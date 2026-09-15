import { Check } from 'lucide-react'

import { hasPermission, permissions, roles, roleLabels } from '@/app/access/permissions'
import { PageHeader } from '@/components/shared/page-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function RolePermissionsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Roles y permisos"
        description="Mapa propuesto para separar la experiencia pública, las solicitudes del cliente y la gestión interna de Brunexa."
      />

      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          El visitante y el cliente podrán simular; las solicitudes de inversión
          y documentos corresponderán al cliente identificado. Cada asesor verá
          solo su área, mientras que el administrador configurará la institución
          y asignará roles.
        </p>
        <p>
          Esta matriz y el selector de perfil son una demostración del frontend,
          no un sistema de autenticación. El backend deberá comprobar cada
          permiso antes de leer o modificar datos.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-245">
          <caption className="sr-only">Permisos previstos por rol de Brunexa</caption>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-65">Permiso</TableHead>
              {roles.map((role) => (
                <TableHead key={role} className="min-w-34 text-center">
                  {roleLabels[role]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map(({ key, label, area }) => (
              <TableRow key={key}>
                <TableCell>
                  <span className="block font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{area}</span>
                </TableCell>
                {roles.map((role) => (
                  <TableCell key={role} className="text-center">
                    {hasPermission(role, key) ? (
                      <span className="inline-flex items-center gap-1 text-brand-teal">
                        <Check className="mx-auto size-4" aria-hidden="true" />
                        <span className="sr-only">Permitido</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">No permitido</span>
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
