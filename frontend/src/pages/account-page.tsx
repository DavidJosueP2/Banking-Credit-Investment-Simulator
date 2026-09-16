import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/providers/auth-provider'
import { Button } from '@/components/ui/button'

export function AccountPage() {
  const { account, isPending, isError, logout, hasPermission } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')

  if (isPending) return <main id="contenido" className="mx-auto max-w-7xl px-5 py-20 text-muted-foreground sm:px-8">Cargando tu cuenta…</main>
  if (isError) return <main id="contenido" className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><h1 className="text-3xl">No se pudo cargar tu cuenta</h1><p className="mt-4 text-muted-foreground">Revisa la conexión con el servidor e intenta de nuevo.</p></main>
  if (!account) return <Navigate to="/login?next=%2Fcuenta" replace />

  async function signOut() {
    setSigningOut(true)
    setError('')
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      setError('No se pudo cerrar la sesión. Intenta de nuevo.')
    } finally {
      setSigningOut(false)
    }
  }

  return <main id="contenido" className="mx-auto min-h-[65svh] max-w-7xl px-5 py-16 sm:px-8">
    <div className="max-w-2xl">
      <h1 className="text-3xl text-brand-teal sm:text-4xl">Tu cuenta</h1>
      <p className="mt-4 leading-7 text-muted-foreground">Tu identidad y accesos están registrados en Brunexa.</p>
      <dl className="mt-10 grid gap-6 border-y py-8 sm:grid-cols-2">
        <div><dt className="text-sm text-muted-foreground">Nombre</dt><dd className="mt-1 font-medium">{account.fullName}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Correo</dt><dd className="mt-1 font-medium">{account.email}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Roles asignados</dt><dd className="mt-1 font-medium">{account.roles.join(', ')}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Estado</dt><dd className="mt-1 font-medium text-brand-teal">{account.enabled ? 'Activa' : 'Inactiva'}</dd></div>
      </dl>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {hasPermission('admin.dashboard.view') && <Button asChild><Link to="/admin">Abrir panel interno</Link></Button>}
        <Button variant="outline" onClick={signOut} disabled={signingOut}>{signingOut ? 'Saliendo…' : 'Cerrar sesión'}</Button>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  </main>
}
