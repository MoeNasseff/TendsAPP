import { Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { MoodLayout } from './components/MoodLayout'
import { RequireAuth } from './components/RequireAuth'
import { SeedGate } from './components/SeedGate'
import { PageSkeleton } from './components/PageSkeleton'
import { Login } from './pages/Login'

export const router = createBrowserRouter([
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
          { index: true, element: <Navigate to="/expenses" replace /> },
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
        ],
      },
    ],
  },
])
