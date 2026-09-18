import { api } from '@/lib/api'
import { type AuthResponse } from '@/types'

interface LoginRequestDto {
  email: string
  password: string
}

interface RegisterRequestDto {
  nombre: string
  apellido: string
  email: string
  password: string
  cedula?: string
  telefono?: string
}

export const authService = {
  login: async (dto: LoginRequestDto): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/api/auth/login', dto)
    return data
  },

  register: async (dto: RegisterRequestDto): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/api/auth/register', dto)
    return data
  },

  me: async () => {
    const { data } = await api.get('/api/auth/me')
    return data
  },
}
