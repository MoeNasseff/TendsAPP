import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import type { RecurringBill, RecurringBillPayment } from '../../lib/types'
import type { AnalyticsResult } from '../analytics/types'

/**
 * Recurring bills — electricity, internet, the gardener, rent, an open-ended
 * loan. Shaped after `useExpenses.ts`, with the same missing-table detection
 * `useInstallments` uses so an unpushed migration reads as a setup step
 * rather than a wall of failed requests.
 */

function isMissingTable(error: PostgrestError | null): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || error.code === '42P01'
}

export interface BillDue {
  bill: RecurringBill
  dueOn: string
  /** Null for a variable bill whose amount is only known at pay time. */
  amount: number | null
  isLate: boolean
  daysUntil: number
}

export interface BillsSummary {
  /** Committed spend per month, normalised across intervals. Excludes
   *  variable bills, whose amount is unknown by definition. */
  monthlyCommitted: number
  /** How many active bills were left out of the figure above. */
  variableCount: number
  activeCount: number
  lateCount: number
}

function todayISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number)
  const [ty, tm, td] = toISO.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000)
}

/** Monthly equivalent of one interval, so a yearly insurance premium and a
 *  monthly subscription can be added together honestly. */
function perMonth(bill: RecurringBill): number {
  if (bill.amount === null) return 0
  const n = Number(bill.amount)
  switch (bill.interval_unit) {
    case 'week':
      return (n * 52) / 12 / bill.interval_count
    case 'month':
      return n / bill.interval_count
    case 'quarter':
      return n / (3 * bill.interval_count)
    case 'year':
      return n / (12 * bill.interval_count)
  }
}

export function useBills() {
  const { user } = useAuth()
  const [bills, setBills] = useState<RecurringBill[]>([])
  const [payments, setPayments] = useState<RecurringBillPayment[]>([])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const [billRes, paymentRes] = await Promise.all([
      supabase.from('recurring_bills').select('*').order('next_due_on'),
      supabase.from('recurring_bill_payments').select('*').order('due_on', { ascending: false }),
    ])

    if (isMissingTable(billRes.error) || isMissingTable(paymentRes.error)) {
      setAvailable(false)
      setBills([])
      setPayments([])
      setLoading(false)
      return
    }

    setAvailable(true)
    setBills(billRes.data ?? [])
    setPayments(paymentRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('recurring_bills', load)
  useRealtime('recurring_bill_payments', load)

  const today = todayISO(new Date())

  const upcoming = useMemo<AnalyticsResult<{ dues: BillDue[] }>>(() => {
    const active = bills.filter((b) => b.active)
    if (active.length === 0) return { status: 'insufficient_data', reason: 'no active recurring bills' }
    const dues: BillDue[] = active
      .map((bill) => ({
        bill,
        dueOn: bill.next_due_on,
        amount: bill.amount === null ? null : Number(bill.amount),
        isLate: bill.next_due_on < today,
        daysUntil: daysBetween(today, bill.next_due_on),
      }))
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
    return { status: 'ok', dues }
  }, [bills, today])

  const summary = useMemo<AnalyticsResult<BillsSummary>>(() => {
    const active = bills.filter((b) => b.active)
    if (active.length === 0) return { status: 'insufficient_data', reason: 'no active recurring bills' }
    return {
      status: 'ok',
      // Variable bills contribute 0 rather than a guess, and are counted
      // separately so the UI can say the total is partial.
      monthlyCommitted: active.reduce((s, b) => s + perMonth(b), 0),
      variableCount: active.filter((b) => b.amount === null || b.is_variable).length,
      activeCount: active.length,
      lateCount: active.filter((b) => b.next_due_on < today).length,
    }
  }, [bills, today])

  async function addBill(input: Omit<RecurringBill, 'id' | 'user_id' | 'created_at'>) {
    if (!user) return { error: new Error('Not signed in') }
    const { error } = await supabase.from('recurring_bills').insert({ user_id: user.id, ...input })
    if (!error) await load()
    return { error }
  }

  async function updateBill(id: string, input: Partial<RecurringBill>) {
    const { error } = await supabase.from('recurring_bills').update(input).eq('id', id)
    if (!error) await load()
    return { error }
  }

  async function deleteBill(id: string) {
    const { error } = await supabase.from('recurring_bills').delete().eq('id', id)
    if (!error) await load()
    return { error }
  }

  /**
   * Marks the current occurrence paid and rolls the schedule forward one
   * interval, server-side so the two writes cannot half-succeed.
   * `expenseId` links the money to the expense that actually recorded it —
   * the amount is never counted twice, because this table stores the
   * commitment and `expenses` stores the spend.
   */
  async function markPaid(billId: string, paidAmount: number, paidOn: string, expenseId?: string | null) {
    const { data, error } = await supabase.rpc('advance_recurring_bill', {
      p_bill_id: billId,
      p_paid_amount: paidAmount,
      p_paid_on: paidOn,
      p_expense_id: expenseId ?? null,
    })
    if (!error) await load()
    return { error, nextDueOn: data as string | null }
  }

  return {
    loading,
    available,
    bills,
    payments,
    upcoming,
    summary,
    addBill,
    updateBill,
    deleteBill,
    markPaid,
    reload: load,
  }
}
