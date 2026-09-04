import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import type { InboxMessage, TransactionKind } from '../../lib/types'
import type { ExpenseInput } from '../expenses/useExpenses'

/**
 * What this message should be filed as, before the user touches anything.
 *
 * A paired row is decided: it matched a card-payment settlement of the same
 * amount within ±3 days, which is not a bare amount-and-window coincidence but
 * a match against a message shape that means one specific thing. An unpaired
 * `transfer` suggestion is still only a suggestion — "transfer to another
 * account" reads the same whether it paid your own card or a person — so it
 * arrives pre-selected and the user confirms it.
 *
 * Exported because the page needs the same answer to render the row, and two
 * copies of this rule would eventually disagree.
 */
export function suggestedKind(message: InboxMessage): TransactionKind {
  return message.suggested_kind ?? 'purchase'
}

/** True when the classification is settled and the UI should not ask. */
export function isKindDecided(message: InboxMessage): boolean {
  return message.paired_inbox_id !== null
}

/**
 * Bank/payment texts awaiting review. Shaped after `useBills.ts`, with the
 * same missing-table detection `useInstallments`/`useBills` use so a
 * migration that has not reached this environment reads as a setup step
 * rather than a wall of failed requests.
 */

function isMissingTable(error: PostgrestError | null): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || error.code === '42P01'
}

export function useInbox() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('sms_inbox')
      .select('*')
      .order('received_at', { ascending: false })

    if (isMissingTable(error)) {
      setAvailable(false)
      setMessages([])
      setLoading(false)
      return
    }

    setAvailable(true)
    setMessages(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('sms_inbox', load)

  // Grouped, not sorted-by-status: a text-column sort would put 'accepted'
  // before 'pending' alphabetically, which is the opposite of what the page
  // needs to surface first. Both groups keep the query's own newest-first
  // order.
  const pending = useMemo(
    () => messages.filter((m) => m.status === 'pending' || m.status === 'unparsed'),
    [messages],
  )
  const resolved = useMemo(
    () => messages.filter((m) => m.status === 'accepted' || m.status === 'rejected' || m.status === 'ignored'),
    [messages],
  )

  /**
   * Inserts the expense directly rather than going through
   * `useExpenses().addExpense` — that helper never returns the new row, and
   * this needs the id to link `sms_inbox.expense_id` in the same action. Same
   * table, same input shape; nothing about useExpenses.ts changes.
   */
  async function acceptMessage(message: InboxMessage, input: ExpenseInput) {
    if (!user) return { error: new Error('Not signed in') }
    if (message.parsed_direction === 'credit') {
      return { error: new Error('This message is money coming in, not spending — it cannot be accepted as an expense.') }
    }

    // Resolved here rather than trusted from the caller, for the same reason
    // the credit guard above lives in the hook: the rule has to hold whichever
    // surface calls this. An explicit choice from the review UI wins; with
    // none, the parser's own suggestion does; a row nothing classified is a
    // purchase, which is what every non-SMS expense in the app already is.
    const kind = input.kind ?? suggestedKind(message)

    const { data, error: insertError } = await supabase
      .from('expenses')
      .insert({ user_id: user.id, ...input, kind })
      .select('id')
      .single()
    if (insertError) return { error: insertError }

    const { error: updateError } = await supabase
      .from('sms_inbox')
      .update({ status: 'accepted', expense_id: data.id })
      .eq('id', message.id)
    if (updateError) return { error: updateError }

    await recordBalanceObservation(message)
    await load()
    return { error: null }
  }

  /**
   * Best-effort: a failure here does not undo the expense that was just
   * created, and never blocks acceptMessage from returning success — this is
   * secondary enrichment (S32b), not the point of accepting.
   *
   * Routes by payment_methods.kind rather than parsed_direction, because a
   * card CHARGE and a debit-card PURCHASE are both direction: 'debit' but
   * parsed_balance means opposite things on them — "still borrowable" for a
   * credit card, real cash for a debit card/account. See
   * 20260901000000_account_balances.sql for why the two live in separate
   * columns.
   */
  async function recordBalanceObservation(message: InboxMessage) {
    if (!user) return
    if (message.parsed_balance === null || !message.suggested_payment_method_id) return

    const { data: method } = await supabase
      .from('payment_methods')
      .select('kind')
      .eq('id', message.suggested_payment_method_id)
      .maybeSingle()
    if (!method) return

    const isCredit = method.kind === 'credit_card'
    const isDebitLike = method.kind === 'debit_card' || method.kind === 'bank_transfer'
    if (!isCredit && !isDebitLike) return

    await supabase.from('account_balances').insert({
      user_id: user.id,
      payment_method_id: message.suggested_payment_method_id,
      balance: isDebitLike ? message.parsed_balance : null,
      available_credit: isCredit ? message.parsed_balance : null,
      source: 'sms',
      observed_at: message.parsed_occurred_at ?? message.received_at,
      sms_inbox_id: message.id,
    })
  }

  async function rejectMessage(id: string) {
    const { error } = await supabase.from('sms_inbox').update({ status: 'rejected' }).eq('id', id)
    if (!error) await load()
    return { error }
  }

  return {
    loading,
    available,
    messages,
    pending,
    resolved,
    acceptMessage,
    rejectMessage,
    reload: load,
  }
}
