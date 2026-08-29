import { useState } from 'react'
import { CalendarClock, CreditCard } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { SensitiveValue } from '../../components/SensitiveValue'
import { formatCurrency, formatDate } from '../../lib/format'
import { logoPath, monogram, NEUTRAL_BRAND, providerFor } from './providers'
import { useInstallments } from './useInstallments'
import type { MethodExposure, UpcomingDue } from './types'

/**
 * Installments strip for the analytics dashboard. Card shells follow the
 * TailAdmin analytics demo (`assets/re-desgin/tailadmin-pro-reference/analytics.html`):
 * `rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800
 * dark:bg-white/[0.03]`, and the utilisation bar is the demo's own
 * Customers Demographic bar, class for class.
 */

const CARD = 'rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6'
const CARD_TITLE = 'mb-1 text-lg font-semibold text-gray-800 dark:text-white/90'
const CARD_SUB = 'block text-gray-500 text-theme-sm dark:text-gray-400'

/**
 * Brand tile. Renders the provider's supplied logo from `public/brand/` when
 * one exists, otherwise a monogram on the brand colour — a provider with no
 * artwork is a normal state, not a broken image.
 *
 * `logoFit` matters because the supplied files are not uniform: Sympl, CIB and
 * FAB Misr are square app icons carrying their own background and fill the
 * tile edge to edge, while ValU is a wide teal wordmark on white and is
 * letterboxed on its own white background instead.
 */
function ProviderMark({ slug, label, size = 40 }: { slug: string | null; label: string; size?: number }) {
  const provider = providerFor(slug)
  const src = logoPath(provider)
  const [logoFailed, setLogoFailed] = useState(false)
  const showLogo = src !== null && !logoFailed
  const cover = provider?.logoFit !== 'contain'

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg font-semibold text-white"
      style={{
        background: showLogo ? (provider?.logoBg ?? 'transparent') : (provider?.brand ?? NEUTRAL_BRAND),
        width: size,
        height: size,
        fontSize: size * 0.36,
      }}
      aria-hidden="true"
    >
      {showLogo ? (
        <img
          src={src}
          alt=""
          className={cover ? 'h-full w-full object-cover' : 'h-full w-full object-contain p-1'}
          onError={() => setLogoFailed(true)}
        />
      ) : (
        monogram(label)
      )}
    </div>
  )
}

function utilisationTone(pct: number): string {
  if (pct >= 100) return 'bg-error-500'
  if (pct >= 80) return 'bg-warning-500'
  return 'bg-brand-500'
}

function ExposureRow({ exposure }: { exposure: MethodExposure }) {
  const { method, installmentUtilisation: util, availableCredit, outstanding } = exposure
  const provider = providerFor(method.provider_slug)
  const subtitle = [
    method.kind === 'credit_card' ? (method.network ?? 'Card') : (provider?.label ?? 'BNPL'),
    method.last4 ? `•••• ${method.last4}` : null,
    method.issuer,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <ProviderMark slug={method.provider_slug} label={method.label} />
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">{method.label}</p>
          <span className="block truncate text-gray-500 text-theme-xs dark:text-gray-400">
            {subtitle || '—'} · owing <SensitiveValue>{formatCurrency(outstanding, method.currency)}</SensitiveValue>
          </span>
        </div>
      </div>

      {util === null ? (
        // Never a 0% bar: a limit that was never recorded is unknown, not zero.
        <span className="shrink-0 text-theme-xs text-gray-400 dark:text-gray-500">Limit not set</span>
      ) : (
        <div className="flex w-full max-w-[140px] shrink-0 items-center gap-3">
          <div className="relative block h-2 w-full max-w-[100px] rounded-sm bg-gray-200 dark:bg-gray-800">
            <div
              className={`absolute left-0 top-0 flex h-full items-center justify-center rounded-sm text-xs font-medium text-white ${utilisationTone(util)}`}
              style={{ width: `${Math.min(100, Math.max(0, util))}%` }}
            />
          </div>
          <p
            className="w-10 shrink-0 text-right font-medium text-gray-800 text-theme-sm dark:text-white/90"
            title={availableCredit === null ? undefined : `${formatCurrency(availableCredit, method.currency)} available`}
          >
            {util.toFixed(0)}%
          </p>
        </div>
      )}
    </div>
  )
}

function DueRow({ due }: { due: UpcomingDue }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <ProviderMark slug={due.providerSlug} label={due.methodLabel} size={32} />
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">{due.description}</p>
          <span className="block truncate text-gray-500 text-theme-xs dark:text-gray-400">
            {due.methodLabel} · {formatDate(due.dueOn)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
          <SensitiveValue>{formatCurrency(due.amount)}</SensitiveValue>
        </span>
        {due.isLate && (
          <Badge color="error" size="sm">
            Late
          </Badge>
        )}
      </div>
    </div>
  )
}

export function InstallmentCards() {
  const { loading, availability, exposures, upcomingDues, summary } = useInstallments()

  if (loading) return null

  // The migration exists in the repo but has not been applied. Say exactly
  // that — it is a setup step, not an error, and not an empty dataset.
  if (availability === 'schema_missing') {
    return (
      <div className="col-span-12">
        <div className={CARD}>
          <h3 className={CARD_TITLE}>Installments</h3>
          <span className={CARD_SUB}>
            Not set up yet — the installments migration is written but has not been applied to this project.
          </span>
          <p className="mt-4 rounded-lg bg-gray-50 p-3 font-mono text-theme-xs text-gray-600 dark:bg-white/5 dark:text-gray-400">
            supabase/migrations/20260826120000_installments.sql
          </p>
        </div>
      </div>
    )
  }

  const hasMethods = exposures.status === 'ok' && exposures.exposures.length > 0
  const hasDues = upcomingDues.status === 'ok' && upcomingDues.dues.length > 0

  return (
    <>
      <div className="col-span-12 xl:col-span-7">
        <div className={CARD}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className={CARD_TITLE}>Cards &amp; installment plans</h3>
              <span className={CARD_SUB}>
                {summary.status === 'ok'
                  ? `${summary.activePlans} active plan${summary.activePlans === 1 ? '' : 's'}`
                  : 'How much of each limit your plans are using'}
              </span>
            </div>
            {summary.status === 'ok' && summary.lateCount > 0 && (
              <Badge color="error" size="sm">
                {summary.lateCount} late
              </Badge>
            )}
          </div>

          {hasMethods ? (
            <div className="flex flex-col gap-5">
              {exposures.exposures.map((e) => (
                <ExposureRow key={e.method.id} exposure={e} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CreditCard className="h-5 w-5 text-gray-400 dark:text-gray-600" aria-hidden="true" />
              <p className="font-medium text-gray-700 text-theme-sm dark:text-gray-200">No cards or BNPL accounts yet</p>
              <p className="max-w-xs text-gray-500 text-theme-xs dark:text-gray-400">
                Add ValU, Sympl or a bank card to track limits and what you owe.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-12 xl:col-span-5">
        <div className={CARD}>
          <div className="mb-5">
            <h3 className={CARD_TITLE}>Due in the next 30 days</h3>
            <span className={CARD_SUB}>
              {summary.status === 'ok' ? (
                <>
                  <SensitiveValue>{formatCurrency(summary.monthlyBurden)}</SensitiveValue> falls due this month
                </>
              ) : (
                'Upcoming instalments'
              )}
            </span>
          </div>

          {hasDues ? (
            <div className="flex flex-col gap-5">
              {upcomingDues.dues.slice(0, 5).map((d) => (
                <DueRow key={d.paymentId} due={d} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarClock className="h-5 w-5 text-gray-400 dark:text-gray-600" aria-hidden="true" />
              <p className="font-medium text-gray-700 text-theme-sm dark:text-gray-200">Nothing due</p>
              <p className="max-w-xs text-gray-500 text-theme-xs dark:text-gray-400">
                Instalments appear here once a plan is recorded.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
