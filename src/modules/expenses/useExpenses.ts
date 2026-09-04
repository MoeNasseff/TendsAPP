import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import type { Expense, ExpenseCategory, TransactionKind } from '../../lib/types'

export interface ExpenseInput {
  amount: number
  category_id: string | null
  note: string
  spent_at: string
  /**
   * Optional so every existing caller — the expense form, the scanner, the
   * seed script — keeps compiling and keeps producing purchases, which is what
   * they all mean. The column's own `default 'purchase'` does the same job on
   * the database side. Only the inbox, which is the one place a non-purchase
   * can originate, ever sets this.
   */
  kind?: TransactionKind
}

export function useExpenses() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const [catRes, expRes] = await Promise.all([
      supabase.from('expense_categories').select('*').order('name'),
      supabase.from('expenses').select('*').order('spent_at', { ascending: false }),
    ])
    setCategories(catRes.data ?? [])
    setExpenses(expRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('expenses', load)
  useRealtime('expense_categories', load)

  async function addExpense(input: ExpenseInput) {
    if (!user) return
    const { error } = await supabase.from('expenses').insert({ user_id: user.id, ...input })
    if (error) throw error
    await load()
  }

  async function updateExpense(id: string, input: ExpenseInput) {
    const { error } = await supabase.from('expenses').update(input).eq('id', id)
    if (error) throw error
    await load()
  }

  async function deleteExpense(id: string) {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  async function addCategory(input: { name: string; color: string }) {
    if (!user) return
    const { error } = await supabase.from('expense_categories').insert({ user_id: user.id, ...input })
    if (error) throw error
    await load()
  }

  async function deleteCategory(id: string) {
    const { error } = await supabase.from('expense_categories').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  return {
    categories,
    expenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    addCategory,
    deleteCategory,
  }
}
