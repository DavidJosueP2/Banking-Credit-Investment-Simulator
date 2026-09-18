import { createContext, useContext, useState, useCallback, type PropsWithChildren } from 'react'
import { type Usuario, type AuthResponse } from '@/types'
import { saveAuth, clearAuth, getUsuario } from '@/lib/auth'

interface AuthContextValue {
  usuario: Usuario | null
  isAuthenticated: boolean
  login: (auth: AuthResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => getUsuario())

  const login = useCallback((auth: AuthResponse) => {
    saveAuth(auth)
    setUsuario({
      id:       auth.usuarioId,
      nombre:   auth.nombre,
      apellido: auth.apellido,
      email:    auth.email,
      rol:      auth.rol,
    })
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUsuario(null)
  }, [])

  return (
    <AuthContext.Provider value={{ usuario, isAuthenticated: !!usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
