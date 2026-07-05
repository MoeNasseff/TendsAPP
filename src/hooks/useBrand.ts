import { useContext } from 'react'
import { BrandContext } from '../lib/brand'

export function useBrand() {
  return useContext(BrandContext)
}
