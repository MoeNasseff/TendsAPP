import { useState } from 'react'
import { Target, Wallet } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { PageSkeleton } from '../../components/PageSkeleton'
import { PrivacyToggle } from '../../components/PrivacyToggle'
import { ProgressMeter } from '../../components/ProgressMeter'
import { BUDGET_THRESHOLDS } from '../../lib/meter'
import { SensitiveValue } from '../../components/SensitiveValue'
import { formatCurrency } from '../../lib/format'
import { useBudgets, type BudgetProgress } from './useBudgets'
import type { Budget } from '../../lib/types'

const CARD_TITLE = 'mb-1 text-lg font-semibold text-gray-800 dark:text-white/90'
const CARD_SUB = 'block text-gray-500 text-theme-sm dark:text-gray-400'
const INPUT =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-theme-sm text-gray-800 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white/90'

/**
 * The readout beside the meter. Past 100% it says "over", not "137%" — the
 * number that matters at that point is how much you are over in currency,
 * which the row already shows, and a raw percentage past 100 reads as a bug
 * in a bar that is visually full.
 */
function meterLabel(p: BudgetProgress): string {
  return p.over ? 'over' : `${p.percent.toFixed(0)}%`
}

function BudgetRow({ progress, onEdit, onClose }: { progress: BudgetProgress; onEdit: () => void; onClose: () => void }) {
  const { budget, category, spent, remaining, over } = progress
  const currency = budget.currency

  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 last:border-0 last:pb-0 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">
              {category?.name ?? 'Uncategorised'}
            </p>
            {over && (
              <Badge color="error" size="sm">
                Over budget
              </Badge>
            )}
          </div>
          <span className="block truncate text-gray-500 text-theme-xs dark:text-gray-400">
            <SensitiveValue>{formatCurrency(spent, currency)}</SensitiveValue> of{' '}
            <SensitiveValue>{formatCurrency(Number(budget.amount), currency)}</SensitiveValue>
            {' · '}
            {over ? (
              <span className="text-error-500">
                <SensitiveValue>{formatCurrency(Math.abs(remaining), currency)}</SensitiveValue> over
              </span>
            ) : (
              <>
                <SensitiveValue>{formatCurrency(remaining, currency)}</SensitiveValue> left
              </>
            )}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <ProgressMeter percent={progress.percent} thresholds={BUDGET_THRESHOLDS} label={meterLabel(progress)} />
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-theme-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1.5 text-theme-xs text-gray-500 hover:text-error-600 dark:text-gray-400 dark:hover:text-error-500"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

export function BudgetsPage() {
  const {
    loading,
    available,
    overall,
    perCategory,
    unbudgetedCategories,
    progressFor,
    addBudget,
    replaceBudget,
    closeBudget,
  } = useBudgets()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [closing, setClosing] = useState<Budget | null>(null)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  if (loading) return <PageSkeleton />

  if (!available) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="LIMITS" title="Budgets" />
        <Card>
          <h3 className={CARD_TITLE}>Not set up yet</h3>
          <span className={CARD_SUB}>The budgets migration has not been applied to this project.</span>
          <p className="mt-4 rounded-lg bg-gray-50 p-3 font-mono text-theme-xs text-gray-600 dark:bg-white/5 dark:text-gray-400">
            supabase/migrations/20260906120000_budgets.sql
          </p>
        </Card>
      </div>
    )
  }

  function openAdd() {
    setEditing(null)
    setAmount('')
    // Default to the overall budget when it does not exist yet — it is the one
    // most people want first, and it is the only budget the month total is
    // measured against.
    setCategoryId(overall ? (unbudgetedCategories[0]?.id ?? '') : '')
    setError(null)
    setFormOpen(true)
  }

  function openEdit(budget: Budget) {
    setEditing(budget)
    setAmount(String(budget.amount))
    setError(null)
    setFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }

    // The edit path deliberately takes only the amount: a budget's category is
    // what identifies it, and letting an edit move it would leave the old
    // category silently unbudgeted.
    const result = editing
      ? await replaceBudget(editing, value)
      : await addBudget({ category_id: categoryId === '' ? null : categoryId, amount: value })
    if (result?.error) {
      setError(result.error.message)
      return
    }
    setFormOpen(false)
  }

  const overallProgress = overall ? progressFor(overall) : null
  const hasAny = overall !== null || perCategory.length > 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="LIMITS"
        title="Budgets"
        titleAdornment={<PrivacyToggle />}
        action={
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            Add budget
          </button>
        }
      />

      {!hasAny ? (
        <Card>
          <EmptyState
            icon={Target}
            title="No budgets yet"
            description="A budget is what you meant to spend, next to what you actually did. Set one overall limit for the month, or a limit per category, and this page tracks both against your real expenses. Transfers between your own accounts and credit-card payments never count towards it."
          />
        </Card>
      ) : (
        <>
          {overallProgress && (
            <Card>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className={CARD_TITLE}>This month overall</h3>
                  <span className={CARD_SUB}>
                    Every purchase counts towards this. Transfers and card payments do not.
                  </span>
                </div>
                <Wallet className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-600" aria-hidden="true" />
              </div>

              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h4 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                    <SensitiveValue>
                      {formatCurrency(overallProgress.spent, overallProgress.budget.currency)}
                    </SensitiveValue>
                  </h4>
                  <span className={CARD_SUB}>
                    of{' '}
                    <SensitiveValue>
                      {formatCurrency(Number(overallProgress.budget.amount), overallProgress.budget.currency)}
                    </SensitiveValue>
                    {overallProgress.over ? (
                      <span className="text-error-500">
                        {' · '}
                        <SensitiveValue>
                          {formatCurrency(Math.abs(overallProgress.remaining), overallProgress.budget.currency)}
                        </SensitiveValue>{' '}
                        over
                      </span>
                    ) : (
                      <>
                        {' · '}
                        <SensitiveValue>
                          {formatCurrency(overallProgress.remaining, overallProgress.budget.currency)}
                        </SensitiveValue>{' '}
                        left
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <ProgressMeter
                    percent={overallProgress.percent}
                    thresholds={BUDGET_THRESHOLDS}
                    label={meterLabel(overallProgress)}
                  />
                  <button
                    type="button"
                    onClick={() => openEdit(overallProgress.budget)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-theme-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setClosing(overallProgress.budget)}
                    className="rounded-lg px-2 py-1.5 text-theme-xs text-gray-500 hover:text-error-600 dark:text-gray-400 dark:hover:text-error-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <div className="mb-5">
              <h3 className={CARD_TITLE}>By category</h3>
              <span className={CARD_SUB}>
                {perCategory.length > 0
                  ? 'A category can be under while the month overall is over, and the other way round.'
                  : 'No category limits set.'}
              </span>
            </div>

            {perCategory.length > 0 ? (
              <div className="flex flex-col gap-4">
                {perCategory.map((budget) => (
                  <BudgetRow
                    key={budget.id}
                    progress={progressFor(budget)}
                    onEdit={() => openEdit(budget)}
                    onClose={() => setClosing(budget)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Target}
                title="No category limits"
                description="Set one for the categories you actually want to hold a line on — groceries, eating out — rather than all of them."
              />
            )}
          </Card>
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Change this budget' : 'Add a budget'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {editing ? (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-theme-xs text-gray-600 dark:bg-white/5 dark:text-gray-400">
              The old limit is kept and closed today rather than overwritten, so past months still report
              against the number that was actually in force at the time.
            </p>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">Applies to</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={INPUT}
              >
                {!overall && <option value="">Everything this month (overall)</option>}
                {unbudgetedCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                Categories that already have a budget are not listed — edit the existing one instead.
              </span>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">Monthly limit</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={INPUT}
              autoFocus
            />
          </label>

          {error && <p className="text-theme-xs text-error-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-gray-300 px-3.5 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-500 px-3.5 py-2 text-theme-sm font-medium text-white hover:bg-brand-600"
            >
              {editing ? 'Save' : 'Add budget'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!closing}
        title="Remove this budget?"
        message="It stops applying from today. The old figure is kept, so past months still report against the limit that was in force then."
        confirmLabel="Remove"
        onCancel={() => setClosing(null)}
        onConfirm={async () => {
          if (closing) await closeBudget(closing.id)
          setClosing(null)
        }}
      />
    </div>
  )
}
