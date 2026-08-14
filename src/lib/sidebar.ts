/**
 * Sidebar collapse state: the desktop sidebar can collapse to an icon rail
 * and expand back. Module-level store read through useSyncExternalStore,
 * mirroring src/lib/privacy.ts and src/lib/theme.ts — same pattern, same
 * reasons.
 */
const STORAGE_KEY = 'tend:sidebar'

export type SidebarState = 'expanded' | 'collapsed'

const listeners = new Set<() => void>()

function readInitial(): SidebarState {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'collapsed' ? 'collapsed' : 'expanded'
  } catch {
    // Safari private mode throws on localStorage access rather than returning null.
    return 'expanded'
  }
}

let state = readInitial()

export function subscribeSidebar(onChange: () => void) {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function getSidebarSnapshot() {
  return state
}

export function setCollapsed(collapsed: boolean) {
  state = collapsed ? 'collapsed' : 'expanded'
  try {
    localStorage.setItem(STORAGE_KEY, state)
  } catch {
    // Preference simply does not survive a reload when storage is unavailable.
  }
  for (const listener of listeners) listener()
}

export function toggleSidebar() {
  setCollapsed(state === 'expanded')
}
