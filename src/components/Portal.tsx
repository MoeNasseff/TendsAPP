import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/**
 * Renders children into document.body instead of the local DOM position.
 * Needed for fixed-position overlays (modals/dialogs): an ancestor with
 * `backdrop-filter` or `filter` becomes the containing block for
 * `position: fixed` descendants per the CSS spec, which breaks full-viewport
 * modals nested under any `.glass` element (backdrop-filter: blur(...)).
 */
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}
