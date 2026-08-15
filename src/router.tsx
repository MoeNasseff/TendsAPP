import { Suspense } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { MoodLayout } from './components/MoodLayout'
import { RequireAuth } from './components/RequireAuth'
import { RootGate } from './components/RootGate'
import { SeedGate } from './components/SeedGate'
import { PageSkeleton } from './components/PageSkeleton'
import { Login } from './pages/Login'

export const router = createBrowserRouter([
  { path: '/', element: <RootGate /> },
  { path: '/login', element: <Login /> },
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
          {
            path: 'settings',
            lazy: async () => {
              const { SettingsPage } = await import('./modules/settings/SettingsPage')
              return { Component: SettingsPage }
            },
          },
        ],
      },
    ],
  },
])
