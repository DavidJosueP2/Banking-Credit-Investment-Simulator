import { ArrowRight, ChartNoAxesCombined, ChevronDown, Landmark, Settings2, TableProperties, UsersRound, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { type Permission } from '@/app/access/permissions'
import { useAuth } from '@/app/providers/auth-provider'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { MockDataTable } from '@/pages/dev-table-page'

const managementAreas = [
  {
    title: 'Productos de crédito',
    description: 'Tipos de crédito, tasas y cobros asociados.',
    icon: Landmark,
    permission: 'credit.products.manage',
    url: '/admin/creditos',
  },
  {
    title: 'Productos de inversión',
    description: 'Condiciones de inversión y solicitudes de clientes.',
    icon: ChartNoAxesCombined,
    permission: 'investment.products.manage',
    status: 'Disponible',
    url: '/admin/inversiones',
  },
  {
    title: 'Configuración institucional',
    description: 'Identidad, información y parámetros de Brunexa.',
    icon: Settings2,
    permission: 'institution.manage',
    status: 'Disponible',
    url: '/admin/configuracion',
  },
] satisfies Array<{
  title: string
  description: string
  icon: LucideIcon
  permission: Permission
  status?: string
  url?: string
}>

export function AdminHomePage() {
  const { hasPermission } = useAuth()
  const canManageAccess = hasPermission('users.roles.manage')
  const visibleAreas = managementAreas.filter((area) => hasPermission(area.permission))

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        title="Panel administrativo"
        description="Gestiona los accesos y consulta las áreas de trabajo de Brunexa desde un mismo espacio. La vista se adapta a tus permisos."
        actions={
          <div className="flex flex-wrap gap-2">
            {canManageAccess && (
              <Button asChild variant="brand">
                <Link to="/admin/roles">Gestionar accesos <ArrowRight aria-hidden="true" /></Link>
              </Button>
            )}
            <Button asChild variant="gold-outline">
              <Link to="/cuenta">Mi cuenta</Link>
            </Button>
          </div>
        }
        className="border-b pb-8"
      />

      {canManageAccess && (
        <section aria-labelledby="access-title" className="space-y-4">
          <div>
            <h2 id="access-title" className="text-xl text-foreground">Gestión de accesos</h2>
            <p className="mt-2 text-sm text-muted-foreground">Administra las cuentas y revisa las autoridades asignadas a cada rol.</p>
          </div>
          <Link
            to="/admin/roles"
            className="group flex min-h-20 items-center gap-4 rounded-xl border bg-card px-5 py-4 transition-colors hover:border-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UsersRound className="size-5 shrink-0 text-brand-teal" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">Usuarios, roles y permisos</span>
              <span className="mt-1 block text-sm text-muted-foreground">Cuentas y permisos administrados desde el sistema.</span>
            </span>
            <span className="hidden text-sm font-medium text-brand-teal sm:inline">Abrir</span>
            <ArrowRight className="size-4 shrink-0 text-brand-teal transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </section>
      )}

      {visibleAreas.length > 0 && (
        <section aria-labelledby="areas-title" className="space-y-4">
          <div>
            <h2 id="areas-title" className="text-xl text-foreground">Áreas de gestión</h2>
            <p className="mt-2 text-sm text-muted-foreground">Módulos y herramientas disponibles según los permisos de tu perfil.</p>
          </div>
          <div className="divide-y rounded-xl border bg-card">
            {visibleAreas.map((area) => {
              const content = <>
                <area.icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base text-foreground">{area.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{area.description}</p>
                </div>
                {area.status && (
                  <span className={`ml-9 shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium sm:ml-0 ${area.url ? 'border-brand-teal/40 text-brand-teal' : 'border-brand-gold/40 text-brand-gold'}`}>
                    {area.status}
                  </span>
                )}
                {area.url && <ArrowRight className="size-4 shrink-0 text-brand-teal" aria-hidden="true" />}
              </>
              return area.url ? (
                <Link key={area.title} to={area.url} className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-nowrap">
                  {content}
                </Link>
              ) : (
                <div key={area.title} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:flex-nowrap">{content}</div>
              )
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="example-title" className="border-t pt-8">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-md py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <TableProperties className="size-5 text-brand-gold" aria-hidden="true" />
            <h2 id="example-title" className="flex-1 text-sm font-medium text-foreground">Tabla de ejemplo</h2>
            <span className="hidden text-sm text-muted-foreground sm:inline">Ver registros</span>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="space-y-5 pt-5">
            <p className="text-sm text-muted-foreground">Datos ilustrativos para revisar búsqueda, filtros y paginación; no representan productos vigentes.</p>
            <MockDataTable />
          </div>
        </details>
      </section>
    </div>
  )
}
