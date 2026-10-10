import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts'

import { InfoHint } from '@/components/shared/info-hint'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { DashboardSummary } from './dashboard-api'

const statuses = [
  ['SUBMITTED', 'Por revisar'],
  ['IN_REVIEW', 'En revisión'],
  ['OBSERVED', 'Observadas'],
  ['PENDING_APPROVAL', 'Por aprobar'],
  ['APPROVED', 'Aprobadas'],
  ['REJECTED', 'Rechazadas'],
  ['CANCELLED', 'Canceladas'],
] as const

type ChartRow = { label: string; value: number; fill: string }

/** Compara solicitudes y productos con los datos permitidos para el usuario. */
export function DashboardCharts({ summary }: { summary: DashboardSummary }) {
  const requests = statuses.map(([key, label]) => ({
    label,
    value: summary.applicationsByStatus[key] ?? 0,
    fill: 'var(--brand-teal)',
  }))
  const products = summary.kpis
    .filter((kpi) => ['creditProducts', 'investmentProducts'].includes(kpi.key))
    .map((kpi) => ({
      label: kpi.key === 'creditProducts' ? 'Créditos' : 'Inversiones',
      value: kpi.value,
      fill: kpi.key === 'creditProducts' ? 'var(--brand-teal)' : 'var(--brand-gold)',
    }))
  const canSeeRequests = summary.kpis.some((kpi) => kpi.key === 'submitted')
  if (!canSeeRequests && products.length === 0) return null

  return (
    <div className={`grid min-w-0 gap-4 ${canSeeRequests && products.length > 0 ? 'xl:grid-cols-2' : ''}`}>
      {canSeeRequests && (
        <MetricChart title="Solicitudes por estado" rows={requests}
          detail="Estado actual de las solicitudes visibles para tu perfil. Excluye borradores."
          empty="Aún no hay solicitudes." />
      )}
      {products.length > 0 && (
        <MetricChart title="Productos disponibles" rows={products}
          detail="Productos activos disponibles en los simuladores. Los créditos excluyen los que superan el tope permitido."
          empty="Aún no hay productos disponibles." />
      )}
    </div>
  )
}

function MetricChart({ title, rows, detail, empty }: {
  title: string; rows: ChartRow[]; detail: string; empty: string
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  return (
    <figure className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
      <figcaption className="flex items-center justify-between gap-2">
        <span className="font-medium">{title}</span>
        <InfoHint label={`Detalle: ${title}`}>{detail}</InfoHint>
      </figcaption>
      <p className="mt-1 text-sm text-muted-foreground">
        {total.toLocaleString('es-EC')} en total
      </p>
      {total > 0 ? (
        <ChartContainer config={{ value: { label: 'Cantidad', color: 'var(--brand-teal)' } }}
          className="mt-5 h-64 w-full aspect-auto">
          <BarChart accessibilityLayer data={rows} layout="vertical" margin={{ top: 4, right: 36, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={94} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={32} isAnimationActive={false}>
              {rows.map((row) => <Cell key={row.label} fill={row.fill} />)}
              <LabelList dataKey="value" position="right" className="fill-foreground" fontSize={12} />
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : <div className="mt-5 flex h-64 items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground">{empty}</div>}
      <ul className="sr-only" aria-label={title}>
        {rows.map((row) => <li key={row.label}>{row.label}: {row.value}</li>)}
      </ul>
    </figure>
  )
}
