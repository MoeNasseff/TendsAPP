import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4 pb-2">
      <div className="flex flex-col gap-2">
        <span className="text-micro uppercase text-mood-accent-safe">{eyebrow}</span>
        <h1 className="font-display text-display text-slate-900 dark:text-white">{title}</h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
