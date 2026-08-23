import { type ReactNode } from 'react'
import { brand, BrandContext } from '../lib/brand'

/**
 * Supplies brand identity (name, logo, favicon, manifest icons) through context.
 *
 * It deliberately does NOT write colour custom properties any more. It used to
 * set --brand-primary/-secondary/-accent/-on-primary as INLINE styles on <html>,
 * which caused two problems:
 *
 *   1. An inline style outranks every stylesheet rule, so `[data-theme='light']`
 *      could never override --brand-secondary and the light theme rendered with
 *      the dark page ground. See tasks/current-theme-spec.md §1.14.
 *   2. Since pass 2 those token names no longer exist — the palette moved into
 *      the @theme block in src/index.css, which is now the single source of
 *      truth for colour and is theme-scopable.
 *
 * brand.config.json still owns the colours used for the PWA manifest's
 * theme_color (via scripts/gen-brand.ts) and the logo/favicon assets below.
 */
export function BrandProvider({ children }: { children: ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}
