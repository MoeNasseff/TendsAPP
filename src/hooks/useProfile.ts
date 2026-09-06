import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface Profile {
  display_name: string | null
  avatar_url: string | null
  /** Cloned /profile page fields — see 20260906130000_profile_fields.sql.
   *  first/last name sit alongside display_name rather than replacing it:
   *  display_name is what UserAvatar and the header already render. */
  first_name: string | null
  last_name: string | null
  phone: string | null
  bio: string | null
  country: string | null
  city_state: string | null
  postal_code: string | null
  tax_id: string | null
  social_facebook: string | null
  social_x: string | null
  social_linkedin: string | null
  social_instagram: string | null
  /** Off by default. Governs whether sms-ingest may send a bank text's raw
   *  content to the AI fallback when no deterministic parser can read it —
   *  see supabase/functions/sms-ingest/ai-parse.ts. */
  sms_ai_parsing_enabled: boolean
}

const EMPTY_PROFILE: Profile = {
  display_name: null,
  avatar_url: null,
  first_name: null,
  last_name: null,
  phone: null,
  bio: null,
  country: null,
  city_state: null,
  postal_code: null,
  tax_id: null,
  social_facebook: null,
  social_x: null,
  social_linkedin: null,
  social_instagram: null,
  sms_ai_parsing_enabled: false,
}

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
      // Enumerated, not '*': profiles also holds push_subscription (a large
      // jsonb) and the notification channels, none of which this hook exposes.
      .select('display_name, avatar_url, first_name, last_name, phone, bio, country, city_state, postal_code, tax_id, social_facebook, social_x, social_linkedin, social_instagram, sms_ai_parsing_enabled')
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
