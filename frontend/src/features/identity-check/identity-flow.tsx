import { Fingerprint } from 'lucide-react'
import { Suspense, lazy, useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { idTypeLabels, type IdType } from '@/features/registration/registration-api'
import { isValidCedula, normalizeFingerprintCode } from '@/lib/ecuadorian-id'
import { DocumentScanner, type ScanStatus } from './document-scanner'
import {
  analyzeDocument,
  type DocumentSide,
  type IdentityClaim,
  type IdentityEndpoint,
  type VerifiedIdentity,
} from './identity-check-api'
import { messageFrom, withMinimumDuration } from './utils'

const LivenessStep = lazy(() => import('./liveness-step').then((module) => ({ default: module.LivenessStep })))

interface SideState {
  status: ScanStatus
  error: string
  preview: string | null
}

const emptySide: SideState = { status: 'idle', error: '', preview: null }

const documentCopy: Record<IdType, Record<DocumentSide, { label: string; steps: string[] }>> = {
  CEDULA: {
    FRONT: {
      label: 'Anverso de la cédula',
      steps: ['Detectando los bordes del documento…', 'Leyendo el número de cédula…', 'Localizando tu fotografía…', 'Comprobando la calidad del rostro…'],
    },
    BACK: {
      label: 'Reverso de la cédula',
      steps: ['Detectando los bordes del documento…', 'Buscando el código dactilar…', 'Comparando con el código ingresado…'],
    },
  },
  PASAPORTE: {
    FRONT: {
      label: 'Página de datos del pasaporte',
      steps: ['Detectando los bordes de la página…', 'Leyendo la zona de lectura mecánica…', 'Validando número y vencimiento…', 'Comprobando la calidad del rostro…'],
    },
    BACK: {
      label: 'Reverso de la página de datos',
      steps: ['Detectando los bordes de la página…', 'Comprobando la imagen…'],
    },
  },
}

const documentHints: Record<IdType, string> = {
  CEDULA: '10 dígitos',
  PASAPORTE: 'Como aparece en el pasaporte',
}

const MINIMUM_SCAN_MS = 2400

/** Fecha local en formato ISO: toISOString usaría UTC y en la noche de Ecuador ya sería mañana. */
function today() {
  return new Date().toLocaleDateString('en-CA')
}

interface IdentityFlowProps {
  endpoint: IdentityEndpoint
  /** En el registro se pide la autorización; al actualizar, la persona ya la dio al crear su cuenta. */
  requireConsent?: boolean
  onVerified: (identity: VerifiedIdentity) => void
  onCancel?: () => void
}

/** Documento (número, código dactilar o vencimiento y ambas caras) y luego prueba de vida. */
export function IdentityFlow({ endpoint, requireConsent = false, onVerified, onCancel }: IdentityFlowProps) {
  const fieldId = useId()
  const [phase, setPhase] = useState<'document' | 'face'>('document')
  const [idType, setIdType] = useState<IdType>('CEDULA')
  const [idNumber, setIdNumber] = useState('')
  const [fingerprintCode, setFingerprintCode] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [consent, setConsent] = useState(!requireConsent)
  const [sides, setSides] = useState<Record<DocumentSide, SideState>>({ FRONT: emptySide, BACK: emptySide })
  const previews = useRef(new Set<string>())

  useEffect(() => {
    const created = previews.current
    return () => created.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const isCedula = idType === 'CEDULA'
  const normalizedCode = normalizeFingerprintCode(fingerprintCode)
  const numberValid = isCedula ? isValidCedula(idNumber) : /^[A-Z0-9]{6,20}$/.test(idNumber)
  const secondFactorValid = isCedula ? Boolean(normalizedCode) : Boolean(expiryDate) && expiryDate >= today()
  const scanning = sides.FRONT.status === 'scanning' || sides.BACK.status === 'scanning'
  const documentsReady = sides.FRONT.status === 'done' && sides.BACK.status === 'done'
  const claim: IdentityClaim = {
    idType,
    idNumber,
    fingerprintCode: isCedula ? normalizedCode : null,
    expiryDate: isCedula ? null : expiryDate || null,
  }

  function updateSide(side: DocumentSide, next: Partial<SideState>) {
    setSides((current) => {
      const merged = { ...current[side], ...next }
      const previous = current[side].preview
      if (previous && merged.preview !== previous) {
        URL.revokeObjectURL(previous)
        previews.current.delete(previous)
      }
      return { ...current, [side]: merged }
    })
  }

  /** Las fotos se validaron contra los datos escritos: si cambian, hay que volver a subirlas. */
  function resetDocuments() {
    if (sides.FRONT.status !== 'idle') updateSide('FRONT', { ...emptySide })
    if (sides.BACK.status !== 'idle') updateSide('BACK', { ...emptySide })
  }

  function changeIdType(value: IdType) {
    setIdType(value)
    setIdNumber('')
    setFingerprintCode('')
    setExpiryDate('')
    resetDocuments()
  }

  function changeIdNumber(value: string) {
    setIdNumber(isCedula
      ? value.replace(/\D/g, '').slice(0, 10)
      : value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))
    resetDocuments()
  }

  function changeFingerprintCode(value: string) {
    setFingerprintCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))
    resetDocuments()
  }

  function changeExpiryDate(value: string) {
    setExpiryDate(value)
    resetDocuments()
  }

  async function scan(side: DocumentSide, file: File) {
    const preview = URL.createObjectURL(file)
    previews.current.add(preview)
    updateSide(side, { status: 'scanning', error: '', preview })
    try {
      await withMinimumDuration(analyzeDocument(endpoint, claim, side, file), MINIMUM_SCAN_MS)
      updateSide(side, { status: 'done' })
    } catch (cause) {
      updateSide(side, { status: 'error', error: messageFrom(cause, 'No pudimos analizar la imagen.') })
    }
  }

  if (phase === 'face') {
    return (
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando verificación facial…</p>}>
        <LivenessStep endpoint={endpoint} claim={claim} documentPreview={sides.FRONT.preview}
          onBack={() => setPhase('document')} onVerified={onVerified} />
      </Suspense>
    )
  }

  const uploadsLocked = !numberValid || !secondFactorValid || !consent

  return (
    <form className="space-y-8" onSubmit={(event) => { event.preventDefault(); if (documentsReady) setPhase('face') }}>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Tipo de documento</Label>
          <Tabs value={idType} onValueChange={(value) => changeIdType(value as IdType)}>
            <TabsList className="w-full">
              <TabsTrigger value="CEDULA" className="flex-1" disabled={scanning}>{idTypeLabels.CEDULA}</TabsTrigger>
              <TabsTrigger value="PASAPORTE" className="flex-1" disabled={scanning}>{idTypeLabels.PASAPORTE}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-numero`}>Número de {isCedula ? 'cédula' : 'pasaporte'}</Label>
          <Input id={`${fieldId}-numero`} inputMode={isCedula ? 'numeric' : 'text'} autoComplete="off"
            placeholder={documentHints[idType]} value={idNumber} disabled={scanning}
            aria-invalid={isCedula && idNumber.length === 10 && !numberValid}
            onChange={(event) => changeIdNumber(event.target.value)} required />
          {isCedula && idNumber.length === 10 && !numberValid && (
            <p className="text-sm text-destructive">La cédula no es válida.</p>
          )}
        </div>
        {isCedula ? (
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-dactilar`} className="inline-flex items-center gap-1.5">
              <Fingerprint className="size-4 text-brand-teal" aria-hidden /> Código dactilar
            </Label>
            <Input id={`${fieldId}-dactilar`} autoComplete="off" autoCapitalize="characters" placeholder="V1234V1234"
              value={fingerprintCode} disabled={scanning}
              aria-invalid={fingerprintCode.length === 10 && !normalizedCode}
              onChange={(event) => changeFingerprintCode(event.target.value)} required />
            {fingerprintCode.length === 10 && !normalizedCode && (
              <p className="text-sm text-destructive">
                Debe ser una letra, cuatro números, una letra y cuatro números.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-vencimiento`}>Fecha de vencimiento</Label>
            <Input id={`${fieldId}-vencimiento`} type="date" min={today()} value={expiryDate} disabled={scanning}
              onChange={(event) => changeExpiryDate(event.target.value)} required />
          </div>
        )}
      </div>

      {requireConsent && (
        <div className="flex items-start gap-3">
          <Checkbox id={`${fieldId}-politicas`} checked={consent}
            onCheckedChange={(value) => setConsent(value === true)} />
          <Label htmlFor={`${fieldId}-politicas`} className="text-sm font-normal leading-6 text-muted-foreground">
            Acepto el acuerdo de uso de canales electrónicos y las políticas de privacidad y tratamiento de datos
            personales. Autorizo el análisis de mi documento y de mi rostro para verificar mi identidad, y que
            Brunexa guarde la plantilla biométrica de mi rostro para confirmarla en operaciones sensibles.
          </Label>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {(['FRONT', 'BACK'] as const).map((side) => (
          <DocumentScanner
            key={`${idType}-${side}`}
            label={documentCopy[idType][side].label}
            steps={documentCopy[idType][side].steps}
            status={sides[side].status}
            previewUrl={sides[side].preview}
            error={sides[side].error}
            disabled={uploadsLocked}
            onSelect={(file) => void scan(side, file)}
          />
        ))}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" className="sm:w-40" disabled={scanning} onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={!documentsReady} className="sm:w-40">Siguiente</Button>
      </div>
    </form>
  )
}
