import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, CircleAlert, IdCard, Info, ShieldAlert, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ApplicationFigures,
  ApplicationStatusBadge,
  DocumentList,
  PaymentsList,
  ScheduleTable,
  Timeline,
} from '@/features/applications/application-parts'
import {
  applicationKeys,
  decideApplication,
  deletePayment,
  formatTerm,
  getReviewDetail,
  openIdentityDocument,
  openReviewDocument,
  productTypeLabels,
  registerPayment,
  takeApplication,
  type ApplicationDetail,
  type CustomerFile,
  type Decision,
  type ReviewActions,
  type ReviewDetail,
} from '@/features/applications/applications-api'
import { messageFrom } from '@/features/identity-check/utils'
import { CreditVisuals } from '@/features/applications/credit-visuals'
import { idTypeLabels } from '@/features/registration/registration-api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'

/** Referencia prudencial para crédito de consumo; el asesor decide, el sistema solo lo señala. */
const PAYMENT_TO_INCOME_ALERT = 0.4

export function ApplicationReviewPage() {
  const id = Number(useParams().applicationId)
  const client = useQueryClient()
  const query = useQuery({ queryKey: applicationKeys.review(id), queryFn: () => getReviewDetail(id), enabled: Number.isFinite(id) })

  function replace(detail: ReviewDetail) {
    client.setQueryData(applicationKeys.review(id), detail)
    void client.invalidateQueries({ queryKey: applicationKeys.queue, exact: true })
  }

  const take = useMutation({
    mutationFn: () => takeApplication(id),
    onSuccess: (detail) => { replace(detail); toast.success('Tomaste la solicitud.') },
    onError: (error) => toast.error(messageFrom(error, 'No se pudo tomar la solicitud.')),
  })

  if (query.isPending) return <p className="text-sm text-muted-foreground">Cargando expediente…</p>
  if (query.isError || !query.data) {
    return (
      <div>
        <h1 className="text-2xl">No se pudo abrir la solicitud</h1>
        <p className="mt-3 text-muted-foreground">{messageFrom(query.error, 'Vuelve a la bandeja e intenta de nuevo.')}</p>
        <Button asChild variant="outline" className="mt-6"><Link to="/admin/solicitudes">Ir a la bandeja</Link></Button>
      </div>
    )
  }

  const { application, customer, actions } = query.data
  const credit = application.productType === 'CREDIT'
  const canAct = actions.canObserve || actions.canRecommend || actions.canDecide || actions.canFinalize || actions.canReturn

  return (
    <div className="space-y-8">
      <Link to="/admin/solicitudes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />Bandeja de solicitudes
      </Link>

      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-gold">{productTypeLabels[application.productType]} · {application.code}</p>
          <h1 className="mt-1 text-2xl sm:text-3xl">{customer.fullName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {application.productName} · {formatCurrency(application.amount)} a {formatTerm(application.term, application.termUnit)}
            {application.submittedAt && ` · Enviada el ${formatDateTime(application.submittedAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ApplicationStatusBadge status={application.status} />
          {actions.canTake && (
            <Button variant="brand" disabled={take.isPending} onClick={() => take.mutate()}>
              {take.isPending ? 'Tomando…' : 'Tomar para revisión'}
            </Button>
          )}
        </div>
      </header>

      {actions.notice && (
        <p className="flex gap-2 rounded-lg border bg-muted/40 p-4 text-sm">
          <Info className="size-4 shrink-0 text-brand-teal" aria-hidden="true" />{actions.notice}
        </p>
      )}
      {application.recommendation && <RecommendationBox application={application} />}
      {canAct && <DecisionPanel application={application} actions={actions} onDone={replace} />}
      {(application.status === 'APPROVED' || application.status === 'REJECTED') && application.decidedByName && (
        <p className="text-sm text-muted-foreground">
          {application.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'} por {application.decidedByName}
          {application.decidedAt && ` el ${formatDateTime(application.decidedAt)}`}.
          {application.decisionComment && <> Motivo: “{application.decisionComment}”</>}
        </p>
      )}
      {application.status === 'OBSERVED' && (
        <p className="flex gap-2 rounded-lg border border-brand-gold/40 bg-brand-gold/5 p-4 text-sm">
          <CircleAlert className="size-4 shrink-0 text-brand-gold" aria-hidden="true" />
          Esperando respuesta del cliente a la observación: “{application.decisionComment}”
        </p>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <section className="rounded-xl border p-6" aria-labelledby="conditions-title">
            <h2 id="conditions-title" className="mb-5 text-lg">Condiciones calculadas</h2>
            <ApplicationFigures application={application} />
            <div className="mt-6 grid gap-4 border-t pt-5 text-sm sm:grid-cols-2">
              {credit && <CapacityIndicator application={application} />}
              <div>
                <p className="text-muted-foreground">{credit ? 'Destino del crédito' : 'Origen de los fondos'}</p>
                <p className="mt-1">{application.purpose}</p>
              </div>
            </div>
          </section>

          {credit && <CreditVisuals application={application} />}

          <section aria-labelledby="schedule-title">
            <h2 id="schedule-title" className="mb-4 text-lg">Cronograma {application.status === 'APPROVED' ? '' : 'proyectado'}</h2>
            <ScheduleTable productType={application.productType} schedule={application.schedule}
              paidThrough={application.status === 'APPROVED' ? application.paidThroughInstallment : undefined} />
          </section>

          {application.status === 'APPROVED' && (
            <PaymentsSection application={application} actions={actions} onDone={replace} />
          )}
        </div>

        <aside className="space-y-8">
          <CustomerPanel application={application} customer={customer} />
          <section aria-labelledby="docs-title">
            <h2 id="docs-title" className="mb-3 text-lg">Documentos de la solicitud</h2>
            <DocumentList documents={application.documents}
              onOpen={(document) => void openReviewDocument(application.id, document.id).catch(() => toast.error('No se pudo abrir el documento.'))}
              empty="El cliente no adjuntó documentos." />
          </section>
          <section aria-labelledby="timeline-title">
            <h2 id="timeline-title" className="mb-4 text-lg">Historial</h2>
            <Timeline events={application.events} customerLabel="Cliente" />
          </section>
        </aside>
      </div>
    </div>
  )
}

/**
 * Registro de pagos: bookkeeping, no una decisión de crédito. El servidor siempre asigna la cuota
 * siguiente del cronograma (nunca se elige el número) y solo deja quitar el último pago registrado.
 */
function PaymentsSection({ application, actions, onDone }: {
  application: ApplicationDetail
  actions: ReviewActions
  onDone: (detail: ReviewDetail) => void
}) {
  const nextNumber = application.paidThroughInstallment + 1
  const nextRow = application.schedule.find((row) => row.number === nextNumber)
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  const register = useMutation({
    mutationFn: () => registerPayment(application.id, {
      amount: Number(amount || nextRow?.payment || 0),
      paidAt,
      note: note.trim() || undefined,
    }),
    onSuccess: (detail) => {
      onDone(detail)
      setAmount('')
      setNote('')
      toast.success(`Pago de la cuota N.º ${nextNumber} registrado.`)
    },
    onError: (error) => toast.error(messageFrom(error, 'No se pudo registrar el pago.')),
  })

  const lastPayment = application.payments.at(-1)
  const removeLast = useMutation({
    mutationFn: () => deletePayment(application.id, lastPayment!.id),
    onSuccess: (detail) => { onDone(detail); toast.success('Se quitó el último pago.') },
    onError: (error) => toast.error(messageFrom(error, 'No se pudo quitar el pago.')),
  })

  return (
    <section className="rounded-xl border p-6" aria-labelledby="payments-title">
      <h2 id="payments-title" className="mb-4 text-lg">Pagos</h2>
      <PaymentsList payments={application.payments} />

      {actions.canRegisterPayment && nextRow && (
        <div className="mt-5 space-y-3 border-t pt-4">
          <p className="text-sm">
            Próxima cuota a registrar: <strong>N.º {nextNumber}</strong> · vence {formatDate(nextRow.dueDate)}
            {' '}· cuota {formatCurrency(nextRow.payment)}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="payment-amount" className="text-xs">Monto pagado</Label>
              <Input id="payment-amount" type="number" min="0.01" step="0.01" placeholder={String(nextRow.payment)}
                value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="payment-date" className="text-xs">Fecha de pago</Label>
              <Input id="payment-date" type="date" max={new Date().toISOString().slice(0, 10)}
                value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="payment-note" className="text-xs">Nota (opcional)</Label>
              <Input id="payment-note" maxLength={200} placeholder="Transferencia, efectivo…"
                value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
          </div>
          <Button type="button" size="sm" variant="brand" disabled={register.isPending} onClick={() => register.mutate()}>
            {register.isPending ? 'Registrando…' : 'Registrar pago'}
          </Button>
        </div>
      )}

      {actions.canRegisterPayment && !nextRow && (
        <p className="mt-4 text-sm text-muted-foreground">Ya se registraron todas las cuotas del cronograma.</p>
      )}

      {actions.canRegisterPayment && lastPayment && (
        <button type="button" disabled={removeLast.isPending} onClick={() => removeLast.mutate()}
          className="mt-3 text-xs text-destructive hover:underline disabled:opacity-50">
          {removeLast.isPending ? 'Quitando…' : `Quitar el último pago (cuota N.º ${lastPayment.installmentNumber})`}
        </button>
      )}
    </section>
  )
}

function CapacityIndicator({ application }: { application: ApplicationDetail }) {
  if (!application.monthlyIncome || !application.periodicPayment) return null
  const monthlyPayment = application.termUnit === 'YEARS' ? application.periodicPayment / 12 : application.periodicPayment
  const ratio = monthlyPayment / application.monthlyIncome
  const high = ratio > PAYMENT_TO_INCOME_ALERT
  return (
    <div>
      <p className="text-muted-foreground">Cuota / ingreso mensual</p>
      <p className={cn('mt-1 text-lg font-medium tabular-nums', high ? 'text-destructive' : 'text-brand-teal')}>
        {new Intl.NumberFormat('es-EC', { style: 'percent', maximumFractionDigits: 1 }).format(ratio)}
      </p>
      <p className="text-xs text-muted-foreground">
        Ingreso declarado {formatCurrency(application.monthlyIncome)}.{high ? ' Supera el 40 % de referencia.' : ' Dentro del 40 % de referencia.'}
      </p>
    </div>
  )
}

function CustomerPanel({ application, customer }: { application: ApplicationDetail; customer: CustomerFile }) {
  const age = customer.birthDate ? ageFrom(customer.birthDate) : null
  const manualReview = application.biometricResult === 'MANUAL_REVIEW'
  return (
    <section className="rounded-xl border p-5" aria-labelledby="customer-title">
      <h2 id="customer-title" className="text-lg">Expediente del cliente</h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Item label="Documento" value={customer.idType ? `${idTypeLabels[customer.idType]} ${customer.idNumber}` : '—'} />
        <Item label="Edad" value={age !== null ? `${age} años` : '—'} />
        <Item label="Correo" value={customer.email} />
        <Item label="Teléfono" value={customer.phone ?? '—'} />
        <div className="col-span-2"><Item label="Dirección" value={customer.address ?? 'Sin registrar'} /></div>
      </dl>

      <div className="mt-5 space-y-2 border-t pt-4 text-sm">
        <p className="flex items-center gap-2">
          <BadgeCheck className={cn('size-4', customer.identityVerifiedAt ? 'text-brand-teal' : 'text-muted-foreground')} aria-hidden="true" />
          {customer.identityVerifiedAt ? `Identidad verificada el ${formatDate(customer.identityVerifiedAt)}` : 'Sin identidad verificada'}
        </p>
        <p className="flex items-center gap-2">
          {manualReview
            ? <ShieldAlert className="size-4 text-brand-gold" aria-hidden="true" />
            : <BadgeCheck className="size-4 text-brand-teal" aria-hidden="true" />}
          {application.biometricResult === 'APPROVED' && 'Prueba de vida al enviar: aprobada'}
          {manualReview && 'Prueba de vida al enviar: parecido no concluyente'}
          {!application.biometricResult && 'Sin prueba de vida registrada'}
        </p>
        {manualReview && (
          <p className="text-xs leading-5 text-muted-foreground">Compara el documento con el cliente antes de aprobar. Deberás dejar constancia en el comentario.</p>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          {customer.documentFront && (
            <Button type="button" variant="outline" size="sm" onClick={() => void openIdentityDocument(application.id, 'front').catch(() => toast.error('No se pudo abrir el documento.'))}>
              <IdCard className="size-4" />Anverso
            </Button>
          )}
          {customer.documentBack && (
            <Button type="button" variant="outline" size="sm" onClick={() => void openIdentityDocument(application.id, 'back').catch(() => toast.error('No se pudo abrir el documento.'))}>
              <IdCard className="size-4" />Reverso
            </Button>
          )}
        </div>
      </div>

      {customer.otherApplications.length > 0 && (
        <div className="mt-5 border-t pt-4">
          <p className="text-sm font-medium">Otras solicitudes</p>
          <ul className="mt-2 space-y-2">
            {customer.otherApplications.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                <Link to={`/admin/solicitudes/${item.id}`} className="truncate hover:text-brand-teal hover:underline">
                  {item.code} · {formatCurrency(item.amount)}
                </Link>
                <ApplicationStatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function ageFrom(birthDate: string) {
  const birth = new Date(`${birthDate}T00:00:00`)
  const today = new Date()
  const hadBirthday = today.getMonth() > birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  return today.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1)
}

function Item({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 truncate" title={value}>{value}</dd></div>
}

function RecommendationBox({ application }: { application: ApplicationDetail }) {
  const approve = application.recommendation === 'APPROVE'
  return (
    <section className={`rounded-xl border p-5 ${approve ? 'border-brand-teal/30 bg-brand-teal/5' : 'border-destructive/30 bg-destructive/5'}`}>
      <p className="flex items-center gap-2 font-medium">
        {approve ? <ThumbsUp className="size-4 text-brand-teal" aria-hidden="true" /> : <ThumbsDown className="size-4 text-destructive" aria-hidden="true" />}
        El asesor recomienda {approve ? 'aprobar' : 'rechazar'}
      </p>
      <p className="mt-2 text-sm leading-6">{application.recommendationComment}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {application.recommendedByName}{application.recommendedAt && ` · ${formatDateTime(application.recommendedAt)}`} · Nota interna: el cliente no la ve.
      </p>
    </section>
  )
}

interface DecisionOption {
  value: Decision
  label: string
  button: string
  placeholder: string
  tone: 'brand' | 'outline' | 'destructive'
  commentRequired: boolean
}

function decisionOptions(application: ApplicationDetail, actions: ReviewActions): DecisionOption[] {
  const credit = application.productType === 'CREDIT'
  const manual = application.biometricResult === 'MANUAL_REVIEW'
  const options: DecisionOption[] = []
  if (actions.canFinalize) {
    options.push(
      { value: 'APPROVE', label: 'Aprobar crédito', button: 'Aprobar crédito', tone: 'brand',
        commentRequired: manual || application.recommendation === 'REJECT',
        placeholder: application.recommendation === 'REJECT' ? 'Justifica por qué apruebas pese a la recomendación' : 'Comentario para el cliente (opcional)' },
      { value: 'REJECT', label: 'Rechazar', button: 'Rechazar crédito', tone: 'destructive', commentRequired: true,
        placeholder: 'Motivo del rechazo que verá el cliente' },
      { value: 'RETURN', label: 'Devolver al asesor', button: 'Devolver al asesor', tone: 'outline', commentRequired: true,
        placeholder: 'Qué debe revisar o completar el asesor (nota interna)' },
    )
  }
  if (actions.canRecommend) {
    options.push(
      { value: 'RECOMMEND_APPROVE', label: 'Recomendar aprobación', button: 'Enviar al analista', tone: 'brand', commentRequired: true,
        placeholder: 'Resumen para el analista: capacidad de pago, documentos revisados, riesgos' },
      { value: 'RECOMMEND_REJECT', label: 'Recomendar rechazo', button: 'Enviar al analista', tone: 'outline', commentRequired: true,
        placeholder: 'Motivo de la recomendación para el analista' },
    )
  }
  if (actions.canDecide) {
    options.push(
      { value: 'APPROVE', label: credit ? 'Aprobar (mi atribución)' : 'Aprobar', button: 'Aprobar solicitud', tone: 'brand',
        commentRequired: manual, placeholder: manual ? 'Explica cómo confirmaste la identidad del cliente' : 'Comentario para el cliente (opcional)' },
      { value: 'REJECT', label: 'Rechazar', button: 'Rechazar solicitud', tone: 'destructive', commentRequired: true,
        placeholder: 'Motivo del rechazo que verá el cliente' },
    )
  }
  if (actions.canObserve) {
    options.push({ value: 'OBSERVE', label: 'Pedir información', button: 'Enviar observación', tone: 'outline', commentRequired: true,
      placeholder: 'Qué debe corregir o adjuntar el cliente' })
  }
  return options
}

function DecisionPanel({ application, actions, onDone }: { application: ApplicationDetail; actions: ReviewActions; onDone: (detail: ReviewDetail) => void }) {
  const options = decisionOptions(application, actions)
  const [selected, setSelected] = useState<Decision>(options[0]?.value ?? 'OBSERVE')
  const [comment, setComment] = useState('')
  const option = options.find((item) => item.value === selected) ?? options[0]
  const decide = useMutation({
    mutationFn: () => decideApplication(application.id, option.value, comment),
    onSuccess: (detail) => {
      onDone(detail)
      setComment('')
      toast.success(successMessage(option.value))
    },
    onError: (error) => toast.error(messageFrom(error, 'No se pudo registrar la decisión.')),
  })
  if (!option) return null
  const credit = application.productType === 'CREDIT'

  return (
    <section className="rounded-xl border border-brand-teal/30 bg-brand-teal/5 p-5" aria-labelledby="decision-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="decision-title" className="text-lg">{actions.canFinalize ? 'Decisión del analista' : 'Revisión del asesor'}</h2>
        {credit && actions.advisorApprovalLimit !== null && !actions.canFinalize && (
          <span className="text-xs text-muted-foreground">
            Atribución del asesor: hasta {formatCurrency(actions.advisorApprovalLimit)} con biometría aprobada
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de decisión">
        {options.map((item) => (
          <Button key={item.value} type="button" size="sm" role="radio" aria-checked={option.value === item.value}
            variant={option.value === item.value ? (item.tone === 'destructive' ? 'destructive' : 'brand') : 'outline'}
            onClick={() => setSelected(item.value)}>
            {item.label}
          </Button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <Label htmlFor="decision-comment">
          Comentario {option.commentRequired ? <span className="text-destructive">(obligatorio)</span> : <span className="text-muted-foreground">(opcional)</span>}
        </Label>
        <Textarea id="decision-comment" rows={3} maxLength={600} value={comment} onChange={(event) => setComment(event.target.value)}
          placeholder={option.placeholder} />
      </div>
      <Button type="button" className="mt-4" variant={option.tone} disabled={decide.isPending} onClick={() => decide.mutate()}>
        {decide.isPending ? 'Registrando…' : option.button}
      </Button>
    </section>
  )
}

function successMessage(decision: Decision) {
  switch (decision) {
    case 'APPROVE': return 'Solicitud aprobada.'
    case 'REJECT': return 'Solicitud rechazada.'
    case 'OBSERVE': return 'Observación enviada al cliente.'
    case 'RETURN': return 'Solicitud devuelta al asesor.'
    default: return 'Recomendación enviada al analista.'
  }
}
