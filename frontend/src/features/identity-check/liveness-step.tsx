import '@aws-amplify/ui-react/styles.css'

import { FaceLivenessDetector, type FaceLivenessDetectorProps } from '@aws-amplify/ui-react-liveness'
import { ScanFace } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  completeLiveness,
  startLiveness,
  type IdentityClaim,
  type IdentityEndpoint,
  type LivenessTicket,
  type VerifiedIdentity,
} from './identity-check-api'
import { applyLivenessCredentials } from './liveness-credentials'
import { messageFrom, withMinimumDuration } from './utils'

type Phase = 'intro' | 'preparing' | 'capturing' | 'verifying' | 'rejected'

interface LivenessStepProps {
  endpoint: IdentityEndpoint
  claim: IdentityClaim
  documentPreview: string | null
  onBack: () => void
  onVerified: (identity: VerifiedIdentity) => void
}

const displayText: FaceLivenessDetectorProps['displayText'] = {
  hintMoveFaceFrontOfCameraText: 'Coloca tu rostro frente a la cámara',
  hintTooManyFacesText: 'Asegúrate de que solo tu rostro esté frente a la cámara',
  hintFaceDetectedText: 'Rostro detectado',
  hintCanNotIdentifyText: 'Coloca tu rostro frente a la cámara',
  hintTooCloseText: 'Aléjate un poco',
  hintTooFarText: 'Acércate un poco',
  hintConnectingText: 'Conectando…',
  hintVerifyingText: 'Verificando…',
  hintCheckCompleteText: 'Listo',
  hintIlluminationTooBrightText: 'Busca un lugar con menos luz',
  hintIlluminationTooDarkText: 'Busca un lugar con más luz',
  hintIlluminationNormalText: 'Iluminación adecuada',
  hintHoldFaceForFreshnessText: 'Quédate quieto',
  hintCenterFaceText: 'Centra tu rostro',
  hintCenterFaceInstructionText: 'Centra tu rostro en el óvalo',
  hintFaceOffCenterText: 'Tu rostro no está centrado',
  hintMatchIndicatorText: '50 % completado. Sigue acercándote.',
  cameraMinSpecificationsHeadingText: 'La cámara no cumple los requisitos mínimos',
  cameraMinSpecificationsMessageText: 'La cámara debe tener al menos 320×240 de resolución y 15 cuadros por segundo.',
  cameraNotFoundHeadingText: 'No podemos acceder a la cámara',
  cameraNotFoundMessageText: 'Revisa que esté conectada y que el navegador tenga permiso para usarla.',
  retryCameraPermissionsText: 'Reintentar',
  waitingCameraPermissionText: 'Esperando permiso para usar la cámara…',
  a11yVideoLabelText: 'Vista de la cámara para la verificación facial',
  recordingIndicatorText: 'Grabando',
  cancelLivenessCheckText: 'Cancelar verificación',
  errorLabelText: 'Error',
  connectionTimeoutHeaderText: 'Se agotó el tiempo de conexión',
  connectionTimeoutMessageText: 'No pudimos conectar con el servicio de verificación.',
  timeoutHeaderText: 'Se agotó el tiempo',
  timeoutMessageText: 'Tu rostro no llenó el óvalo a tiempo. Inténtalo de nuevo.',
  faceDistanceHeaderText: 'Movimiento hacia adelante detectado',
  faceDistanceMessageText: 'Evita acercarte mientras se conecta.',
  multipleFacesHeaderText: 'Se detectó más de un rostro',
  multipleFacesMessageText: 'Asegúrate de que solo tu rostro esté frente a la cámara.',
  clientHeaderText: 'Error del cliente',
  clientMessageText: 'La verificación falló por un problema del dispositivo.',
  serverHeaderText: 'Error del servidor',
  serverMessageText: 'No pudimos completar la verificación por un problema del servidor.',
  landscapeHeaderText: 'Orientación horizontal no soportada',
  landscapeMessageText: 'Gira tu dispositivo a vertical.',
  portraitMessageText: 'Mantén el dispositivo en vertical durante la verificación.',
  tryAgainText: 'Intentar de nuevo',
}

export function LivenessStep({ endpoint, claim, documentPreview, onBack, onVerified }: LivenessStepProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [ticket, setTicket] = useState<LivenessTicket | null>(null)
  const [message, setMessage] = useState('')

  async function start() {
    setMessage('')
    setPhase('preparing')
    try {
      const issued = await startLiveness(endpoint, claim)
      applyLivenessCredentials(issued)
      setTicket(issued)
      setPhase('capturing')
    } catch (cause) {
      setMessage(messageFrom(cause, 'No pudimos iniciar la verificación facial.'))
      setPhase('intro')
    }
  }

  async function finish(sessionId: string) {
    setTicket(null)
    setPhase('verifying')
    try {
      const outcome = await withMinimumDuration(completeLiveness(endpoint, sessionId), 2000)
      if (outcome.result === 'APPROVED' && outcome.identity) {
        onVerified(outcome.identity)
        return
      }
      setMessage(outcome.detail)
    } catch (cause) {
      setMessage(messageFrom(cause, 'No pudimos confirmar tu identidad.'))
    }
    setPhase('rejected')
  }

  if (phase === 'capturing' && ticket) {
    return (
      <div>
        <FaceLivenessDetector
          sessionId={ticket.sessionId}
          region={ticket.region}
          disableStartScreen
          displayText={displayText}
          onAnalysisComplete={() => finish(ticket.sessionId)}
          onUserCancel={() => { setTicket(null); setPhase('intro') }}
          onError={(event) => {
            setMessage(event.error?.message ?? 'La verificación facial falló.')
            setTicket(null)
            setPhase('intro')
          }}
        />
      </div>
    )
  }

  if (phase === 'verifying') {
    return (
      <div className="flex flex-col items-center py-6 text-center" aria-live="polite">
        <div className="flex w-full max-w-sm items-center gap-3">
          <div className="relative aspect-[1.586] w-2/5 shrink-0 overflow-hidden rounded-md border border-brand-teal/50 bg-muted">
            {documentPreview && <img src={documentPreview} alt="" className="size-full object-cover" />}
          </div>
          <div className="face-link h-0.5 flex-1 rounded-full" aria-hidden />
          <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-brand-teal text-brand-teal">
            <ScanFace className="size-9" strokeWidth={1.5} aria-hidden />
          </div>
        </div>
        <p className="mt-6 font-medium">Confirmando tu identidad</p>
        <p className="mt-2 max-w-[45ch] text-sm leading-6 text-muted-foreground">
          Comparamos tu rostro en vivo con la foto de tu documento.
        </p>
      </div>
    )
  }

  return (
    <div>
      {phase === 'rejected' ? (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">No pudimos confirmar tu identidad</p>
          <p className="mt-1 text-sm leading-6">{message}</p>
        </div>
      ) : (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
          <li>Quítate lentes, gorra o mascarilla.</li>
          <li>Busca luz pareja de frente, sin ventanas detrás.</li>
          <li>Que solo tu rostro aparezca en la cámara.</li>
          <li>La pantalla mostrará luces de colores: evita esta prueba si eres fotosensible.</li>
        </ul>
      )}

      {phase === 'intro' && message && <p role="alert" className="mt-4 text-sm text-destructive">{message}</p>}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="sm:w-48" disabled={phase === 'preparing'} onClick={onBack}>
          Volver al documento
        </Button>
        <Button type="button" className="sm:w-56" disabled={phase === 'preparing'} onClick={() => void start()}>
          {phase === 'preparing' && <Spinner />}
          {phase === 'preparing' ? 'Preparando cámara…' : phase === 'rejected' ? 'Intentar de nuevo' : 'Iniciar verificación facial'}
        </Button>
      </div>
    </div>
  )
}
