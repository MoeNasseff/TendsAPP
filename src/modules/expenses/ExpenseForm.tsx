import { useState, useEffect, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { GlassCard } from '../../components/GlassCard'
import { useToast } from '../../hooks/useToast'
import type { Expense, ExpenseCategory } from '../../lib/types'
import type { ExpenseInput } from './useExpenses'

const today = () => new Date().toISOString().slice(0, 10)

export function ExpenseForm({
  categories,
  editing,
  onSubmit,
  onCancelEdit,
  onAddCategory,
}: {
  categories: ExpenseCategory[]
  editing: Expense | null
  onSubmit: (input: ExpenseInput) => Promise<void>
  onCancelEdit: () => void
  onAddCategory: (input: { name: string; color: string }) => Promise<void>
}) {
  const showToast = useToast()
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [spentAt, setSpentAt] = useState(today())
  const [submitting, setSubmitting] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#10b981')

  useEffect(() => {
    if (editing) {
      setAmount(String(editing.amount))
      setCategoryId(editing.category_id ?? '')
      setNote(editing.note ?? '')
      setSpentAt(editing.spent_at)
    } else {
      setAmount('')
      setCategoryId('')
      setNote('')
      setSpentAt(today())
    }
  }, [editing])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      showToast('Please enter a valid amount', 'error')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({ amount: parsedAmount, category_id: categoryId || null, note: note.trim(), spent_at: spentAt })
      showToast(editing ? 'Expense updated' : 'Expense added', 'success')
      if (!editing) {
        setAmount('')
        setNote('')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save expense', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return
    try {
      await onAddCategory({ name: newCategoryName.trim(), color: newCategoryColor })
      setNewCategoryName('')
      setShowNewCategory(false)
      showToast('Category added', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add category', 'error')
    }
  }

  return (
    <GlassCard>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="number"
          step="0.01"
          required
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
        />
        <input
          type="date"
          required
          value={spentAt}
          onChange={(e) => setSpentAt(e.target.value)}
          className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
        />
        <div className="flex gap-2 sm:col-span-2">
          <select
            value={categoryId}
            aria-label="Category"
            onChange={(e) => setCategoryId(e.target.value)}
            className="form-input flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNewCategory((v) => !v)}
            className="shrink-0 rounded-lg border border-white/10 px-3 text-slate-400 hover:border-mood-accent hover:text-mood-accent"
            title="New category"
            aria-label="New category"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {showNewCategory && (
          <div className="flex gap-2 sm:col-span-2">
            <input
              type="text"
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="form-input flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
            />
            <input
              type="color"
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
              className="h-9 w-10 rounded-lg border border-white/10 bg-black/20"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="shrink-0 rounded-lg bg-mood-accent px-3 text-sm font-medium text-white"
            >
              Add
            </button>
          </div>
        )}

        <textarea
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none sm:col-span-2"
        />

        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-mood-accent py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : editing ? 'Update expense' : 'Add expense'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border border-white/10 px-4 text-sm text-slate-400 hover:bg-white/5"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </GlassCard>
  )
}
