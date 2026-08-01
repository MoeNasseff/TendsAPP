import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useRealtime } from './useRealtime'
import { useToast } from './useToast'
import type { Reminder } from '../lib/types'

export function useDueReminders() {
  const { user } = useAuth()
  const showToast = useToast()
  const [dueReminders, setDueReminders] = useState<Reminder[]>([])

  const load = useCallback(async () => {
    if (!user) return
    // 'sent' just means an external channel (push/telegram/email) was
    // attempted — the on-site popover still surfaces it until the user
    // acknowledges it (Done/Snooze), so it must be included here too.
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .in('status', ['scheduled', 'sent', 'snoozed'])
      .lte('fire_at', new Date().toISOString())
      .order('fire_at')
    setDueReminders(data ?? [])
  }, [user])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [load])

  useRealtime('reminders', load)

  async function markDone(id: string) {
    const { error } = await supabase.from('reminders').update({ status: 'done' }).eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    await load()
  }

  async function snooze(id: string, minutes: number) {
    const { error } = await supabase
      .from('reminders')
      .update({ status: 'snoozed', fire_at: new Date(Date.now() + minutes * 60_000).toISOString() })
      .eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    await load()
  }

  // 'cancelled' rather than 'done' — dismissing is not completing, and it is
  // excluded by the due-filter above so the cards disappear.
  //
  // Cleared optimistically: without it the stack sits there unchanged for the
  // whole round-trip, which reads as a dead button. On failure the cards go
  // back and the reason is shown rather than swallowed.
  async function dismissAll() {
    const previous = dueReminders
    const ids = previous.map((r) => r.id)
    if (ids.length === 0) return

    setDueReminders([])
    const { error } = await supabase.from('reminders').update({ status: 'cancelled' }).in('id', ids)
    if (error) {
      setDueReminders(previous)
      showToast(error.message, 'error')
      return
    }
    await load()
  }

  return { dueReminders, markDone, snooze, dismissAll }
}
