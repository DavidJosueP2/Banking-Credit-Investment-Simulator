import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth, type Account } from '@/app/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const protectedDestinations: Record<string, string> = {
  '/admin': 'admin.dashboard.view',
  '/admin/creditos': 'credit.products.manage',
  '/admin/inversiones': 'investment.products.manage',
  '/admin/configuracion': 'institution.manage',
  '/admin/roles': 'users.roles.manage',
  '/dev/table': 'admin.dashboard.view',
}

function destinationAfterLogin(account: Account, requested: string | null) {
  const fallback = account.permissions?.includes('admin.dashboard.view') ? '/admin' : '/cuenta'
  if (requested === '/cuenta') return requested
  const permission = requested ? protectedDestinations[requested] : undefined
  if (requested?.startsWith('/admin/') && !account.permissions?.includes('admin.dashboard.view')) return fallback
  if (requested && permission && account.permissions?.includes(permission)) return requested
  return fallback
}

export function LoginPage() {
  const { account, isPending, refreshAccount, login } = useAuth()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    let active = true
    void refreshAccount().catch(() => null).finally(() => {
      if (active) setSessionChecked(true)
    })
    return () => { active = false }
  }, [refreshAccount])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const signedIn = await login(username.trim(), password)
      navigate(destinationAfterLogin(signedIn, search.get('next')), { replace: true })
    } catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 401) {
        setError('Usuario o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.')
      } else if (axios.isAxiosError(cause) && cause.response?.status === 403) {
        const detail = cause.response.data as { message?: string } | undefined
        setError(detail?.message ?? 'Verifica tu correo antes de ingresar.')
      } else {
        setError('No pudimos iniciar sesión. Comprueba la conexión con el servidor e inténtalo de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (isPending || !sessionChecked) return <main id="contenido" className="mx-auto flex min-h-[65svh] max-w-7xl items-center px-5 py-16 text-sm text-muted-foreground sm:px-8" aria-live="polite">Comprobando tu sesión…</main>
  if (account) return <Navigate to={destinationAfterLogin(account, search.get('next'))} replace />

  return (
    <main id="contenido" className="mx-auto flex min-h-[65svh] max-w-7xl items-center px-5 py-16 sm:px-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl sm:text-4xl">Ingresa a Brunexa</h1>
        <p className="mt-4 max-w-[55ch] leading-7 text-muted-foreground">
          Accede con tu cuenta para consultar las funciones asignadas a tu perfil.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="login-username">Usuario</Label>
            <Input id="login-username" autoComplete="username" value={username}
              onChange={(event) => setUsername(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Contraseña</Label>
            <Input id="login-password" type="password" autoComplete="current-password" value={password}
              onChange={(event) => setPassword(event.target.value)} required />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/registro" className="text-brand-gold underline underline-offset-4 hover:text-foreground">
            Crear cuenta
          </Link>
        </p>
        <Link to="/" className="mt-4 inline-block text-sm text-brand-gold underline underline-offset-4 hover:text-foreground">
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
