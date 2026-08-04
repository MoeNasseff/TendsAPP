import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import { useToast } from '../../hooks/useToast'
import type { BodyMeasurement, BodyProfile, MeasurementSite } from '../../lib/types'

/** A new reading. Sites are canonical cm, weight canonical kg. */
export type MeasurementInput = Partial<Record<MeasurementSite, number | null>> & {
  taken_at: string
  weight_kg: number | null
  note: string | null
}

const EMPTY_PROFILE: BodyProfile = {
  sex: null,
  unit_system: 'metric',
  height_cm: null,
  birth_date: null,
}

export function useBody() {
  const { user } = useAuth()
  const showToast = useToast()
  const [profile, setProfile] = useState<BodyProfile>(EMPTY_PROFILE)
  const [history, setHistory] = useState<BodyMeasurement[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const [profileRes, historyRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('sex, unit_system, height_cm, birth_date')
        .eq('id', user.id)
        .single(),
      // Oldest first: the chart plots left to right, and the trend compares the
      // ends of this array directly.
      supabase.from('body_measurements').select('*').order('taken_at'),
    ])

    if (profileRes.data) setProfile({ ...EMPTY_PROFILE, ...profileRes.data })
    setHistory(historyRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('body_measurements', load)

  const saveProfile = useCallback(
    async (patch: Partial<BodyProfile>) => {
      if (!user) return
      // Optimistic: these drive which figure and units render, and waiting on a
      // round-trip to redraw the whole page reads as lag.
      const previous = profile
      setProfile((p) => ({ ...p, ...patch }))

      const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
      if (error) {
        setProfile(previous)
        showToast(error.message, 'error')
      }
    },
    [user, profile, showToast],
  )

  const addMeasurement = useCallback(
    async (input: MeasurementInput) => {
      if (!user) return false
      const { error } = await supabase
        .from('body_measurements')
        .insert({ ...input, user_id: user.id })
      if (error) {
        showToast(error.message, 'error')
        return false
      }
      showToast('Measurements saved', 'success')
      await load()
      return true
    },
    [user, load, showToast],
  )

  const deleteMeasurement = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('body_measurements').delete().eq('id', id)
      if (error) {
        showToast(error.message, 'error')
        return
      }
      await load()
    },
    [load, showToast],
  )

  return {
    profile,
    history,
    loading,
    latest: history.length ? history[history.length - 1] : null,
    saveProfile,
    addMeasurement,
    deleteMeasurement,
  }
}
