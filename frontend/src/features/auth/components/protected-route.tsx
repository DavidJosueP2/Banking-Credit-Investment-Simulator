import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/auth-context'
import { type RolUsuario } from '@/types'

interface ProtectedRouteProps {
  roles?: RolUsuario[]
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { isAuthenticated, usuario } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  if (roles && usuario && !roles.includes(usuario.rol)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
