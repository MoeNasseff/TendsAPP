import { useSidebar } from '../hooks/useSidebar'

/**
 * Port of TailAdmin's Backdrop (layout/Backdrop.tsx). Dims the page behind the
 * mobile sidebar drawer and closes it on tap. Only mounts while the drawer is
 * open, and only below xl — above that the sidebar is in flow, not overlaid.
 * The breakpoint tracks Sidebar's `xl:translate-x-0`; the two must move
 * together or the page dims behind a sidebar that is already on screen.
 */
export function Backdrop() {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar()

  if (!isMobileOpen) return null

  return (
    <button
      type="button"
      aria-label="Close menu"
      onClick={toggleMobileSidebar}
      className="fixed inset-0 z-40 bg-gray-900/50 xl:hidden"
    />
  )
}
