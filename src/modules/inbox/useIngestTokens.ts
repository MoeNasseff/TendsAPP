import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { IngestToken } from '../../lib/types'

/**
 * The credential the iOS Shortcut authenticates with (see
 * supabase/functions/sms-ingest). Created entirely client-side: a random
 * token is minted in the browser, only its SHA-256 hash is ever sent to the
 * database, and the raw value is returned exactly once, to be shown and
 * copied — never stored anywhere, never readable again after this call
 * returns. RLS already lets a user insert their own ingest_tokens row (the
 * same own_rows policy every table gets), so this needs no edge function.
 */

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function useIngestTokens() {
  const { user } = useAuth()
  const [tokens, setTokens] = useState<IngestToken[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('ingest_tokens').select('*').order('created_at', { ascending: false })
    setTokens(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  async function createToken(label: string): Promise<{ raw: string | null; error: Error | null }> {
    if (!user) return { raw: null, error: new Error('Not signed in') }
    // crypto.subtle is gated on a secure context (HTTPS or localhost), same
    // as crypto.randomUUID — see lib/id.ts. Unlike that helper there is no
    // reasonable non-crypto fallback for SHA-256, so this fails loudly
    // rather than silently degrading to an unhashed or weaker token.
    if (typeof crypto === 'undefined' || typeof crypto.subtle === 'undefined') {
      return { raw: null, error: new Error('Creating a token needs a secure connection (HTTPS or localhost).') }
    }

    const raw = randomToken()
    const tokenHash = await sha256Hex(raw)
    const { error } = await supabase
      .from('ingest_tokens')
      .insert({ user_id: user.id, token_hash: tokenHash, label: label.trim() || null })
    if (error) return { raw: null, error }

    await load()
    return { raw, error: null }
  }

  async function revokeToken(id: string) {
    const { error } = await supabase
      .from('ingest_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) await load()
    return { error }
  }

  return { tokens, loading, createToken, revokeToken, reload: load }
}
