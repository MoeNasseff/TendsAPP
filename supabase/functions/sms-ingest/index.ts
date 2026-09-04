// SMS/bank-text ingestion. An iOS Shortcut POSTs the raw message text here;
// this endpoint authenticates it with a per-user token -- never a Supabase
// session, since there is no login flow on a phone automation -- dedupes it,
// masks anything that looks like a full card number, and inserts it. It then
// tries to parse the message: deterministic patterns first (Session 25,
// parsers/index.ts -- an empty registry until that session lands), an AI
// fallback second (Session 27, ai-parse.ts) only if the user has opted in,
// then merchant/category/payment-method matching (enrich.ts). See
// tasks/handoff-4.md.
//
// Nothing here ever writes to `expenses`. A bank text is a notification, not
// a ledger entry -- whatever gets parsed still lands `status: 'pending'` (or
// stays `'unparsed'` if nothing could be read), and every row is reviewed by
// hand on /inbox before it becomes real spending.
//
// Deployed with JWT verification OFF at the gateway
// (`supabase functions deploy sms-ingest --no-verify-jwt`), the same way
// telegram-webhook is: the caller (the Shortcut) has no Supabase session to
// present, so this function does 100% of its own authentication below, via
// `x-tend-token`.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { aiParse } from './ai-parse.ts'
import { enrich, matchInstallmentPlan } from './enrich.ts'
import { kindForShape, pairSettlement } from './kind.ts'
import { runDeterministicParsers, type MessageShape, type ParsedFields } from './parsers/index.ts'

// Keep in sync with GEMINI_DEFAULT_MODEL in src/lib/ai/gemini.ts and
// DEFAULT_MODEL in ai-proxy/index.ts.
const DEFAULT_AI_MODEL = 'gemini-3.6-flash'
// Bumped whenever the prompt or schema in ai-parse.ts changes meaningfully,
// so a later fix can find and re-parse exactly the rows a given version
// handled. S25's parsers will want their own per-module versioning; this one
// constant is enough while AI is the only fallback that exists.
const PARSER_VERSION = 'ai-v1'

const MAX_BODY_BYTES = 8 * 1024
const MAX_TEXT_LENGTH = 2000
const ALLOWED_SOURCES = new Set(['ios-automation', 'share-sheet', 'manual', 'email'])

// `x-tend-token` is a non-simple header, so it must be listed here or the
// browser (for the manual/testing path) fails preflight before the request
// ever leaves the page -- the same trap ai-proxy's own comment documents for
// `apikey`/`x-client-info`.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-tend-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Collapses whitespace only. Deliberately does NOT try to strip a trailing
 * carrier-appended timestamp -- that format is bank/carrier-specific and has
 * not been observed yet (see tasks/sms-corpus.md). Guessing at it now risks
 * either under-normalising (defeating dedupe) or over-normalising (merging
 * two genuinely different messages together). Revisit once the corpus exists.
 */
function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

/**
 * Masks any run of 12+ consecutive digits, keeping the last 4 -- the same
 * shape `payment_methods.last4` already uses.
 *
 * The plan this session followed said "5+ digits". That was wrong and is
 * corrected here: an ordinary EGP amount like "100000.00" or an unbroken
 * carrier-appended date like "20260830" both clear five digits, and masking
 * either would corrupt exactly the numbers this table exists to preserve. No
 * legitimate amount, date, or Egyptian mobile number in a bank text reaches
 * 12 unbroken digits; a full unmasked PAN (15-16 digits) always does.
 */
function maskLongDigitRuns(text: string): string {
  return text.replace(/\d{12,}/g, (run) => '*'.repeat(run.length - 4) + run.slice(-4))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  // ---- 1. Authenticate via the ingest token. Nothing else happens first. --
  const rawToken = req.headers.get('x-tend-token') ?? ''
  if (!rawToken) return json({ error: 'unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const tokenHash = await sha256Hex(rawToken)
  const { data: tokenRow } = await admin
    .from('ingest_tokens')
    .select('id, user_id, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!tokenRow || tokenRow.revoked_at) return json({ error: 'unauthorized' }, 401)
  const userId = tokenRow.user_id as string

  // ---- 2. Read and validate the request. ---------------------------------
  const declaredLength = Number(req.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413)

  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413)

  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text || text.length > MAX_TEXT_LENGTH) return json({ error: 'bad_request' }, 400)

  const source = ALLOWED_SOURCES.has(body.source as string) ? (body.source as string) : 'ios-automation'

  const receivedAt = (() => {
    if (typeof body.received_at !== 'string') return new Date().toISOString()
    const d = new Date(body.received_at)
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
  })()

  const senderLabel = typeof body.sender_label === 'string' ? body.sender_label.trim().slice(0, 60) || null : null

  // ---- 3. Mask, hash, and insert. -----------------------------------------
  const maskedText = maskLongDigitRuns(text)
  const dedupeHash = await sha256Hex(`${userId}|${normalize(maskedText)}`)

  const { data: inserted, error: insertError } = await admin
    .from('sms_inbox')
    .insert({
      user_id: userId,
      raw_text: maskedText,
      sender_label: senderLabel,
      received_at: receivedAt,
      source,
      dedupe_hash: dedupeHash,
      status: 'unparsed',
    })
    .select('id')
    .single()

  if (insertError) {
    // 23505 is the (user_id, dedupe_hash) unique violation -- iOS firing
    // twice for one message because it matched two trigger phrases. This is
    // the expected, common case, not a failure: the shortcut must see 200,
    // or "This Shortcut Had a Problem Running" starts appearing on the phone
    // for something that actually worked the first time.
    if (insertError.code === '23505') {
      const { data: existing } = await admin
        .from('sms_inbox')
        .select('id')
        .eq('user_id', userId)
        .eq('dedupe_hash', dedupeHash)
        .maybeSingle()
      return json({ ok: true, duplicate: true, id: existing?.id ?? null }, 200)
    }
    console.error('sms-ingest: insert failed', insertError.code)
    return json({ error: 'insert_failed' }, 500)
  }

  // Best-effort -- a failure here must never turn a successful ingest into an
  // error response for the shortcut.
  try {
    await admin.from('ingest_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tokenRow.id)
  } catch {
    console.error('sms-ingest: last_used_at stamp failed')
  }

  // ---- 4. Parse, enrich, and update. Best-effort. -------------------------
  // A failure or an inconclusive result anywhere in here must still return
  // 200 -- the row was inserted successfully and stays `unparsed`, which is
  // itself a correct, reviewable outcome. Nothing in this block ever writes
  // to `expenses`.
  try {
    await parseAndEnrich(admin, userId, inserted.id, text, senderLabel, receivedAt)
  } catch (err) {
    console.error('sms-ingest: parse/enrich failed', err instanceof Error ? err.message : err)
  }

  return json({ ok: true, duplicate: false, id: inserted.id }, 200)
})

async function parseAndEnrich(
  admin: ReturnType<typeof createClient>,
  userId: string,
  rowId: string,
  text: string,
  existingSenderLabel: string | null,
  receivedAt: string,
): Promise<void> {
  // `shape` is optional here and required on ParsedFields because only the
  // deterministic parsers can report one -- the AI path recognises no pattern
  // and so names no shape. See AiParsedFields in ai-parse.ts.
  let fields:
    | (Omit<ParsedFields, 'shape'> & { sender?: string; shape?: MessageShape })
    | null = runDeterministicParsers(text)
  let parseMethod: 'regex' | 'ai' | 'none' | null = fields ? 'regex' : null
  let confidence: number | null = null

  if (!fields) {
    const { data: profile } = await admin
      .from('profiles')
      .select('sms_ai_parsing_enabled')
      .eq('id', userId)
      .maybeSingle()

    if (profile?.sms_ai_parsing_enabled) {
      const apiKey = await resolveGeminiKey(admin, userId)
      if (apiKey) {
        const aiFields = await aiParse(text, apiKey.key, apiKey.model)
        if (aiFields) {
          fields = aiFields
          confidence = aiFields.confidence
          parseMethod = 'ai'
        } else {
          // AI ran and concluded this is not a transaction (or the call
          // failed) -- distinct from "never attempted", which stays null.
          parseMethod = 'none'
        }
      }
    }
  }

  const update: Record<string, unknown> = { parser_version: PARSER_VERSION }
  if (parseMethod) update.parse_method = parseMethod
  // The deterministic parser knows which bank matched it the moment it does --
  // no separate detection needed. Fills in what the Shortcut's own payload
  // didn't carry, rather than leaving the row to read "Unknown sender" for a
  // bank the app already identified.
  if (!existingSenderLabel && fields?.sender) update.sender_label = fields.sender

  if (fields) {
    update.parsed_direction = fields.direction
    update.parsed_amount = fields.amount
    update.parsed_currency = fields.currency
    update.parsed_merchant_raw = fields.merchantRaw
    update.parsed_last4 = fields.last4
    update.parsed_occurred_at = fields.occurredAt
    update.parsed_balance = fields.balance
    update.parse_confidence = confidence
    // A parsed amount is what makes a row worth a human's attention. Without
    // one -- direction/merchant with no figure -- it stays `unparsed` rather
    // than moving to `pending`, which the UI reads as "ready to review".
    if (fields.amount !== null) update.status = 'pending'

    const enrichment = await enrich(admin, userId, {
      merchantRaw: fields.merchantRaw,
      last4: fields.last4,
    })
    update.matched_merchant_id = enrichment.merchantId
    update.suggested_category_id = enrichment.categoryId
    update.suggested_payment_method_id = enrichment.paymentMethodId

    if (fields.direction === 'debit') {
      const planId = await matchInstallmentPlan(admin, userId, enrichment.paymentMethodId, fields.amount)
      if (planId) update.matched_installment_plan_id = planId
    }

    // What the message DESCRIBES, as distinct from which way the money went.
    // Only set when a deterministic parser named the shape; an AI-parsed row
    // keeps a null suggested_kind and is classified by the user, because the
    // AI path has no pattern to reason from. See kind.ts.
    if (fields.shape) {
      const kind = kindForShape(fields.shape)
      if (kind) update.suggested_kind = kind

      // Link this row to the other half of a card settlement, if the other
      // half has already arrived. Runs after suggested_kind is decided but
      // before the write, so the pairing lands in the same update; the
      // counterpart's own link is written by pairSettlement itself.
      //
      // Best-effort like everything else in this function: an unpaired row is
      // still a correct, reviewable row -- it just asks the user instead of
      // classifying itself.
      try {
        const pairedId = await pairSettlement(admin, userId, {
          id: rowId,
          shape: fields.shape,
          amount: fields.amount,
          occurredAt: fields.occurredAt,
          receivedAt,
        })
        if (pairedId) update.paired_inbox_id = pairedId
      } catch (err) {
        console.error('sms-ingest: settlement pairing failed', err instanceof Error ? err.message : err)
      }
    }
  }

  if (Object.keys(update).length > 0) {
    await admin.from('sms_inbox').update(update).eq('id', rowId)
  }
}

/**
 * Mirrors ai-proxy's own key resolution (BYOK row first if enabled and
 * present, else the managed GEMINI_API_KEY secret) rather than calling
 * ai-proxy over HTTP: ai-proxy requires a Supabase session JWT, and this
 * function has none to offer it -- the caller is a phone automation with no
 * login flow. sms-ingest already holds service_role for this exact user, so
 * resolving the key directly is the smaller footprint of the two options.
 */
async function resolveGeminiKey(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ key: string; model: string } | null> {
  const { data: config } = await admin
    .from('ai_provider_configs')
    .select('api_key, model')
    .eq('user_id', userId)
    .eq('provider', 'gemini')
    .eq('enabled', true)
    .maybeSingle()

  if (config?.api_key) return { key: config.api_key, model: config.model || DEFAULT_AI_MODEL }

  const managedKey = Deno.env.get('GEMINI_API_KEY')
  return managedKey ? { key: managedKey, model: DEFAULT_AI_MODEL } : null
}
