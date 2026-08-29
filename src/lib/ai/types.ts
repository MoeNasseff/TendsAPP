export type AICapability = 'vision' | 'structuredOutput' | 'text' | 'reasoning'

/** One thing a provider can do, and what identifies it. Capability-flagged
 * so a provider missing what a task needs is never selectable for it. */
export interface AIProvider {
  id: string
  label: string
  capabilities: readonly AICapability[]
}

/** A user's own key for one provider — the shape `ai_provider_configs`
 * exposes to the browser.
 *
 * `apiKey` is deliberately absent. The column is not selectable by the
 * authenticated role (see 20260816000002_ai_provider_configs.sql), so the
 * client can know *that* a key is set and never what it is; `ai-proxy`
 * reads the value server-side. A field holding a key that can never be
 * populated would be a landmine, so there isn't one. */
export interface AIProviderConfig {
  provider: string
  hasKey: boolean
  enabled: boolean
  createdAt: string
  /** Null until the proxy's first successful BYOK call for this row. */
  lastUsedAt: string | null
}

export type AIResolution =
  | { status: 'byok'; provider: AIProvider }
  | { status: 'managed'; provider: AIProvider }
  | { status: 'unavailable' }

export function providerSupports(provider: AIProvider, capability: AICapability): boolean {
  return provider.capabilities.includes(capability)
}
