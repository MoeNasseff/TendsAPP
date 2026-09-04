import { cairoIso, cleanMerchant, expandYear, normalize, parseAmount, type ParsedFields } from './shared.ts'

/**
 * FAB Misr — First Abu Dhabi Bank Egypt. Credit card …1907.
 *
 * Only two shapes in the corpus, and they are the reason this parser matters
 * more than its size suggests: one is a transaction and the other is a monthly
 * statement, and both open by naming the card and quoting an EGP figure.
 *
 *   "Your Card ** 1907 was debited with EGP 5 at uber egy on 12/08/26 12:47.
 *    Available limit is EGP 31398."
 *
 *   "August balance for your Credit Card ** 1907 is EGP 33,596.06.
 *    Minimum due is EGP 2,405.96 for immediate payment."
 *
 * A parser that keyed on "Card ** 1907" plus a number would turn the statement
 * into a 33,596.06 EGP purchase — a month of spending re-recorded as a single
 * transaction. `was debited with` is the discriminator, and the statement is
 * additionally rejected outright below so the intent is explicit rather than
 * incidental.
 *
 * Amounts here carry no thousands separator or decimals when they are round
 * ("EGP 5", "EGP 31398"), so the amount pattern must not require either.
 */

/** Monthly statement / minimum-due notice. Real, useful, and not a transaction. */
const STATEMENT = /balance for your Credit Card \*+ ?\d{4} is [A-Z]{3}/i

const CARD_DEBIT =
  /Your Card \*+ ?(\d{4}) was debited with ([A-Z]{3}) ([\d,]+\.?\d*) at (.+?) on (\d{2})\/(\d{2})\/(\d{2}) (\d{1,2}):(\d{2})\.(?: Available limit is ([A-Z]{3}) ([\d,]+\.?\d*)\.)?/

export function match(text: string): ParsedFields | null {
  const t = normalize(text)

  if (STATEMENT.test(t)) return null

  const debit = t.match(CARD_DEBIT)
  if (!debit) return null

  const [, last4, ccy, amt, merchant, dd, mm, yy, hh, mi, , limit] = debit
  return {
    direction: 'debit',
    amount: parseAmount(amt),
    currency: ccy,
    merchantRaw: cleanMerchant(merchant),
    last4,
    occurredAt: cairoIso(expandYear(yy), Number(mm), Number(dd), Number(hh), Number(mi)),
    balance: parseAmount(limit),
    // FAB Misr sends only this one transactional shape; the statement notice
    // above is filtered out before we ever get here.
    shape: 'card_charge',
  }
}
