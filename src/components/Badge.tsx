import type { ReactNode } from 'react'

/**
 * Pill badge, ported from the TailAdmin reference
 * (`…/free-react-tailwind-admin-dashboard-main/src/components/ui/badge/Badge.tsx`).
 * Class strings are byte-identical to the source so cloned markup renders the
 * same; only the export style is changed to a named export, per this project.
 *
 * Two deliberate divergences from the reference:
 *  - The `info` variant is dropped. It resolves `blue-light-*`, which Tend's
 *    theme does not define — it would render an unstyled badge.
 *  - `dark:text-orange-400` on light/warning is the source's own inconsistency
 *    (every other light variant uses its own -500 ramp). Kept, so a diff
 *    against the template stays clean.
 */

type BadgeVariant = 'light' | 'solid'
type BadgeSize = 'sm' | 'md'
type BadgeColor = 'primary' | 'success' | 'error' | 'warning' | 'light' | 'dark'

const BASE = 'inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium'

const SIZES: Record<BadgeSize, string> = {
  sm: 'text-theme-xs',
  md: 'text-sm',
}

const VARIANTS: Record<BadgeVariant, Record<BadgeColor, string>> = {
  light: {
    primary: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
    success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
    error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
    light: 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80',
    dark: 'bg-gray-500 text-white dark:bg-white/5 dark:text-white',
  },
  solid: {
    primary: 'bg-brand-500 text-white dark:text-white',
    success: 'bg-success-500 text-white dark:text-white',
    error: 'bg-error-500 text-white dark:text-white',
    warning: 'bg-warning-500 text-white dark:text-white',
    light: 'bg-gray-400 dark:bg-white/5 text-white dark:text-white/80',
    dark: 'bg-gray-700 text-white dark:text-white',
  },
}

export function Badge({
  variant = 'light',
  color = 'primary',
  size = 'md',
  startIcon,
  endIcon,
  children,
}: {
  variant?: BadgeVariant
  size?: BadgeSize
  color?: BadgeColor
  startIcon?: ReactNode
  endIcon?: ReactNode
  children: ReactNode
}) {
  return (
    <span className={`${BASE} ${SIZES[size]} ${VARIANTS[variant][color]}`}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  )
}
