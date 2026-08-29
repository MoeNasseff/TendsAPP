/**
 * Every metric is a pure function of rows and returns this shape instead of
 * silently defaulting to zero. `insufficient_data` is not an error — it is
 * the correct answer when the account's history is too short to support the
 * claim being asked for (see compute.ts for the specific gates).
 */
export type AnalyticsResult<T> = ({ status: 'ok' } & T) | { status: 'insufficient_data'; reason: string }

export interface DateRange {
  /** ISO date (YYYY-MM-DD), inclusive. */
  from: string
  /** ISO date (YYYY-MM-DD), inclusive. */
  to: string
}

export interface DayTotal {
  date: string
  total: number
}

export interface WeekTotal {
  /** ISO date of the Monday that starts the week. */
  weekStart: string
  total: number
}

export interface MonthTotal {
  /** 'YYYY-MM' */
  month: string
  total: number
}

export interface PeriodTotals {
  range: DateRange
  totalSpend: number
  /** Sparse — only days with at least one expense. */
  daily: DayTotal[]
  /** Sparse — only weeks with at least one expense. */
  weekly: WeekTotal[]
  /** Sparse — only months with at least one expense. */
  monthly: MonthTotal[]
  /** totalSpend divided by calendar days elapsed in `range` (inclusive). */
  avgDailySpend: number
}

export interface SpendDay {
  date: string
  total: number
}

export interface HighLowSpendDays {
  highest: SpendDay
  lowest: SpendDay
}

export interface CategoryRollup {
  categoryId: string | null
  categoryName: string
  total: number
  /** Share of the range's total spend, 0-100. */
  percentage: number
  count: number
}

export interface MerchantRollup {
  merchantId: string
  merchantName: string
  total: number
  /** Share of the range's total spend (all expenses, not just merchant-linked ones), 0-100. */
  percentage: number
  count: number
}

export interface PeriodDelta {
  currentRange: DateRange
  previousRange: DateRange
  currentTotal: number
  previousTotal: number
  absoluteChange: number
  /** null when previousTotal is 0 — a percentage change from zero is undefined, not infinite. */
  percentageChange: number | null
}

export type RecurringConfidence = 'likely_recurring'

export interface RecurringCandidate {
  merchantId: string
  merchantName: string
  occurrences: number
  avgIntervalDays: number
  avgAmount: number
  /** Coefficient of variation (stdev / mean) of the amounts, as a ratio. */
  amountVariance: number
  lastSeen: string
  confidence: RecurringConfidence
}

/**
 * 'exact' when the product row carries brand + size_value + size_unit (the
 * full DB uniqueness key). 'possible' when any of those is missing — the
 * normalized_name match could then be collapsing two genuinely different
 * products that were never disambiguated at scan time.
 */
export type ProductMatchConfidence = 'exact' | 'possible'

export interface ItemRollup {
  /** `receipt_items.label` — the line as the receipt worded it. */
  label: string
  total: number
  /** Share of the range's *itemised* spend, 0-100 — not of total spend. */
  percentage: number
  count: number
}

export interface ItemCategoryRollup {
  categoryId: string | null
  categoryName: string
  total: number
  percentage: number
  count: number
}

/**
 * How much of a range's spend is actually broken down into line items.
 * Item totals are almost always lower than expense totals — a receipt saved
 * without lines still has an expense. Callers must render this rather than
 * letting the two totals sit side by side implying they should reconcile.
 */
export interface ItemCoverage {
  itemisedTotal: number
  expenseTotal: number
  receiptsWithItems: number
  receiptsTotal: number
}

export interface RecentPurchase {
  id: string
  label: string
  merchantName: string | null
  categoryId: string | null
  categoryName: string | null
  lineTotal: number
  currency: string
  /** From the parent receipt's issued_at, else the linked expense's spent_at. */
  date: string
  expenseId: string | null
}

export interface ProductPriceChange {
  productId: string
  productName: string
  brand: string | null
  sizeValue: number | null
  sizeUnit: string | null
  matchConfidence: ProductMatchConfidence
  firstPrice: number
  lastPrice: number
  absoluteChange: number
  percentageChange: number | null
  observationCount: number
  /** True if both the first and last price used were normalized_unit_price rather than raw unit_price. */
  usesNormalizedPrice: boolean
}
