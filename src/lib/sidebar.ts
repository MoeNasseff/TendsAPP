/**
 * Sidebar state. Module-level store read through useSyncExternalStore,
 * mirroring src/lib/privacy.ts and src/lib/theme.ts — same pattern, same
 * reasons.
 *
 * TailAdmin's SidebarContext tracks three things, and all three are needed
 * here because the shell's left margin is derived from them:
 *   - collapsed  — the desktop rail toggle. Persisted; it is a preference.
 *   - mobileOpen — the drawer below lg. Deliberately NOT persisted: restoring
 *                  a reload into an open drawer over the content is wrong.
 *   - hovered    — hovering a collapsed rail expands it temporarily. Ephemeral
 *                  by definition, but it has to live here rather than as local
 *                  state because AppShell reads it to widen its margin in step
 *                  with the sidebar.
 *
 * Separate snapshot getters per field rather than one object, because
 * useSyncExternalStore compares snapshots by identity and a fresh object every
 * call would loop.
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
let mobileOpen = false
let hovered = false

function emit() {
  for (const listener of listeners) listener()
}

export function subscribeSidebar(onChange: () => void) {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function getSidebarSnapshot() {
  return state
}

export function getMobileOpenSnapshot() {
  return mobileOpen
}

export function getHoveredSnapshot() {
  return hovered
}

export function setCollapsed(collapsed: boolean) {
  state = collapsed ? 'collapsed' : 'expanded'
  try {
    localStorage.setItem(STORAGE_KEY, state)
  } catch {
    // Preference simply does not survive a reload when storage is unavailable.
  }
  emit()
}

export function toggleSidebar() {
  setCollapsed(state === 'expanded')
}

export function setMobileOpen(open: boolean) {
  if (mobileOpen === open) return
  mobileOpen = open
  emit()
}

export function toggleMobileSidebar() {
  setMobileOpen(!mobileOpen)
}

export function setHovered(next: boolean) {
  if (hovered === next) return
  hovered = next
  emit()
}
