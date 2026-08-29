import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import type { InstallmentPayment, InstallmentPlan, PaymentMethod } from '../../lib/types'
import {
  computeInstallmentSummary,
  computeMethodExposures,
  computePlanProgress,
  computeUpcomingDues,
} from './compute'
import type { InstallmentsAvailability } from './types'

/**
 * Shaped after `useExpenses.ts`, with one addition: the tables this reads are
 * created by `20260826120000_installments.sql`, which is written but may not
 * have been pushed yet. Rather than letting that surface as a console full of
 * failed requests, a missing table is detected and reported as
 * `availability: 'schema_missing'` — an expected state the UI renders plainly.
 */

/** PostgREST's codes for "that relation does not exist". `PGRST205` is the
 *  schema-cache miss; `42P01` is Postgres' own undefined_table. */
function isMissingTable(error: PostgrestError | null): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || error.code === '42P01'
}

export function useInstallments() {
  const { user } = useAuth()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [plans, setPlans] = useState<InstallmentPlan[]>([])
  const [payments, setPayments] = useState<InstallmentPayment[]>([])
  const [availability, setAvailability] = useState<InstallmentsAvailability>('ready')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const [methodRes, planRes, paymentRes] = await Promise.all([
      supabase.from('payment_methods').select('*').order('created_at'),
      supabase.from('installment_plans').select('*').order('started_on', { ascending: false }),
      supabase.from('installment_payments').select('*').order('due_on'),
    ])

    if (isMissingTable(methodRes.error) || isMissingTable(planRes.error) || isMissingTable(paymentRes.error)) {
      setAvailability('schema_missing')
      setMethods([])
      setPlans([])
      setPayments([])
      setLoading(false)
      return
    }

    setAvailability('ready')
    setMethods(methodRes.data ?? [])
    setPlans(planRes.data ?? [])
    setPayments(paymentRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  // Subscribing to a table that does not exist is inert rather than fatal —
  // the channel simply never delivers. Once the migration lands, the existing
  // subscription starts firing with no code change.
  useRealtime('payment_methods', load)
  useRealtime('installment_plans', load)
  useRealtime('installment_payments', load)

  const exposures = useMemo(() => computeMethodExposures(methods, plans, payments), [methods, plans, payments])
  const progress = useMemo(() => computePlanProgress(plans, payments, methods), [plans, payments, methods])
  const upcomingDues = useMemo(() => computeUpcomingDues(plans, payments, methods), [plans, payments, methods])
  const summary = useMemo(() => computeInstallmentSummary(plans, payments), [plans, payments])

  /** Plans keyed by the expense that originated them, so the purchases table
   *  can label a row without every consumer re-deriving the join. */
  const plansByExpenseId = useMemo(() => {
    const map = new Map<string, InstallmentPlan>()
    for (const plan of plans) {
      if (plan.expense_id) map.set(plan.expense_id, plan)
    }
    return map
  }, [plans])

  async function addMethod(input: Omit<PaymentMethod, 'id' | 'user_id' | 'created_at'>) {
    if (!user) return { error: new Error('Not signed in') }
    const { error } = await supabase.from('payment_methods').insert({ user_id: user.id, ...input })
    if (!error) await load()
    return { error }
  }

  async function deleteMethod(id: string) {
    const { error } = await supabase.from('payment_methods').delete().eq('id', id)
    if (!error) await load()
    return { error }
  }

  async function addPlan(input: Omit<InstallmentPlan, 'id' | 'user_id' | 'created_at' | 'status'>) {
    if (!user) return { error: new Error('Not signed in') }
    const { data, error } = await supabase
      .from('installment_plans')
      .insert({ user_id: user.id, ...input })
      .select('id')
      .single()
    if (error) return { error }
    // Server-side so the N instalments are one round trip and the rounding
    // remainder lands on the final row.
    const { error: scheduleError } = await supabase.rpc('generate_installment_schedule', { p_plan_id: data.id })
    await load()
    return { error: scheduleError }
  }

  async function markPaid(paymentId: string, paidOn: string, paidAmount: number) {
    const { error } = await supabase
      .from('installment_payments')
      .update({ status: 'paid', paid_on: paidOn, paid_amount: paidAmount })
      .eq('id', paymentId)
    if (!error) await load()
    return { error }
  }

  return {
    loading,
    availability,
    methods,
    plans,
    payments,
    exposures,
    progress,
    upcomingDues,
    summary,
    plansByExpenseId,
    addMethod,
    deleteMethod,
    addPlan,
    markPaid,
    reload: load,
  }
}
