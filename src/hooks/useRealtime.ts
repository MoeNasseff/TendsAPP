import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(table: string, onChange: () => void) {
  const callbackRef = useRef(onChange)
  callbackRef.current = onChange

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-realtime`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => callbackRef.current())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table])
}
