import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useRealtime } from './useRealtime'
import type { Reminder } from '../lib/types'

export function useDueReminders() {
  const { user } = useAuth()
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
    await supabase.from('reminders').update({ status: 'done' }).eq('id', id)
    await load()
  }

  async function snooze(id: string, minutes: number) {
    await supabase
      .from('reminders')
      .update({ status: 'snoozed', fire_at: new Date(Date.now() + minutes * 60_000).toISOString() })
      .eq('id', id)
    await load()
  }

  return { dueReminders, markDone, snooze }
}
