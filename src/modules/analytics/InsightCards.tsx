import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Card } from '../../components/Card'
import { useAIProviders } from '../../hooks/useAIProviders'
import { generateInsights, type Insight, type InsightRequest } from './insights'
import type {
  AnalyticsResult,
  CategoryRollup,
  MerchantRollup,
  PeriodDelta,
  ProductPriceChange,
  RecurringCandidate,
} from './types'

interface Props {
  monthOverMonth: AnalyticsResult<PeriodDelta>
  categoryRollups: AnalyticsResult<{ rollups: CategoryRollup[] }>
  merchantRollups: AnalyticsResult<{ rollups: MerchantRollup[] }>
  recurringCandidates: AnalyticsResult<{ candidates: RecurringCandidate[] }>
  productPriceChanges: AnalyticsResult<{ changes: ProductPriceChange[] }>
}

/**
 * Builds one small, aggregated payload per eligible slot — never the raw
 * rows behind them. A slot with insufficient_data or nothing to report is
 * simply absent from the list, not sent to the model as a gap to fill in.
 */
function buildRequests(props: Props): InsightRequest[] {
  const requests: InsightRequest[] = []

  if (props.monthOverMonth.status === 'ok') {
    const d = props.monthOverMonth
    requests.push({
      id: 'month-over-month',
      subject: 'the change in total spend this month compared to last month',
      metrics: {
        currency: 'EGP',
        currentTotal: round2(d.currentTotal),
        previousTotal: round2(d.previousTotal),
        absoluteChange: round2(d.absoluteChange),
        percentageChange: d.percentageChange === null ? null : round2(d.percentageChange),
      },
    })
  }

  if (props.categoryRollups.status === 'ok' && props.categoryRollups.rollups.length > 0) {
    const top = props.categoryRollups.rollups[0]
    requests.push({
      id: 'top-category',
      subject: 'the single category that took the largest share of this month\'s spend',
      metrics: {
        currency: 'EGP',
        category: top.categoryName,
        amount: round2(top.total),
        percentageOfMonth: round2(top.percentage),
      },
    })
  }

  if (props.merchantRollups.status === 'ok' && props.merchantRollups.rollups.length > 0) {
    const top = props.merchantRollups.rollups[0]
    requests.push({
      id: 'top-merchant',
      subject: 'the merchant that took the largest share of this month\'s tracked spend',
      metrics: {
        currency: 'EGP',
        merchant: top.merchantName,
        amount: round2(top.total),
        percentageOfMonth: round2(top.percentage),
      },
    })
  }

  if (props.recurringCandidates.status === 'ok' && props.recurringCandidates.candidates.length > 0) {
    const top = props.recurringCandidates.candidates[0]
    requests.push({
      id: 'recurring',
      subject: 'a merchant that looks like a recurring, subscription-like charge — phrase this as a possibility, not a certainty',
      metrics: {
        currency: 'EGP',
        merchant: top.merchantName,
        occurrences: top.occurrences,
        avgAmount: round2(top.avgAmount),
        avgIntervalDays: top.avgIntervalDays,
      },
    })
  }

  if (props.productPriceChanges.status === 'ok' && props.productPriceChanges.changes.length > 0) {
    const top = props.productPriceChanges.changes[0]
    requests.push({
      id: 'price-change',
      subject:
        'how the recorded unit price of one product changed between the first and most recent time it was scanned — only compare these two recorded prices, never mention any other store or source',
      metrics: {
        currency: 'EGP',
        product: top.productName,
        firstPrice: round2(top.firstPrice),
        lastPrice: round2(top.lastPrice),
        percentageChange: top.percentageChange === null ? null : round2(top.percentageChange),
        confidence: top.matchConfidence,
      },
    })
  }

  return requests
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function resolutionKey(status: string, requests: InsightRequest[]): string {
  return `${status}:${JSON.stringify(requests)}`
}

/**
 * Worded cards on top of S15's numbers. When no provider is configured this
 * renders nothing at all — every chart and stat on the page comes from the
 * engine directly and stays fully functional either way.
 */
export function InsightCards(props: Props) {
  const { resolutionFor } = useAIProviders()
  const resolution = resolutionFor('text')

  const requests = useMemo(() => buildRequests(props), [props])
  const [insights, setInsights] = useState<Insight[]>([])

  // Keyed on content, not object identity: `requests` is a fresh array every
  // render (useAnalytics recomputes on every realtime reload), and re-firing
  // an AI call because the numbers happen to be identical would be wasted.
  const key = resolutionKey(resolution.status, requests)

  useEffect(() => {
    if (resolution.status === 'unavailable' || requests.length === 0) {
      setInsights([])
      return
    }
    let cancelled = false
    generateInsights(resolution, requests).then((result) => {
      if (!cancelled) setInsights(result)
    })
    return () => {
      cancelled = true
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (resolution.status === 'unavailable' || insights.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-display-sm font-semibold text-gray-900 dark:text-white">Insights</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => (
          <Card key={insight.id} className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" aria-hidden="true" />
            <p className="text-sm text-gray-700 dark:text-gray-200">{insight.text}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
