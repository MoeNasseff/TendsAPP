import { useMemo, useState } from 'react'
import { Wallet, TrendingUp, Calendar, Receipt, Plus, ScanLine } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { StatCard } from '../../components/StatCard'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { StatGrid } from '../../components/StatGrid'
import { Section } from '../../components/Section'
import { Modal } from '../../components/Modal'
import { DataGrid, type DataGridColumn } from '../../components/DataGrid'
import { EmptyState } from '../../components/EmptyState'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageSkeleton } from '../../components/PageSkeleton'
import { formatCurrency, formatDate } from '../../lib/format'
import { CHART_SERIES, tooltipProps, axisProps } from '../../lib/chartTheme'
import { useExpenses } from './useExpenses'
import { ExpenseForm } from './ExpenseForm'
import { ScanModal } from '../scanner/ScanModal'
import type { Expense } from '../../lib/types'

interface ExpenseRow {
  id: string
  spent_at: string
  categoryName: string
  amount: number
  currency: string
  note: string
}

function isSameMonth(iso: string, ref: Date) {
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

export function ExpensesPage() {
  const { categories, expenses, loading, addExpense, updateExpense, deleteExpense, addCategory } = useExpenses()
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
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

  const tableRows = useMemo<ExpenseRow[]>(
    () =>
      filteredExpenses.map((e) => ({
        id: e.id,
        spent_at: e.spent_at,
        categoryName: e.category_id ? (categoryById.get(e.category_id)?.name ?? 'Unknown') : 'Uncategorized',
        amount: Number(e.amount),
        currency: e.currency,
        note: e.note ?? '',
      })),
    [filteredExpenses, categoryById],
  )

  const tableColumns = useMemo<DataGridColumn<ExpenseRow>[]>(
    () => [
      { data: 'spent_at', title: 'Date', format: (v) => formatDate(v as string) },
      { data: 'categoryName', title: 'Category' },
      {
        data: 'amount',
        title: 'Amount',
        sensitive: true,
        format: (v, row) => formatCurrency(v as number, row.currency),
      },
      { data: 'note', title: 'Note', format: (v) => (v as string) || '—' },
    ],
    [],
  )

  const expenseById = useMemo(() => new Map(expenses.map((e) => [e.id, e])), [expenses])

  async function handleSubmit(input: Parameters<typeof addExpense>[0]) {
    if (editing) {
      await updateExpense(editing.id, input)
      setEditing(null)
    } else {
      await addExpense(input)
    }
    setFormOpen(false)
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="MONTHLY OUTFLOW"
        title="Expenses"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="tap-target flex items-center gap-2 rounded-lg border border-black/10 px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors duration-fast ease-out-expo hover:border-black/20 hover:text-slate-900 dark:border-white/10 dark:text-white/70 dark:hover:border-white/20 dark:hover:text-white"
            >
              <ScanLine className="h-4 w-4" />
              Scan
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              aria-label="Add expense"
              className="rounded-lg bg-mood-accent p-2 text-white transition-opacity duration-fast ease-out-expo hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <StatGrid>
        <StatCard label="This month" value={formatCurrency(stats.total)} icon={Wallet} sensitive />
        <StatCard label="Top category" value={stats.topCategoryName} icon={TrendingUp} />
        <StatCard label="Avg/day" value={formatCurrency(stats.avgPerDay)} icon={Calendar} sensitive />
        <StatCard label="Transactions" value={stats.count} icon={Receipt} />
      </StatGrid>

      <Section title="Spend by category (this month)">
        <Card>
          {donutData.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No expenses yet this month" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {donutData.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color || CHART_SERIES[i % CHART_SERIES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} {...tooltipProps} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section title="Last 30 days">
        <Card>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={last30DaysData}>
              <XAxis dataKey="date" {...axisProps} interval={4} />
              <YAxis {...axisProps} width={40} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} {...tooltipProps} />
              <Bar dataKey="total" fill="var(--mood-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Edit expense' : 'Add expense'}
      >
        <ExpenseForm
          categories={categories}
          editing={editing}
          onSubmit={handleSubmit}
          onCancelEdit={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onAddCategory={addCategory}
        />
      </Modal>

      <Section title="Transactions">
        <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={filterCategory}
            aria-label="Filter by category"
            onChange={(e) => setFilterCategory(e.target.value)}
            className="form-input rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-slate-200 outline-hidden"
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
            className="form-input rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-slate-200 outline-hidden"
          />
          <span className="text-xs text-slate-500">to</span>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            aria-label="Filter to date"
            className="form-input rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-slate-200 outline-hidden"
          />
        </div>

        {tableRows.length === 0 ? (
          <EmptyState icon={Receipt} title="No expenses recorded yet" description="Add your first expense above." />
        ) : (
          <DataGrid
            columns={tableColumns}
            data={tableRows}
            onEdit={(row) => {
              const expense = expenseById.get(row.id)
              if (expense) {
                setEditing(expense)
                setFormOpen(true)
              }
            }}
            onDelete={(row) => {
              const expense = expenseById.get(row.id)
              if (expense) setDeleteTarget(expense)
            }}
          />
        )}
        </Card>
      </Section>

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

      <ScanModal open={scanOpen} onClose={() => setScanOpen(false)} />
    </div>
  )
}
