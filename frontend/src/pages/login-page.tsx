import axios from 'axios'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/app/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const { account, login } = useAuth()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const signedIn = await login(email.trim(), password)
      const requested = search.get('next')
      const safeNext = requested?.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\')
        ? requested : null
      navigate(safeNext ?? (signedIn.permissions.includes('admin.dashboard.view') ? '/admin' : '/cuenta'), { replace: true })
    } catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 401) {
        setError('Correo o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.')
      } else {
        setError('No pudimos iniciar sesión. Comprueba la conexión con el servidor e inténtalo de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main id="contenido" className="mx-auto flex min-h-[65svh] max-w-7xl items-center px-5 py-16 sm:px-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl sm:text-4xl">Ingresa a Brunexa</h1>
        <p className="mt-4 max-w-[55ch] leading-7 text-muted-foreground">
          Accede con tu cuenta para consultar las funciones asignadas a tu perfil.
        </p>
        {account && <p className="mt-6 text-sm text-brand-teal">Ya ingresaste como {account.fullName}.</p>}
        <form onSubmit={submit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="login-email">Correo electrónico</Label>
            <Input id="login-email" type="email" autoComplete="username" value={email}
              onChange={(event) => setEmail(event.target.value)} required />
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
        <Link to="/" className="mt-6 inline-block text-sm text-brand-gold underline underline-offset-4 hover:text-foreground">
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
