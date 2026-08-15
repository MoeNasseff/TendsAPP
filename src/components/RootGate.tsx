import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Landing } from '../pages/Landing'

/**
 * `/` is public. Signed-in users go straight to the app; everyone else gets
 * the marketing page. Keeps start_url and every module URL unchanged.
 */
export function RootGate() {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-svh bg-brand-secondary" />
  return session ? <Navigate to="/expenses" replace /> : <Landing />
}
