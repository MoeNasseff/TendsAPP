import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Icon className="h-6 w-6 text-white/25" aria-hidden="true" />
      <p className="font-display text-display-sm text-white/80">{title}</p>
      {description && <p className="max-w-xs text-sm text-white/50">{description}</p>}
    </div>
  )
}
