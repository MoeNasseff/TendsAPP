export function formatCurrency(amount: number, currency = 'EGP') {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

export function getTimeLeft(date: Date) {
  const diff = date.getTime() - Date.now()
  if (diff < 0) return 'Overdue'
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  if (days > 0) return `${days}d ${hours}h`
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

/* ---------------------- Body measurement units ----------------------
 * Values are stored canonically in cm and kg. These convert for display and
 * back on input, so switching unit system never rewrites stored history.
 * ------------------------------------------------------------------- */

const CM_PER_INCH = 2.54
const LB_PER_KG = 2.2046226218

export type UnitSystemName = 'metric' | 'imperial'

export const lengthUnit = (u: UnitSystemName) => (u === 'metric' ? 'cm' : 'in')
export const weightUnit = (u: UnitSystemName) => (u === 'metric' ? 'kg' : 'lb')

/** Stored cm to the displayed unit. */
export function toDisplayLength(cm: number, u: UnitSystemName) {
  return u === 'metric' ? cm : cm / CM_PER_INCH
}

/** Displayed unit back to cm for storage. */
export function toStoredLength(value: number, u: UnitSystemName) {
  return u === 'metric' ? value : value * CM_PER_INCH
}

export function toDisplayWeight(kg: number, u: UnitSystemName) {
  return u === 'metric' ? kg : kg * LB_PER_KG
}

export function toStoredWeight(value: number, u: UnitSystemName) {
  return u === 'metric' ? value : value / LB_PER_KG
}

/** One decimal is the practical limit of a tape measure or bathroom scale. */
export function formatMeasure(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(1)} ${unit}`
}

export function calcBmi(weightKg: number, heightCm: number) {
  const m = heightCm / 100
  if (m <= 0) return null
  return weightKg / (m * m)
}

/** Standard WHO adult bands. */
export function bmiBand(bmi: number): { label: string; tone: string } {
  if (bmi < 18.5) return { label: 'Underweight', tone: 'text-sky-400' }
  if (bmi < 25) return { label: 'Healthy', tone: 'text-emerald-400' }
  if (bmi < 30) return { label: 'Overweight', tone: 'text-amber-400' }
  return { label: 'Obese', tone: 'text-red-400' }
}

/** Whole years from a birth date. */
export function ageFrom(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const monthDiff = now.getMonth() - b.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) age--
  return age >= 0 ? age : null
}
