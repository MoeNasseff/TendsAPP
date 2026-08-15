import type { ReactNode } from 'react'
import { usePrivacy } from '../hooks/usePrivacy'

/**
 * Wraps a value that should be obscured while privacy mode is on. Tapping it
 * turns privacy mode off globally, matching the single-toggle model in Header.
 */
export function SensitiveValue({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { hidden, toggle } = usePrivacy()

  if (!hidden) return <span className={className}>{children}</span>

  return (
    <button
      type="button"
      onClick={toggle}
      title="Tap to reveal"
      aria-label="Hidden value — tap to reveal"
      className={`select-none blur-[6px] transition-[filter] duration-base ease-out-expo hover:blur-[4px] ${className}`}
    >
      {children}
    </button>
  )
}
