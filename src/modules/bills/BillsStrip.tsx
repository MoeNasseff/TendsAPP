import { Link } from 'react-router-dom'
import { Repeat } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { SensitiveValue } from '../../components/SensitiveValue'
import { formatCurrency, formatDate } from '../../lib/format'
import { useBills } from './useBills'

/**
 * Read-only summary of recurring commitments for the analytics dashboard.
 * Entry and editing live on /bills; this is the glance version, so it never
 * writes anything.
 */
export function BillsStrip() {
  const { loading, available, upcoming, summary } = useBills()

  // The migration not being applied is a setup state for /bills to explain,
  // not something to shout about on a dashboard.
  if (loading || !available) return null

  const hasDues = upcoming.status === 'ok' && upcoming.dues.length > 0

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Recurring bills</h3>
          <span className="block text-gray-500 text-theme-sm dark:text-gray-400">
            {summary.status === 'ok' ? (
              <>
                <SensitiveValue>{formatCurrency(summary.monthlyCommitted)}</SensitiveValue> committed each month
                {summary.variableCount > 0 && `, excluding ${summary.variableCount} that vary`}
              </>
            ) : (
              'Electricity, internet, rent, services'
            )}
          </span>
        </div>
        <Link
          to="/bills"
          className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-theme-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Manage
        </Link>
      </div>

      {hasDues ? (
        <div className="flex flex-col gap-4">
          {upcoming.dues.slice(0, 5).map((due) => (
            <div key={due.bill.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">{due.bill.name}</p>
                <span className="block truncate text-gray-500 text-theme-xs dark:text-gray-400">
                  {formatDate(due.dueOn)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {due.amount === null ? (
                    <span className="text-gray-400 dark:text-gray-500">Varies</span>
                  ) : (
                    <SensitiveValue>{formatCurrency(due.amount, due.bill.currency)}</SensitiveValue>
                  )}
                </span>
                {due.isLate ? (
                  <Badge color="error" size="sm">
                    Overdue
                  </Badge>
                ) : (
                  <Badge color="light" size="sm">
                    In {due.daysUntil}d
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Repeat className="h-5 w-5 text-gray-400 dark:text-gray-600" aria-hidden="true" />
          <p className="font-medium text-gray-700 text-theme-sm dark:text-gray-200">No recurring bills yet</p>
          <p className="max-w-xs text-gray-500 text-theme-xs dark:text-gray-400">
            Add electricity, internet or a service on the Bills page and it will show up here.
          </p>
        </div>
      )}
    </div>
  )
}
