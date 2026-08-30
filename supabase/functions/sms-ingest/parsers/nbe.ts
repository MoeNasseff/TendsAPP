import { cairoIso, cleanMerchant, expandYear, normalize, parseAmount, type ParsedFields } from './shared.ts'

/**
 * NBE — National Bank of Egypt. Debit card …5311 on account …0180.
 *
 * Unlike CIB and FAB this is a *debit* card, so the figure after المتاح is a
 * real account balance, not remaining credit. That distinction is the whole
 * reason the corpus arithmetic checks out: the last full message reads
 * 30,267.12 available, the 59.96 debit after it lands the account at 30,207.16,
 * which is the balance stated independently. Treating that number as a credit
 * limit, as it would be for the other two senders, would make the combined-cash
 * figure in S32 nonsense.
 *
 * Three shapes worth knowing about:
 *
 * 1. The merchant field is padded to a fixed width — "عند Uber" is followed by
 *    roughly twenty spaces before يوم. `normalize` collapses them; without that
 *    the merchant captures as "Uber                      ".
 *
 * 2. NBE spells the hour marker two ways: الساعه in the debit alerts and الساعة
 *    in the credit ones. Matching only one silently halves the parser.
 *
 * 3. The credit shape dates itself "يوم 08-16" — month and day, no year. There
 *    is no safe way to infer it from the text alone, and a wrong year files a
 *    transaction twelve months out, so occurredAt is deliberately left null and
 *    `received_at` carries the timing instead.
 *
 * One corpus message is truncated mid-sentence ("… يوم" and nothing after).
 * The date group is therefore optional: the amount, card and merchant in it are
 * unambiguous and worth keeping. That is not a partial guess — it is parsing
 * what is present and declining to invent what is not.
 */

// ` يوم` is required even in the truncated message, and only what follows it is
// optional. Without that the lazy merchant group backtracks over "يوم" itself
// and captures "Uber يوم". No `$` anchor either: every complete message trails
// a "للمزيد إتصل ب" support line after the balance.
const DEBIT_CARD_PURCHASE =
  /تم خصم ([\d,]+\.?\d*) ([A-Z]{3}) من بطاقة الخصم المباشر رقم (\d{4}) عند (.+?) يوم(?: (\d{2})\/(\d{2})\/(\d{2}) الساعه? (\d{1,2}):(\d{2}))?(?: المتاح ([\d,]+\.?\d*)[A-Z]{3})?/

const INSTANT_TRANSFER_IN =
  /تم إضافة تحويل لحظي لحسابكم رقم (\d{4}) بمبلغ ([\d,]+\.?\d*) جم من (.+?) رقم مرجعي \d+ يوم (\d{2})-(\d{2}) الساعة (\d{1,2}):(\d{2})/

export function match(text: string): ParsedFields | null {
  const t = normalize(text)

  const purchase = t.match(DEBIT_CARD_PURCHASE)
  if (purchase) {
    const [, amt, ccy, last4, merchant, dd, mm, yy, hh, mi, balance] = purchase
    return {
      direction: 'debit',
      amount: parseAmount(amt),
      currency: ccy,
      merchantRaw: cleanMerchant(merchant),
      last4,
      occurredAt: dd
        ? cairoIso(expandYear(yy), Number(mm), Number(dd), Number(hh), Number(mi))
        : null,
      balance: parseAmount(balance),
    }
  }

  const transferIn = t.match(INSTANT_TRANSFER_IN)
  if (transferIn) {
    const [, last4, amt] = transferIn
    return {
      direction: 'credit',
      amount: parseAmount(amt),
      currency: 'EGP',
      // The counterparty is a named private individual. It is not a merchant,
      // and writing a person's name into merchant matching would seed the
      // merchants table with people.
      merchantRaw: null,
      last4,
      // Month and day only — see the note above. Never guessed.
      occurredAt: null,
      balance: null,
    }
  }

  return null
}
