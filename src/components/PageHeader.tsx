import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  titleAdornment,
  action,
}: {
  eyebrow: string
  title: string
  /** Sits inline with the title, for controls that belong to the heading
   *  itself rather than the page's actions — e.g. hide/show amounts. */
  titleAdornment?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4 pb-2">
      <div className="flex flex-col gap-2">
        <span className="text-micro uppercase text-brand-500 dark:text-brand-400">{eyebrow}</span>
        <div className="flex items-center gap-2">
          <h1 className="text-display font-semibold text-gray-900 dark:text-white">{title}</h1>
          {titleAdornment}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
