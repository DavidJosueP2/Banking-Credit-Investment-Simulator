import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

type CsrfToken = { headerName: string; token: string }
let csrfRequest: Promise<CsrfToken> | null = null

export function clearCsrfToken() {
  csrfRequest = null
}

api.interceptors.request.use(async (request) => {
  const method = request.method?.toUpperCase() ?? 'GET'
  const isExcluded = request.url?.includes('/simulador') || request.url?.includes('/public')
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !isExcluded) {
    csrfRequest ??= api.get<CsrfToken>('/auth/csrf').then(({ data }) => data).catch((error: unknown) => {
      csrfRequest = null
      throw error
    })
    try {
      const csrf = await csrfRequest
      if (csrf?.headerName && csrf?.token) {
        request.headers.set(csrf.headerName, csrf.token)
      }
    } catch {
      // Permite que la petición continúe si es una ruta que no requiere CSRF
    }
  }
  return request
})
