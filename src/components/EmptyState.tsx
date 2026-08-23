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
      <Icon className="h-6 w-6 text-gray-400 dark:text-gray-600" aria-hidden="true" />
      <p className="text-display-sm font-semibold text-gray-700 dark:text-gray-200">{title}</p>
      {description && (
        <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
  )
}
