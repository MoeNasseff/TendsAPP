import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { resolveProvider } from '../lib/ai/client'
import { geminiProvider, runGemini, GEMINI_DEFAULT_MODEL } from '../lib/ai/gemini'
import type { AICapability, AIProvider, AIProviderConfig, AIResolution } from '../lib/ai/types'

/**
 * Session 8 / Packet 5c — the settings surface for AI providers.
 *
 * Shaped after `useProfile.ts`: one row-backed slice of state, a loader, and
 * mutations that patch optimistically and roll back on failure.
 *
 * Two things this hook will never do, both enforced by the schema rather than
 * by convention (see 20260816000002_ai_provider_configs.sql):
 *   - read a key back. `api_key` is excluded from the authenticated role's
 *     column grants, so `hasKey` is all the browser can ever learn.
 *   - select `*`. PostgREST would ask for the ungranted column and the
 *     request would fail outright. Every select below names its columns.
 */

/** Providers offered in the UI. Only entries the proxy actually accepts —
 *  `ALLOWED_PROVIDERS` in supabase/functions/ai-proxy/index.ts is the gate,
 *  and listing anything else here would render a control that cannot work. */
export const AI_PROVIDERS: readonly AIProvider[] = [geminiProvider]

/** Columns the authenticated role is allowed to read. */
const SELECT_COLUMNS = 'id, provider, model, has_key, enabled, created_at, last_used_at'

interface ConfigRow {
  id: string
  provider: string
  model: string | null
  has_key: boolean
  enabled: boolean
  created_at: string
  last_used_at: string | null
}

export interface ProviderState extends AIProviderConfig {
  provider: string
  model: string | null
}

/** No row yet — the provider is offered but unconfigured. */
const emptyState = (provider: string): ProviderState => ({
  provider,
  model: null,
  hasKey: false,
  enabled: false,
  createdAt: '',
  lastUsedAt: null,
})

export type TestResult = { ok: true } | { ok: false; reason: string }

export function useAIProviders() {
  const { user } = useAuth()
  const [states, setStates] = useState<ProviderState[]>(() =>
    AI_PROVIDERS.map((p) => emptyState(p.id)),
  )
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setStates(AI_PROVIDERS.map((p) => emptyState(p.id)))
      setLoading(false)
      return
    }
    const { data } = await supabase.from('ai_provider_configs').select(SELECT_COLUMNS)
    const rows = (data ?? []) as ConfigRow[]
    setStates(
      AI_PROVIDERS.map((p) => {
        const row = rows.find((r) => r.provider === p.id)
        if (!row) return emptyState(p.id)
        return {
          provider: p.id,
          model: row.model,
          hasKey: row.has_key,
          enabled: row.enabled,
          createdAt: row.created_at,
          lastUsedAt: row.last_used_at,
        }
      }),
    )
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  /**
   * Stores a key. The value goes straight to the column and is never held in
   * state, so nothing in this module can re-render it. `has_key` is a
   * generated column, so the optimistic `hasKey: true` below is what the
   * database will independently compute.
   */
  const saveKey = useCallback(
    async (provider: string, apiKey: string, model?: string | null) => {
      if (!user) return { error: new Error('Not signed in') }
      const previous = states
      setStates((prev) =>
        prev.map((s) => (s.provider === provider ? { ...s, hasKey: true, enabled: true } : s)),
      )
      // Plain insert, falling back to update on conflict -- not `.upsert()`.
      // Postgres's `ON CONFLICT DO UPDATE` needs SELECT on every column
      // referenced via `excluded.*`, including `api_key`, which is
      // deliberately never granted to `authenticated` (see
      // 20260816000002_ai_provider_configs.sql). That combination makes a
      // single upsert call permission-denied by construction; this two-step
      // form never references `excluded` and works under the same grants.
      const { error: insertError } = await supabase.from('ai_provider_configs').insert({
        user_id: user.id,
        provider,
        api_key: apiKey,
        model: model ?? null,
        enabled: true,
      })
      let error = insertError
      if (insertError?.code === '23505') {
        const { error: updateError } = await supabase
          .from('ai_provider_configs')
          .update({ api_key: apiKey, model: model ?? null, enabled: true })
          .eq('user_id', user.id)
          .eq('provider', provider)
        error = updateError
      }
      if (error) setStates(previous)
      else await load()
      return { error }
    },
    [user, states, load],
  )

  const setEnabled = useCallback(
    async (provider: string, enabled: boolean) => {
      if (!user) return { error: new Error('Not signed in') }
      const previous = states
      setStates((prev) => prev.map((s) => (s.provider === provider ? { ...s, enabled } : s)))
      const { error } = await supabase
        .from('ai_provider_configs')
        .update({ enabled })
        .eq('user_id', user.id)
        .eq('provider', provider)
      if (error) setStates(previous)
      return { error }
    },
    [user, states],
  )

  /** Clears the stored key by deleting the row outright — an empty string
   *  would leave `has_key` false but the row present, which reads as
   *  "configured then broken" rather than "not configured". */
  const removeKey = useCallback(
    async (provider: string) => {
      if (!user) return { error: new Error('Not signed in') }
      const previous = states
      setStates((prev) => prev.map((s) => (s.provider === provider ? emptyState(provider) : s)))
      const { error } = await supabase
        .from('ai_provider_configs')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider)
      if (error) setStates(previous)
      return { error }
    },
    [user, states],
  )

  /**
   * The reveal affordance's replacement: proves a key works without ever
   * showing it. Sends the smallest possible interaction through the proxy,
   * which loads the key server-side.
   */
  const testConnection = useCallback(
    async (provider: string): Promise<TestResult> => {
      const state = states.find((s) => s.provider === provider)
      const definition = AI_PROVIDERS.find((p) => p.id === provider)
      if (!definition) return { ok: false, reason: 'Unknown provider' }

      setTesting(provider)
      try {
        const resolution: AIResolution = state?.hasKey
          ? { status: 'byok', provider: definition }
          : { status: 'managed', provider: definition }

        const result = await runGemini(resolution, {
          input: [{ type: 'text', text: 'Reply with OK.' }],
          model: state?.model ?? GEMINI_DEFAULT_MODEL,
        })

        if (result.ok) return { ok: true }
        const reasons: Record<string, string> = {
          unavailable: 'No provider is configured — add a key, or use manual entry.',
          byok_not_configured: 'No key stored for this provider yet.',
          provider_error: 'The provider rejected the request. Check the key.',
          transport_error: 'Could not reach the service. Check your connection.',
        }
        return { ok: false, reason: reasons[result.reason] ?? 'Test failed.' }
      } finally {
        setTesting(null)
      }
    },
    [states],
  )

  /** What a scan would actually do right now, for the honest status line. */
  const resolutionFor = useCallback(
    (capability: AICapability): AIResolution => {
      const byokState = states.find((s) => s.hasKey && s.enabled)
      const byokProvider = byokState && AI_PROVIDERS.find((p) => p.id === byokState.provider)
      return resolveProvider({
        capability,
        byok: byokProvider ? { provider: byokProvider, config: byokState } : null,
        // The managed path exists whenever the proxy has its own key. The
        // browser cannot know that, so it is offered and the proxy answers
        // 'unavailable' if it is not set — an honest runtime answer beats a
        // guess rendered at load time.
        managed: { provider: geminiProvider },
      })
    },
    [states],
  )

  return {
    providers: AI_PROVIDERS,
    states,
    loading,
    testing,
    saveKey,
    setEnabled,
    removeKey,
    testConnection,
    resolutionFor,
    reload: load,
  }
}
