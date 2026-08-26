import { useMemo } from 'react'
import { Calendar, Minus, Repeat, Store, Tag, TrendingDown, TrendingUp, Wallet, type LucideIcon } from 'lucide-react'
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
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { PageSkeleton } from '../../components/PageSkeleton'
import { PrivacyToggle } from '../../components/PrivacyToggle'
import { Section } from '../../components/Section'
import { SensitiveValue } from '../../components/SensitiveValue'
import { StatCard } from '../../components/StatCard'
import { StatGrid } from '../../components/StatGrid'
import { axisProps, CHART_SERIES, gridProps, tooltipProps } from '../../lib/chartTheme'
import { formatCurrency, formatDate } from '../../lib/format'
import { InsightCards } from './InsightCards'
import { useAnalytics } from './useAnalytics'
import type { MerchantRollup, PeriodDelta, ProductPriceChange, RecurringCandidate } from './types'

function daysInMonth(rangeFromISO: string): number {
  const [year, month] = rangeFromISO.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

/** Matches StatCard's own shape but carries a tone-coloured trend value —
 *  StatCard's `value` prop is plain text and can't express that. */
function DeltaCard({ label, icon: Icon, delta }: { label: string; icon: LucideIcon; delta: PeriodDelta | null }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-micro font-medium uppercase text-gray-500 dark:text-gray-400">{label}</span>
        <Icon className="h-3.5 w-3.5 shrink-0 text-brand-500 dark:text-brand-400" aria-hidden="true" />
      </div>
      {delta ? (
        <SensitiveValue>
          <DeltaValue delta={delta} />
        </SensitiveValue>
      ) : (
        <div className="truncate text-stat font-semibold text-gray-400 dark:text-gray-500">Not enough data yet</div>
      )}
    </Card>
  )
}

/** Spending less reads as good (success), spending more as a flag (warning) —
 *  same orientation MeasurementHistory's TrendBadge uses for "slimmer"/"larger". */
function DeltaValue({ delta }: { delta: PeriodDelta }) {
  const pct = delta.percentageChange
  const flat = pct !== null && Math.abs(pct) < 0.5
  const rising = pct !== null ? pct > 0 : delta.absoluteChange > 0
  const Icon = flat ? Minus : rising ? TrendingUp : TrendingDown
  const tone = flat
    ? 'text-gray-500 dark:text-gray-400'
    : rising
      ? 'text-warning-600 dark:text-warning-500'
      : 'text-success-600 dark:text-success-500'
  const text =
    pct === null
      ? `${delta.absoluteChange >= 0 ? '+' : ''}${formatCurrency(delta.absoluteChange)}`
      : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`

  return (
    <div className={`flex items-center gap-1.5 truncate text-stat font-semibold ${tone}`}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {text}
    </div>
  )
}

function MerchantRow({ merchant }: { merchant: MerchantRollup }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{merchant.merchantName}</p>
        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
          {merchant.count} transaction{merchant.count === 1 ? '' : 's'} · <SensitiveValue>{formatCurrency(merchant.total)}</SensitiveValue>
        </span>
      </div>
      <div className="flex w-full max-w-[140px] shrink-0 items-center gap-3">
        <div className="relative h-2 w-full max-w-[100px] rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-brand-500"
            style={{ width: `${Math.min(100, Math.max(0, merchant.percentage))}%` }}
          />
        </div>
        <p className="w-10 shrink-0 text-right text-sm font-medium text-gray-800 dark:text-white/90">
          {merchant.percentage.toFixed(0)}%
        </p>
      </div>
    </div>
  )
}

function RecurringRow({ candidate }: { candidate: RecurringCandidate }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{candidate.merchantName}</p>
        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
          {candidate.occurrences} times · every ~{candidate.avgIntervalDays}d · avg{' '}
          <SensitiveValue>{formatCurrency(candidate.avgAmount)}</SensitiveValue> · last {formatDate(candidate.lastSeen)}
        </span>
      </div>
      <span className="shrink-0 rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
        Likely recurring
      </span>
    </div>
  )
}

function PriceChangeRow({ change }: { change: ProductPriceChange }) {
  const pct = change.percentageChange
  const rising = pct !== null && pct > 0
  const tone = pct === null ? 'text-gray-500 dark:text-gray-400' : rising ? 'text-warning-600 dark:text-warning-500' : 'text-success-600 dark:text-success-500'
  const sizeLabel = change.sizeValue != null && change.sizeUnit ? `${change.sizeValue}${change.sizeUnit}` : null
  const meta = [change.brand, sizeLabel, `${change.observationCount} prices recorded`].filter(Boolean).join(' · ')

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
          {change.productName}
          {change.matchConfidence === 'possible' && (
            <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">(possible match)</span>
          )}
        </p>
        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
          {formatCurrency(change.firstPrice)} → {formatCurrency(change.lastPrice)}
          {meta ? ` · ${meta}` : ''}
        </span>
      </div>
      <span className={`shrink-0 text-sm font-medium ${tone}`}>{pct === null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}</span>
    </div>
  )
}

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
    computeForRange,
  } = useAnalytics()

  const dailySeries = useMemo(() => {
    if (totals.status !== 'ok') return []
    const byDate = new Map(totals.daily.map((d) => [d.date, d.total]))
    const prefix = totals.range.from.slice(0, 7)
    const count = daysInMonth(totals.range.from)
    return Array.from({ length: count }, (_, i) => {
      const day = i + 1
      const date = `${prefix}-${String(day).padStart(2, '0')}`
      return { day, total: byDate.get(date) ?? 0 }
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
    const maxDays = Math.max(currentDays, previousDays)

    return Array.from({ length: maxDays }, (_, i) => {
      const day = i + 1
      return {
        day,
        current: day <= currentDays ? (currentByDay.get(day) ?? 0) : null,
        previous: day <= previousDays ? (previousByDay.get(day) ?? 0) : null,
      }
    })
  }, [monthOverMonth, totals, computeForRange])

  const topCategory = categoryRollups.status === 'ok' && categoryRollups.rollups.length > 0 ? categoryRollups.rollups[0] : null

  if (loading) return <PageSkeleton />

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="THE NUMBERS" title="Analytics" titleAdornment={<PrivacyToggle />} />

      <StatGrid>
        <StatCard
          label="This month"
          value={totals.status === 'ok' ? formatCurrency(totals.totalSpend) : 'Not enough data yet'}
          icon={Wallet}
          sensitive={totals.status === 'ok'}
        />
        <StatCard
          label="Avg / day"
          value={totals.status === 'ok' ? formatCurrency(totals.avgDailySpend) : 'Not enough data yet'}
          icon={Calendar}
          sensitive={totals.status === 'ok'}
        />
        <DeltaCard label="Vs last month" icon={TrendingUp} delta={monthOverMonth.status === 'ok' ? monthOverMonth : null} />
        <DeltaCard label="Vs last week" icon={TrendingUp} delta={weekOverWeek.status === 'ok' ? weekOverWeek : null} />
      </StatGrid>

      <InsightCards
        monthOverMonth={monthOverMonth}
        categoryRollups={categoryRollups}
        merchantRollups={merchantRollups}
        recurringCandidates={recurringCandidates}
        productPriceChanges={productPriceChanges}
      />

      <Section title="Daily spend this month">
        <Card>
          {hasDailySpend ? (
            <div className="h-56 w-full">
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
            <EmptyState icon={Wallet} title="No spend recorded yet this month" />
          )}
        </Card>
      </Section>

      <Section
        title="This month vs last month"
        action={
          comparisonSeries && (
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: CHART_SERIES[0] }} />
                This month
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: CHART_SERIES[1] }} />
                Last month
              </span>
            </div>
          )
        }
      >
        <Card>
          {comparisonSeries ? (
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
              icon={Calendar}
              title="Not enough data yet"
              description="Check back once a full previous month has been tracked."
            />
          )}
        </Card>
      </Section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Top category">
          <Card>
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
                  <span className="max-w-[80%] truncate text-xs text-gray-500 dark:text-gray-400">
                    {topCategory.categoryName}
                  </span>
                </div>
              </div>
            ) : (
              <EmptyState icon={Tag} title="No categorized spend this month yet" />
            )}
          </Card>
        </Section>

        <Section title="Where you spend">
          <Card className="flex flex-col gap-5">
            {merchantRollups.status === 'ok' && merchantRollups.rollups.length > 0 ? (
              merchantRollups.rollups.slice(0, 5).map((m) => <MerchantRow key={m.merchantId} merchant={m} />)
            ) : (
              <EmptyState
                icon={Store}
                title="No merchant-linked spending yet"
                description="Scan a receipt to start tracking merchants."
              />
            )}
          </Card>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Recurring spend">
          <Card className="flex flex-col gap-5">
            {recurringCandidates.status === 'ok' && recurringCandidates.candidates.length > 0 ? (
              recurringCandidates.candidates.slice(0, 5).map((c) => <RecurringRow key={c.merchantId} candidate={c} />)
            ) : (
              <EmptyState
                icon={Repeat}
                title="No recurring pattern yet"
                description="Not enough repeat purchases yet to detect one."
              />
            )}
          </Card>
        </Section>

        <Section title="Price changes">
          <Card className="flex flex-col gap-5">
            {productPriceChanges.status === 'ok' && productPriceChanges.changes.length > 0 ? (
              productPriceChanges.changes.slice(0, 5).map((c) => <PriceChangeRow key={c.productId} change={c} />)
            ) : (
              <EmptyState
                icon={Tag}
                title="No repeated price observations yet"
                description="Scan the same product twice to start tracking its price."
              />
            )}
          </Card>
        </Section>
      </div>
    </div>
  )
}
