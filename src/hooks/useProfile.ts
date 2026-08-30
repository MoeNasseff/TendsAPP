import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface Profile {
  display_name: string | null
  avatar_url: string | null
  /** Off by default. Governs whether sms-ingest may send a bank text's raw
   *  content to the AI fallback when no deterministic parser can read it —
   *  see supabase/functions/sms-ingest/ai-parse.ts. */
  sms_ai_parsing_enabled: boolean
}

const EMPTY_PROFILE: Profile = { display_name: null, avatar_url: null, sms_ai_parsing_enabled: false }

/** Shared by UserAvatar (initials/photo) and SettingsPage (edit form) so
 * both read the same row instead of issuing separate queries. */
export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(EMPTY_PROFILE)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('profiles')
      .select('display_name, avatar_url, sms_ai_parsing_enabled')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        if (data) setProfile(data)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) return { error: new Error('Not signed in') }
      const previous = profile
      setProfile((p) => ({ ...p, ...patch }))
      const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
      if (error) setProfile(previous)
      return { error }
    },
    [user, profile],
  )

  return { profile, loading, updateProfile }
}
