import {
  cairoIso,
  cleanMerchant,
  expandYear,
  monthFromName,
  normalize,
  parseAmount,
  type ParsedFields,
} from './shared.ts'

/**
 * CIB — Commercial International Bank.
 *
 * Six distinct message shapes in the corpus, three English and three Arabic,
 * covering a credit card (…8537) and a current account (…6196). Each is matched
 * by its own anchored pattern rather than by a general "find a number" sweep:
 * CIB's promotional SMS quotes "3,000 جنيه" in its body, and any parser loose
 * enough to read an amount out of prose would invent a 3,000 EGP expense out of
 * a marketing blast.
 *
 * Two corpus facts worth carrying forward:
 *
 * 1. A card payment arrives as *two* messages — the account debit ("is debited
 *    with amount EGP 1,155.00DR … with transfer to another account") and the
 *    card credit ("تم سداد مبلغ 1155.00 جم فى بطاقتكم الائتمانية"). They are one
 *    movement of money described twice. Both are parsed, because dropping either
 *    would hide a real event, but the card side is `credit` so neither can
 *    inflate spending. Pairing them is a reconciliation problem, not a parsing
 *    one — see the S32 plan.
 *
 * 2. The salary alert carries no date or time at all, only an amount. Its
 *    occurredAt is null by necessity and `received_at` is the only timestamp
 *    that exists for it.
 */

/** Anything with this phrase is a marketing blast, whatever else it contains. */
const PROMO_MARKERS = [/CIB Plus Booth/i, /تطبق الشروط والأحكام/, /اضغط هنا/]

/**
 * "Your credit card ending with#8537 using Apple Pay was charged for EGP 577.00
 *  at FAWRY IKEA MOA on 27/08/26  at 14:44. Card available limit is EGP  32153.04."
 *
 * `using <wallet>` is optional — the same card sends both variants. The trailing
 * figure is available *credit*, not an account balance; see the note in
 * parsers/index.ts about what `balance` means per message type.
 */
const CARD_CHARGE =
  /Your credit card ending with#(\d{4})(?: using .+?)? was charged for ([A-Z]{3}) ([\d,]+\.?\d*) at (.+?) on (\d{2})\/(\d{2})\/(\d{2}) at (\d{1,2}):(\d{2})\.(?: Card available limit is ([A-Z]{3}) ([\d,]+\.?\d*)\.)?/

/**
 * "تم سداد مبلغ 1155.00 جم فى بطاقتكم الائتمانية المنتهية بـ 8537 بتاريخ 28-08-26"
 * A payment onto the credit card. Credit, and never an expense.
 */
const CARD_PAYMENT =
  /تم سداد مبلغ ([\d,]+\.?\d*) جم فى بطاقتكم الائتمانية المنتهية بـ (\d{4}) بتاريخ (\d{2})-(\d{2})-(\d{2})/

/**
 * "Your account ending with ****6196 is debited with amount EGP 1,155.00DR
 *  On 30 AUG 2026 with transfer to  another account."
 * Date only, no clock time.
 */
const ACCOUNT_DEBIT =
  /Your account ending with \*+(\d{4}) is debited with amount ([A-Z]{3}) ([\d,]+\.?\d*)DR On (\d{1,2}) ([A-Za-z]{3,}) (\d{4})/

/**
 * "يرجى العلم أنه تم خصم مبلغ EGP 530000.00 من حساب ****6196 عبر شبكة المدفوعات
 *  اللحظية (IPN) … بتاريخ 29-08-2026 14:42 إلى RANA …"
 */
const IPN_DEBIT =
  /تم خصم مبلغ ([A-Z]{3}) ([\d,]+\.?\d*) من حساب \*+(\d{4}).*?بتاريخ (\d{2})-(\d{2})-(\d{4}) (\d{1,2}):(\d{2})/

/**
 * "يرجى العلم انه تم تنفيذ تحويل لحظي بمبلغ 249.97 جم من حسابك المنتهي بـ ****6196
 *  برقم مرجعي 8ecf05a0 بتاريخ 29-08-2026 18:16"
 */
const INSTANT_TRANSFER_OUT =
  /تم تنفيذ تحويل لحظي بمبلغ ([\d,]+\.?\d*) جم من حسابك المنتهي بـ \*+(\d{4}).*?بتاريخ (\d{2})-(\d{2})-(\d{4}) (\d{1,2}):(\d{2})/

/**
 * "عميلنا العزيز لقد تم تحويل مبلغ EGP41,201.42 على حسابكم لدينا من جهة العمل"
 *
 * The salary credit. `من جهة العمل` ("from the employer") is the whole signal —
 * it is what separates this from every other inbound transfer, and it is the
 * hook the salary notification in S32 hangs on. No date, no account, no time.
 */
const SALARY_CREDIT =
  /تم تحويل مبلغ ([A-Z]{3})\s?([\d,]+\.?\d*) على حسابكم لدينا من جهة العمل/

/** True when the message is CIB's salary alert. Read by enrich/notification code. */
export function isSalaryCredit(text: string): boolean {
  const t = normalize(text)
  return !PROMO_MARKERS.some((p) => p.test(t)) && SALARY_CREDIT.test(t)
}

export function match(text: string): ParsedFields | null {
  const t = normalize(text)

  // Checked before anything else: the promo quotes amounts in prose and is the
  // single most likely source of a false positive in the whole corpus.
  if (PROMO_MARKERS.some((p) => p.test(t))) return null

  const charge = t.match(CARD_CHARGE)
  if (charge) {
    const [, last4, ccy, amt, merchant, dd, mm, yy, hh, mi, , limit] = charge
    return {
      direction: 'debit',
      amount: parseAmount(amt),
      currency: ccy,
      merchantRaw: cleanMerchant(merchant),
      last4,
      occurredAt: cairoIso(expandYear(yy), Number(mm), Number(dd), Number(hh), Number(mi)),
      balance: parseAmount(limit),
    }
  }

  const payment = t.match(CARD_PAYMENT)
  if (payment) {
    const [, amt, last4, dd, mm, yy] = payment
    return {
      direction: 'credit',
      amount: parseAmount(amt),
      currency: 'EGP',
      merchantRaw: null,
      last4,
      occurredAt: cairoIso(expandYear(yy), Number(mm), Number(dd)),
      balance: null,
    }
  }

  const accountDebit = t.match(ACCOUNT_DEBIT)
  if (accountDebit) {
    const [, last4, ccy, amt, dd, mon, yyyy] = accountDebit
    return {
      direction: 'debit',
      amount: parseAmount(amt),
      currency: ccy,
      merchantRaw: null,
      last4,
      occurredAt: cairoIso(Number(yyyy), monthFromName(mon), Number(dd)),
      balance: null,
    }
  }

  const ipn = t.match(IPN_DEBIT)
  if (ipn) {
    const [, ccy, amt, last4, dd, mm, yyyy, hh, mi] = ipn
    return {
      direction: 'debit',
      amount: parseAmount(amt),
      currency: ccy,
      merchantRaw: null,
      last4,
      occurredAt: cairoIso(Number(yyyy), Number(mm), Number(dd), Number(hh), Number(mi)),
      balance: null,
    }
  }

  const instant = t.match(INSTANT_TRANSFER_OUT)
  if (instant) {
    const [, amt, last4, dd, mm, yyyy, hh, mi] = instant
    return {
      direction: 'debit',
      amount: parseAmount(amt),
      currency: 'EGP',
      merchantRaw: null,
      last4,
      occurredAt: cairoIso(Number(yyyy), Number(mm), Number(dd), Number(hh), Number(mi)),
      balance: null,
    }
  }

  const salary = t.match(SALARY_CREDIT)
  if (salary) {
    const [, ccy, amt] = salary
    return {
      direction: 'credit',
      amount: parseAmount(amt),
      currency: ccy,
      merchantRaw: null,
      last4: null,
      occurredAt: null,
      balance: null,
    }
  }

  return null
}
