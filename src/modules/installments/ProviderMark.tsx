import { useState } from 'react'
import { logoPath, monogram, NEUTRAL_BRAND, providerFor } from './providers'

/**
 * Brand tile: the provider's supplied logo from `public/brand/` when one
 * exists, otherwise a monogram on the brand colour — a provider with no
 * artwork is a normal state, not a broken image. Shared by every place that
 * shows a bank/provider mark (installments, accounts, the bank-SMS inbox)
 * rather than each re-deriving the same logo/monogram fallback. Kept out of
 * providers.ts so that file stays plain data/logic — Fast Refresh only works
 * on a module that exports components alone.
 *
 * `shape` defaults to the rounded-lg tile installments/accounts use; pass
 * `rounded-full` for a circular badge slot instead — the fallback logic is
 * identical either way, only the outer clip changes.
 */
export function ProviderMark({
  slug,
  label,
  size = 40,
  shape = 'rounded-lg',
}: {
  slug: string | null
  label: string
  size?: number
  shape?: string
}) {
  const provider = providerFor(slug)
  const src = logoPath(provider)
  const [logoFailed, setLogoFailed] = useState(false)
  const showLogo = src !== null && !logoFailed
  const cover = provider?.logoFit !== 'contain'

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden font-semibold text-white ${shape}`}
      style={{
        background: showLogo ? (provider?.logoBg ?? 'transparent') : (provider?.brand ?? NEUTRAL_BRAND),
        width: size,
        height: size,
        fontSize: size * 0.36,
      }}
      aria-hidden="true"
    >
      {showLogo ? (
        <img
          src={src}
          alt=""
          className={cover ? 'h-full w-full object-cover' : 'h-full w-full object-contain p-1'}
          onError={() => setLogoFailed(true)}
        />
      ) : (
        monogram(label)
      )}
    </div>
  )
}
