import { useSyncExternalStore } from 'react'
import { getPrivacySnapshot, subscribePrivacy, togglePrivacy } from '../lib/privacy'

export function usePrivacy() {
  const hidden = useSyncExternalStore(subscribePrivacy, getPrivacySnapshot, () => false)
  return { hidden, toggle: togglePrivacy }
}
