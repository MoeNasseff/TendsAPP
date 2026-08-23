import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'
import { SensitiveValue } from './SensitiveValue'

/**
 * The icon stays a small accent mark rather than sitting in a tinted rounded
 * square. TailAdmin's own metric cards do use the tinted-container pattern, so
 * this is a deliberate hold-over from the previous system rather than an
 * oversight — see the No-Chip Rule under "Superseded rules" in DESIGN.md.
 * Hierarchy is carried by the stat numeral against a tracked uppercase label.
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
        <span className="truncate text-micro font-medium uppercase text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 shrink-0 text-brand-500 dark:text-brand-400" aria-hidden="true" />
      </div>
      <div className="truncate text-stat font-semibold text-gray-900 dark:text-white">
        {sensitive ? <SensitiveValue>{value}</SensitiveValue> : value}
      </div>
    </Card>
  )
}
