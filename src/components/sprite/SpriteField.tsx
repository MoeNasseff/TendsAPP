import type { ReactNode } from 'react'

/**
 * The layer every roaming decoration lives in.
 *
 * Fixed to the viewport so a sprite can wander the whole page rather than being
 * trapped in one block of the document, and so it keeps moving while the page
 * scrolls underneath it.
 *
 * Three properties make it safe to put over live content:
 *
 * - `pointer-events: none` means clicks, taps, drags and text selection all
 *   pass straight through. A sprite can sit directly on top of an input and the
 *   input still receives every event.
 * - `aria-hidden` keeps it out of the accessibility tree, so screen readers and
 *   tab order are untouched.
 * - `z-20` places it above page content but below every piece of chrome and
 *   interaction: the sidebar and header (z-30/z-40), bottom nav (z-40), modals
 *   (z-50) and due-reminder cards (z-90) all still paint over it. Nothing that
 *   the user needs to read or press can be covered.
 *
 * Insets keep the field clear of the fixed chrome, so sprites do not slide
 * under the header or behind the sidebar and vanish mid-stride.
 */
export function SpriteField({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-20 top-16 z-20 overflow-hidden sm:bottom-6 sm:left-56"
    >
      {children}
    </div>
  )
}
