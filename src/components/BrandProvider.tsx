import { useEffect, type ReactNode } from 'react'
import { brand, BrandContext } from '../lib/brand'

export function BrandProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--brand-primary', brand.colors.brandPrimary)
    root.setProperty('--brand-secondary', brand.colors.brandSecondary)
    root.setProperty('--brand-accent', brand.colors.brandAccent)
    root.setProperty('--brand-on-primary', brand.colors.brandOnPrimary)
  }, [])

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}
