/**
 * Theme mode: 'light' | 'dark' | 'system'. Persisted and resolved the same
 * way as the inline bootstrap script in index.html — keep the two in sync,
 * since that script sets the initial `data-theme` before this module loads
 * and this store must agree with it or the page flips on hydration.
 */
const STORAGE_KEY = 'tend:theme'

export type ThemeMode = 'light' | 'dark' | 'system'
export type EffectiveTheme = 'light' | 'dark'

const listeners = new Set<() => void>()

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark'
  } catch {
    // Safari private mode throws on localStorage access rather than returning null.
    return 'dark'
  }
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(mode: ThemeMode): EffectiveTheme {
  return mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode
}

let mode = readStoredMode()
let effective = resolve(mode)

function applyToDocument() {
  document.documentElement.setAttribute('data-theme', effective)
}

// Only matters while mode === 'system': the OS preference can change out
// from under an open tab (e.g. sunset-triggered dark mode).
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (mode !== 'system') return
  effective = resolve(mode)
  applyToDocument()
  for (const listener of listeners) listener()
})

export function subscribeTheme(onChange: () => void) {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function getThemeSnapshot() {
  return mode
}

export function getEffectiveThemeSnapshot() {
  return effective
}

export function setTheme(next: ThemeMode) {
  mode = next
  effective = resolve(mode)
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Preference simply does not survive a reload when storage is unavailable.
  }
  applyToDocument()
  for (const listener of listeners) listener()
}
