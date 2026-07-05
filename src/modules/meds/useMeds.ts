import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import type { Med, MedLog } from '../../lib/types'

export interface MedInput {
  name: string
  description: string
  image_url: string | null
  dosage: string
  times_of_day: string[]
  days_of_week: number[]
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function useMeds() {
  const { user } = useAuth()
  const [meds, setMeds] = useState<Med[]>([])
  const [todayLogs, setTodayLogs] = useState<MedLog[]>([])
  const [last7DaysLogs, setLast7DaysLogs] = useState<MedLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const dayStart = `${todayKey()}T00:00:00.000Z`
    const dayEnd = `${todayKey()}T23:59:59.999Z`
    const sevenDaysAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10) + 'T00:00:00.000Z'
    const [medsRes, logsRes, weekLogsRes] = await Promise.all([
      supabase.from('meds').select('*').order('name'),
      supabase.from('med_logs').select('*').gte('scheduled_for', dayStart).lte('scheduled_for', dayEnd),
      supabase.from('med_logs').select('*').gte('scheduled_for', sevenDaysAgo).eq('taken', true),
    ])
    setMeds(medsRes.data ?? [])
    setTodayLogs(logsRes.data ?? [])
    setLast7DaysLogs(weekLogsRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('meds', load)
  useRealtime('med_logs', load)

  async function addMed(input: MedInput) {
    if (!user) return
    const { error } = await supabase.from('meds').insert({ user_id: user.id, ...input })
    if (error) throw error
    await load()
  }

  async function updateMed(id: string, input: MedInput) {
    const { error } = await supabase.from('meds').update(input).eq('id', id)
    if (error) throw error
    await load()
  }

  async function deleteMed(id: string) {
    const { error } = await supabase.from('meds').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  async function markTaken(med: Med, time: string) {
    if (!user) return
    const scheduledFor = `${todayKey()}T${time}:00.000Z`
    const { error } = await supabase.from('med_logs').insert({
      user_id: user.id,
      med_id: med.id,
      scheduled_for: scheduledFor,
      taken: true,
      taken_at: new Date().toISOString(),
    })
    if (error) throw error
    await load()
  }

  async function undoTaken(logId: string) {
    const { error } = await supabase.from('med_logs').delete().eq('id', logId)
    if (error) throw error
    await load()
  }

  return { meds, todayLogs, last7DaysLogs, loading, addMed, updateMed, deleteMed, markTaken, undoTaken }
}
