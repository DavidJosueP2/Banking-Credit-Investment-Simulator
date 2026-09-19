import '@aws-amplify/ui-react/styles.css'

import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness'
import axios from 'axios'
import { Amplify } from 'aws-amplify'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  createLivenessSession,
  getLivenessCredentials,
  getLivenessOutcome,
  type LivenessOutcome,
} from '@/features/profile/profile-api'

const resultLabels: Record<LivenessOutcome['result'], string> = {
  APPROVED: 'Identidad confirmada',
  MANUAL_REVIEW: 'Pasa a revisión humana',
  REJECTED: 'Rechazado',
}

const resultStyles: Record<LivenessOutcome['result'], string> = {
  APPROVED: 'text-brand-teal',
  MANUAL_REVIEW: 'text-brand-gold',
  REJECTED: 'text-destructive',
}

function messageFrom(cause: unknown, fallback: string) {
  if (axios.isAxiosError(cause)) {
    const detail = cause.response?.data as { message?: string } | undefined
    if (detail?.message) return detail.message
  }
  return fallback
}

export function LivenessDevPage() {
  const [sessionId, setSessionId] = useState('')
  const [region, setRegion] = useState('')
  const [outcome, setOutcome] = useState<LivenessOutcome | null>(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  async function start() {
    setError('')
    setOutcome(null)
    setStarting(true)
    try {
      const credentials = await getLivenessCredentials()
      Amplify.configure(
        { Auth: { Cognito: { identityPoolId: '', allowGuestAccess: true } } } as never,
        {
          Auth: {
            credentialsProvider: {
              getCredentialsAndIdentityId: async () => ({
                credentials: {
                  accessKeyId: credentials.accessKeyId,
                  secretAccessKey: credentials.secretAccessKey,
                  sessionToken: credentials.sessionToken,
                  expiration: new Date(credentials.expiration),
                },
              }),
              clearCredentialsAndIdentityId: () => undefined,
            },
          },
        },
      )
      setRegion(credentials.region)
      const session = await createLivenessSession()
      setSessionId(session.sessionId)
    } catch (cause) {
      setError(messageFrom(cause, 'No pudimos iniciar la prueba de vida.'))
    } finally {
      setStarting(false)
    }
  }

  async function finish() {
    try {
      setOutcome(await getLivenessOutcome(sessionId))
    } catch (cause) {
      setError(messageFrom(cause, 'No pudimos obtener el resultado.'))
    } finally {
      setSessionId('')
    }
  }

  return (
    <main id="contenido" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl text-brand-teal sm:text-4xl">Prueba de vida</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Banco de pruebas del paso biométrico. En producción esta comprobación no se abre sola: se
          dispara dentro de una operación sensible y queda atada a esa solicitud.
        </p>

        {!sessionId && (
          <>
            <div className="mt-8 rounded-md border p-5">
              <h2 className="font-medium">Antes de empezar</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <li>Quítate lentes, gorra, mascarilla o cualquier cosa que tape tu cara.</li>
                <li>Busca luz pareja de frente. Evita tener una ventana o lámpara detrás de ti.</li>
                <li>Que se vea solo tu rostro: nadie más dentro del encuadre.</li>
                <li>Sostén el dispositivo a la altura de los ojos y quédate quieto durante la secuencia.</li>
                <li>Si usas el navegador en otra pestaña, vuelve a esta antes de iniciar.</li>
              </ul>
            </div>
            <Button type="button" className="mt-6" disabled={starting} onClick={() => void start()}>
              {starting ? 'Preparando…' : 'Iniciar prueba'}
            </Button>
          </>
        )}

        {sessionId && region && (
          <div className="mt-8">
            <FaceLivenessDetector
              sessionId={sessionId}
              region={region}
              onAnalysisComplete={finish}
              onError={(event) => {
                setError(event.error?.message ?? 'La prueba de vida falló.')
                setSessionId('')
              }}
            />
          </div>
        )}

        {outcome && (
          <div className="mt-8 rounded-md border p-5">
            <p className={`text-lg font-medium ${resultStyles[outcome.result]}`}>
              {resultLabels[outcome.result]}
            </p>
            <p className="mt-2 text-muted-foreground">{outcome.detail}</p>
            {outcome.result !== 'APPROVED' && (
              <Button type="button" variant="outline" className="mt-4" onClick={() => void start()}>
                Intentar de nuevo
              </Button>
            )}
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Confianza de vida</dt>
                <dd className="mt-1 font-medium">
                  {outcome.livenessConfidence === null ? '—' : `${outcome.livenessConfidence.toFixed(2)} %`}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Parecido con tu rostro registrado</dt>
                <dd className="mt-1 font-medium">
                  {outcome.matchSimilarity === null ? '—' : `${outcome.matchSimilarity.toFixed(2)} %`}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {error && <p role="alert" className="mt-6 text-sm text-destructive">{error}</p>}

        <Link to="/perfil" className="mt-10 inline-block text-sm text-brand-gold underline underline-offset-4 hover:text-foreground">
          Volver a mi perfil
        </Link>
      </div>
    </main>
  )
}
