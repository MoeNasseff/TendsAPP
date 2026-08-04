import { Wallet, Dog, Car, Pill, PersonStanding } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/expenses', label: 'Expenses', icon: Wallet, mood: 'expenses' },
  { to: '/dog', label: 'Dog', icon: Dog, mood: 'dog' },
  { to: '/car', label: 'Car', icon: Car, mood: 'car' },
  { to: '/meds', label: 'Meds', icon: Pill, mood: 'meds' },
  { to: '/body', label: 'Body', icon: PersonStanding, mood: 'body' },
] as const
