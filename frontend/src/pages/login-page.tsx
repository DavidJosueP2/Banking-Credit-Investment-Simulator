import axios from 'axios'
import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth, type Account } from '@/app/providers/auth-provider'
import { IllustratedAccessLayout } from '@/components/layout/illustrated-access-layout'
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
  const fallback = account.permissions.includes('admin.dashboard.view') ? '/admin' : '/cuenta'
  if (requested === '/cuenta') return requested
  const permission = requested ? protectedDestinations[requested] : undefined
  if (requested?.startsWith('/admin/') && !account.permissions.includes('admin.dashboard.view')) return fallback
  if (requested && permission && account.permissions.includes(permission)) return requested
  return fallback
}

export function LoginPage() {
  const { account, isPending, refreshAccount, login } = useAuth()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    let active = true
    void refreshAccount().catch(() => null).finally(() => {
      if (active) setSessionChecked(true)
    })
    return () => { active = false }
  }, [refreshAccount])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })
    return () => cancelAnimationFrame(frame)
  }, [sessionChecked])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNeedsVerification(false)
    setSubmitting(true)
    try {
      const signedIn = await login(username.trim(), password)
      navigate(destinationAfterLogin(signedIn, search.get('next')), { replace: true })
    } catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 401) {
        setError('Usuario o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.')
      } else if (axios.isAxiosError(cause) && cause.response?.status === 403) {
        const detail = cause.response.data as { message?: string } | undefined
        const message = detail?.message ?? 'Verifica tu correo antes de ingresar.'
        setError(message)
        setNeedsVerification(message.toLowerCase().includes('verifica tu correo'))
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
    <IllustratedAccessLayout>
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-center text-3xl sm:text-4xl">Ingresa a Brunexa</h1>
        <p className="mt-4 text-center leading-7 text-muted-foreground">
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
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <EyeOff className="size-4.5" aria-hidden="true" />
                ) : (
                  <Eye className="size-4.5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {needsVerification && (
            <Link to="/verificar-correo" className="block text-sm text-brand-gold underline underline-offset-4 hover:text-foreground">
              Ingresar o reenviar el código de verificación
            </Link>
          )}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/registro" className="text-brand-gold underline underline-offset-4 hover:text-foreground">
            Crear cuenta
          </Link>
        </p>
        <Link to="/" className="mx-auto mt-4 block w-fit text-sm text-brand-gold underline underline-offset-4 hover:text-foreground">
          Volver al inicio
        </Link>
      </div>
    </IllustratedAccessLayout>
  )
}
