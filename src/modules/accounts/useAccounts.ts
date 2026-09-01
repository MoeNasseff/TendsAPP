import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import type { AccountBalance, PaymentMethod } from '../../lib/types'
import type { PaymentMethodInput } from '../installments/PaymentMethodForm'

/**
 * Owns payment_methods CRUD independently of useInstallments.ts rather than
 * importing it wholesale — this page has no use for installment_plans or
 * installment_payments, and pulling in that hook would mean two extra
 * queries this page never reads.
 */

function isMissingTable(error: PostgrestError | null): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || error.code === '42P01'
}

export type AccountsAvailability = 'ready' | 'schema_missing'

export interface MethodBalance {
  method: PaymentMethod
  /** Latest observation by observed_at, or null if none has ever landed. */
  latest: AccountBalance | null
}

/**
 * `not_recorded` covers both "no credit_limit set" and "no observation yet" —
 * both read the same to the user (nothing to show) even though they are
 * different facts underneath. `in_credit` is not an edge case to hide: an
 * overpaid card (available_credit > credit_limit) is a real, valid state —
 * see the S32 "red rule" worked example (CIB card at 69,584.15 available
 * against a 60,000 limit).
 */
export type UtilisationState = { status: 'not_recorded' } | { status: 'in_credit' } | { status: 'ok'; percent: number }

export function useAccounts() {
  const { user } = useAuth()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [availability, setAvailability] = useState<AccountsAvailability>('ready')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const [methodRes, balanceRes] = await Promise.all([
      supabase.from('payment_methods').select('*').order('created_at'),
      supabase.from('account_balances').select('*').order('observed_at', { ascending: false }),
    ])

    if (isMissingTable(methodRes.error) || isMissingTable(balanceRes.error)) {
      setAvailability('schema_missing')
      setMethods([])
      setBalances([])
      setLoading(false)
      return
    }

    setAvailability('ready')
    setMethods(methodRes.data ?? [])
    setBalances(balanceRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('payment_methods', load)
  useRealtime('account_balances', load)

  // balances is already ordered newest-first, so the first row seen per
  // method is its latest observation.
  const latestByMethod = useMemo(() => {
    const map = new Map<string, AccountBalance>()
    for (const b of balances) {
      if (!map.has(b.payment_method_id)) map.set(b.payment_method_id, b)
    }
    return map
  }, [balances])

  const methodBalances = useMemo<MethodBalance[]>(
    () => methods.map((method) => ({ method, latest: latestByMethod.get(method.id) ?? null })),
    [methods, latestByMethod],
  )

  /**
   * Debit balances only, never available_credit — the one figure the S32
   * "red rule" exists to protect. Summing a credit card's available_credit
   * in here would count borrowing capacity as savings.
   */
  const combinedCash = useMemo(() => {
    return methodBalances.reduce((sum, { method, latest }) => {
      const isDebitLike = method.kind === 'debit_card' || method.kind === 'bank_transfer'
      if (!isDebitLike || !latest || latest.balance === null) return sum
      return sum + Number(latest.balance)
    }, 0)
  }, [methodBalances])

  function utilisationFor(method: PaymentMethod, latest: AccountBalance | null): UtilisationState {
    if (method.credit_limit === null || latest === null || latest.available_credit === null) {
      return { status: 'not_recorded' }
    }
    const limit = Number(method.credit_limit)
    const available = Number(latest.available_credit)
    if (available > limit) return { status: 'in_credit' }
    return { status: 'ok', percent: ((limit - available) / limit) * 100 }
  }

  async function addMethod(input: PaymentMethodInput) {
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

  return {
    loading,
    availability,
    methods,
    methodBalances,
    combinedCash,
    utilisationFor,
    addMethod,
    deleteMethod,
    reload: load,
  }
}
