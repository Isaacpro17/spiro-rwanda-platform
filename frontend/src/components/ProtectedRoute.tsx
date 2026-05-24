import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: string[]
}

/**
 * Route guard that enforces authentication and role-based access control.
 *
 * - Unauthenticated users are redirected to /login, preserving their intended
 *   destination via location.state so they can be redirected back after login.
 * - Authenticated users whose role is not in allowedRoles get a 403-style redirect.
 * - Shows a loading spinner while auth state is being resolved.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Preserve the attempted URL so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Role mismatch — redirect to the user's own dashboard rather than a dead-end
    const dashboards: Record<string, string> = {
      rider:      '/rider/dashboard',
      operator:   '/operator/dashboard',
      technician: '/technician/dashboard',
      admin:      '/admin/dashboard',
    }
    const home = dashboards[user.role] ?? '/'
    return <Navigate to={home} replace />
  }

  return <>{children}</>
}
