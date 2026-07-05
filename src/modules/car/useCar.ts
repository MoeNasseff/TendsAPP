import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import type { Car, CarService, OdometerLog } from '../../lib/types'

export interface CarServiceInput {
  part: CarService['part']
  label: string
  last_service_km: number | null
  last_service_date: string | null
  interval_km: number | null
  interval_days: number | null
  note: string
}

export function useCar() {
  const { user } = useAuth()
  const [car, setCar] = useState<Car | null>(null)
  const [services, setServices] = useState<CarService[]>([])
  const [logs, setLogs] = useState<OdometerLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data: cars } = await supabase.from('cars').select('*').order('created_at').limit(1)
    const activeCar = cars?.[0] ?? null
    setCar(activeCar)

    if (activeCar) {
      const [servicesRes, logsRes] = await Promise.all([
        supabase.from('car_services').select('*').eq('car_id', activeCar.id).order('part'),
        supabase.from('odometer_logs').select('*').eq('car_id', activeCar.id).order('logged_at', { ascending: false }).limit(10),
      ])
      setServices(servicesRes.data ?? [])
      setLogs(logsRes.data ?? [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('cars', load)
  useRealtime('car_services', load)
  useRealtime('odometer_logs', load)

  async function addOdometerReading(readingKm: number) {
    if (!user || !car) return
    const { error: logError } = await supabase.from('odometer_logs').insert({
      user_id: user.id,
      car_id: car.id,
      reading_km: readingKm,
      logged_at: new Date().toISOString().slice(0, 10),
    })
    if (logError) throw logError

    const { error: carError } = await supabase
      .from('cars')
      .update({ current_odometer_km: readingKm })
      .eq('id', car.id)
    if (carError) throw carError
    await load()
  }

  async function addService(input: CarServiceInput) {
    if (!user || !car) return
    const { error } = await supabase.from('car_services').insert({ user_id: user.id, car_id: car.id, ...input })
    if (error) throw error
    await load()
  }

  async function updateService(id: string, input: CarServiceInput) {
    const { error } = await supabase.from('car_services').update(input).eq('id', id)
    if (error) throw error
    await load()
  }

  async function deleteService(id: string) {
    const { error } = await supabase.from('car_services').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  return { car, services, logs, loading, addOdometerReading, addService, updateService, deleteService }
}
