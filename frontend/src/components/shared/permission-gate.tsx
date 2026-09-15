import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

import { type Permission } from '@/app/access/permissions'
import { useAuth } from '@/app/providers/auth-provider'
import { Button } from '@/components/ui/button'

interface PermissionGateProps {
  permission: Permission
  children: ReactNode
}

export function PermissionGate({ permission, children }: PermissionGateProps) {
  const { account, isPending, isError, hasPermission } = useAuth()
  const location = useLocation()
  if (isPending) return <main className="mx-auto max-w-xl px-6 py-24 text-sm text-muted-foreground">Comprobando acceso…</main>
  if (isError) return <main className="mx-auto max-w-xl px-6 py-24"><h1 className="text-3xl">No se pudo comprobar tu acceso</h1><p className="mt-4 text-muted-foreground">Revisa la conexión con el servidor e intenta de nuevo.</p></main>
  if (!account) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  if (hasPermission(permission)) return children

  return (
    <main className="mx-auto flex min-h-[50svh] max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl">No tienes acceso a esta sección</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        Tu cuenta no tiene el permiso necesario. Si necesitas trabajar aquí,
        solicita acceso a un administrador de Brunexa.
      </p>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <Link to="/">Ir al inicio</Link>
        </Button>
      </div>
    </main>
  )
}
