import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Inbox, ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/app/providers/auth-provider'
import { PageHeader } from '@/components/shared/page-header'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApplicationStatusBadge } from '@/features/applications/application-parts'
import {
  applicationKeys,
  formatTerm,
  getReviewQueue,
  isSettled,
  type ApplicationSummary,
  productTypeLabels,
  type ApplicationStatus,
  type ProductType,
} from '@/features/applications/applications-api'
import { messageFrom } from '@/features/identity-check/utils'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters'

type Filter = 'pending' | 'IN_REVIEW' | 'approval' | 'OBSERVED' | 'portfolio' | 'decided' | 'all'

const today = () => new Date().toISOString().slice(0, 10)
const isLate = (row: ApplicationSummary) => !isSettled(row) && row.nextDueDate != null && row.nextDueDate.slice(0, 10) < today()

const filters: Array<{ value: Filter; label: string; statuses?: ApplicationStatus[]; matches?: (row: ApplicationSummary) => boolean }> = [
  { value: 'pending', label: 'Por revisar', statuses: ['SUBMITTED'] },
  { value: 'IN_REVIEW', label: 'En revisión', statuses: ['IN_REVIEW'] },
  { value: 'approval', label: 'Por aprobar', statuses: ['PENDING_APPROVAL'] },
  { value: 'OBSERVED', label: 'Observadas', statuses: ['OBSERVED'] },
  // Cartera: aprobados con cuotas o pagos por registrar, lo más urgente primero.
  { value: 'portfolio', label: 'Cartera', statuses: ['APPROVED'], matches: (row) => !isSettled(row) },
  { value: 'decided', label: 'Decididas', statuses: ['APPROVED', 'REJECTED', 'CANCELLED'] },
  { value: 'all', label: 'Todas' },
]

function seesCreditReview(hasPermission: (permission: string) => boolean) {
  return hasPermission('credit.requests.review') || hasPermission('investment.requests.review') || hasPermission('credit.requests.approve')
}

export function ApplicationsQueuePage() {
  const { hasPermission } = useAuth()
  const queue = useQuery({ queryKey: applicationKeys.queue, queryFn: getReviewQueue, refetchInterval: 30_000 })
  const analystOnly = hasPermission('credit.requests.approve') && !hasPermission('credit.requests.review')
  const [searchParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>(searchParams.get('vista') === 'cartera' ? 'portfolio' : analystOnly ? 'approval' : 'pending')
  const [type, setType] = useState<ProductType | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const audit = hasPermission('requests.audit')
  const seesCredit = audit || hasPermission('credit.requests.review') || hasPermission('credit.requests.approve')
  const seesInvestment = audit || hasPermission('investment.requests.review')
  const both = seesCredit && seesInvestment

  const counts = useMemo(() => Object.fromEntries(filters.map((item) => [item.value,
    (queue.data ?? []).filter((row) => (!item.statuses || item.statuses.includes(row.status)) && (!item.matches || item.matches(row))).length])), [queue.data])

  const rows = useMemo(() => {
    const current = filters.find((item) => item.value === filter)
    const statuses = current?.statuses
    const term = search.trim().toLowerCase()
    const list = (queue.data ?? [])
      .filter((row) => !statuses || statuses.includes(row.status))
      .filter((row) => !current?.matches || current.matches(row))
      .filter((row) => type === 'ALL' || row.productType === type)
      .filter((row) => !term || `${row.code} ${row.customerName} ${row.productName}`.toLowerCase().includes(term))
    // Lo más antiguo primero en las colas de trabajo; lo más reciente primero en el historial.
    if (filter === 'portfolio') return [...list].sort((a, b) => (a.nextDueDate ?? '9').localeCompare(b.nextDueDate ?? '9'))
    return filter === 'decided' || filter === 'all'
      ? list
      : [...list].sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''))
  }, [queue.data, filter, type, search])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Solicitudes"
        description={analystOnly
          ? 'Decide los créditos que los asesores recomendaron. No puedes decidir una solicitud que hayas revisado como asesor.'
          : audit && !seesCreditReview(hasPermission)
            ? 'Consulta las solicitudes y su trazabilidad. La administración no decide operaciones individuales.'
            : 'Revisa las solicitudes que los clientes enviaron en línea. Solo ves los productos que tu rol puede evaluar.'}
        className="border-b pb-6"
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList className="flex-wrap">
            {filters.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
                <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{counts[item.value] ?? 0}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          {both && (
            <Tabs value={type} onValueChange={(value) => setType(value as ProductType | 'ALL')}>
              <TabsList>
                <TabsTrigger value="ALL">Todo</TabsTrigger>
                <TabsTrigger value="CREDIT">Créditos</TabsTrigger>
                <TabsTrigger value="INVESTMENT">Inversiones</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <Input type="search" placeholder="Buscar código o cliente" value={search} onChange={(event) => setSearch(event.target.value)}
            className="w-full sm:w-60" aria-label="Buscar solicitudes" />
        </div>
      </div>

      {queue.isError && <p className="text-sm text-destructive">{messageFrom(queue.error, 'No se pudo cargar la bandeja.')}</p>}

      {queue.isPending ? (
        <p className="text-sm text-muted-foreground">Cargando solicitudes…</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
          <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 font-medium">No hay solicitudes aquí</p>
          <p className="mt-1 text-sm text-muted-foreground">Las nuevas solicitudes aparecerán automáticamente.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Solicitud</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Plazo</TableHead>
                <TableHead>Enviada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead><span className="sr-only">Abrir</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="group">
                  <TableCell>
                    <Link to={`/admin/solicitudes/${row.id}`} className="font-medium hover:text-brand-teal hover:underline">{row.code}</Link>
                    <p className="text-xs text-muted-foreground">{productTypeLabels[row.productType]} · {row.productName}</p>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      {row.customerName}
                      {row.biometricResult === 'MANUAL_REVIEW' && (
                        <ShieldAlert className="size-4 text-brand-gold" aria-label="Biometría no concluyente" />
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.amount)}</TableCell>
                  <TableCell>{formatTerm(row.term, row.termUnit)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(row.submittedAt)}</TableCell>
                  <TableCell>
                    <ApplicationStatusBadge status={row.status} settled={isSettled(row) ? row.productType : null} />
                    {row.reviewerName && row.status === 'IN_REVIEW' && <p className="mt-1 text-xs text-muted-foreground">{row.reviewerName}</p>}
                    {row.status === 'APPROVED' && !isSettled(row) && (
                      <p className={`mt-1 text-xs ${isLate(row) ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                        {row.elapsedInstallments}/{row.totalInstallments} pagadas
                        {row.nextDueDate && ` · ${isLate(row) ? 'venció' : 'vence'} ${formatDate(row.nextDueDate)}`}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link to={`/admin/solicitudes/${row.id}`} aria-label={`Abrir ${row.code}`} className="text-brand-teal">
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
