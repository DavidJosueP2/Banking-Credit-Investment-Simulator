import { type AuthResponse, type Usuario } from '@/types'

const TOKEN_KEY  = 'token'
const USER_KEY   = 'usuario'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUsuario(): Usuario | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Usuario
  } catch {
    return null
  }
}

export function saveAuth(auth: AuthResponse): void {
  localStorage.setItem(TOKEN_KEY, auth.token)
  const usuario: Usuario = {
    id:       auth.usuarioId,
    nombre:   auth.nombre,
    apellido: auth.apellido,
    email:    auth.email,
    rol:      auth.rol,
  }
  localStorage.setItem(USER_KEY, JSON.stringify(usuario))
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
