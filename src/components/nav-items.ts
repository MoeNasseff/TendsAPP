import { Wallet, Dog, Car, Pill } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/expenses', label: 'Expenses', icon: Wallet, mood: 'expenses' },
  { to: '/dog', label: 'Dog', icon: Dog, mood: 'dog' },
  { to: '/car', label: 'Car', icon: Car, mood: 'car' },
  { to: '/meds', label: 'Meds', icon: Pill, mood: 'meds' },
] as const
