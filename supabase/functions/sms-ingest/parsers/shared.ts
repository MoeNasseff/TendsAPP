// Helpers shared by every sender parser. Kept here rather than duplicated per
// module because the failure modes below are identical across senders and each
// one silently corrupts a number if it is got wrong once.

/**
 * Arabic-Indic (٠-٩, U+0660) and Extended Arabic-Indic (۰-۹, U+06F0) digits to
 * ASCII. Both appear in the corpus — NBE signs off with ١٩٦٢٣ and the CIB promo
 * carries ۹٤۹-۸۹۱-۲۰٤ — and a bare \d in a RegExp does not match either, so a
 * message can look unparseable purely because of its phone number.
 */
export function normalizeDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (d) => {
    const code = d.charCodeAt(0)
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660
    return String(code - base)
  })
}

/**
 * Collapses the runs of whitespace the banks pad their fields with. NBE sends
 * the merchant followed by ~22 spaces before the date; CIB puts two spaces
 * after the amount and before the available limit. Matching those literally
 * would make every pattern brittle against a single spacing change.
 */
export function normalizeSpace(text: string): string {
  return text.replace(/[ \s]+/g, ' ').trim()
}

/** Both at once — every parser's first move. */
export function normalize(text: string): string {
  return normalizeSpace(normalizeDigits(text))
}

/** "1,155.00" / "5" / "530000.00" → number. Null on anything unparseable. */
export function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number(raw.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/**
 * Minutes east of UTC for Africa/Cairo at a given instant.
 *
 * Not a constant: Egypt reinstated DST, so the offset is +03:00 in August and
 * +02:00 in December. Hardcoding either one puts every transaction in the other
 * half of the year an hour out. `longOffset` yields "GMT+03:00".
 */
function cairoOffsetMinutes(utcMs: number): number {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    timeZoneName: 'longOffset',
  }).format(new Date(utcMs))
  const match = formatted.match(/GMT([+-])(\d{2}):(\d{2})/)
  if (!match) return 120
  const sign = match[1] === '-' ? -1 : 1
  return sign * (Number(match[2]) * 60 + Number(match[3]))
}

/**
 * Wall-clock date/time as written in the message → an ISO instant.
 *
 * Banks send local Cairo time with no offset. Treating it as UTC would shift
 * every transaction two or three hours and quietly move late-evening spending
 * into the next day.
 *
 * Returns null rather than guessing whenever a component is missing — see the
 * NBE credit shape, which carries a month and day but no year.
 */
export function cairoIso(
  year: number | null,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): string | null {
  if (year === null || !Number.isFinite(month) || !Number.isFinite(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  if (hour > 23 || minute > 59) return null

  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const iso = new Date(guess - cairoOffsetMinutes(guess) * 60_000).toISOString()
  return iso
}

/**
 * Two-digit year to four. The corpus is entirely "26" for 2026; anything that
 * would land before 2000 is treated as this century rather than 19xx, since a
 * bank SMS from 1926 is not a case worth supporting.
 */
export function expandYear(yy: string): number {
  const n = Number(yy)
  return n < 100 ? 2000 + n : n
}

/** Month names as CIB writes them in its English account alerts: "30 AUG 2026". */
const MONTHS: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
}

export function monthFromName(name: string): number {
  return MONTHS[name.toUpperCase().slice(0, 3)] ?? NaN
}

/**
 * Merchant names arrive padded, truncated to a fixed width and sometimes
 * lowercase ("uber egy", "HYPERONE - ELSO", "Emirates Misr S"). Trim only —
 * do not title-case or expand. The raw string is what merchant matching in
 * enrich.ts normalises against, and rewriting it here would hide what the bank
 * actually sent when a match later goes wrong.
 */
export function cleanMerchant(raw: string | undefined): string | null {
  if (!raw) return null
  const trimmed = normalizeSpace(raw).replace(/[.,]+$/, '')
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Which message shape matched, named by the parser that recognised it.
 *
 * This is the parser reporting *what kind of event the bank described*, which
 * is information only the pattern knows and which is otherwise thrown away the
 * moment `match()` returns. `direction` cannot substitute for it: a card
 * charge and an account debit funding a card payment are both `debit`, and one
 * is spending while the other settles spending already counted. See
 * `kind.ts` for the shape -> transaction-kind mapping.
 *
 * Deliberately a closed union. A new shape must be added here, which forces
 * the mapping in `kind.ts` to be updated in the same change rather than
 * silently defaulting a new message type into "purchase".
 */
export type MessageShape =
  | 'card_charge'
  | 'card_payment'
  | 'account_debit'
  | 'ipn_debit'
  | 'instant_transfer_out'
  | 'instant_transfer_in'
  | 'salary_credit'
  | 'debit_card_purchase'

/** The shape every parser returns. Re-exported by parsers/index.ts. */
export interface ParsedFields {
  direction: 'debit' | 'credit' | null
  amount: number | null
  currency: string | null
  merchantRaw: string | null
  last4: string | null
  occurredAt: string | null
  balance: number | null
  shape: MessageShape
}
