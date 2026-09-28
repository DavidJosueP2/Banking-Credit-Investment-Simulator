import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CircleAlert, Info, Paperclip, ShieldAlert } from 'lucide-react'
import { lazy, Suspense, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useInstitutionSettings } from '@/app/providers/settings-provider'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  ApplicationFigures,
  ApplicationProgress,
  ApplicationStatusBadge,
  DeclarationList,
  DiscontinuedNotice,
  DocumentList,
  PaymentsList,
  ScheduleTable,
  Timeline,
} from '@/features/applications/application-parts'
import {
  applicationKeys,
  cancelApplication,
  deleteApplicationDocument,
  DOCUMENT_RULES,
  getMyApplication,
  isSettled,
  openClientDocument,
  productTypeLabels,
  respondToObservation,
  uploadApplicationDocument,
  type ApplicationDetail,
} from '@/features/applications/applications-api'
import { messageFrom } from '@/features/identity-check/utils'
import { CreditVisuals } from '@/features/applications/credit-visuals'
import { CreditProgress, InvestmentProgress, InvestmentVisuals } from '@/features/applications/progress-panels'
import { formatDateTime } from '@/lib/formatters'

const BiometricSignature = lazy(() => import('@/features/applications/biometric-signature'))

export function ApplicationDetailPage() {
  const { settings } = useInstitutionSettings()
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
  const uploadsEnabled = credit || settings.investment.documentUploadEnabled === 'true'
  const editableDocuments = uploadsEnabled && ((application.status === 'DRAFT' && application.productAvailable) || application.status === 'OBSERVED')
  const canSign = application.status === 'DRAFT' && application.productAvailable
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
        <ApplicationStatusBadge status={application.status} settled={isSettled(application) ? application.productType : null} />
      </header>

      <div className="mt-6"><ApplicationProgress status={application.status} /></div>

      <DiscontinuedNotice application={application} audience="customer" className="mt-8" />

      {canSign && (
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

      {approved && (
        <div className="mt-8">{credit ? <CreditProgress application={application} /> : <InvestmentProgress application={application} />}</div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <section aria-labelledby="figures-title">
            <h2 id="figures-title" className="mb-4 text-xl">{approved ? (credit ? 'Tu crédito' : 'Tu inversión') : 'Condiciones solicitadas'}</h2>
            <ApplicationFigures application={application} />
          </section>
          <section aria-labelledby="declaration-title">
            <h2 id="declaration-title" className="mb-4 text-xl">Lo que declaraste</h2>
            <DeclarationList application={application} />
          </section>
        </div>

        <aside className="space-y-10">
          <DocumentsPanel application={application} editable={editableDocuments} uploadsEnabled={uploadsEnabled} onChanged={() => void query.refetch()} />
          <section aria-labelledby="history-title">
            <h2 id="history-title" className="mb-4 text-xl">Seguimiento</h2>
            <Timeline events={application.events} />
          </section>
          {cancellable && <CancelApplication application={application} onDone={replace} />}
        </aside>
      </div>

      <div className="mt-12">
        {credit
          ? <CreditVisuals application={application} paidThrough={approved ? application.paidThroughInstallment : undefined} />
          : <InvestmentVisuals application={application} paidThrough={approved ? application.paidThroughInstallment : undefined} />}
      </div>

      <section aria-labelledby="schedule-title" className="mt-12">
        <h2 id="schedule-title" className="text-xl">{approved ? 'Cronograma' : 'Cronograma proyectado'}</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          {approved
            ? 'Las fechas son vencimientos pactados. Los pagos registrados muestran aparte la fecha y el monto reales y la nota, si la hay; no recalculan el cronograma.'
            : 'Las fechas se ajustarán al día en que se apruebe la solicitud.'}
        </p>
        <ScheduleTable productType={application.productType} schedule={application.schedule} highlightNext={approved}
          paidThrough={approved ? application.paidThroughInstallment : undefined}
          payments={approved ? application.payments : undefined} />
      </section>

      {approved && (
        <section aria-labelledby="payments-title" className="mt-12">
          <h2 id="payments-title" className="mb-1 text-xl">Pagos registrados</h2>
          <p className="mb-4 text-sm text-muted-foreground">Lo confirma tu asesor al recibir cada cuota; puede tardar en reflejarse aquí.</p>
          <PaymentsList payments={application.payments} productType={application.productType} />
        </section>
      )}
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

function DocumentsPanel({ application, editable, uploadsEnabled, onChanged }: { application: ApplicationDetail; editable: boolean; uploadsEnabled: boolean; onChanged: () => void }) {
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
            <input ref={input} type="file" accept={DOCUMENT_RULES.accept} className="sr-only" tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) return
                if (!DOCUMENT_RULES.accept.split(',').includes(file.type)) return void toast.error(`Solo se admiten archivos ${DOCUMENT_RULES.formats}.`)
                if (file.size > DOCUMENT_RULES.maxMegabytes * 1024 * 1024) return void toast.error(`El archivo supera ${DOCUMENT_RULES.maxMegabytes} MB.`)
                if (application.documents.length >= DOCUMENT_RULES.maxFiles) return void toast.error(`Puedes adjuntar hasta ${DOCUMENT_RULES.maxFiles} documentos.`)
                upload.mutate(file)
              }} />
            <Button type="button" variant="outline" size="sm" disabled={upload.isPending} onClick={() => input.current?.click()}>
              <Paperclip className="size-4" />{upload.isPending ? 'Subiendo…' : 'Adjuntar'}
            </Button>
          </>
        )}
      </div>
      {editable && (
        <div className="mb-3 space-y-1 text-xs leading-5 text-muted-foreground">
          <p>
            {application.productType === 'CREDIT'
              ? 'Opcional. Ayudan al asesor: rol de pagos, certificado de ingresos, estado de cuenta o proforma del bien.'
              : 'Opcional. Por ejemplo: estado de cuenta o respaldo del origen de los fondos.'}
          </p>
          <p className="flex gap-1.5">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              Hasta {DOCUMENT_RULES.maxFiles} archivos ({application.documents.length} de {DOCUMENT_RULES.maxFiles}) · {DOCUMENT_RULES.formats} ·
              máximo {DOCUMENT_RULES.maxMegabytes} MB cada uno. Revisamos el contenido real del archivo, no solo su extensión.
            </span>
          </p>
        </div>
      )}
      {!uploadsEnabled && application.documents.length === 0 && (
        <p className="text-xs leading-5 text-muted-foreground">La institución no recibe documentos en línea para inversiones; si hacen falta, tu asesor te dirá cómo entregarlos.</p>
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
