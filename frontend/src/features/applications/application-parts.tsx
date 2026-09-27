import { CheckCircle2, Circle, CircleAlert, FileText, MailCheck, ScanFace, UserRound, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '@/components/shared/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'

import {
  formatRate,
  formatTerm,
  statusLabels,
  statusTones,
  systemLabels,
  type ApplicationDetail,
  type ApplicationDocument,
  type ApplicationEvent,
  type ApplicationStatus,
  type Installment,
  type PaymentRecord,
  type Readiness,
} from './applications-api'
import { payoutLabels } from '@/features/investments/investment-api'

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <StatusBadge tone={statusTones[status]}>{statusLabels[status]}</StatusBadge>
}

/** Recorrido del cliente: cada paso se marca según el estado real de la solicitud. */
export function ApplicationProgress({ status }: { status: ApplicationStatus }) {
  const finalLabel = status === 'REJECTED' ? 'Rechazada' : status === 'CANCELLED' ? 'Cancelada' : 'Aprobada'
  const order: Record<ApplicationStatus, number> = {
    DRAFT: 0, SUBMITTED: 1, OBSERVED: 2, IN_REVIEW: 2, PENDING_APPROVAL: 2, APPROVED: 3, REJECTED: 3, CANCELLED: 3,
  }
  const current = order[status]
  const reviewLabel = status === 'OBSERVED' ? 'Con observaciones' : status === 'PENDING_APPROVAL' ? 'En aprobación' : 'En revisión'
  const steps = ['Confirmar identidad', 'Enviada', reviewLabel, finalLabel]
  const failed = status === 'REJECTED' || status === 'CANCELLED'

  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Avance de la solicitud">
      {steps.map((label, index) => {
        const done = index < current || (index === current && index === 3 && !failed)
        const active = index === current
        const Icon = index === 3 && failed && active ? XCircle
          : status === 'OBSERVED' && index === 2 ? CircleAlert
            : done ? CheckCircle2 : Circle
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <Icon
              aria-hidden="true"
              className={cn('size-5 shrink-0',
                done ? 'text-brand-teal'
                  : active && failed ? 'text-destructive'
                    : active ? 'text-brand-gold' : 'text-muted-foreground/50')}
            />
            <span className={cn('text-sm', active ? 'font-medium text-foreground' : 'text-muted-foreground')}>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function ApplicationFigures({ application }: { application: ApplicationDetail }) {
  const credit = application.productType === 'CREDIT'
  const items: Array<[string, string, boolean?]> = credit
    ? [
        ['Monto solicitado', formatCurrency(application.amount)],
        ['Plazo', formatTerm(application.term, application.termUnit)],
        ['Tasa anual', formatRate(application.annualRate)],
        ['Sistema', application.amortizationSystem ? systemLabels[application.amortizationSystem] : '—'],
        [application.amortizationSystem === 'ALEMAN' ? 'Primera cuota' : 'Cuota', formatCurrency(application.periodicPayment)],
        ['Intereses', formatCurrency(application.totalInterest)],
        ['Seguro de desgravamen', formatCurrency(application.totalInsurance)],
        ['Total a pagar', formatCurrency(application.totalAmount), true],
      ]
    : [
        ['Capital', formatCurrency(application.amount)],
        ['Plazo', formatTerm(application.term, application.termUnit)],
        ['Tasa anual', formatRate(application.annualRate)],
        ['Pago de intereses', application.payoutFrequency ? payoutLabels[application.payoutFrequency as keyof typeof payoutLabels] ?? application.payoutFrequency : '—'],
        ['Retención', formatCurrency(application.totalWithholding)],
        ['Interés neto', formatCurrency(application.totalInterest)],
        ['Valor al vencimiento', formatCurrency(application.totalAmount), true],
      ]
  if (credit && application.totalCharges > 0) items.splice(7, 0, ['Cargos', formatCurrency(application.totalCharges)])

  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value, featured]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className={cn('mt-1 font-medium tabular-nums', featured ? 'text-lg text-brand-teal' : 'text-foreground')}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ScheduleTable({ productType, schedule, highlightNext = false, paidThrough }: {
  productType: 'CREDIT' | 'INVESTMENT'
  schedule: Installment[]
  highlightNext?: boolean
  /** Cuotas ya cobradas de verdad; si se da, manda sobre `highlightNext` (que solo mira la fecha). */
  paidThrough?: number
}) {
  const credit = productType === 'CREDIT'
  const today = new Date().toISOString().slice(0, 10)
  const nextNumber = paidThrough !== undefined
    ? schedule.find((row) => row.number > paidThrough)?.number
    : highlightNext ? schedule.find((row) => row.dueDate > today)?.number : undefined
  const hasCharges = schedule.some((row) => row.charges > 0)

  return (
    <div className="max-h-[28rem] overflow-auto rounded-xl border">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead>N.º</TableHead>
            <TableHead>Fecha</TableHead>
            {credit && <TableHead className="text-right">Saldo inicial</TableHead>}
            <TableHead className="text-right">{credit ? 'Capital' : 'Capital devuelto'}</TableHead>
            <TableHead className="text-right">{credit ? 'Interés' : 'Interés bruto'}</TableHead>
            {credit && <TableHead className="text-right">Desgravamen</TableHead>}
            {credit && hasCharges && <TableHead className="text-right">Cargos</TableHead>}
            {!credit && <TableHead className="text-right">Retención</TableHead>}
            <TableHead className="text-right">{credit ? 'Cuota' : 'Recibes'}</TableHead>
            {credit && <TableHead className="text-right">Saldo final</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedule.map((row) => (
            <TableRow key={row.number} className={cn(row.number === nextNumber && 'bg-brand-teal/5')}>
              <TableCell>
                {row.number}
                {paidThrough !== undefined && row.number <= paidThrough && (
                  <CheckCircle2 className="ml-1.5 inline size-3.5 text-brand-teal" aria-label="Pagada" />
                )}
                {row.number === nextNumber && <span className="ml-2 text-xs text-brand-teal">Próxima</span>}
              </TableCell>
              <TableCell>{formatDate(row.dueDate)}</TableCell>
              {credit && <TableCell className="text-right tabular-nums">{formatCurrency(row.openingBalance)}</TableCell>}
              <TableCell className="text-right tabular-nums">{formatCurrency(row.principal)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(row.interest)}</TableCell>
              {credit && <TableCell className="text-right tabular-nums">{formatCurrency(row.insurance)}</TableCell>}
              {credit && hasCharges && <TableCell className="text-right tabular-nums">{formatCurrency(row.charges)}</TableCell>}
              {!credit && <TableCell className="text-right tabular-nums">{formatCurrency(row.withholding)}</TableCell>}
              <TableCell className="text-right font-medium tabular-nums">{formatCurrency(row.payment)}</TableCell>
              {credit && <TableCell className="text-right tabular-nums">{formatCurrency(row.closingBalance)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function Timeline({ events, customerLabel = 'Tú' }: { events: ApplicationEvent[]; customerLabel?: string }) {
  return (
    <ol className="space-y-5 border-l pl-5">
      {[...events].reverse().map((event, index) => (
        <li key={`${event.createdAt}-${index}`} className="relative">
          <span aria-hidden="true" className={cn('absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full ring-4 ring-card',
            statusTones[event.toStatus] === 'success' ? 'bg-brand-teal'
              : statusTones[event.toStatus] === 'danger' ? 'bg-destructive'
                : statusTones[event.toStatus] === 'warning' ? 'bg-brand-gold' : 'bg-muted-foreground')} />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{statusLabels[event.toStatus]}</span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(event.createdAt)} · {event.byCustomer ? customerLabel : event.actorName ?? 'Brunexa'}
            </span>
          </div>
          {event.comment && <p className="mt-1 max-w-[65ch] text-sm leading-6 text-muted-foreground">{event.comment}</p>}
        </li>
      ))}
    </ol>
  )
}

export function DocumentList({ documents, onOpen, onDelete, empty = 'Sin documentos adjuntos.' }: {
  documents: ApplicationDocument[]
  onOpen: (document: ApplicationDocument) => void
  onDelete?: (document: ApplicationDocument) => void
  empty?: string
}) {
  if (documents.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="divide-y rounded-lg border">
      {documents.map((document) => (
        <li key={document.id} className="flex items-center gap-3 px-4 py-3">
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <button type="button" onClick={() => onOpen(document)} className="min-w-0 flex-1 truncate text-left text-sm hover:text-brand-teal hover:underline">
            {document.fileName}
          </button>
          <span className="shrink-0 text-xs text-muted-foreground">{formatSize(document.sizeBytes)}</span>
          {onDelete && document.byCustomer && (
            <button type="button" onClick={() => onDelete(document)} className="shrink-0 text-xs text-destructive hover:underline">
              Quitar
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Requisitos del cliente antes de solicitar: los provee el módulo de registro y verificación. */
/**
 * Requisitos para solicitar. Un cliente que se registró ya los cumple todos; esto lo ve, sobre todo,
 * una cuenta que nunca pasó por el registro (p. ej. las de ejemplo). La identidad se verifica en Mi
 * perfil con el mismo control del registro: documento + prueba de vida.
 */
export function ReadinessChecklist({ readiness, returnTo }: { readiness: Readiness; returnTo?: string }) {
  const identityDone = readiness.hasProfile && readiness.identityVerified
  const profileLink = returnTo ? `/perfil?volver=${encodeURIComponent(returnTo)}` : '/perfil'
  const items: Array<{ ok: boolean; label: string; hint: ReactNode; icon: typeof UserRound }> = [
    {
      ok: identityDone,
      label: 'Identidad verificada (documento y rostro)',
      hint: <>Verifícala en <Link to={profileLink} className="text-brand-gold underline underline-offset-4">Mi perfil</Link>:
        necesitas tu cédula o pasaporte y la cámara del dispositivo (unos 2 minutos).</>,
      icon: ScanFace,
    },
  ]
  // El correo solo puede faltar en cuentas antiguas; a quien se registra se le verifica antes de ingresar.
  if (readiness.hasProfile && !readiness.emailVerified) {
    items.push({
      ok: false,
      label: 'Correo verificado',
      hint: <><Link to="/verificar-correo" className="text-brand-gold underline underline-offset-4">Ingresa tu código</Link> para verificarlo.</>,
      icon: MailCheck,
    })
  }
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.label} className="flex gap-3 rounded-lg border px-4 py-3">
          {item.ok
            ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-teal" aria-hidden="true" />
            : <item.icon className="mt-0.5 size-5 shrink-0 text-brand-gold" aria-hidden="true" />}
          <div>
            <p className="text-sm font-medium">{item.label}</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.ok ? 'Listo' : item.hint}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Historial de cuotas cobradas de verdad (no proyectadas); solo lectura, la registra el personal. */
export function PaymentsList({ payments, empty = 'Aún no se registran pagos.' }: {
  payments: PaymentRecord[]
  empty?: string
}) {
  if (payments.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="divide-y rounded-lg border">
      {payments.map((payment) => (
        <li key={payment.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="font-medium">Cuota N.º {payment.installmentNumber}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {formatDate(payment.paidAt)} · registrado por {payment.recordedByName}
              {payment.note && ` · ${payment.note}`}
            </p>
          </div>
          <span className="shrink-0 font-medium tabular-nums">{formatCurrency(payment.amount)}</span>
        </li>
      ))}
    </ul>
  )
}
