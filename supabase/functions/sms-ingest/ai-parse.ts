// AI fallback for a message no deterministic parser could read. Called only
// when runDeterministicParsers() (parsers/index.ts) returned null, and only
// for a user who has opted in -- see profiles.sms_ai_parsing_enabled, off by
// default. Structured output over the same Gemini surface every other AI
// call in this app uses; the response is an external payload and is
// hand-narrowed exactly like src/modules/scanner/extract.ts does, never
// trusted as already parsed.
//
// This function classifies and extracts. It never decides anything gets
// written to expenses -- the row it produces fields for still lands
// `status: 'pending'` like any other, labelled `parse_method: 'ai'`.
//
// Gemini surface checked against ai.google.dev on 2026-08-16 (see
// ai-proxy/index.ts): POST /v1beta/interactions, flat `input` array,
// `response_format`. Re-read the docs before editing rather than trusting
// this comment.
import type { ParsedFields } from './parsers/index.ts'

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'

export interface AiParsedFields extends ParsedFields {
  confidence: number | null
}

// The single most important field in this schema: it lets the model say "not
// a transaction" for an OTP, balance enquiry, or promo text, rather than
// being forced to invent numbers for a message that has none.
const RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    is_transaction: { type: 'boolean' },
    direction: { type: 'string', enum: ['debit', 'credit'] },
    amount: { type: 'number' },
    currency: { type: 'string' },
    merchant: { type: 'string', description: 'Merchant or payee name as printed, if any.' },
    last4: { type: 'string', description: 'Last 4 digits of the card or account, if the message shows them.' },
    occurred_at: {
      type: 'string',
      format: 'date',
      description: 'Transaction date as ISO 8601 yyyy-mm-dd, converted from whatever format the text prints.',
    },
    balance: { type: 'number', description: 'Account or card balance after the transaction, if stated.' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['is_transaction'],
}

function buildPrompt(text: string): string {
  return [
    'You are reading one SMS or push notification from a bank or a payment provider (BNPL, wallet).',
    'Decide first whether this text reports an actual money movement -- a purchase, refund, withdrawal,',
    'transfer, or instalment payment. An OTP or verification code, a balance enquiry, a marketing message,',
    'or anything else that is not itself a transaction must get is_transaction: false, with every other',
    'field omitted -- never guess a number for a message that has none.',
    'If it is a transaction: direction is "debit" for money leaving (purchase, withdrawal, fee, instalment',
    'due) and "credit" for money arriving (refund, deposit, reversal, salary). Extract the amount exactly',
    'as printed, the currency, the merchant or payee name, and the date, converted to ISO 8601 yyyy-mm-dd',
    '-- Egyptian bank texts usually print DD/MM/YYYY.',
    'For last4: look for a card or account number that is partly masked or partly stated, in any of these',
    'forms -- "card ending 4417", "card ending in 4417", "**** 4417", "xxxx4417", "a/c ...4417" -- and',
    'return just the 4 digits, "4417". This is different from an OTP or reference number: only extract it',
    'from wording that names a card or account, never from an unrelated number elsewhere in the text.',
    'For balance: only if the message explicitly states an account or card balance after the transaction',
    '(e.g. "available balance EGP 12,450.00", "avail bal 12450.00") -- extract that number, not the',
    'transaction amount itself.',
    'For confidence, report your own honest estimate of extraction accuracy from 0 to 1. Omit it if you',
    'cannot estimate it -- never invent a number.',
    'Message:',
    text,
  ].join(' ')
}

function asText(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

function asDirection(v: unknown): 'debit' | 'credit' | null {
  return v === 'debit' || v === 'credit' ? v : null
}

/** Only ever the last 4 -- if the model echoes more digits than that, they
 *  are discarded rather than stored, the same rule payment_methods.last4
 *  and the ingest endpoint's own PAN masking both follow. */
function asLast4(v: unknown): string | null {
  const digits = (asText(v) ?? '').replace(/\D/g, '')
  return digits.length === 4 ? digits : digits.length > 4 ? digits.slice(-4) : null
}

function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const probe = new Date(Date.UTC(y, m - 1, d))
  return probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
}

function normalizeDate(v: unknown): string | null {
  const raw = asText(v)
  if (!raw) return null
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return isRealDate(+iso[1], +iso[2], +iso[3]) ? raw : null
  const dayFirst = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (dayFirst) {
    const [, d, m, y] = dayFirst
    if (!isRealDate(+y, +m, +d)) return null
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

/**
 * Calls Gemini directly with an already-resolved key, rather than looping
 * back through ai-proxy's own HTTP surface. ai-proxy verifies a Supabase
 * session JWT before anything else happens, and this function has none to
 * offer it -- the caller here is sms-ingest itself, already running as
 * service_role for exactly this user. Duplicating this ~small request
 * rather than minting a synthetic session was the smaller footprint of the
 * two options.
 *
 * Returns null on any failure, on a non-2xx response, on an unparseable
 * body, and whenever the model itself reports `is_transaction` as anything
 * other than `true` -- false and missing are treated identically, both
 * meaning "do not create a transaction from this."
 */
export async function aiParse(text: string, apiKey: string, model: string): Promise<AiParsedFields | null> {
  let upstream: Response
  try {
    upstream = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: [{ type: 'text', text: buildPrompt(text) }],
        response_format: { type: 'text', mime_type: 'application/json', schema: RESPONSE_SCHEMA },
      }),
    })
  } catch {
    return null
  }
  if (!upstream.ok) return null

  let interaction: unknown
  try {
    interaction = await upstream.json()
  } catch {
    return null
  }

  const steps =
    (interaction as { steps?: Array<{ content?: Array<{ type?: string; text?: string }> }> } | null)?.steps ?? []
  const parts: string[] = []
  for (const step of steps) {
    for (const block of step.content ?? []) {
      if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
    }
  }
  const raw = parts.join('')
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null

  const record = parsed as Record<string, unknown>
  if (record.is_transaction !== true) return null

  return {
    direction: asDirection(record.direction),
    amount: asNumber(record.amount),
    currency: asText(record.currency),
    merchantRaw: asText(record.merchant),
    last4: asLast4(record.last4),
    occurredAt: normalizeDate(record.occurred_at),
    balance: asNumber(record.balance),
    confidence: asNumber(record.confidence),
  }
}
