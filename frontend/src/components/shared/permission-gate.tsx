import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { hasPermission, roleLabels, type Permission } from '@/app/access/permissions'
import { useDemoAccess } from '@/app/providers/demo-access-provider'
import { RolePreviewSelect } from '@/components/shared/role-preview-select'
import { Button } from '@/components/ui/button'

interface PermissionGateProps {
  permission: Permission
  children: ReactNode
}

export function PermissionGate({ permission, children }: PermissionGateProps) {
  const { role } = useDemoAccess()
  if (hasPermission(role, permission)) return children

  return (
    <main className="mx-auto flex min-h-[50svh] max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl">Esta vista no corresponde a tu perfil</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        El perfil de demostración “{roleLabels[role]}” no incluye este permiso.
        Selecciona otro perfil para revisar la navegación prevista.
      </p>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <RolePreviewSelect />
        <Button asChild variant="outline">
          <Link to="/">Ir a la landing</Link>
        </Button>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Este selector solo representa permisos en la interfaz. La autorización real
        deberá aplicarse en el backend.
      </p>
    </main>
  )
}
