import { Link, useLocation } from 'react-router-dom'
import { Hammer } from 'lucide-react'
import { NAV_GROUPS, type NavGroup, type NavSubItem } from '../components/nav-items'
import { NotFoundPage } from './errors/NotFoundPage'

function addSubPaths(items: NavSubItem[] | undefined, acc: Set<string>) {
  for (const item of items ?? []) {
    if (item.path) acc.add(item.path)
    addSubPaths(item.subItems, acc)
  }
}

function knownPaths(groups: NavGroup[]): Set<string> {
  const acc = new Set<string>()
  for (const group of groups) {
    for (const item of group.items) {
      if (item.path) acc.add(item.path)
      addSubPaths(item.subItems, acc)
    }
  }
  return acc
}

/** Every path the sidebar itself links to — computed once at module load. */
const KNOWN_PATHS = knownPaths(NAV_GROUPS)

/**
 * Catch-all for the TailAdmin menu entries that have no page behind them yet.
 *
 * The sidebar carries TailAdmin's full site map — roughly seventy
 * destinations — and almost none are built. A path the sidebar itself links
 * to is an honest "not built yet"; a path that isn't in the menu at all is a
 * genuine 404. Both land on this route via the `*` catch-all, so the split
 * happens here rather than in the router.
 */
export function ComingSoon() {
  const { pathname } = useLocation()

  if (!KNOWN_PATHS.has(pathname)) {
    return <NotFoundPage />
  }

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
