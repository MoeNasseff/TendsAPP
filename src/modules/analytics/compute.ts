import type {
  Expense,
  ExpenseCategory,
  Merchant,
  PriceObservation,
  Product,
  Receipt,
  ReceiptItem,
} from '../../lib/types'
import type {
  AnalyticsResult,
  CategoryRollup,
  DateRange,
  HighLowSpendDays,
  ItemCategoryRollup,
  ItemCoverage,
  ItemRollup,
  MerchantRollup,
  PeriodDelta,
  PeriodTotals,
  ProductMatchConfidence,
  ProductPriceChange,
  RecentPurchase,
  RecurringCandidate,
  SpendDay,
} from './types'

// A recurring pattern needs at least this many hits before it's a pattern
// rather than a coincidence; two purchases only define a single interval.
const MIN_RECURRING_OCCURRENCES = 3
// Real prices vary — these are "roughly consistent", not "identical".
const AMOUNT_CV_THRESHOLD = 0.4
const INTERVAL_CV_THRESHOLD = 0.4
const MIN_PRICE_OBSERVATIONS = 2

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

function parseYMD(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month: month - 1, day }
}

// Local (no-timezone) Date math throughout: spent_at/observed_at/issued_at
// are date-only columns, so parsing them as calendar Y/M/D and never calling
// toISOString/getUTC* keeps arithmetic immune to UTC-offset drift.
function dateFromISO(iso: string): Date {
  const { year, month, day } = parseYMD(iso)
  return new Date(year, month, day)
}

function daysBetween(fromIso: string, toIso: string): number {
  const diffMs = dateFromISO(toIso).getTime() - dateFromISO(fromIso).getTime()
  return Math.round(diffMs / 86400000)
}

function dayCountInclusive(range: DateRange): number {
  return daysBetween(range.from, range.to) + 1
}

function filterByRange(expenses: Expense[], range: DateRange): Expense[] {
  return expenses.filter((e) => e.spent_at >= range.from && e.spent_at <= range.to)
}

function weekStartKey(iso: string): string {
  const d = dateFromISO(iso)
  const dow = d.getDay() // 0=Sun..6=Sat
  const diffToMonday = (dow === 0 ? -6 : 1) - dow
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday)
  return ymd(monday.getFullYear(), monday.getMonth(), monday.getDate())
}

function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length
}

function stdev(values: number[], avg: number): number {
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/** Calendar month (1st through last day) containing `date`. */
export function monthRangeFor(date: Date): DateRange {
  const year = date.getFullYear()
  const month = date.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return { from: ymd(year, month, 1), to: ymd(year, month, lastDay) }
}

export function previousMonthRangeFor(date: Date): DateRange {
  return monthRangeFor(new Date(date.getFullYear(), date.getMonth() - 1, 1))
}

/** Monday-start calendar week containing `date`. */
export function weekRangeFor(date: Date): DateRange {
  const dow = date.getDay()
  const diffToMonday = (dow === 0 ? -6 : 1) - dow
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return {
    from: ymd(monday.getFullYear(), monday.getMonth(), monday.getDate()),
    to: ymd(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()),
  }
}

export function previousWeekRangeFor(date: Date): DateRange {
  const dow = date.getDay()
  const diffToMonday = (dow === 0 ? -6 : 1) - dow
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday)
  return weekRangeFor(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7))
}

export function computeTotals(expenses: Expense[], range: DateRange): AnalyticsResult<PeriodTotals> {
  const rows = filterByRange(expenses, range)

  const dailyMap = new Map<string, number>()
  const weeklyMap = new Map<string, number>()
  const monthlyMap = new Map<string, number>()
  let totalSpend = 0

  for (const e of rows) {
    const amount = Number(e.amount)
    totalSpend += amount
    dailyMap.set(e.spent_at, (dailyMap.get(e.spent_at) ?? 0) + amount)
    const week = weekStartKey(e.spent_at)
    weeklyMap.set(week, (weeklyMap.get(week) ?? 0) + amount)
    const month = monthKey(e.spent_at)
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + amount)
  }

  const daily = Array.from(dailyMap, ([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date))
  const weekly = Array.from(weeklyMap, ([weekStart, total]) => ({ weekStart, total })).sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart),
  )
  const monthly = Array.from(monthlyMap, ([month, total]) => ({ month, total })).sort((a, b) => a.month.localeCompare(b.month))

  const dayCount = dayCountInclusive(range)
  const avgDailySpend = dayCount > 0 ? totalSpend / dayCount : 0

  return { status: 'ok', range, totalSpend, daily, weekly, monthly, avgDailySpend }
}

export function computeHighLowSpendDays(expenses: Expense[], range: DateRange): AnalyticsResult<HighLowSpendDays> {
  const rows = filterByRange(expenses, range)
  if (rows.length === 0) return { status: 'insufficient_data', reason: 'no expenses recorded in range' }

  const dailyMap = new Map<string, number>()
  for (const e of rows) {
    dailyMap.set(e.spent_at, (dailyMap.get(e.spent_at) ?? 0) + Number(e.amount))
  }

  const entries: SpendDay[] = Array.from(dailyMap, ([date, total]) => ({ date, total }))
  let highest = entries[0]
  let lowest = entries[0]
  for (const entry of entries) {
    if (entry.total > highest.total) highest = entry
    if (entry.total < lowest.total) lowest = entry
  }

  return { status: 'ok', highest, lowest }
}

export function computeCategoryRollups(
  expenses: Expense[],
  categories: ExpenseCategory[],
  range: DateRange,
): AnalyticsResult<{ rollups: CategoryRollup[] }> {
  const rows = filterByRange(expenses, range)
  if (rows.length === 0) return { status: 'insufficient_data', reason: 'no expenses recorded in range' }

  const totalSpend = rows.reduce((s, e) => s + Number(e.amount), 0)
  if (totalSpend === 0) {
    return { status: 'insufficient_data', reason: 'total spend in range is zero; percentage share is undefined' }
  }

  // Every expense uncategorised is not a finding — it means categorisation has
  // never happened. "100% Uncategorized" dresses an absence up as a result.
  if (rows.every((e) => e.category_id === null)) {
    return { status: 'insufficient_data', reason: 'no expense in range has been categorised yet' }
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const byCategory = new Map<string, { total: number; count: number }>()
  for (const e of rows) {
    const key = e.category_id ?? 'uncategorized'
    const bucket = byCategory.get(key) ?? { total: 0, count: 0 }
    bucket.total += Number(e.amount)
    bucket.count += 1
    byCategory.set(key, bucket)
  }

  const rollups: CategoryRollup[] = Array.from(byCategory, ([key, { total, count }]) => ({
    categoryId: key === 'uncategorized' ? null : key,
    categoryName: key === 'uncategorized' ? 'Uncategorized' : (categoryById.get(key)?.name ?? 'Unknown'),
    total,
    percentage: (total / totalSpend) * 100,
    count,
  })).sort((a, b) => b.total - a.total)

  return { status: 'ok', rollups }
}

export function computeMerchantRollups(
  expenses: Expense[],
  receipts: Receipt[],
  merchants: Merchant[],
  range: DateRange,
): AnalyticsResult<{ rollups: MerchantRollup[] }> {
  const rows = filterByRange(expenses, range)
  if (rows.length === 0) return { status: 'insufficient_data', reason: 'no expenses recorded in range' }

  const totalSpend = rows.reduce((s, e) => s + Number(e.amount), 0)
  if (totalSpend === 0) {
    return { status: 'insufficient_data', reason: 'total spend in range is zero; percentage share is undefined' }
  }

  const merchantIdByExpenseId = new Map<string, string>()
  for (const r of receipts) {
    if (r.merchant_id) merchantIdByExpenseId.set(r.expense_id, r.merchant_id)
  }
  const merchantById = new Map(merchants.map((m) => [m.id, m]))

  const byMerchant = new Map<string, { total: number; count: number }>()
  for (const e of rows) {
    const merchantId = merchantIdByExpenseId.get(e.id)
    if (!merchantId) continue
    const bucket = byMerchant.get(merchantId) ?? { total: 0, count: 0 }
    bucket.total += Number(e.amount)
    bucket.count += 1
    byMerchant.set(merchantId, bucket)
  }

  const rollups: MerchantRollup[] = Array.from(byMerchant, ([merchantId, { total, count }]) => ({
    merchantId,
    merchantName: merchantById.get(merchantId)?.name ?? 'Unknown',
    total,
    percentage: (total / totalSpend) * 100,
    count,
  })).sort((a, b) => b.total - a.total)

  return { status: 'ok', rollups }
}

function computePeriodDelta(
  expenses: Expense[],
  currentRange: DateRange,
  previousRange: DateRange,
  insufficientReason: string,
): AnalyticsResult<PeriodDelta> {
  if (expenses.length === 0) return { status: 'insufficient_data', reason: 'no expenses recorded' }

  const earliest = expenses.reduce((min, e) => (e.spent_at < min ? e.spent_at : min), expenses[0].spent_at)
  if (earliest > previousRange.from) {
    return { status: 'insufficient_data', reason: insufficientReason }
  }

  const currentTotal = filterByRange(expenses, currentRange).reduce((s, e) => s + Number(e.amount), 0)
  const previousTotal = filterByRange(expenses, previousRange).reduce((s, e) => s + Number(e.amount), 0)
  const absoluteChange = currentTotal - previousTotal
  const percentageChange = previousTotal === 0 ? null : (absoluteChange / previousTotal) * 100

  return { status: 'ok', currentRange, previousRange, currentTotal, previousTotal, absoluteChange, percentageChange }
}

export function computeMonthOverMonthDelta(expenses: Expense[], referenceDate: Date = new Date()): AnalyticsResult<PeriodDelta> {
  return computePeriodDelta(
    expenses,
    monthRangeFor(referenceDate),
    previousMonthRangeFor(referenceDate),
    'history does not reach back to the prior month; a zero total there would be indistinguishable from untracked spend',
  )
}

export function computeWeekOverWeekDelta(expenses: Expense[], referenceDate: Date = new Date()): AnalyticsResult<PeriodDelta> {
  return computePeriodDelta(
    expenses,
    weekRangeFor(referenceDate),
    previousWeekRangeFor(referenceDate),
    'history does not reach back to the prior week; a zero total there would be indistinguishable from untracked spend',
  )
}

export function computeRecurringCandidates(
  expenses: Expense[],
  receipts: Receipt[],
  merchants: Merchant[],
): AnalyticsResult<{ candidates: RecurringCandidate[] }> {
  const merchantReceipts = receipts.filter((r) => r.merchant_id)
  if (merchantReceipts.length < MIN_RECURRING_OCCURRENCES) {
    return { status: 'insufficient_data', reason: `fewer than ${MIN_RECURRING_OCCURRENCES} merchant-linked receipts on record` }
  }

  const expenseById = new Map(expenses.map((e) => [e.id, e]))
  const merchantById = new Map(merchants.map((m) => [m.id, m]))

  const byMerchant = new Map<string, { date: string; amount: number }[]>()
  for (const r of merchantReceipts) {
    const expense = expenseById.get(r.expense_id)
    if (!expense) continue
    const merchantId = r.merchant_id as string
    const list = byMerchant.get(merchantId) ?? []
    list.push({ date: expense.spent_at, amount: Number(expense.amount) })
    byMerchant.set(merchantId, list)
  }

  const candidates: RecurringCandidate[] = []
  for (const [merchantId, occurrences] of byMerchant) {
    if (occurrences.length < MIN_RECURRING_OCCURRENCES) continue
    occurrences.sort((a, b) => a.date.localeCompare(b.date))

    const intervals: number[] = []
    for (let i = 1; i < occurrences.length; i++) {
      intervals.push(daysBetween(occurrences[i - 1].date, occurrences[i].date))
    }

    const amounts = occurrences.map((o) => o.amount)
    const amountMean = mean(amounts)
    const amountCV = amountMean === 0 ? Infinity : stdev(amounts, amountMean) / amountMean

    const intervalMean = mean(intervals)
    const intervalCV = intervalMean === 0 ? Infinity : stdev(intervals, intervalMean) / intervalMean

    if (amountCV > AMOUNT_CV_THRESHOLD || intervalCV > INTERVAL_CV_THRESHOLD) continue

    candidates.push({
      merchantId,
      merchantName: merchantById.get(merchantId)?.name ?? 'Unknown',
      occurrences: occurrences.length,
      avgIntervalDays: Math.round(intervalMean),
      avgAmount: amountMean,
      amountVariance: amountCV,
      lastSeen: occurrences[occurrences.length - 1].date,
      confidence: 'likely_recurring',
    })
  }

  candidates.sort((a, b) => b.occurrences - a.occurrences)
  return { status: 'ok', candidates }
}

/* ─────────────────────── Item level ───────────────────────
 * `receipt_items` carries no date of its own. Every function below resolves
 * one through the parent receipt's `issued_at`, falling back to the linked
 * expense's `spent_at`. An item whose receipt resolves to neither is dropped
 * rather than dated to today — a purchase with no knowable date must not
 * silently land in the current month.
 */

interface EnrichedItem {
  item: ReceiptItem
  date: string | null
  merchantName: string | null
  expenseId: string | null
}

function enrichItems(
  items: ReceiptItem[],
  receipts: Receipt[],
  expenses: Expense[],
  merchants: Merchant[],
): EnrichedItem[] {
  const receiptById = new Map(receipts.map((r) => [r.id, r]))
  const expenseById = new Map(expenses.map((e) => [e.id, e]))
  const merchantById = new Map(merchants.map((m) => [m.id, m]))

  return items.map((item) => {
    const receipt = receiptById.get(item.receipt_id)
    const expense = receipt ? expenseById.get(receipt.expense_id) : undefined
    return {
      item,
      date: receipt?.issued_at ?? expense?.spent_at ?? null,
      merchantName: receipt?.merchant_id ? (merchantById.get(receipt.merchant_id)?.name ?? null) : null,
      expenseId: receipt?.expense_id ?? null,
    }
  })
}

function inRange(date: string | null, range: DateRange): boolean {
  return date !== null && date >= range.from && date <= range.to
}

/** Line total, falling back to quantity × unit price when the receipt stated
 *  only the parts. Null when neither is knowable — never coerced to 0. */
function itemAmount(item: ReceiptItem): number | null {
  if (item.line_total !== null) return Number(item.line_total)
  if (item.unit_price !== null) return Number(item.unit_price) * Number(item.quantity ?? 1)
  return null
}

export function computeItemRollups(
  items: ReceiptItem[],
  receipts: Receipt[],
  expenses: Expense[],
  merchants: Merchant[],
  range: DateRange,
): AnalyticsResult<{ rollups: ItemRollup[] }> {
  const rows = enrichItems(items, receipts, expenses, merchants).filter((r) => inRange(r.date, range))
  if (rows.length === 0) return { status: 'insufficient_data', reason: 'no itemised receipts in range' }

  const byLabel = new Map<string, { total: number; count: number }>()
  let itemisedTotal = 0
  for (const row of rows) {
    const amount = itemAmount(row.item)
    if (amount === null) continue
    itemisedTotal += amount
    const key = row.item.label
    const bucket = byLabel.get(key) ?? { total: 0, count: 0 }
    bucket.total += amount
    bucket.count += 1
    byLabel.set(key, bucket)
  }

  if (itemisedTotal === 0) {
    return { status: 'insufficient_data', reason: 'itemised spend in range is zero; percentage share is undefined' }
  }

  const rollups: ItemRollup[] = Array.from(byLabel, ([label, { total, count }]) => ({
    label,
    total,
    percentage: (total / itemisedTotal) * 100,
    count,
  })).sort((a, b) => b.total - a.total)

  return { status: 'ok', rollups }
}

export function computeItemCategoryRollups(
  items: ReceiptItem[],
  receipts: Receipt[],
  expenses: Expense[],
  merchants: Merchant[],
  categories: ExpenseCategory[],
  range: DateRange,
): AnalyticsResult<{ rollups: ItemCategoryRollup[] }> {
  const rows = enrichItems(items, receipts, expenses, merchants).filter((r) => inRange(r.date, range))
  if (rows.length === 0) return { status: 'insufficient_data', reason: 'no itemised receipts in range' }

  // Every item uncategorised is not a finding — it means categorisation has
  // never run. Reporting "100% Uncategorized" would dress that up as a result.
  if (rows.every((r) => r.item.category_id === null)) {
    return { status: 'insufficient_data', reason: 'no line item in range has been categorised yet' }
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const byCategory = new Map<string, { total: number; count: number }>()
  let total = 0
  for (const row of rows) {
    const amount = itemAmount(row.item)
    if (amount === null) continue
    total += amount
    const key = row.item.category_id ?? 'uncategorized'
    const bucket = byCategory.get(key) ?? { total: 0, count: 0 }
    bucket.total += amount
    bucket.count += 1
    byCategory.set(key, bucket)
  }

  if (total === 0) {
    return { status: 'insufficient_data', reason: 'itemised spend in range is zero; percentage share is undefined' }
  }

  const rollups: ItemCategoryRollup[] = Array.from(byCategory, ([key, { total: t, count }]) => ({
    categoryId: key === 'uncategorized' ? null : key,
    categoryName: key === 'uncategorized' ? 'Uncategorized' : (categoryById.get(key)?.name ?? 'Unknown'),
    total: t,
    percentage: (t / total) * 100,
    count,
  })).sort((a, b) => b.total - a.total)

  return { status: 'ok', rollups }
}

/**
 * How much of the range's spend is itemised. Always `ok` when any expense
 * exists — this is a completeness measure, and "nothing is itemised" is a
 * meaningful, renderable answer rather than missing data.
 */
export function computeItemCoverage(
  items: ReceiptItem[],
  receipts: Receipt[],
  expenses: Expense[],
  merchants: Merchant[],
  range: DateRange,
): AnalyticsResult<ItemCoverage> {
  const expenseRows = filterByRange(expenses, range)
  if (expenseRows.length === 0) return { status: 'insufficient_data', reason: 'no expenses recorded in range' }

  const rows = enrichItems(items, receipts, expenses, merchants).filter((r) => inRange(r.date, range))
  const itemisedTotal = rows.reduce((s, r) => s + (itemAmount(r.item) ?? 0), 0)
  const expenseIds = new Set(expenseRows.map((e) => e.id))
  const receiptsInRange = receipts.filter((r) => expenseIds.has(r.expense_id))
  const receiptIdsWithItems = new Set(rows.map((r) => r.item.receipt_id))

  return {
    status: 'ok',
    itemisedTotal,
    expenseTotal: expenseRows.reduce((s, e) => s + Number(e.amount), 0),
    receiptsWithItems: receiptsInRange.filter((r) => receiptIdsWithItems.has(r.id)).length,
    receiptsTotal: receiptsInRange.length,
  }
}

export function computeRecentPurchases(
  items: ReceiptItem[],
  receipts: Receipt[],
  expenses: Expense[],
  merchants: Merchant[],
  categories: ExpenseCategory[],
  limit = 10,
): AnalyticsResult<{ purchases: RecentPurchase[] }> {
  const rows = enrichItems(items, receipts, expenses, merchants).filter((r) => r.date !== null)
  if (rows.length === 0) return { status: 'insufficient_data', reason: 'no itemised receipts recorded yet' }

  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const receiptById = new Map(receipts.map((r) => [r.id, r]))

  const purchases: RecentPurchase[] = rows
    .map((row) => ({
      id: row.item.id,
      label: row.item.label,
      merchantName: row.merchantName,
      categoryId: row.item.category_id,
      categoryName: row.item.category_id ? (categoryById.get(row.item.category_id)?.name ?? null) : null,
      lineTotal: itemAmount(row.item) ?? 0,
      currency: receiptById.get(row.item.receipt_id)?.currency ?? 'EGP',
      date: row.date as string,
      expenseId: row.expenseId,
    }))
    // Newest first; `position` breaks ties so a receipt's own lines keep the
    // order they were printed in rather than an arbitrary one.
    .sort((a, b) => b.date.localeCompare(a.date) || (a.label > b.label ? 1 : -1))
    .slice(0, limit)

  return { status: 'ok', purchases }
}

export function computeProductPriceChanges(
  observations: PriceObservation[],
  products: Product[],
): AnalyticsResult<{ changes: ProductPriceChange[] }> {
  const productById = new Map(products.map((p) => [p.id, p]))

  const byProduct = new Map<string, PriceObservation[]>()
  for (const obs of observations) {
    const list = byProduct.get(obs.product_id) ?? []
    list.push(obs)
    byProduct.set(obs.product_id, list)
  }

  const eligible = Array.from(byProduct.entries()).filter(([, obs]) => obs.length >= MIN_PRICE_OBSERVATIONS)
  if (eligible.length === 0) {
    return { status: 'insufficient_data', reason: `no product has ${MIN_PRICE_OBSERVATIONS} or more price observations` }
  }

  const changes: ProductPriceChange[] = eligible.map(([productId, obs]) => {
    const sorted = [...obs].sort((a, b) => a.observed_at.localeCompare(b.observed_at))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const firstPrice = first.normalized_unit_price ?? first.unit_price
    const lastPrice = last.normalized_unit_price ?? last.unit_price
    const product = productById.get(productId)
    // The DB's uniqueness key is (normalized_name, brand, size_value, size_unit) — trust
    // grouping by product_id, but flag as merely 'possible' when brand/size are missing,
    // since incomplete disambiguation could be collapsing two different real products.
    const matchConfidence: ProductMatchConfidence =
      product && product.brand && product.size_value !== null && product.size_unit ? 'exact' : 'possible'

    return {
      productId,
      productName: product?.name ?? 'Unknown product',
      brand: product?.brand ?? null,
      sizeValue: product?.size_value ?? null,
      sizeUnit: product?.size_unit ?? null,
      matchConfidence,
      firstPrice,
      lastPrice,
      absoluteChange: lastPrice - firstPrice,
      percentageChange: firstPrice === 0 ? null : ((lastPrice - firstPrice) / firstPrice) * 100,
      observationCount: sorted.length,
      usesNormalizedPrice: first.normalized_unit_price !== null && last.normalized_unit_price !== null,
    }
  })

  changes.sort((a, b) => Math.abs(b.percentageChange ?? 0) - Math.abs(a.percentageChange ?? 0))
  return { status: 'ok', changes }
}
