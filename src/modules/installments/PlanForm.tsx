import { useMemo, useState, type FormEvent } from 'react'
import { formatCurrency } from '../../lib/format'
import type { InstallmentPlan, PaymentMethod } from '../../lib/types'

const FIELD = 'form-input rounded-lg border px-3 py-2 text-sm outline-hidden'
const LABEL = 'text-micro uppercase text-gray-500 dark:text-gray-400'

export type PlanInput = Omit<InstallmentPlan, 'id' | 'user_id' | 'created_at' | 'status'>

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addOneMonth(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const next = new Date(y, m, d)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

export function PlanForm({
  methods,
  onSubmit,
  onCancel,
}: {
  methods: PaymentMethod[]
  onSubmit: (input: PlanInput) => Promise<void>
  onCancel: () => void
}) {
  const [methodId, setMethodId] = useState(methods[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [principal, setPrincipal] = useState('')
  const [fees, setFees] = useState('')
  const [months, setMonths] = useState('12')
  const [startedOn, setStartedOn] = useState(todayISO())
  const [firstDueOn, setFirstDueOn] = useState(addOneMonth(todayISO()))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Derived, never a separate input: a monthly figure the user could edit
  // independently of principal and fees would let the schedule disagree with
  // the total it is supposed to pay off.
  const derived = useMemo(() => {
    const p = Number(principal) || 0
    const f = Number(fees) || 0
    const n = Math.max(1, Number(months) || 1)
    const total = p + f
    return { total, monthly: total / n, months: n }
  }, [principal, fees, months])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!methodId) {
      setError('Add a card or BNPL account first — a plan has to be charged to something.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        payment_method_id: methodId,
        expense_id: null,
        receipt_id: null,
        merchant_id: null,
        description: description.trim(),
        principal: Number(principal) || 0,
        fees: Number(fees) || 0,
        total_payable: derived.total,
        months: derived.months,
        monthly_amount: derived.monthly,
        started_on: startedOn,
        first_due_on: firstDueOn,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label htmlFor="plan-method" className="flex flex-col gap-1 sm:col-span-2">
        <span className={LABEL}>Charged to</span>
        <select id="plan-method" value={methodId} onChange={(e) => setMethodId(e.target.value)} className={FIELD}>
          {methods.length === 0 && <option value="">No cards or accounts yet</option>}
          {methods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="plan-desc" className="flex flex-col gap-1 sm:col-span-2">
        <span className={LABEL}>What was bought</span>
        <input
          id="plan-desc"
          type="text"
          required
          placeholder="Laptop, washing machine, phone…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={FIELD}
        />
      </label>

      <label htmlFor="plan-principal" className="flex flex-col gap-1">
        <span className={LABEL}>Amount financed</span>
        <input
          id="plan-principal"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="0.00"
          value={principal}
          onChange={(e) => setPrincipal(e.target.value)}
          className={FIELD}
        />
      </label>

      <label htmlFor="plan-fees" className="flex flex-col gap-1">
        <span className={LABEL}>Fees / interest</span>
        <input
          id="plan-fees"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={fees}
          onChange={(e) => setFees(e.target.value)}
          className={FIELD}
        />
        <span className="text-theme-xs text-gray-500 dark:text-gray-400">
          As the provider charged it. Tend never derives this from a rate.
        </span>
      </label>

      <label htmlFor="plan-months" className="flex flex-col gap-1">
        <span className={LABEL}>Months</span>
        <input
          id="plan-months"
          type="number"
          min="1"
          required
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className={FIELD}
        />
      </label>

      <label htmlFor="plan-first-due" className="flex flex-col gap-1">
        <span className={LABEL}>First instalment due</span>
        <input
          id="plan-first-due"
          type="date"
          required
          value={firstDueOn}
          onChange={(e) => setFirstDueOn(e.target.value)}
          className={FIELD}
        />
      </label>

      <label htmlFor="plan-started" className="flex flex-col gap-1">
        <span className={LABEL}>Purchased on</span>
        <input
          id="plan-started"
          type="date"
          required
          value={startedOn}
          onChange={(e) => setStartedOn(e.target.value)}
          className={FIELD}
        />
      </label>

      <div className="flex flex-col justify-end gap-1 sm:col-span-1">
        <span className={LABEL}>Works out to</span>
        <p className="text-sm text-gray-800 dark:text-white/90">
          {derived.months} × {formatCurrency(derived.monthly)}{' '}
          <span className="text-gray-500 dark:text-gray-400">= {formatCurrency(derived.total)}</span>
        </p>
      </div>

      <p className="text-theme-xs text-gray-500 dark:text-gray-400 sm:col-span-2">
        The full schedule is generated when you save. The final instalment absorbs any rounding, so the payments always
        add up to the total exactly.
      </p>

      {error && (
        <p className="text-sm text-error-600 dark:text-error-500 sm:col-span-2" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={saving || methods.length === 0}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Add plan'}
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
  )
}
