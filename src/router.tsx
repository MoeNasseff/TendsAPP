import { Suspense } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { MoodLayout } from './components/MoodLayout'
import { RequireAuth } from './components/RequireAuth'
import { RootGate } from './components/RootGate'
import { SeedGate } from './components/SeedGate'
import { PageSkeleton } from './components/PageSkeleton'
import { RouteError } from './components/RouteError'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { NotFoundPage } from './pages/errors/NotFoundPage'
import { ServerErrorPage } from './pages/errors/ServerErrorPage'
import { MaintenancePage } from './pages/errors/MaintenancePage'

export const router = createBrowserRouter([
  {
    // One boundary for anything no branch below catches — a malformed URL,
    // or an error thrown before any of the branch-level boundaries mount.
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <RootGate /> },
      {
        // Its own boundary so a 500 while signed out renders ServerErrorPage
        // directly, rather than bubbling to a RequireAuth check that would
        // read it as "no session" and redirect to /login — a loop, since the
        // page that just 500'd is /login itself.
        errorElement: <RouteError />,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/signup', element: <Signup /> },
        ],
      },
      {
        path: '/',
        element: <RequireAuth />,
        errorElement: <RouteError withShell />,
        children: [
          {
            path: '',
            element: (
              <SeedGate>
                <AppShell>
                  <Suspense fallback={<PageSkeleton />}>
                    <Outlet />
                  </Suspense>
                </AppShell>
              </SeedGate>
            ),
            children: [
              {
                path: 'expenses',
                element: <MoodLayout mood="expenses" />,
                children: [
                  {
                    index: true,
                    lazy: async () => {
                      const { ExpensesPage } = await import('./modules/expenses/ExpensesPage')
                      return { Component: ExpensesPage }
                    },
                  },
                ],
              },
              {
                path: 'dog',
                element: <MoodLayout mood="dog" />,
                children: [
                  {
                    index: true,
                    lazy: async () => {
                      const { DogPage } = await import('./modules/dog/DogPage')
                      return { Component: DogPage }
                    },
                  },
                ],
              },
              {
                path: 'car',
                element: <MoodLayout mood="car" />,
                children: [
                  {
                    index: true,
                    lazy: async () => {
                      const { CarPage } = await import('./modules/car/CarPage')
                      return { Component: CarPage }
                    },
                  },
                ],
              },
              {
                path: 'meds',
                element: <MoodLayout mood="meds" />,
                children: [
                  {
                    index: true,
                    lazy: async () => {
                      const { MedsPage } = await import('./modules/meds/MedsPage')
                      return { Component: MedsPage }
                    },
                  },
                ],
              },
              {
                path: 'body',
                element: <MoodLayout mood="body" />,
                children: [
                  {
                    index: true,
                    lazy: async () => {
                      const { BodyPage } = await import('./modules/body/BodyPage')
                      return { Component: BodyPage }
                    },
                  },
                ],
              },
              // The three cloned TailAdmin invoice pages. They sit under the
              // Expenses disclosure in the sidebar but keep the reference's own
              // top-level paths, because those are what its markup links to
              // (`create-invoice.html` → /create-invoice) and what the sidebar
              // entries under MENU > E-commerce already point at.
              {
                path: 'invoices',
                lazy: async () => {
                  const { InvoicesPage } = await import('./modules/freelancing/InvoicesPage')
                  return { Component: InvoicesPage }
                },
              },
              {
                path: 'single-invoice',
                lazy: async () => {
                  const { SingleInvoicePage } = await import('./modules/freelancing/SingleInvoicePage')
                  return { Component: SingleInvoicePage }
                },
              },
              {
                path: 'create-invoice',
                lazy: async () => {
                  const { CreateInvoicePage } = await import('./modules/freelancing/CreateInvoicePage')
                  return { Component: CreateInvoicePage }
                },
              },
              {
                path: 'analytics',
                lazy: async () => {
                  const { AnalyticsPage } = await import('./modules/analytics/AnalyticsPage')
                  return { Component: AnalyticsPage }
                },
              },
              {
                path: 'api-keys',
                lazy: async () => {
                  const { ApiKeysPage } = await import('./modules/settings/ApiKeysPage')
                  return { Component: ApiKeysPage }
                },
              },
              {
                path: 'settings',
                lazy: async () => {
                  const { SettingsPage } = await import('./modules/settings/SettingsPage')
                  return { Component: SettingsPage }
                },
              },
              // The three "Pages" menu entries that name an error state
              // directly. These render the clone itself, not the errorElement —
              // visiting /error-404 isn't an error, it's a page about one.
              // Static, not lazy: RouteError already imports all three eagerly,
              // so a dynamic import here would just re-reference the same chunk.
              { path: 'error-404', element: <NotFoundPage /> },
              { path: 'error-500', element: <ServerErrorPage /> },
              { path: 'error-503', element: <MaintenancePage /> },
              { path: 'maintenance', element: <MaintenancePage /> },
              // The sidebar carries TailAdmin's full site map, and almost none of
              // those pages exist yet. Without this catch-all an unmatched path
              // matches no route and the content area silently renders empty.
              // Ranked last by React Router's own specificity scoring, not by
              // position, so it never shadows a real sibling route.
              {
                path: '*',
                lazy: async () => {
                  const { ComingSoon } = await import('./pages/ComingSoon')
                  return { Component: ComingSoon }
                },
              },
            ],
          },
        ],
      },
    ],
  },
])
