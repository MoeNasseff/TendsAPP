// Real extraction — Session 9 / Packet 6. Replaces mockExtract with an
// actual Gemini vision call. Every field below is hand-narrowed from the
// model's JSON: it is an external payload like any other and is never
// trusted at face value.
import { runGemini, outputText } from '../../lib/ai/gemini'
import type { AIResolution } from '../../lib/ai/types'
import type { DocumentType } from '../../lib/types'

export interface CategoryOption {
  id: string
  name: string
}

export type ExtractionFailureReason =
  | 'unavailable'
  | 'byok_not_configured'
  | 'provider_error'
  | 'transport_error'
  /** Model read the image fine but it isn't a purchase document. */
  | 'invalid_document'
  /** Response didn't parse, or parsed without the one field we can't do
   * without (total). */
  | 'malformed_response'

export interface ExtractedItemFields {
  label: string
  brand: string | null
  quantity: number | null
  unitPrice: number | null
  lineTotal: number | null
  discount: number | null
  sizeValue: number | null
  sizeUnit: string | null
}

export interface ExtractedFields {
  documentType: DocumentType
  merchantName: string | null
  merchantBranch: string | null
  invoiceNumber: string | null
  issuedAt: string | null
  dueAt: string | null
  subtotal: number | null
  tax: number | null
  total: number | null
  currency: string | null
  categoryId: string | null
  /** Only ever what the provider itself reported — never fabricated. */
  confidence: number | null
  items: ExtractedItemFields[]
}

export type ExtractOutcome =
  | { ok: true; fields: ExtractedFields; raw: unknown }
  /** `fields` carries whatever did parse, even on failure, so the caller can
   * pre-fill the review form instead of throwing the read away. */
  | { ok: false; reason: ExtractionFailureReason; fields: Partial<ExtractedFields> }

// Deliberately does not require total/currency — an unreadable image must
// still satisfy the schema by setting is_readable:false, not by inventing a
// total. Missing-total-on-a-readable-document is handled after parsing.
const RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    is_readable: { type: 'boolean' },
    document_type: { type: 'string', enum: ['receipt', 'invoice', 'bill', 'other'] },
    merchant_name: { type: 'string' },
    merchant_branch: { type: 'string' },
    invoice_number: { type: 'string' },
    // format + description both stated: the model prints whatever the receipt
    // printed unless told otherwise, and DD/MM/YYYY is the norm on Egyptian
    // receipts. normalizeDate below is the safety net, not the primary fix.
    issued_at: {
      type: 'string',
      format: 'date',
      description: 'Purchase date as ISO 8601 yyyy-mm-dd, converted from whatever format the receipt prints.',
    },
    due_at: {
      type: 'string',
      format: 'date',
      description: 'Payment due date as ISO 8601 yyyy-mm-dd, if the document states one.',
    },
    subtotal: { type: 'number' },
    tax: { type: 'number' },
    total: { type: 'number' },
    currency: { type: 'string' },
    category_name: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    items: {
      type: 'array',
      description:
        'Every purchased line printed on the document, one entry each, in printed order. A receipt listing eight products yields eight entries. Only an empty array when the document genuinely itemises nothing.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'The product name as printed.' },
          brand: { type: 'string', description: 'Brand only, separate from the product name.' },
          quantity: { type: 'number' },
          unit_price: { type: 'number', description: 'Price for one unit.' },
          line_total: { type: 'number', description: 'Price for this line: quantity x unit price.' },
          discount: { type: 'number' },
          size_value: { type: 'number', description: 'Numeric pack size, e.g. 3 for "3kg".' },
          size_unit: { type: 'string', description: 'Unit of the pack size, e.g. "kg", "L", "g".' },
        },
        required: ['label'],
      },
    },
  },
  required: ['is_readable', 'document_type', 'items'],
}

function buildPrompt(categories: CategoryOption[]): string {
  const names = categories.map((c) => c.name).join(', ') || 'none yet'
  return [
    'You are reading a photo of a single purchase document — a receipt, invoice, or bill.',
    'Extract only the fields defined by the response schema. No prose, no markdown.',
    'Classify document_type as receipt, invoice, bill, or other. Do not assume every document is an invoice.',
    `For category_name, choose the single best match from this exact list if one clearly fits: ${names}.`,
    'If nothing fits, use "Uncategorized". Never invent a category name that is not in that list.',
    'Transcribe EVERY line item printed on the document — one entry per printed line, in order, each with its',
    'own price. Do not summarise several products into one entry, and do not return only the total. Include',
    'brand and pack size when visible (for example "3kg" or "1L").',
    'Dates must be ISO 8601 yyyy-mm-dd. Receipts here usually print DD/MM/YYYY — convert it, do not copy it.',
    'If the image is not a legible purchase document — blurry, blank, or an unrelated subject — set',
    'is_readable to false and leave the numeric fields out rather than guessing.',
    'For confidence, report your own honest estimate of extraction accuracy from 0 to 1. Omit it if you',
    'cannot estimate it — never invent a number.',
  ].join(' ')
}

/**
 * Raw base64, no data-URL prefix — the shape `GeminiInputPart` expects.
 *
 * FileReader rather than a hand-rolled loop over the bytes: a photo off a
 * phone camera is several megabytes, and building that string one
 * `String.fromCharCode` at a time hangs or crashes mobile Safari. The native
 * decoder does it in one pass off the main thread.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Could not read the image'))
        return
      }
      // readAsDataURL yields "data:image/jpeg;base64,<payload>".
      const comma = result.indexOf(',')
      resolve(comma === -1 ? result : result.slice(comma + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the image'))
    reader.readAsDataURL(file)
  })
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

/**
 * Coerces a date to `yyyy-mm-dd`, or null.
 *
 * The review form's `<input type="date">` accepts that format and nothing
 * else — hand it `15/08/2026` and it renders blank with no error, which reads
 * as "the AI missed the date" when the AI actually found it. That silent drop
 * is what this exists to prevent.
 *
 * Day-first on the slash form: these are Egyptian receipts, where DD/MM/YYYY
 * is the convention. An ambiguous `03/04/2026` is therefore 3 April. Anything
 * that is not one of the two recognised shapes returns null rather than a
 * guess — a blank the user fills in beats a plausible wrong date on a
 * financial record.
 */
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

function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const probe = new Date(Date.UTC(y, m - 1, d))
  return probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
}

function asDocumentType(v: unknown): DocumentType {
  return v === 'receipt' || v === 'invoice' || v === 'bill' || v === 'other' ? v : 'other'
}

/** Case-insensitive exact match against the user's real categories only.
 * Never creates one — a non-match falls back to uncategorised (null). */
function matchCategory(name: string | null, categories: CategoryOption[]): string | null {
  if (!name) return null
  const needle = name.trim().toLowerCase()
  return categories.find((c) => c.name.trim().toLowerCase() === needle)?.id ?? null
}

function parseItems(v: unknown): ExtractedItemFields[] {
  if (!Array.isArray(v)) return []
  const items: ExtractedItemFields[] = []
  for (const raw of v) {
    if (typeof raw !== 'object' || raw === null) continue
    const row = raw as Record<string, unknown>
    const label = asText(row.label)
    if (!label) continue
    items.push({
      label,
      brand: asText(row.brand),
      quantity: asNumber(row.quantity),
      unitPrice: asNumber(row.unit_price),
      lineTotal: asNumber(row.line_total),
      discount: asNumber(row.discount),
      sizeValue: asNumber(row.size_value),
      sizeUnit: asText(row.size_unit),
    })
  }
  return items
}

function parseFields(parsed: Record<string, unknown>, categories: CategoryOption[]): ExtractedFields {
  return {
    documentType: asDocumentType(parsed.document_type),
    merchantName: asText(parsed.merchant_name),
    merchantBranch: asText(parsed.merchant_branch),
    invoiceNumber: asText(parsed.invoice_number),
    issuedAt: normalizeDate(parsed.issued_at),
    dueAt: normalizeDate(parsed.due_at),
    subtotal: asNumber(parsed.subtotal),
    tax: asNumber(parsed.tax),
    total: asNumber(parsed.total),
    currency: asText(parsed.currency),
    categoryId: matchCategory(asText(parsed.category_name), categories),
    confidence: asNumber(parsed.confidence),
    items: parseItems(parsed.items),
  }
}

/**
 * Runs one real extraction pass over a receipt/invoice image through
 * whichever provider `resolution` already resolved to. Never decides for
 * itself which key to use — an 'unavailable' resolution makes no network
 * call and no base64 conversion at all.
 */
export async function extractReceipt(
  file: File,
  resolution: AIResolution,
  categories: CategoryOption[],
  model?: string,
): Promise<ExtractOutcome> {
  if (resolution.status === 'unavailable') return { ok: false, reason: 'unavailable', fields: {} }

  let data: string
  try {
    data = await fileToBase64(file)
  } catch {
    return { ok: false, reason: 'malformed_response', fields: {} }
  }
  const result = await runGemini(resolution, {
    model,
    input: [
      { type: 'image', data, mime_type: file.type || 'image/jpeg' },
      { type: 'text', text: buildPrompt(categories) },
    ],
    responseFormat: { type: 'text', mime_type: 'application/json', schema: RESPONSE_SCHEMA },
  })

  if (!result.ok) return { ok: false, reason: result.reason, fields: {} }

  const text = outputText(result.interaction)
  if (!text) return { ok: false, reason: 'malformed_response', fields: {} }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'malformed_response', fields: {} }
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'malformed_response', fields: {} }
  }

  const record = parsed as Record<string, unknown>
  const fields = parseFields(record, categories)

  if (record.is_readable === false) return { ok: false, reason: 'invalid_document', fields }
  // A real purchase total is a meaningful positive amount — a null, zero, or
  // vanishingly small value (models occasionally emit e.g. 2.2e-13 instead of
  // admitting they couldn't read one) means nothing usable actually came back.
  if (fields.total === null || fields.total < 0.01) {
    // Null the bad total so the caller doesn't pre-fill the amount field with
    // it — everything else that did parse (vendor, date, items) still keeps.
    return { ok: false, reason: 'malformed_response', fields: { ...fields, total: null } }
  }

  return { ok: true, fields, raw: parsed }
}
