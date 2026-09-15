import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { createContext, useContext, type PropsWithChildren } from 'react'

import { api, clearCsrfToken } from '@/lib/api'

export interface Account {
  id: number
  email: string
  fullName: string
  enabled: boolean
  roles: string[]
  permissions: string[]
}

const authQueryKey = ['auth', 'me'] as const

const AuthContext = createContext<{
  account: Account | null
  isPending: boolean
  isError: boolean
  login: (email: string, password: string) => Promise<Account>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
} | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: authQueryKey,
    queryFn: async () => {
      try {
        const { data } = await api.get<Account>('/auth/me')
        return data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) return null
        throw error
      }
    },
    retry: (count, error) => !(axios.isAxiosError(error) && error.response?.status === 401) && count < 1,
  })

  async function login(email: string, password: string): Promise<Account> {
    const fields = new URLSearchParams({ email, password })
    await api.post('/auth/login', fields, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    clearCsrfToken()
    const { data } = await api.get<Account>('/auth/me')
    client.setQueryData(authQueryKey, data)
    return data
  }

  async function logout() {
    await api.post('/auth/logout')
    clearCsrfToken()
    client.setQueryData(authQueryKey, null)
    client.removeQueries({ queryKey: ['admin'] })
  }

  return (
    <AuthContext.Provider value={{
      account: query.data ?? null,
      isPending: query.isPending,
      isError: query.isError,
      login,
      logout,
      hasPermission: (permission) => query.data?.permissions.includes(permission) ?? false,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
