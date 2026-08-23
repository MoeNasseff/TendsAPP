import { useSyncExternalStore } from 'react'
import {
  getHoveredSnapshot,
  getMobileOpenSnapshot,
  getSidebarSnapshot,
  setCollapsed,
  setHovered,
  setMobileOpen,
  subscribeSidebar,
  toggleMobileSidebar,
  toggleSidebar,
} from '../lib/sidebar'

/**
 * Mirrors TailAdmin's useSidebar surface (isExpanded / isMobileOpen /
 * isHovered / setIsHovered / toggleSidebar / toggleMobileSidebar) so the ported
 * AppSidebar and AppHeader read the same way as the reference. `collapsed` is
 * kept as the inverse of isExpanded for the call sites that predate the port.
 */
export function useSidebar() {
  const state = useSyncExternalStore(subscribeSidebar, getSidebarSnapshot, () => 'expanded' as const)
  const isMobileOpen = useSyncExternalStore(subscribeSidebar, getMobileOpenSnapshot, () => false)
  const isHovered = useSyncExternalStore(subscribeSidebar, getHoveredSnapshot, () => false)

  return {
    state,
    collapsed: state === 'collapsed',
    isExpanded: state === 'expanded',
    isMobileOpen,
    isHovered,
    setIsHovered: setHovered,
    setCollapsed,
    setMobileOpen,
    toggle: toggleSidebar,
    toggleSidebar,
    toggleMobileSidebar,
  }
}
