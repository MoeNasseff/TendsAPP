import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import type { InboxMessage } from '../../lib/types'
import type { ExpenseInput } from '../expenses/useExpenses'

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

    const { data, error: insertError } = await supabase
      .from('expenses')
      .insert({ user_id: user.id, ...input })
      .select('id')
      .single()
    if (insertError) return { error: insertError }

    const { error: updateError } = await supabase
      .from('sms_inbox')
      .update({ status: 'accepted', expense_id: data.id })
      .eq('id', message.id)
    if (!updateError) await load()
    return { error: updateError }
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
