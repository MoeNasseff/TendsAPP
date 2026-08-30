// SMS/bank-text ingestion. An iOS Shortcut POSTs the raw message text here;
// this endpoint authenticates it with a per-user token -- never a Supabase
// session, since there is no login flow on a phone automation -- dedupes it,
// masks anything that looks like a full card number, and inserts it as
// `status: 'unparsed'`. Parsing is Session 25's job, not this file's: see
// tasks/handoff-4.md.
//
// Nothing here ever writes to `expenses`. A bank text is a notification, not
// a ledger entry -- every row is reviewed by hand on /inbox.
//
// Deployed with JWT verification OFF at the gateway
// (`supabase functions deploy sms-ingest --no-verify-jwt`), the same way
// telegram-webhook is: the caller (the Shortcut) has no Supabase session to
// present, so this function does 100% of its own authentication below, via
// `x-tend-token`.
import { createClient } from 'npm:@supabase/supabase-js@2'

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

  return json({ ok: true, duplicate: false, id: inserted.id }, 200)
})
