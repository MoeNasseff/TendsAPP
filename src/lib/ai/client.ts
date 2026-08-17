import type { AICapability, AIProvider, AIProviderConfig, AIResolution } from './types'
import { providerSupports } from './types'

/**
 * Resolves which provider should handle a task needing `capability`, in
 * order: the user's own configured+enabled key (only if it actually
 * supports the capability), else the managed proxy (same check), else
 * 'unavailable'. 'unavailable' is a correct outcome, not a failure — the
 * caller (e.g. manual expense entry) must keep working with no provider
 * configured at all.
 *
 * Never silently falls back to a provider the user has not authorised: a
 * BYOK entry that fails the capability check does not fall through to the
 * managed proxy unless `managed` was itself explicitly passed in.
 */
export function resolveProvider(params: {
  capability: AICapability
  byok?: { provider: AIProvider; config: AIProviderConfig } | null
  managed?: { provider: AIProvider } | null
}): AIResolution {
  const { capability, byok, managed } = params

  // `hasKey` matters as much as `enabled`: an enabled config with no key
  // stored is not a usable BYOK path, and must not shadow the managed one.
  if (byok && byok.config.enabled && byok.config.hasKey && providerSupports(byok.provider, capability)) {
    return { status: 'byok', provider: byok.provider }
  }

  if (managed && providerSupports(managed.provider, capability)) {
    return { status: 'managed', provider: managed.provider }
  }

  return { status: 'unavailable' }
}
