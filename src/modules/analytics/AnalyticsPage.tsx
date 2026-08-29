import { useMemo, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Repeat, Store, Tag, TrendingDown, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { PageSkeleton } from '../../components/PageSkeleton'
import { PrivacyToggle } from '../../components/PrivacyToggle'
import { SensitiveValue } from '../../components/SensitiveValue'
import { axisProps, CHART_SERIES, gridProps, tooltipProps } from '../../lib/chartTheme'
import { formatCurrency, formatDate } from '../../lib/format'
import { DUR, EASE } from '../../lib/motion'
import { BillsStrip } from '../bills/BillsStrip'
import { InstallmentCards } from '../installments/InstallmentCards'
import { useInstallments } from '../installments/useInstallments'
import { InsightCards } from './InsightCards'
import { RecentPurchases } from './RecentPurchases'
import { useAnalytics } from './useAnalytics'
import type { ItemRollup, MerchantRollup, PeriodDelta, ProductPriceChange, RecurringCandidate } from './types'

/**
 * Analytics dashboard. Layout, card shells, metric cards and the chart tab
 * group are cloned from TailAdmin's analytics demo, distilled in
 * `assets/re-desgin/tailadmin-pro-reference/analytics.html`; the purchases
 * table is cloned from its ecommerce demo. Class strings are the source's.
 *
 * Divergences from the reference, all deliberate:
 *  - Charts are recharts, not ApexCharts. The demo's chart *shapes* are
 *    reproduced; ApexCharts is not a dependency and is not becoming one.
 *  - "Sessions By Device", "Top Pages" and the "Customers Demographic" world
 *    map are dropped. Tend has no device, page or geographic data, and the
 *    honest options were to omit them or to invent data. Their layout slots
 *    are reused for merchant, item and installment cards.
 *  - Every figure here comes from a compute function. This file contains no
 *    arithmetic beyond formatting and chart-series shaping.
 */

const CARD = 'rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6'
const CARD_FLUSH =
  'rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6'
const CARD_TITLE = 'mb-1 text-lg font-semibold text-gray-800 dark:text-white/90'
const CARD_SUB = 'block text-gray-500 text-theme-sm dark:text-gray-400'

function daysInMonth(rangeFromISO: string): number {
  const [year, month] = rangeFromISO.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

/** Staggered cell. Mirrors StatGrid's 40ms cascade and no-ops entirely under
 *  prefers-reduced-motion, as every other animated surface in the app does. */
function Cell({ className, children, index = 0 }: { className: string; children: ReactNode; index?: number }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE, delay: Math.min(index * 0.04, 0.24) }}
    >
      {children}
    </motion.div>
  )
}

/** TailAdmin's analytics metric card, class for class. */
function MetricCard({
  label,
  value,
  delta,
  sensitive = false,
}: {
  label: string
  value: string
  delta?: PeriodDelta | null
  sensitive?: boolean
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-gray-500 text-theme-sm dark:text-gray-400">{label}</p>
      {/* flex-wrap, not truncate: at the demo's widths this stays side by side
          as the source has it, and where the card is narrower the delta drops
          to its own line. A clipped money figure is never acceptable. */}
      <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1 mt-3">
        <div>
          <h4 className="whitespace-nowrap text-2xl font-bold text-gray-800 dark:text-white/90">
            {sensitive ? <SensitiveValue>{value}</SensitiveValue> : value}
          </h4>
        </div>
        {delta !== undefined && (
          <div className="flex shrink-0 items-center gap-1">
            {delta === null ? (
              // Short, because this sits beside the figure. The full phrasing
              // lives on the cards that have room for it.
              <span
                className="whitespace-nowrap text-gray-400 text-theme-xs dark:text-gray-500"
                title="Not enough history to compare against the previous period"
              >
                No comparison yet
              </span>
            ) : (
              <>
                <DeltaBadge delta={delta} />
                <span className="whitespace-nowrap text-gray-500 text-theme-xs dark:text-gray-400">Vs last</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Spending less is the good direction, so a fall is `success` and a rise is
 *  `warning` — the same orientation MeasurementHistory's TrendBadge uses. */
function DeltaBadge({ delta }: { delta: PeriodDelta }) {
  const pct = delta.percentageChange
  const rising = pct !== null ? pct > 0 : delta.absoluteChange > 0
  const flat = pct !== null && Math.abs(pct) < 0.5
  const Icon = rising ? TrendingUp : TrendingDown
  const text =
    pct === null
      ? `${delta.absoluteChange >= 0 ? '+' : ''}${formatCurrency(delta.absoluteChange)}`
      : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`

  return (
    <Badge color={flat ? 'light' : rising ? 'warning' : 'success'} size="md">
      {!flat && <Icon className="h-3 w-3" aria-hidden="true" />}
      <span className="text-xs">{text}</span>
    </Badge>
  )
}

/** The demo's segmented control. Selected pill carries shadow + raised bg. */
function ChartTab<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${
            option === value
              ? 'shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

/** The demo's Customers Demographic bar, reused for any share-of-total row. */
function ShareRow({
  title,
  subtitle,
  percentage,
  trailing,
}: {
  title: string
  subtitle: ReactNode
  percentage: number
  trailing?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">{title}</p>
        <span className="block truncate text-gray-500 text-theme-xs dark:text-gray-400">{subtitle}</span>
      </div>
      <div className="flex w-full max-w-[140px] shrink-0 items-center gap-3">
        {trailing ?? (
          <>
            <div className="relative block h-2 w-full max-w-[100px] rounded-sm bg-gray-200 dark:bg-gray-800">
              <div
                className="absolute left-0 top-0 flex h-full items-center justify-center rounded-sm bg-brand-500 text-xs font-medium text-white"
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>
            <p className="w-10 shrink-0 text-right font-medium text-gray-800 text-theme-sm dark:text-white/90">
              {percentage.toFixed(0)}%
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function MerchantRow({ merchant }: { merchant: MerchantRollup }) {
  return (
    <ShareRow
      title={merchant.merchantName}
      subtitle={
        <>
          {merchant.count} transaction{merchant.count === 1 ? '' : 's'} ·{' '}
          <SensitiveValue>{formatCurrency(merchant.total)}</SensitiveValue>
        </>
      }
      percentage={merchant.percentage}
    />
  )
}

function ItemRow({ item }: { item: ItemRollup }) {
  return (
    <ShareRow
      title={item.label}
      subtitle={
        <>
          {item.count} line{item.count === 1 ? '' : 's'} · <SensitiveValue>{formatCurrency(item.total)}</SensitiveValue>
        </>
      }
      percentage={item.percentage}
    />
  )
}

function RecurringRow({ candidate }: { candidate: RecurringCandidate }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">{candidate.merchantName}</p>
        <span className="block truncate text-gray-500 text-theme-xs dark:text-gray-400">
          {candidate.occurrences} times · every ~{candidate.avgIntervalDays}d · avg{' '}
          <SensitiveValue>{formatCurrency(candidate.avgAmount)}</SensitiveValue> · last{' '}
          {formatDate(candidate.lastSeen)}
        </span>
      </div>
      <Badge color="success" size="sm">
        Likely recurring
      </Badge>
    </div>
  )
}

function PriceChangeRow({ change }: { change: ProductPriceChange }) {
  const pct = change.percentageChange
  const rising = pct !== null && pct > 0
  const sizeLabel = change.sizeValue != null && change.sizeUnit ? `${change.sizeValue}${change.sizeUnit}` : null
  const meta = [change.brand, sizeLabel, `${change.observationCount} prices recorded`].filter(Boolean).join(' · ')

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">
          {change.productName}
          {change.matchConfidence === 'possible' && (
            <span className="ml-1.5 font-normal text-theme-xs text-gray-400 dark:text-gray-500">(possible match)</span>
          )}
        </p>
        <span className="block truncate text-gray-500 text-theme-xs dark:text-gray-400">
          {formatCurrency(change.firstPrice)} → {formatCurrency(change.lastPrice)}
          {meta ? ` · ${meta}` : ''}
        </span>
      </div>
      <Badge color={pct === null ? 'light' : rising ? 'warning' : 'success'} size="sm">
        {pct === null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}
      </Badge>
    </div>
  )
}

const SPEND_VIEWS = ['Daily', 'Vs last month'] as const
type SpendView = (typeof SPEND_VIEWS)[number]

export function AnalyticsPage() {
  const {
    loading,
    totals,
    categoryRollups,
    merchantRollups,
    monthOverMonth,
    weekOverWeek,
    recurringCandidates,
    productPriceChanges,
    itemRollups,
    itemCoverage,
    recentPurchases,
    computeForRange,
  } = useAnalytics()
  const { plansByExpenseId } = useInstallments()
  const [spendView, setSpendView] = useState<SpendView>('Daily')

  const dailySeries = useMemo(() => {
    if (totals.status !== 'ok') return []
    const byDate = new Map(totals.daily.map((d) => [d.date, d.total]))
    const prefix = totals.range.from.slice(0, 7)
    return Array.from({ length: daysInMonth(totals.range.from) }, (_, i) => {
      const day = i + 1
      return { day, total: byDate.get(`${prefix}-${String(day).padStart(2, '0')}`) ?? 0 }
    })
  }, [totals])

  const hasDailySpend = dailySeries.some((d) => d.total > 0)

  const comparisonSeries = useMemo(() => {
    if (monthOverMonth.status !== 'ok' || totals.status !== 'ok') return null
    const previousTotals = computeForRange(monthOverMonth.previousRange).totals
    if (previousTotals.status !== 'ok') return null

    const currentByDay = new Map(totals.daily.map((d) => [Number(d.date.slice(-2)), d.total]))
    const previousByDay = new Map(previousTotals.daily.map((d) => [Number(d.date.slice(-2)), d.total]))
    const currentDays = daysInMonth(totals.range.from)
    const previousDays = daysInMonth(monthOverMonth.previousRange.from)

    return Array.from({ length: Math.max(currentDays, previousDays) }, (_, i) => {
      const day = i + 1
      return {
        day,
        current: day <= currentDays ? (currentByDay.get(day) ?? 0) : null,
        previous: day <= previousDays ? (previousByDay.get(day) ?? 0) : null,
      }
    })
  }, [monthOverMonth, totals, computeForRange])

  const topCategory =
    categoryRollups.status === 'ok' && categoryRollups.rollups.length > 0 ? categoryRollups.rollups[0] : null

  if (loading) return <PageSkeleton />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="THE NUMBERS" title="Analytics" titleAdornment={<PrivacyToggle />} />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* ── Metric row ─────────────────────────────────────────── */}
        <Cell className="col-span-12" index={0}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
            <MetricCard
              label="This month"
              value={totals.status === 'ok' ? formatCurrency(totals.totalSpend) : 'Not enough data yet'}
              sensitive={totals.status === 'ok'}
              delta={monthOverMonth.status === 'ok' ? monthOverMonth : null}
            />
            <MetricCard
              label="Avg / day"
              value={totals.status === 'ok' ? formatCurrency(totals.avgDailySpend) : 'Not enough data yet'}
              sensitive={totals.status === 'ok'}
            />
            <MetricCard
              label="This week"
              value={
                weekOverWeek.status === 'ok' ? formatCurrency(weekOverWeek.currentTotal) : 'Not enough data yet'
              }
              sensitive={weekOverWeek.status === 'ok'}
              delta={weekOverWeek.status === 'ok' ? weekOverWeek : null}
            />
            <MetricCard
              label="Itemised"
              value={
                itemCoverage.status === 'ok'
                  ? `${itemCoverage.receiptsWithItems}/${itemCoverage.receiptsTotal} receipts`
                  : 'Not enough data yet'
              }
            />
          </div>
        </Cell>

        {/* ── Insights (absent entirely when no AI provider) ──────── */}
        <Cell className="col-span-12" index={1}>
          <InsightCards
            monthOverMonth={monthOverMonth}
            categoryRollups={categoryRollups}
            merchantRollups={merchantRollups}
            recurringCandidates={recurringCandidates}
            productPriceChanges={productPriceChanges}
          />
        </Cell>

        {/* ── Spending chart, tabbed ─────────────────────────────── */}
        <Cell className="col-span-12" index={2}>
          <div className={CARD_FLUSH}>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <h3 className={CARD_TITLE}>Spending</h3>
                <span className={CARD_SUB}>
                  {spendView === 'Daily' ? 'Every day of the current month' : 'This month against the last'}
                </span>
              </div>
              <ChartTab options={SPEND_VIEWS} value={spendView} onChange={setSpendView} />
            </div>

            <div className="mt-6 pb-5">
              {spendView === 'Daily' ? (
                hasDailySpend ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailySeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid {...gridProps()} />
                        <XAxis dataKey="day" {...axisProps()} interval={2} />
                        <YAxis {...axisProps()} width={48} />
                        <Tooltip
                          formatter={(v) => formatCurrency(Number(v))}
                          labelFormatter={(d) => `Day ${d}`}
                          {...tooltipProps()}
                        />
                        <Bar dataKey="total" fill={CHART_SERIES[0]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState icon={Tag} title="No spend recorded yet this month" />
                )
              ) : comparisonSeries ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={comparisonSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid {...gridProps()} />
                      <XAxis dataKey="day" {...axisProps()} interval={2} />
                      <YAxis {...axisProps()} width={48} />
                      <Tooltip
                        formatter={(v) => (v === null ? '—' : formatCurrency(Number(v)))}
                        labelFormatter={(d) => `Day ${d}`}
                        {...tooltipProps()}
                      />
                      <Area
                        type="monotone"
                        dataKey="current"
                        name="This month"
                        stroke={CHART_SERIES[0]}
                        fill={CHART_SERIES[0]}
                        fillOpacity={0.18}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="previous"
                        name="Last month"
                        stroke={CHART_SERIES[1]}
                        fill={CHART_SERIES[1]}
                        fillOpacity={0.12}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  icon={Tag}
                  title="Not enough data yet"
                  description="Check back once a full previous month has been tracked."
                />
              )}
            </div>
          </div>
        </Cell>

        {/* ── Where the money went ───────────────────────────────── */}
        <Cell className="col-span-12 xl:col-span-7" index={3}>
          <div className={CARD}>
            <div className="mb-5">
              <h3 className={CARD_TITLE}>Where you spend</h3>
              <span className={CARD_SUB}>Share of this month by merchant</span>
            </div>
            {merchantRollups.status === 'ok' && merchantRollups.rollups.length > 0 ? (
              <div className="flex flex-col gap-5">
                {merchantRollups.rollups.slice(0, 5).map((m) => (
                  <MerchantRow key={m.merchantId} merchant={m} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Store}
                title="No merchant-linked spending yet"
                description="Scan a receipt to start tracking merchants."
              />
            )}
          </div>
        </Cell>

        <Cell className="col-span-12 xl:col-span-5" index={4}>
          <div className={CARD}>
            <div className="mb-5">
              <h3 className={CARD_TITLE}>Top category</h3>
              <span className={CARD_SUB}>Largest share of this month</span>
            </div>
            {topCategory ? (
              <div className="relative mx-auto h-56 w-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="72%"
                    outerRadius="100%"
                    data={[{ value: topCategory.percentage, fill: CHART_SERIES[0] }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
                    <RadialBar dataKey="value" background={{ fill: gridProps().stroke }} cornerRadius={999} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <span className="text-stat font-semibold text-gray-900 dark:text-white">
                    {Math.round(topCategory.percentage)}%
                  </span>
                  <span className="max-w-[80%] truncate text-theme-xs text-gray-500 dark:text-gray-400">
                    {topCategory.categoryName}
                  </span>
                </div>
              </div>
            ) : (
              <EmptyState icon={Tag} title="No categorized spend this month yet" />
            )}
          </div>
        </Cell>

        {/* ── Installments and recurring commitments ─────────────── */}
        <InstallmentCards />

        <Cell className="col-span-12" index={5}>
          <BillsStrip />
        </Cell>

        {/* ── Item-level spending ────────────────────────────────── */}
        <Cell className="col-span-12 xl:col-span-7" index={5}>
          <div className={CARD}>
            <div className="mb-5">
              <h3 className={CARD_TITLE}>What you bought</h3>
              <span className={CARD_SUB}>
                {itemCoverage.status === 'ok' ? (
                  <>
                    <SensitiveValue>{formatCurrency(itemCoverage.itemisedTotal)}</SensitiveValue> itemised of{' '}
                    <SensitiveValue>{formatCurrency(itemCoverage.expenseTotal)}</SensitiveValue> spent — the rest is on
                    receipts with no line items
                  </>
                ) : (
                  'Line items from scanned receipts'
                )}
              </span>
            </div>
            {itemRollups.status === 'ok' && itemRollups.rollups.length > 0 ? (
              <div className="flex flex-col gap-5">
                {itemRollups.rollups.slice(0, 6).map((item) => (
                  <ItemRow key={item.label} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Tag}
                title="No itemised receipts yet"
                description="Scan a receipt to break spending down by item."
              />
            )}
          </div>
        </Cell>

        <Cell className="col-span-12 xl:col-span-5" index={6}>
          <div className={CARD}>
            <div className="mb-5">
              <h3 className={CARD_TITLE}>Recurring spend</h3>
              <span className={CARD_SUB}>Merchants that look like a pattern</span>
            </div>
            {recurringCandidates.status === 'ok' && recurringCandidates.candidates.length > 0 ? (
              <div className="flex flex-col gap-5">
                {recurringCandidates.candidates.slice(0, 4).map((c) => (
                  <RecurringRow key={c.merchantId} candidate={c} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Repeat}
                title="No recurring pattern yet"
                description="Not enough repeat purchases yet to detect one."
              />
            )}
          </div>
        </Cell>

        {/* ── Recent purchases (ecommerce demo's table) ───────────── */}
        <Cell className="col-span-12" index={7}>
          <RecentPurchases purchases={recentPurchases} plansByExpenseId={plansByExpenseId} />
        </Cell>

        {/* ── Price changes ──────────────────────────────────────── */}
        <Cell className="col-span-12" index={8}>
          <div className={CARD}>
            <div className="mb-5">
              <h3 className={CARD_TITLE}>Price changes</h3>
              <span className={CARD_SUB}>Only what your own receipts recorded — no external price sources</span>
            </div>
            {productPriceChanges.status === 'ok' && productPriceChanges.changes.length > 0 ? (
              <div className="flex flex-col gap-5">
                {productPriceChanges.changes.slice(0, 5).map((c) => (
                  <PriceChangeRow key={c.productId} change={c} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Tag}
                title="No repeated price observations yet"
                description="Scan the same product twice to start tracking its price."
              />
            )}
          </div>
        </Cell>
      </div>
    </div>
  )
}
