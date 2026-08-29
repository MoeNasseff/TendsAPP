import { useState, type FormEvent } from 'react'
import type { ExpenseCategory, IntervalUnit, PaymentMethod, RecurringBill, RecurringBillKind } from '../../lib/types'

const FIELD = 'form-input rounded-lg border px-3 py-2 text-sm outline-hidden'
const LABEL = 'text-micro uppercase text-gray-500 dark:text-gray-400'

const KINDS: { value: RecurringBillKind; label: string }[] = [
  { value: 'utility', label: 'Utility (electricity, water, gas)' },
  { value: 'subscription', label: 'Subscription (internet, streaming)' },
  { value: 'service', label: 'Service (gardener, pool, cleaner)' },
  { value: 'rent', label: 'Rent' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'loan', label: 'Loan' },
  { value: 'other', label: 'Other' },
]

const INTERVALS: { value: IntervalUnit; label: string }[] = [
  { value: 'week', label: 'week(s)' },
  { value: 'month', label: 'month(s)' },
  { value: 'quarter', label: 'quarter(s)' },
  { value: 'year', label: 'year(s)' },
]

export type BillInput = Omit<RecurringBill, 'id' | 'user_id' | 'created_at'>

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function BillForm({
  editing,
  categories,
  methods,
  onSubmit,
  onCancel,
}: {
  editing: RecurringBill | null
  categories: ExpenseCategory[]
  methods: PaymentMethod[]
  onSubmit: (input: BillInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(editing?.name ?? '')
  const [kind, setKind] = useState<RecurringBillKind>(editing?.kind ?? 'utility')
  const [isVariable, setIsVariable] = useState(editing?.is_variable ?? false)
  const [amount, setAmount] = useState(editing?.amount != null ? String(editing.amount) : '')
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(editing?.interval_unit ?? 'month')
  const [intervalCount, setIntervalCount] = useState(String(editing?.interval_count ?? 1))
  const [nextDueOn, setNextDueOn] = useState(editing?.next_due_on ?? todayISO())
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? '')
  const [methodId, setMethodId] = useState(editing?.payment_method_id ?? '')
  const [autoPay, setAutoPay] = useState(editing?.auto_pay ?? false)
  const [note, setNote] = useState(editing?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        kind,
        merchant_id: null,
        category_id: categoryId || null,
        payment_method_id: methodId || null,
        // A variable bill stores no amount at all rather than a guess — the
        // real figure is captured when it is actually paid.
        amount: isVariable || amount === '' ? null : Number(amount),
        is_variable: isVariable,
        currency: 'EGP',
        interval_unit: intervalUnit,
        interval_count: Math.max(1, Number(intervalCount) || 1),
        next_due_on: nextDueOn,
        active: editing?.active ?? true,
        auto_pay: autoPay,
        note: note.trim() || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this bill')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label htmlFor="bill-name" className="flex flex-col gap-1 sm:col-span-2">
        <span className={LABEL}>Name</span>
        <input
          id="bill-name"
          type="text"
          required
          placeholder="Electricity, Internet, Pool cleaner…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={FIELD}
        />
      </label>

      <label htmlFor="bill-kind" className="flex flex-col gap-1">
        <span className={LABEL}>Type</span>
        <select id="bill-kind" value={kind} onChange={(e) => setKind(e.target.value as RecurringBillKind)} className={FIELD}>
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="bill-due" className="flex flex-col gap-1">
        <span className={LABEL}>Next due</span>
        <input
          id="bill-due"
          type="date"
          required
          value={nextDueOn}
          onChange={(e) => setNextDueOn(e.target.value)}
          className={FIELD}
        />
      </label>

      <div className="flex flex-col gap-1 sm:col-span-2">
        <span className={LABEL}>Amount</span>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="bill-amount"
            type="number"
            step="0.01"
            min="0"
            disabled={isVariable}
            placeholder={isVariable ? 'Varies — entered when paid' : '0.00'}
            value={isVariable ? '' : amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Amount"
            className={`${FIELD} flex-1 disabled:opacity-50`}
          />
          <label htmlFor="bill-variable" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              id="bill-variable"
              type="checkbox"
              checked={isVariable}
              onChange={(e) => setIsVariable(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-white/20"
            />
            Amount varies
          </label>
        </div>
        {isVariable && (
          <span className="text-theme-xs text-gray-500 dark:text-gray-400">
            Electricity and water change every cycle. Nothing is stored now, and the real figure is asked for when you
            mark it paid — so no invented number reaches your totals.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className={LABEL}>Repeats every</span>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={intervalCount}
            onChange={(e) => setIntervalCount(e.target.value)}
            aria-label="Interval count"
            className={`${FIELD} w-20`}
          />
          <select
            value={intervalUnit}
            onChange={(e) => setIntervalUnit(e.target.value as IntervalUnit)}
            aria-label="Interval unit"
            className={`${FIELD} flex-1`}
          >
            {INTERVALS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label htmlFor="bill-category" className="flex flex-col gap-1">
        <span className={LABEL}>Category</span>
        <select
          id="bill-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={FIELD}
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="bill-method" className="flex flex-col gap-1">
        <span className={LABEL}>Paid with</span>
        <select id="bill-method" value={methodId} onChange={(e) => setMethodId(e.target.value)} className={FIELD}>
          <option value="">Cash / not specified</option>
          {methods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="bill-autopay" className="flex items-center gap-2 self-end pb-2 text-sm text-gray-600 dark:text-gray-300">
        <input
          id="bill-autopay"
          type="checkbox"
          checked={autoPay}
          onChange={(e) => setAutoPay(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 dark:border-white/20"
        />
        Pays automatically
      </label>

      <label htmlFor="bill-note" className="flex flex-col gap-1 sm:col-span-2">
        <span className={LABEL}>Note</span>
        <input
          id="bill-note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={FIELD}
        />
      </label>

      {error && (
        <p className="text-sm text-error-600 dark:text-error-500 sm:col-span-2" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-fast ease-out-expo hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add bill'}
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
