import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CircleAlert, Paperclip, ShieldAlert } from 'lucide-react'
import { lazy, Suspense, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  ApplicationFigures,
  ApplicationProgress,
  ApplicationStatusBadge,
  DocumentList,
  PaymentsList,
  ScheduleTable,
  Timeline,
} from '@/features/applications/application-parts'
import {
  applicationKeys,
  cancelApplication,
  deleteApplicationDocument,
  getMyApplication,
  openClientDocument,
  productTypeLabels,
  respondToObservation,
  uploadApplicationDocument,
  type ApplicationDetail,
} from '@/features/applications/applications-api'
import { messageFrom } from '@/features/identity-check/utils'
import { CreditVisuals } from '@/features/applications/credit-visuals'
import { formatCurrency, formatDateTime } from '@/lib/formatters'

const BiometricSignature = lazy(() => import('@/features/applications/biometric-signature'))

export function ApplicationDetailPage() {
  const id = Number(useParams().applicationId)
  const client = useQueryClient()
  const query = useQuery({ queryKey: applicationKeys.mineDetail(id), queryFn: () => getMyApplication(id), enabled: Number.isFinite(id) })

  function replace(application: ApplicationDetail) {
    client.setQueryData(applicationKeys.mineDetail(id), application)
    void client.invalidateQueries({ queryKey: applicationKeys.mine, exact: true })
  }

  if (query.isPending) return <main id="contenido" className="mx-auto max-w-6xl px-5 py-16 text-sm text-muted-foreground sm:px-8">Cargando solicitud…</main>
  if (query.isError || !query.data) {
    return (
      <main id="contenido" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <h1 className="text-2xl">No encontramos la solicitud</h1>
        <p className="mt-3 text-muted-foreground">{messageFrom(query.error, 'Revisa el enlace o vuelve a tu espacio.')}</p>
        <Button asChild variant="outline" className="mt-6"><Link to="/cliente">Ir a mi espacio</Link></Button>
      </main>
    )
  }

  const application = query.data
  const credit = application.productType === 'CREDIT'
  const approved = application.status === 'APPROVED'
  const editableDocuments = application.status === 'DRAFT' || application.status === 'OBSERVED'
  const cancellable = ['DRAFT', 'SUBMITTED', 'OBSERVED'].includes(application.status)

  return (
    <main id="contenido" className="mx-auto min-h-[65svh] max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
      <Link to="/cliente" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />Mi espacio
      </Link>

      <header className="mt-6 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-gold">{productTypeLabels[application.productType]} · {application.code}</p>
          <h1 className="mt-2 text-3xl text-brand-teal">{application.productName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Creada el {formatDateTime(application.createdAt)}
            {application.submittedAt && ` · Enviada el ${formatDateTime(application.submittedAt)}`}
          </p>
        </div>
        <ApplicationStatusBadge status={application.status} />
      </header>

      <div className="mt-6"><ApplicationProgress status={application.status} /></div>

      {application.status === 'DRAFT' && (
        <section className="mt-8 rounded-xl border border-brand-teal/30 bg-brand-teal/5 p-6" aria-labelledby="sign-title">
          <h2 id="sign-title" className="text-lg">Confirma tu identidad para enviar</h2>
          <p className="mt-1 max-w-[70ch] text-sm leading-6 text-muted-foreground">
            Antes de enviar, adjunta los documentos que respalden tu solicitud (opcional) y confirma que eres tú con una prueba de vida.
          </p>
          <div className="mt-5">
            <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando verificación facial…</p>}>
              <BiometricSignature application={application} onSubmitted={(updated) => {
                replace(updated)
                toast.success('Solicitud enviada', { description: 'Un asesor la revisará y verás aquí cada avance.' })
              }} />
            </Suspense>
          </div>
        </section>
      )}

      {application.status === 'OBSERVED' && (
        <ObservationResponse application={application} onDone={replace} />
      )}

      {(application.status === 'REJECTED' || (approved && application.decisionComment)) && (
        <section className={`mt-8 rounded-xl border p-5 ${approved ? 'border-brand-teal/30 bg-brand-teal/5' : 'border-destructive/30 bg-destructive/5'}`}>
          <p className="font-medium">{approved ? 'Comentario del asesor' : 'Motivo del rechazo'}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{application.decisionComment}</p>
        </section>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-10">
          <section aria-labelledby="figures-title">
            <h2 id="figures-title" className="mb-5 text-xl">{approved ? (credit ? 'Tu crédito' : 'Tu inversión') : 'Condiciones solicitadas'}</h2>
            <ApplicationFigures application={application} />
            <dl className="mt-6 grid gap-4 border-t pt-5 text-sm sm:grid-cols-2">
              {credit && application.monthlyIncome && (
                <div><dt className="text-muted-foreground">Ingreso mensual declarado</dt><dd className="mt-1 font-medium">{formatCurrency(application.monthlyIncome)}</dd></div>
              )}
              <div><dt className="text-muted-foreground">{credit ? 'Destino del crédito' : 'Origen de los fondos'}</dt><dd className="mt-1">{application.purpose}</dd></div>
            </dl>
          </section>

          {credit && <CreditVisuals application={application} />}

          <section aria-labelledby="schedule-title">
            <h2 id="schedule-title" className="text-xl">{approved ? 'Cronograma' : 'Cronograma proyectado'}</h2>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              {approved
                ? 'Fechas calculadas desde el día de aprobación.'
                : 'Las fechas se ajustarán al día en que se apruebe la solicitud.'}
            </p>
            <ScheduleTable productType={application.productType} schedule={application.schedule} highlightNext={approved}
              paidThrough={approved ? application.paidThroughInstallment : undefined} />
          </section>

          {approved && (
            <section aria-labelledby="payments-title">
              <h2 id="payments-title" className="mb-1 text-xl">Pagos registrados</h2>
              <p className="mb-4 text-sm text-muted-foreground">Lo confirma tu asesor al recibir cada cuota; puede tardar en reflejarse aquí.</p>
              <PaymentsList payments={application.payments} />
            </section>
          )}
        </div>

        <aside className="space-y-10">
          <DocumentsPanel application={application} editable={editableDocuments} onChanged={() => void query.refetch()} />
          <section aria-labelledby="history-title">
            <h2 id="history-title" className="mb-4 text-xl">Seguimiento</h2>
            <Timeline events={application.events} />
          </section>
          {cancellable && <CancelApplication application={application} onDone={replace} />}
        </aside>
      </div>
    </main>
  )
}

function ObservationResponse({ application, onDone }: { application: ApplicationDetail; onDone: (application: ApplicationDetail) => void }) {
  const [comment, setComment] = useState('')
  const respond = useMutation({
    mutationFn: () => respondToObservation(application.id, comment),
    onSuccess: (updated) => {
      onDone(updated)
      setComment('')
      toast.success('Enviamos tu respuesta al asesor.')
    },
    onError: (error) => toast.error(messageFrom(error, 'No pudimos enviar tu respuesta.')),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    respond.mutate()
  }

  return (
    <section className="mt-8 rounded-xl border border-brand-gold/40 bg-brand-gold/5 p-6" aria-labelledby="observed-title">
      <div className="flex gap-3">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-brand-gold" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="observed-title" className="text-lg">El asesor necesita algo de ti</h2>
          <p className="mt-1 text-sm leading-6">{application.decisionComment}</p>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <Textarea required minLength={5} maxLength={600} rows={3} value={comment} onChange={(event) => setComment(event.target.value)}
              placeholder="Cuéntale qué corregiste o adjuntaste" aria-label="Respuesta para el asesor" />
            <p className="text-xs text-muted-foreground">Si te pidieron documentos, adjúntalos en la sección Documentos antes de responder.</p>
            <Button type="submit" variant="brand" disabled={respond.isPending}>{respond.isPending ? 'Enviando…' : 'Responder y reenviar'}</Button>
          </form>
        </div>
      </div>
    </section>
  )
}

function DocumentsPanel({ application, editable, onChanged }: { application: ApplicationDetail; editable: boolean; onChanged: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useMutation({
    mutationFn: (file: File) => uploadApplicationDocument(application.id, file),
    onSuccess: () => { onChanged(); toast.success('Documento adjuntado.') },
    onError: (error) => toast.error(messageFrom(error, 'No pudimos adjuntar el documento.')),
  })
  const remove = useMutation({
    mutationFn: (documentId: number) => deleteApplicationDocument(application.id, documentId),
    onSuccess: onChanged,
    onError: (error) => toast.error(messageFrom(error, 'No pudimos quitar el documento.')),
  })

  return (
    <section aria-labelledby="documents-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="documents-title" className="text-xl">Documentos</h2>
        {editable && (
          <>
            <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) upload.mutate(file)
                event.target.value = ''
              }} />
            <Button type="button" variant="outline" size="sm" disabled={upload.isPending} onClick={() => input.current?.click()}>
              <Paperclip className="size-4" />{upload.isPending ? 'Subiendo…' : 'Adjuntar'}
            </Button>
          </>
        )}
      </div>
      {editable && (
        <p className="mb-3 text-xs leading-5 text-muted-foreground">
          {application.productType === 'CREDIT'
            ? 'Por ejemplo: rol de pagos, certificado de ingresos o proforma del bien.'
            : 'Por ejemplo: estado de cuenta o respaldo del origen de los fondos.'} PDF, JPG o PNG hasta 5 MB.
        </p>
      )}
      <DocumentList
        documents={application.documents}
        onOpen={(document) => void openClientDocument(application.id, document.id).catch(() => toast.error('No se pudo abrir el documento.'))}
        onDelete={editable ? (document) => remove.mutate(document.id) : undefined}
      />
      {application.biometricResult === 'MANUAL_REVIEW' && (
        <p className="mt-4 flex gap-2 text-xs leading-5 text-muted-foreground">
          <ShieldAlert className="size-4 shrink-0 text-brand-gold" aria-hidden="true" />
          Tu verificación facial no fue concluyente; un asesor confirmará tu identidad antes de decidir.
        </p>
      )}
    </section>
  )
}

function CancelApplication({ application, onDone }: { application: ApplicationDetail; onDone: (application: ApplicationDetail) => void }) {
  const cancel = useMutation({
    mutationFn: () => cancelApplication(application.id),
    onSuccess: (updated) => { onDone(updated); toast.success('Solicitud cancelada.') },
    onError: (error) => toast.error(messageFrom(error, 'No pudimos cancelar la solicitud.')),
  })
  return (
    <ConfirmDialog
      trigger={<Button variant="ghost" className="text-destructive hover:text-destructive">Cancelar solicitud</Button>}
      title="¿Cancelar esta solicitud?"
      description="El asesor ya no la revisará. Podrás crear una nueva desde el simulador."
      confirmLabel="Cancelar solicitud"
      cancelLabel="Volver"
      confirmVariant="destructive"
      isPending={cancel.isPending}
      onConfirm={() => cancel.mutate()}
    />
  )
}
