import { useSyncExternalStore } from 'react'
import { getEffectiveThemeSnapshot, getThemeSnapshot, setTheme, subscribeTheme } from '../lib/theme'

export function useTheme() {
  const mode = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => 'dark' as const)
  const effective = useSyncExternalStore(subscribeTheme, getEffectiveThemeSnapshot, () => 'dark' as const)
  return { mode, effective, setTheme }
}
