import { useMemo, useState } from 'react'
import { Plus, Receipt, Repeat } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { PageSkeleton } from '../../components/PageSkeleton'
import { PrivacyToggle } from '../../components/PrivacyToggle'
import { SensitiveValue } from '../../components/SensitiveValue'
import { formatCurrency, formatDate } from '../../lib/format'
import { useExpenses } from '../expenses/useExpenses'
import { useInstallments } from '../installments/useInstallments'
import { BillForm, type BillInput } from './BillForm'
import { useBills, type BillDue } from './useBills'
import type { RecurringBill } from '../../lib/types'

const CARD_TITLE = 'mb-1 text-lg font-semibold text-gray-800 dark:text-white/90'
const CARD_SUB = 'block text-gray-500 text-theme-sm dark:text-gray-400'

const KIND_LABEL: Record<string, string> = {
  utility: 'Utility',
  subscription: 'Subscription',
  service: 'Service',
  rent: 'Rent',
  insurance: 'Insurance',
  loan: 'Loan',
  other: 'Other',
}

function intervalLabel(bill: RecurringBill): string {
  const n = bill.interval_count
  const unit = bill.interval_unit
  if (n === 1) return `every ${unit}`
  return `every ${n} ${unit}s`
}

function DueBadge({ due }: { due: BillDue }) {
  if (due.isLate) {
    return (
      <Badge color="error" size="sm">
        {Math.abs(due.daysUntil)}d overdue
      </Badge>
    )
  }
  if (due.daysUntil === 0) return <Badge color="warning" size="sm">Due today</Badge>
  if (due.daysUntil <= 7) return <Badge color="warning" size="sm">In {due.daysUntil}d</Badge>
  return <Badge color="light" size="sm">In {due.daysUntil}d</Badge>
}

/** Asks for the real figure on a variable bill instead of assuming one. */
function PayDialog({
  due,
  onCancel,
  onConfirm,
}: {
  due: BillDue
  onCancel: () => void
  onConfirm: (amount: number, paidOn: string) => Promise<void>
}) {
  const [amount, setAmount] = useState(due.amount != null ? String(due.amount) : '')
  const [paidOn, setPaidOn] = useState(due.dueOn)
  const [saving, setSaving] = useState(false)

  return (
    <Modal open onClose={onCancel} title={`Record payment — ${due.bill.name}`}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setSaving(true)
          await onConfirm(Number(amount), paidOn)
          setSaving(false)
        }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <label htmlFor="pay-amount" className="flex flex-col gap-1">
          <span className="text-micro uppercase text-gray-500 dark:text-gray-400">Amount paid</span>
          <input
            id="pay-amount"
            type="number"
            step="0.01"
            min="0"
            required
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="form-input rounded-lg border px-3 py-2 text-sm outline-hidden"
          />
        </label>
        <label htmlFor="pay-date" className="flex flex-col gap-1">
          <span className="text-micro uppercase text-gray-500 dark:text-gray-400">Paid on</span>
          <input
            id="pay-date"
            type="date"
            required
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
            className="form-input rounded-lg border px-3 py-2 text-sm outline-hidden"
          />
        </label>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400 sm:col-span-2">
          This records the payment and moves the bill to its next cycle. It does not create an expense — log that
          separately if you want it counted in your spending.
        </p>
        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Record payment'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function BillsPage() {
  const { loading, available, bills, upcoming, summary, addBill, updateBill, deleteBill, markPaid } = useBills()
  const { categories } = useExpenses()
  const { methods } = useInstallments()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringBill | null>(null)
  const [paying, setPaying] = useState<BillDue | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecurringBill | null>(null)

  const methodById = useMemo(() => new Map(methods.map((m) => [m.id, m])), [methods])

  if (loading) return <PageSkeleton />

  if (!available) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="COMMITMENTS" title="Bills" />
        <Card>
          <h3 className={CARD_TITLE}>Not set up yet</h3>
          <span className={CARD_SUB}>The recurring bills migration has not been applied to this project.</span>
          <p className="mt-4 rounded-lg bg-gray-50 p-3 font-mono text-theme-xs text-gray-600 dark:bg-white/5 dark:text-gray-400">
            supabase/migrations/20260829140000_recurring_bills.sql
          </p>
        </Card>
      </div>
    )
  }

  async function handleSubmit(input: BillInput) {
    if (editing) await updateBill(editing.id, input)
    else await addBill(input)
    setFormOpen(false)
    setEditing(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="COMMITMENTS"
        title="Bills"
        titleAdornment={<PrivacyToggle />}
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white transition-colors duration-fast ease-out-expo hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Add bill
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        <Card>
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">Committed monthly</p>
          <h4 className="mt-3 whitespace-nowrap text-2xl font-bold text-gray-800 dark:text-white/90">
            {summary.status === 'ok' ? (
              <SensitiveValue>{formatCurrency(summary.monthlyCommitted)}</SensitiveValue>
            ) : (
              'Nothing yet'
            )}
          </h4>
          {summary.status === 'ok' && summary.variableCount > 0 && (
            <span className="mt-1 block text-theme-xs text-gray-500 dark:text-gray-400">
              excludes {summary.variableCount} variable bill{summary.variableCount === 1 ? '' : 's'}
            </span>
          )}
        </Card>
        <Card>
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">Active bills</p>
          <h4 className="mt-3 text-2xl font-bold text-gray-800 dark:text-white/90">
            {summary.status === 'ok' ? summary.activeCount : 0}
          </h4>
        </Card>
        <Card>
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">Overdue</p>
          <h4 className="mt-3 text-2xl font-bold text-gray-800 dark:text-white/90">
            {summary.status === 'ok' ? summary.lateCount : 0}
          </h4>
        </Card>
      </div>

      <Card>
        <div className="mb-5">
          <h3 className={CARD_TITLE}>Upcoming</h3>
          <span className={CARD_SUB}>What comes due next, soonest first</span>
        </div>

        {upcoming.status === 'ok' && upcoming.dues.length > 0 ? (
          <div className="flex flex-col gap-5">
            {upcoming.dues.map((due) => {
              const method = due.bill.payment_method_id ? methodById.get(due.bill.payment_method_id) : undefined
              return (
                <div key={due.bill.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {due.bill.name}
                      {due.bill.auto_pay && (
                        <span className="ml-2 font-normal text-theme-xs text-gray-400 dark:text-gray-500">auto</span>
                      )}
                    </p>
                    <span className="block truncate text-gray-500 text-theme-xs dark:text-gray-400">
                      {KIND_LABEL[due.bill.kind]} · {intervalLabel(due.bill)} · {formatDate(due.dueOn)}
                      {method ? ` · ${method.label}` : ''}
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
                    <DueBadge due={due} />
                    <button
                      type="button"
                      onClick={() => setPaying(due)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-theme-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      Mark paid
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(due.bill)
                        setFormOpen(true)
                      }}
                      className="rounded-lg px-2 py-1.5 text-theme-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(due.bill)}
                      className="rounded-lg px-2 py-1.5 text-theme-xs text-gray-500 hover:text-error-600 dark:text-gray-400 dark:hover:text-error-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={Repeat}
            title="No recurring bills yet"
            description="Add electricity, internet, rent, the gardener — anything that comes back every cycle."
          />
        )}
      </Card>

      {bills.some((b) => !b.active) && (
        <Card>
          <div className="mb-5">
            <h3 className={CARD_TITLE}>Inactive</h3>
            <span className={CARD_SUB}>Kept for history, not counted in any total</span>
          </div>
          <div className="flex flex-col gap-3">
            {bills
              .filter((b) => !b.active)
              .map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3">
                  <p className="truncate text-theme-sm text-gray-500 dark:text-gray-400">{b.name}</p>
                  <button
                    type="button"
                    onClick={() => updateBill(b.id, { active: true })}
                    className="shrink-0 text-theme-xs text-brand-500 hover:underline dark:text-brand-400"
                  >
                    Reactivate
                  </button>
                </div>
              ))}
          </div>
        </Card>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Edit bill' : 'Add a recurring bill'}
      >
        <BillForm
          editing={editing}
          categories={categories}
          methods={methods}
          onSubmit={handleSubmit}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      </Modal>

      {paying && (
        <PayDialog
          due={paying}
          onCancel={() => setPaying(null)}
          onConfirm={async (amount, paidOn) => {
            await markPaid(paying.bill.id, amount, paidOn)
            setPaying(null)
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this bill?"
        message="Its payment history goes with it. Deactivate instead if you only want it out of the way."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteBill(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />

      {bills.length === 0 && (
        <Card>
          <EmptyState
            icon={Receipt}
            title="Nothing tracked yet"
            description="Bills you add here appear on the analytics dashboard as upcoming commitments."
          />
        </Card>
      )}
    </div>
  )
}
