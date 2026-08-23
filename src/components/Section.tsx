import type { ReactNode } from 'react'

export function Section({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-display-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
