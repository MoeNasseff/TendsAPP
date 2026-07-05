import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { seedDefaults } from '../lib/seed'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export function SeedGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const showToast = useToast()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function run() {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('seeded')
        .eq('id', user!.id)
        .single()

      if (!error && profile && !profile.seeded) {
        try {
          await seedDefaults(user!.id)
          if (!cancelled) showToast('Welcome! Sample data added to get you started.', 'success')
        } catch (err) {
          if (!cancelled) showToast(err instanceof Error ? err.message : 'Failed to seed sample data', 'error')
        }
      }

      if (!cancelled) setReady(true)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [user, showToast])

  if (!ready) {
    return <div className="min-h-svh bg-brand-secondary" />
  }

  return <>{children}</>
}
