import type { PaymentMethodKind } from '../../lib/types'

/**
 * Known funding providers, for display only.
 *
 * LOGOS: ValU, Sympl and every bank named here are third-party trademarks.
 * No logo file is bundled with this app. Each entry carries a brand colour and
 * a slug; `logoPath` points at `/brands/<slug>.svg`, which is absent by
 * default, and the UI falls back to a monogram tile. If those files are ever
 * added, that is a deliberate act by whoever has satisfied themselves they may
 * use the marks — it is not something this module does on its own.
 *
 * Brand colours below are approximations chosen for legibility against both
 * themes, not sampled from any brand guideline.
 */

export interface Provider {
  slug: string
  label: string
  kind: PaymentMethodKind
  /** Tile background. Monogram text is always white on top of it. */
  brand: string
}

export const PROVIDERS: readonly Provider[] = [
  { slug: 'valu', label: 'ValU', kind: 'bnpl', brand: '#6d28d9' },
  { slug: 'sympl', label: 'Sympl', kind: 'bnpl', brand: '#0f766e' },
  { slug: 'aman', label: 'Aman', kind: 'bnpl', brand: '#b45309' },
  { slug: 'contact', label: 'Contact', kind: 'bnpl', brand: '#be123c' },
  { slug: 'forsa', label: 'Forsa', kind: 'bnpl', brand: '#1d4ed8' },
  { slug: 'halan', label: 'Halan', kind: 'bnpl', brand: '#c2410c' },
  { slug: 'cib', label: 'CIB', kind: 'credit_card', brand: '#7c2d12' },
  { slug: 'nbe', label: 'NBE', kind: 'credit_card', brand: '#065f46' },
  { slug: 'banque-misr', label: 'Banque Misr', kind: 'credit_card', brand: '#9f1239' },
  { slug: 'qnb', label: 'QNB', kind: 'credit_card', brand: '#5b21b6' },
  { slug: 'alexbank', label: 'AlexBank', kind: 'credit_card', brand: '#1e40af' },
  { slug: 'hsbc', label: 'HSBC', kind: 'credit_card', brand: '#991b1b' },
]

const BY_SLUG = new Map(PROVIDERS.map((p) => [p.slug, p]))

export function providerFor(slug: string | null): Provider | null {
  return slug ? (BY_SLUG.get(slug) ?? null) : null
}

export function providersOfKind(kind: PaymentMethodKind): Provider[] {
  return PROVIDERS.filter((p) => p.kind === kind)
}

/** Path a logo *would* live at. The file is not shipped; callers must handle
 *  its absence, which is the normal case. */
export function logoPath(slug: string): string {
  return `/brands/${slug}.svg`
}

/** Up to two letters, skipping articles, for the fallback tile. */
export function monogram(label: string): string {
  const words = label.split(/[\s-]+/).filter((w) => w.length > 0 && !/^(the|of|al)$/i.test(w))
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** Fallback tint for a method with no recognised provider. */
export const NEUTRAL_BRAND = '#667085'
