import type { ReactNode } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { AppShell } from './AppShell'
import { NotFoundPage } from '../pages/errors/NotFoundPage'
import { ServerErrorPage } from '../pages/errors/ServerErrorPage'
import { MaintenancePage } from '../pages/errors/MaintenancePage'

/**
 * The errorElement dispatcher, mounted at a few boundaries in router.tsx.
 *
 * `withShell` is for the RequireAuth boundary only. React Router replaces the
 * whole matched route's own element on error bubbling, so when a page deep
 * inside AppShell throws and nothing closer catches it, the boundary that
 * fires is RequireAuth's — which would otherwise take the sidebar down with
 * it. Rendering AppShell here, around the dispatched page, is what keeps it
 * up.
 */
export function RouteError({ withShell = false }: { withShell?: boolean }) {
  const error = useRouteError()
  const isOffline = error instanceof TypeError && /Failed to fetch/i.test(error.message)

  let page: ReactNode
  if (isRouteErrorResponse(error) && error.status === 404) {
    page = <NotFoundPage />
  } else if ((isRouteErrorResponse(error) && error.status === 503) || isOffline) {
    page = <MaintenancePage />
  } else {
    page = <ServerErrorPage />
  }

  return withShell ? <AppShell>{page}</AppShell> : page
}
