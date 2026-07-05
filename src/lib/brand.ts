import { createContext } from 'react'
import brandConfig from '../../brand.config.json'

export interface BrandConfig {
  appName: string
  shortName: string
  tagline: string
  logo: { src: string; alt: string }
  favicon: string
  icon192: string
  icon512: string
  iconMaskable: string
  font: { family: string; url: string }
  colors: {
    brandPrimary: string
    brandSecondary: string
    brandAccent: string
    brandOnPrimary: string
  }
}

export const brand: BrandConfig = brandConfig as BrandConfig

export const BrandContext = createContext<BrandConfig>(brand)
