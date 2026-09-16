import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    csrfRequest ??= api.get<CsrfToken>('/auth/csrf').then(({ data }) => data).catch((error: unknown) => {
      csrfRequest = null
      throw error
    })
    const csrf = await csrfRequest
    request.headers.set(csrf.headerName, csrf.token)
  }
  return request
})
