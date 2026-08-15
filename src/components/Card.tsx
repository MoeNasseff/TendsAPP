import type { HTMLAttributes } from 'react'

/**
 * Content surface. Solid, one ramp step above the page, hairline stroke, no
 * shadow — depth comes from `.surface-card` in index.css, not from elevation.
 * Distinct from `.glass`, which stays translucent for app chrome.
 */
export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`surface-card rounded-2xl border p-5 ${className}`} {...rest} />
}
