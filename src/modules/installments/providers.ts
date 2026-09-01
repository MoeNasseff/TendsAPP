import type { PaymentMethodKind } from '../../lib/types'

/**
 * Known funding providers, for display only.
 *
 * LOGOS: ValU, Sympl, CIB and FAB Misr are third-party trademarks. The files
 * under `public/brand/` were supplied by the app's owner, who is responsible
 * for having the right to use them; nothing here fetches or bundles a mark on
 * its own. A provider with no `logo` renders a monogram tile instead, which is
 * a first-class state rather than a broken image.
 *
 * The artwork is not uniform, so each entry declares how to fit it:
 *   'cover'   — square app-icon art that already carries its own background
 *               (Sympl, CIB, FAB Misr). Fills the tile edge to edge.
 *   'contain' — a wide wordmark on its own flat background (ValU, teal on
 *               white). Letterboxed on `logoBg` so the artwork's background
 *               and the tile's agree instead of showing a white rectangle
 *               floating on a coloured square.
 *
 * `brand` is only used for the monogram fallback and is an approximation
 * chosen for legibility in both themes, not a sampled brand value.
 */

export interface Provider {
  slug: string
  label: string
  kind: PaymentMethodKind
  /** Monogram tile background. Text on it is always white. */
  brand: string
  /** Filename under `public/brand/`. Omitted ⇒ monogram. */
  logo?: string
  logoFit?: 'cover' | 'contain'
  /** Tile background behind a 'contain' logo — match the artwork's own. */
  logoBg?: string
}

export const PROVIDERS: readonly Provider[] = [
  { slug: 'valu', label: 'ValU', kind: 'bnpl', brand: '#0ea5a4', logo: 'valu.jpeg', logoFit: 'contain', logoBg: '#ffffff' },
  { slug: 'sympl', label: 'Sympl', kind: 'bnpl', brand: '#f43f5e', logo: 'sympl.png', logoFit: 'cover' },
  { slug: 'aman', label: 'Aman', kind: 'bnpl', brand: '#b45309' },
  { slug: 'contact', label: 'Contact', kind: 'bnpl', brand: '#be123c' },
  { slug: 'forsa', label: 'Forsa', kind: 'bnpl', brand: '#1d4ed8' },
  { slug: 'halan', label: 'Halan', kind: 'bnpl', brand: '#c2410c' },
  { slug: 'cib', label: 'CIB', kind: 'credit_card', brand: '#00539f', logo: 'CIB-bank.png', logoFit: 'cover' },
  { slug: 'fab-misr', label: 'FAB Misr', kind: 'credit_card', brand: '#1b2a63', logo: 'FAB-bank.png', logoFit: 'cover' },
  { slug: 'nbe', label: 'NBE', kind: 'credit_card', brand: '#065f46', logo: 'NBE-bank.png', logoFit: 'cover' },
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

/** Public URL of a provider's logo, or null when it has none and the caller
 *  should fall back to the monogram. */
export function logoPath(provider: Provider | null): string | null {
  return provider?.logo ? `/brand/${provider.logo}` : null
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
