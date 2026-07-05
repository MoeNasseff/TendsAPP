import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center bg-brand-secondary" />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
