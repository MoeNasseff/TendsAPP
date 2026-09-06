import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import type { Budget, ExpenseCategory, Expense } from '../../lib/types'
import { computeBudgetSpend, monthRangeFor } from '../analytics/compute'

/**
 * Budgets and their spend-to-date for the current month (S34a).
 *
 * Shaped after `useAccounts`/`useInbox`, including the same missing-table
 * detection, so a migration that has not reached this environment reads as a
 * setup step rather than a wall of failed requests.
 */

function isMissingTable(error: PostgrestError | null): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || error.code === '42P01'
}

export interface BudgetInput {
  category_id: string | null
  amount: number
  currency?: string
}

/** A budget with the month's spend resolved against it. */
export interface BudgetProgress {
  budget: Budget
  category: ExpenseCategory | null
  spent: number
  remaining: number
  /** Uncapped on purpose — 137% must be able to say 137%. */
  percent: number
  over: boolean
}

export function useBudgets() {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return

    const [budgetRes, catRes, expRes] = await Promise.all([
      supabase.from('budgets').select('*').order('starts_on', { ascending: false }),
      supabase.from('expense_categories').select('*').order('name'),
      // `kind='purchase'` is the same filter useAnalytics applies, and it is
      // what keeps a credit-card settlement from blowing a budget for money
      // already counted when the card was used. Applied here at the query, not
      // in compute, so there is one rule in one place.
      supabase.from('expenses').select('*').eq('kind', 'purchase'),
    ])

    if (isMissingTable(budgetRes.error)) {
      setAvailable(false)
      setBudgets([])
      setLoading(false)
      return
    }

    setAvailable(true)
    setBudgets(budgetRes.data ?? [])
    setCategories(catRes.data ?? [])
    setExpenses(expRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('budgets', load)
  useRealtime('expenses', load)

  /** Open budgets only — closed rows are history, not current limits. */
  const open = useMemo(() => budgets.filter((b) => b.ends_on === null), [budgets])

  const range = useMemo(() => monthRangeFor(new Date()), [])
  const spend = useMemo(() => computeBudgetSpend(expenses, range), [expenses, range])

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  function progressFor(budget: Budget): BudgetProgress {
    const amount = Number(budget.amount)
    // A null category means the overall budget, so it is measured against the
    // month's whole total rather than any one category's slice.
    const spent = budget.category_id === null ? spend.total : (spend.byCategory.get(budget.category_id) ?? 0)
    return {
      budget,
      category: budget.category_id ? (categoryById.get(budget.category_id) ?? null) : null,
      spent,
      remaining: amount - spent,
      percent: amount > 0 ? (spent / amount) * 100 : 0,
      over: spent > amount,
    }
  }

  const overall = useMemo(() => open.find((b) => b.category_id === null) ?? null, [open])
  const perCategory = useMemo(
    () => open.filter((b) => b.category_id !== null),
    [open],
  )

  /**
   * Categories with no open budget yet — what the "add a budget" picker offers.
   * Without this the form lets you pick a category that already has one, and
   * the partial unique index rejects it with a constraint error the user
   * cannot act on.
   */
  const unbudgetedCategories = useMemo(() => {
    const taken = new Set(perCategory.map((b) => b.category_id))
    return categories.filter((c) => !taken.has(c.id))
  }, [categories, perCategory])

  async function addBudget(input: BudgetInput) {
    if (!user) return { error: new Error('Not signed in') }
    const { error } = await supabase.from('budgets').insert({
      user_id: user.id,
      category_id: input.category_id,
      amount: input.amount,
      currency: input.currency ?? 'EGP',
      period: 'monthly',
      // Backdated to the 1st so the budget covers the month it is created in.
      // Setting it to today would silently measure a part-month against a
      // whole-month limit, which reads as "well under budget" every time.
      starts_on: range.from,
    })
    if (!error) await load()
    return { error }
  }

  /**
   * Editing is close-and-reinsert, never an in-place amount change: last
   * month's "you were 12% over" has to stay reproducible after the limit
   * moves. Both statements are issued in order rather than in a transaction —
   * PostgREST has no client-side transaction, and the partial unique index
   * only constrains *open* rows, so the close must land first regardless.
   */
  async function replaceBudget(budget: Budget, amount: number) {
    if (!user) return { error: new Error('Not signed in') }

    const { error: closeError } = await supabase
      .from('budgets')
      .update({ ends_on: todayISO() })
      .eq('id', budget.id)
    if (closeError) return { error: closeError }

    const { error } = await supabase.from('budgets').insert({
      user_id: user.id,
      category_id: budget.category_id,
      amount,
      currency: budget.currency,
      period: budget.period,
      starts_on: range.from,
    })
    if (!error) await load()
    return { error }
  }

  /** Closing, not deleting — the history of what the limit used to be survives. */
  async function closeBudget(id: string) {
    const { error } = await supabase.from('budgets').update({ ends_on: todayISO() }).eq('id', id)
    if (!error) await load()
    return { error }
  }

  return {
    loading,
    available,
    range,
    overall,
    perCategory,
    categories,
    unbudgetedCategories,
    monthSpend: spend.total,
    progressFor,
    addBudget,
    replaceBudget,
    closeBudget,
    reload: load,
  }
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
