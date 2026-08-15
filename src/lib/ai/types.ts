export type AICapability = 'vision' | 'structuredOutput' | 'text' | 'reasoning'

/** One thing a provider can do, and what identifies it. Capability-flagged
 * so a provider missing what a task needs is never selectable for it. */
export interface AIProvider {
  id: string
  label: string
  capabilities: readonly AICapability[]
}

/** A user's own key for one provider — the shape `ai_provider_configs`
 * (Session 7) will hold. */
export interface AIProviderConfig {
  provider: string
  apiKey: string
  enabled: boolean
}

export type AIResolution =
  | { status: 'byok'; provider: AIProvider; apiKey: string }
  | { status: 'managed'; provider: AIProvider }
  | { status: 'unavailable' }

export function providerSupports(provider: AIProvider, capability: AICapability): boolean {
  return provider.capabilities.includes(capability)
}
