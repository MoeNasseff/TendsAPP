import { useCallback, useEffect, useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import type { NotificationPref, NotificationPrefType, NotificationSettings, Reminder } from '../../lib/types'

/**
 * Backs the /notifications page. Shaped after useBills.ts/useInbox.ts, with
 * the same missing-table detection — notification_prefs/notification_settings
 * come from S30a's migrations, which are written but not yet applied to
 * production, so this reads as a setup step rather than a wall of failed
 * requests.
 */

function isMissingTable(error: PostgrestError | null): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || error.code === '42P01'
}

export function useNotifications() {
  const { user } = useAuth()
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<Reminder[]>([])
  const [prefs, setPrefs] = useState<NotificationPref[]>([])
  const [settings, setSettings] = useState<NotificationSettings | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    const [historyRes, prefsRes, settingsRes] = await Promise.all([
      supabase.from('reminders').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('notification_prefs').select('*'),
      supabase.from('notification_settings').select('*').eq('user_id', user.id).maybeSingle(),
    ])

    if (isMissingTable(prefsRes.error) || isMissingTable(settingsRes.error)) {
      setAvailable(false)
      setHistory([])
      setPrefs([])
      setSettings(null)
      setLoading(false)
      return
    }

    setAvailable(true)
    setHistory(historyRes.data ?? [])
    setPrefs(prefsRes.data ?? [])
    setSettings(settingsRes.data ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('reminders', load)
  useRealtime('notification_prefs', load)
  useRealtime('notification_settings', load)

  const prefsByType = new Map(prefs.map((p) => [p.type, p.enabled]))

  async function setPrefEnabled(type: NotificationPrefType, enabled: boolean) {
    if (!user) return { error: new Error('Not signed in') }
    const { error } = await supabase
      .from('notification_prefs')
      .upsert({ user_id: user.id, type, enabled }, { onConflict: 'user_id,type' })
    if (!error) await load()
    return { error }
  }

  /**
   * A partial patch, not a full row: columns left out keep the table's own
   * DEFAULT on first insert, and are left untouched by the upsert's
   * ON CONFLICT ... DO UPDATE on an existing row — so calling this with just
   * `{ digest_hour: 21 }` never clobbers quiet hours the user already set.
   */
  async function updateSettings(patch: Partial<Omit<NotificationSettings, 'user_id' | 'created_at'>>) {
    if (!user) return { error: new Error('Not signed in') }
    const { error } = await supabase
      .from('notification_settings')
      .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' })
    if (!error) await load()
    return { error }
  }

  return {
    loading,
    available,
    history,
    prefsByType,
    settings,
    setPrefEnabled,
    updateSettings,
  }
}
