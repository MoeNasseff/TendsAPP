import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import type { Dog, DogItem } from '../../lib/types'

export interface DogItemInput {
  kind: DogItem['kind']
  name: string
  description: string
  image_url: string | null
  dose: string
  schedule_type: DogItem['schedule_type']
  due_at: string | null
  repeat_interval_days: number | null
}

export function useDog() {
  const { user } = useAuth()
  const [dog, setDog] = useState<Dog | null>(null)
  const [items, setItems] = useState<DogItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data: dogs } = await supabase.from('dogs').select('*').order('created_at').limit(1)
    const activeDog = dogs?.[0] ?? null
    setDog(activeDog)

    if (activeDog) {
      const { data } = await supabase.from('dog_items').select('*').eq('dog_id', activeDog.id).order('due_at')
      setItems(data ?? [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('dogs', load)
  useRealtime('dog_items', load)

  async function addItem(input: DogItemInput) {
    if (!user || !dog) return
    const { error } = await supabase.from('dog_items').insert({ user_id: user.id, dog_id: dog.id, ...input })
    if (error) throw error
    await load()
  }

  async function updateItem(id: string, input: DogItemInput) {
    const { error } = await supabase.from('dog_items').update(input).eq('id', id)
    if (error) throw error
    await load()
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from('dog_items').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  async function markDone(item: DogItem) {
    const now = new Date()
    if (item.schedule_type === 'recurring' && item.repeat_interval_days) {
      const nextDue = new Date(now.getTime() + item.repeat_interval_days * 86_400_000)
      const { error } = await supabase
        .from('dog_items')
        .update({ last_done_at: now.toISOString(), due_at: nextDue.toISOString() })
        .eq('id', item.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('dog_items')
        .update({ last_done_at: now.toISOString(), active: false })
        .eq('id', item.id)
      if (error) throw error
    }
    await load()
  }

  return { dog, items, loading, addItem, updateItem, deleteItem, markDone }
}
