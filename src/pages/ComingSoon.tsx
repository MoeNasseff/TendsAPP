import { Link, useLocation } from 'react-router-dom'
import { Hammer } from 'lucide-react'

/**
 * Catch-all for the TailAdmin menu entries that have no page behind them yet.
 *
 * The sidebar now carries TailAdmin's full site map — roughly seventy
 * destinations — and almost none are built. Without this, an unmatched path
 * inside the RequireAuth branch matches no route at all and React Router
 * renders nothing: the shell stays up and the content area goes blank, with no
 * error to explain it. This makes that state legible instead.
 */
export function ComingSoon() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-white/[0.03]">
      <span className="mb-6 flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400">
        <Hammer className="size-7" />
      </span>
      <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90">
        Coming soon
      </h1>
      <p className="mb-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
        This page is in the TailAdmin menu but has not been built for Tend yet.
      </p>
      <code className="mb-8 rounded-lg bg-gray-100 px-2 py-1 text-theme-xs text-gray-600 dark:bg-white/5 dark:text-gray-400">
        {pathname}
      </code>
      <Link
        to="/expenses"
        className="flex items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600"
      >
        Back to Expenses
      </Link>
    </div>
  )
}
