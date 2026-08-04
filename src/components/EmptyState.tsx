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
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-12 text-center">
      <Icon className="h-8 w-8 text-slate-600" />
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
  )
}
