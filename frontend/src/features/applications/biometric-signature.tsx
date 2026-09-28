import '@aws-amplify/ui-react/styles.css'

import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness'
import { ScanFace, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { displayText } from '@/features/identity-check/liveness-display-text'
import { applyLivenessCredentials } from '@/features/identity-check/liveness-credentials'
import { messageFrom, withMinimumDuration } from '@/features/identity-check/utils'

import {
  completeApplicationBiometric,
  startApplicationBiometric,
  type ApplicationDetail,
  type LivenessTicket,
} from './applications-api'

type Phase = 'intro' | 'preparing' | 'capturing' | 'verifying' | 'rejected'

interface BiometricSignatureProps {
  application: ApplicationDetail
  onSubmitted: (application: ApplicationDetail) => void
  disabled?: boolean
}

/**
 * Firma biométrica del envío: prueba de vida con Rekognition comparada con el rostro que el cliente
 * registró con su documento. El resultado queda atado a esta solicitud en el servidor.
 */
export default function BiometricSignature({ application, onSubmitted, disabled = false }: BiometricSignatureProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [ticket, setTicket] = useState<LivenessTicket | null>(null)
  const [message, setMessage] = useState('')
  const [attemptsLeft, setAttemptsLeft] = useState(application.biometricAttemptsLeft)

  async function start() {
    if (disabled) return
    setMessage('')
    setPhase('preparing')
    try {
      const issued = await startApplicationBiometric(application.id)
      applyLivenessCredentials(issued)
      setTicket(issued)
      setAttemptsLeft((left) => Math.max(0, left - 1))
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
      const { outcome, application: updated } = await withMinimumDuration(
        completeApplicationBiometric(application.id, sessionId), 1500)
      if (outcome.result !== 'REJECTED') {
        onSubmitted(updated)
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
    )
  }

  if (phase === 'verifying') {
    return (
      <div className="flex flex-col items-center py-8 text-center" aria-live="polite">
        <div className="flex size-20 items-center justify-center rounded-full border-2 border-brand-teal text-brand-teal">
          <ScanFace className="size-9" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <p className="mt-5 font-medium">Confirmando que eres tú</p>
        <p className="mt-2 max-w-[45ch] text-sm leading-6 text-muted-foreground">
          Comparamos tu rostro en vivo con el que registraste junto a tu documento.
        </p>
      </div>
    )
  }

  const exhausted = attemptsLeft <= 0

  return (
    <div>
      {phase === 'rejected' ? (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">No pudimos confirmar tu identidad</p>
          <p className="mt-1 text-sm leading-6">{message}</p>
        </div>
      ) : (
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-teal" aria-hidden="true" />
          <div className="text-sm leading-6 text-muted-foreground">
            <p className="text-foreground">Tu rostro firma esta solicitud.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Quítate lentes, gorra o mascarilla y busca luz pareja de frente.</li>
              <li>Que solo tu rostro aparezca en la cámara.</li>
              <li>La pantalla mostrará luces de colores: evita esta prueba si eres fotosensible.</li>
            </ul>
          </div>
        </div>
      )}

      {phase === 'intro' && message && <p role="alert" className="mt-4 text-sm text-destructive">{message}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="button" variant="brand" disabled={disabled || phase === 'preparing' || exhausted} onClick={() => void start()}>
          {phase === 'preparing' && <Spinner />}
          {phase === 'preparing' ? 'Preparando cámara…' : phase === 'rejected' ? 'Intentar de nuevo' : 'Confirmar con mi rostro y enviar'}
        </Button>
        <span className="text-xs text-muted-foreground">
          {exhausted ? 'Agotaste los intentos para esta solicitud.' : `Intentos disponibles: ${attemptsLeft}`}
        </span>
      </div>
    </div>
  )
}
