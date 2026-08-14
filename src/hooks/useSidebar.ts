import { useSyncExternalStore } from 'react'
import { getSidebarSnapshot, setCollapsed, subscribeSidebar, toggleSidebar } from '../lib/sidebar'

export function useSidebar() {
  const state = useSyncExternalStore(subscribeSidebar, getSidebarSnapshot, () => 'expanded' as const)
  return { state, collapsed: state === 'collapsed', setCollapsed, toggle: toggleSidebar }
}
