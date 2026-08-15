import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'
import { SensitiveValue } from './SensitiveValue'

/**
 * The icon deliberately does not sit in a tinted rounded square. That pattern
 * was on every module and is the most recognisable generated-UI signature in
 * the app; here the icon is demoted to a small accent mark and the hierarchy
 * is carried by the serif numeral against a tracked uppercase label.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  sensitive = false,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  sensitive?: boolean
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-micro font-medium uppercase text-white/50">{label}</span>
        <Icon className="h-3.5 w-3.5 shrink-0 text-mood-accent" aria-hidden="true" />
      </div>
      <div className="truncate font-display text-stat text-white">
        {sensitive ? <SensitiveValue>{value}</SensitiveValue> : value}
      </div>
    </Card>
  )
}
