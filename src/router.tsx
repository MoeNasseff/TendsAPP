import { Suspense } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { MoodLayout } from './components/MoodLayout'
import { RequireAuth } from './components/RequireAuth'
import { RootGate } from './components/RootGate'
import { SeedGate } from './components/SeedGate'
import { PageSkeleton } from './components/PageSkeleton'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'

export const router = createBrowserRouter([
  { path: '/', element: <RootGate /> },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  {
    path: '/',
    element: <RequireAuth />,
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
              const { InvoicesPage } = await import('./modules/expenses/InvoicesPage')
              return { Component: InvoicesPage }
            },
          },
          {
            path: 'single-invoice',
            lazy: async () => {
              const { SingleInvoicePage } = await import('./modules/expenses/SingleInvoicePage')
              return { Component: SingleInvoicePage }
            },
          },
          {
            path: 'create-invoice',
            lazy: async () => {
              const { CreateInvoicePage } = await import('./modules/expenses/CreateInvoicePage')
              return { Component: CreateInvoicePage }
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
])
