import { useMemo, useState } from 'react'
import { Wallet, TrendingUp, Calendar, Receipt, Trash2, Pencil, Download } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { StatCard } from '../../components/StatCard'
import { GlassCard } from '../../components/GlassCard'
import { EmptyState } from '../../components/EmptyState'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageSkeleton } from '../../components/PageSkeleton'
import { formatCurrency, formatDate } from '../../lib/format'
import { useExpenses } from './useExpenses'
import { ExpenseForm } from './ExpenseForm'
import type { Expense } from '../../lib/types'

const FALLBACK_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

function isSameMonth(iso: string, ref: Date) {
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

export function ExpensesPage() {
  const { categories, expenses, loading, addExpense, updateExpense, deleteExpense, addCategory } = useExpenses()
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const stats = useMemo(() => {
    const now = new Date()
    const monthExpenses = expenses.filter((e) => isSameMonth(e.spent_at, now))
    const total = monthExpenses.reduce((s, e) => s + Number(e.amount), 0)

    const byCategory = new Map<string, number>()
    for (const e of monthExpenses) {
      const key = e.category_id ?? 'uncategorized'
      byCategory.set(key, (byCategory.get(key) ?? 0) + Number(e.amount))
    }
    let topCategoryName = 'None'
    let topAmount = -1
    for (const [key, amount] of byCategory) {
      if (amount > topAmount) {
        topAmount = amount
        topCategoryName = key === 'uncategorized' ? 'Uncategorized' : (categoryById.get(key)?.name ?? 'Unknown')
      }
    }

    const avgPerDay = total / now.getDate()

    return { total, topCategoryName, avgPerDay, count: monthExpenses.length, byCategory }
  }, [expenses, categoryById])

  const donutData = useMemo(
    () =>
      Array.from(stats.byCategory.entries()).map(([key, value]) => ({
        name: key === 'uncategorized' ? 'Uncategorized' : (categoryById.get(key)?.name ?? 'Unknown'),
        value,
        color: key === 'uncategorized' ? '#64748b' : categoryById.get(key)?.color || undefined,
      })),
    [stats.byCategory, categoryById],
  )

  const last30DaysData = useMemo(() => {
    const days: { date: string; total: number }[] = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const total = expenses
        .filter((e) => e.spent_at === key)
        .reduce((s, e) => s + Number(e.amount), 0)
      days.push({ date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), total })
    }
    return days
  }, [expenses])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterCategory && e.category_id !== filterCategory) return false
      if (filterFrom && e.spent_at < filterFrom) return false
      if (filterTo && e.spent_at > filterTo) return false
      return true
    })
  }, [expenses, filterCategory, filterFrom, filterTo])

  function exportCsv() {
    const header = ['Date', 'Category', 'Amount', 'Currency', 'Note']
    const rows = filteredExpenses.map((e) => [
      e.spent_at,
      e.category_id ? (categoryById.get(e.category_id)?.name ?? '') : '',
      e.amount,
      e.currency,
      (e.note ?? '').replace(/"/g, '""'),
    ])
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSubmit(input: Parameters<typeof addExpense>[0]) {
    if (editing) {
      await updateExpense(editing.id, input)
      setEditing(null)
    } else {
      await addExpense(input)
    }
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="This month" value={formatCurrency(stats.total)} icon={Wallet} />
        <StatCard label="Top category" value={stats.topCategoryName} icon={TrendingUp} />
        <StatCard label="Avg/day" value={formatCurrency(stats.avgPerDay)} icon={Calendar} />
        <StatCard label="Transactions" value={stats.count} icon={Receipt} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard>
          <h3 className="mb-2 text-sm font-medium text-slate-300">Spend by category (this month)</h3>
          {donutData.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No expenses yet this month" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {donutData.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ background: '#111d2e', border: '1px solid #1e3048' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="mb-2 text-sm font-medium text-slate-300">Last 30 days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={last30DaysData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={40} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ background: '#111d2e', border: '1px solid #1e3048' }} />
              <Bar dataKey="total" fill="var(--mood-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <ExpenseForm
        categories={categories}
        editing={editing}
        onSubmit={handleSubmit}
        onCancelEdit={() => setEditing(null)}
        onAddCategory={addCategory}
      />

      <GlassCard>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={filterCategory}
            aria-label="Filter by category"
            onChange={(e) => setFilterCategory(e.target.value)}
            className="form-input rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-slate-200 outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            aria-label="Filter from date"
            className="form-input rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-slate-200 outline-none"
          />
          <span className="text-xs text-slate-500">to</span>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            aria-label="Filter to date"
            className="form-input rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-slate-200 outline-none"
          />
          <button
            type="button"
            onClick={exportCsv}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:border-mood-accent hover:text-mood-accent"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>

        {filteredExpenses.length === 0 ? (
          <EmptyState icon={Receipt} title="No expenses recorded yet" description="Add your first expense above." />
        ) : (
          <div className="flex flex-col divide-y divide-white/5">
            {filteredExpenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{formatCurrency(Number(e.amount), e.currency)}</span>
                    {e.category_id && (
                      <span className="rounded-md bg-mood-accent/10 px-2 py-0.5 text-xs text-mood-accent">
                        {categoryById.get(e.category_id)?.name ?? 'Unknown'}
                      </span>
                    )}
                  </div>
                  {e.note && <p className="truncate text-sm text-slate-400">{e.note}</p>}
                  <p className="text-xs text-slate-600">{formatDate(e.spent_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(e)}
                  aria-label="Edit expense"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-mood-accent"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(e)}
                  aria-label="Delete expense"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete expense?"
        message="This can't be undone."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteExpense(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
