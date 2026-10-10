import { InfoHint } from '@/components/shared/info-hint'
import { ArrowRight, ChartNoAxesCombined, Inbox, Landmark, Settings2, UsersRound, type LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { type Permission } from '@/app/access/permissions'
import { useAuth } from '@/app/providers/auth-provider'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardSummary, type Kpi } from '@/features/dashboard/dashboard-api'
import { DashboardCharts } from '@/features/dashboard/dashboard-charts'
import { formatCurrency } from '@/lib/formatters'

const managementAreas = [
  {
    title: 'Solicitudes en línea',
    description: 'Revisa y resuelve solicitudes.',
    icon: Inbox,
    permission: ['credit.requests.review', 'credit.requests.approve', 'investment.requests.review', 'requests.audit'],
    url: '/admin/solicitudes',
  },
  {
    title: 'Tipos de crédito',
    description: 'Tipos de crédito, tasas y cobros asociados.',
    icon: Landmark,
    permission: 'credit.products.manage',
    url: '/admin/creditos',
  },
  {
    title: 'Productos de inversión',
    description: 'Plazos, rendimientos y costos.',
    icon: ChartNoAxesCombined,
    permission: 'investment.products.manage',
    url: '/admin/inversiones',
  },
  {
    title: 'Configuración institucional',
    description: 'Marca y contenido del sitio.',
    icon: Settings2,
    permission: 'institution.manage',
    url: '/admin/configuracion',
  },
] satisfies Array<{
  title: string
  description: string
  icon: LucideIcon
  permission: Permission | Permission[]
  url?: string
}>

export function AdminHomePage() {
  const { hasPermission } = useAuth()
  const canManageAccess = hasPermission('users.roles.manage')
  const visibleAreas = managementAreas.filter((area) =>
    (Array.isArray(area.permission) ? area.permission : [area.permission]).some(hasPermission))

  return (
    <div className="space-y-8">
      <PageHeader
        title="Panel administrativo"
        description="Solicitudes, cartera y productos."
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

      <KpiRow />

      {canManageAccess && (
        <section aria-labelledby="access-title" className="space-y-4">
          <div>
            <h2 id="access-title" className="text-xl text-foreground">Gestión de accesos</h2>
          </div>
          <Link
            to="/admin/roles"
            className="group flex min-h-20 items-center gap-4 rounded-xl bg-muted/50 px-5 py-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UsersRound className="size-5 shrink-0 text-brand-teal" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">Usuarios, roles y permisos</span>
              <span className="mt-1 block text-sm text-muted-foreground">Administra el acceso al sistema.</span>
            </span>
            <span className="hidden text-sm font-medium text-brand-teal sm:inline">Abrir</span>
            <ArrowRight className="size-4 shrink-0 text-brand-teal transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </section>
      )}

      {visibleAreas.length > 0 && (
        <section aria-labelledby="areas-title" className="space-y-4">
          <div>
            <h2 id="areas-title" className="text-xl text-foreground">Productos y operaciones</h2>
          </div>
          <div className="divide-y rounded-xl bg-muted/50">
            {visibleAreas.map((area) => {
              const content = <>
                <area.icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base text-foreground">{area.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{area.description}</p>
                </div>
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
    </div>
  )
}

/** Presenta indicadores y gráficos del resumen administrativo. */
function KpiRow() {
  const summary = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: getDashboardSummary, refetchInterval: 60_000 })
  if (summary.isError) return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border p-5">
      <p className="text-sm">No se pudieron cargar las métricas.</p>
      <Button variant="outline" onClick={() => void summary.refetch()}>Reintentar</Button>
    </div>
  )
  return (
    <section aria-labelledby="kpi-title" className="space-y-4">
      <h2 id="kpi-title" className="sr-only">Indicadores</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {summary.isPending
          ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)
          : summary.data.kpis.slice(0, 3).map((kpi) => <KpiTile key={kpi.key} kpi={kpi} />)}
      </div>
      {summary.data && <DashboardCharts summary={summary.data} />}
      {summary.data && summary.data.kpis.length > 3 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summary.data.kpis.slice(3).map((kpi) => <KpiTile key={kpi.key} kpi={kpi} />)}
        </div>
      )}
    </section>
  )
}

function KpiTile({ kpi }: { kpi: Kpi }) {
  const value = kpi.format === 'CURRENCY'
    ? formatCurrency(kpi.value)
    : kpi.value.toLocaleString('es-EC')
  return (
    <article className="relative rounded-xl border bg-card p-5 transition-colors hover:border-brand-teal/40">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm text-muted-foreground">{kpi.label}</h3>
        {kpi.hint && <InfoHint label={`Detalle: ${kpi.label}`}>{kpi.hint}</InfoHint>}
      </div>
      {kpi.href ? (
        <Link to={kpi.href} aria-label={`${kpi.label}: ${value}`} className="mt-2 inline-flex items-center gap-3 rounded text-3xl font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {value}<ArrowRight className="size-4 text-brand-teal" aria-hidden="true" />
        </Link>
      ) : <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>}
    </article>
  )
}
