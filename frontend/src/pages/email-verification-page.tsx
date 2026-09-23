import { CircleCheck, MailCheck, TimerReset } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import leftIllustration from '@/assets/landing/brunexa-playful-left.svg'
import rightIllustration from '@/assets/landing/brunexa-playful-right.svg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import {
  resendRegistrationCode,
  verifyRegistrationEmail,
} from '@/features/registration/registration-api'
import { messageFrom } from '@/features/identity-check/utils'

function remainingSeconds(expiresAt: string) {
  const expiration = new Date(expiresAt).getTime()
  if (!Number.isFinite(expiration)) return null
  return Math.max(0, Math.ceil((expiration - Date.now()) / 1_000))
}

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

export function EmailVerificationPage() {
  const [search] = useSearchParams()
  const [email, setEmail] = useState(search.get('email') ?? '')
  const [expiresAt, setExpiresAt] = useState(search.get('expires') ?? '')
  const [seconds, setSeconds] = useState<number | null>(() => expiresAt ? remainingSeconds(expiresAt) : null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (!expiresAt) return
    const timer = window.setInterval(() => setSeconds(remainingSeconds(expiresAt)), 1_000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  const expired = seconds === 0

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!email.trim()) {
      setError('Ingresa el correo que recibió el código.')
      return
    }
    if (expired) {
      setError('El código expiró. Solicita uno nuevo para continuar.')
      return
    }

    setSubmitting(true)
    try {
      await verifyRegistrationEmail(email.trim(), code)
      setVerified(true)
    } catch (cause) {
      setError(messageFrom(cause, 'No pudimos validar el código. Revisa los seis dígitos e inténtalo nuevamente.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function resend() {
    setError('')
    setNotice('')
    if (!email.trim()) {
      setError('Ingresa tu correo para enviarte un código nuevo.')
      return
    }

    setSubmitting(true)
    try {
      const pending = await resendRegistrationCode(email.trim())
      setExpiresAt(pending.expiresAt)
      setSeconds(remainingSeconds(pending.expiresAt))
      setCode('')
      setNotice('Enviamos un código nuevo. Revisa también la carpeta de correo no deseado.')
    } catch (cause) {
      setError(messageFrom(cause, 'No pudimos reenviar el código. Inténtalo nuevamente.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main id="contenido" className="grid min-h-[calc(100svh-4.5rem)] overflow-hidden 2xl:grid-cols-[minmax(15rem,1fr)_minmax(0,34rem)_minmax(15rem,1fr)]">
      <div aria-hidden="true" className="hidden items-center justify-start 2xl:flex">
        <img src={leftIllustration} alt="" className="h-auto w-full max-w-[26rem] -translate-x-8 select-none object-contain" />
      </div>

      <section className="flex items-center px-5 py-14 sm:px-8 lg:py-20" aria-labelledby="verification-title">
        <div className="mx-auto w-full max-w-lg">
          {verified ? (
            <div className="text-center" role="status">
              <CircleCheck className="mx-auto size-12 text-brand-teal" aria-hidden="true" />
              <h1 id="verification-title" className="mt-6 text-3xl sm:text-4xl">Correo verificado</h1>
              <p className="mx-auto mt-4 max-w-[48ch] leading-7 text-muted-foreground">
                Tu correo quedó confirmado. Ya puedes iniciar sesión si la cuenta se encuentra activa.
              </p>
              <Button asChild size="lg" variant="brand" className="mt-8 w-full sm:w-auto">
                <Link to="/login">Ir a iniciar sesión</Link>
              </Button>
            </div>
          ) : (
            <>
              <MailCheck className="size-9 text-brand-teal" aria-hidden="true" />
              <h1 id="verification-title" className="mt-5 text-3xl sm:text-4xl">Verifica tu correo</h1>
              <p className="mt-4 max-w-[52ch] leading-7 text-muted-foreground">
                Escribe el código de seis dígitos que enviamos a tu correo. Este paso protege el acceso a tu cuenta Brunexa.
              </p>

              <form onSubmit={verify} className="mt-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="verification-email">Correo electrónico</Label>
                  <Input
                    id="verification-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    maxLength={254}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="verification-code">Código de verificación</Label>
                  <InputOTP
                    id="verification-code"
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    containerClassName="justify-start"
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot key={index} index={index} className="h-12 w-12 text-base sm:h-14 sm:w-14 sm:text-lg" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="flex min-h-6 items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                  <TimerReset className="size-4 shrink-0" aria-hidden="true" />
                  {seconds === null && <span>El código caduca 15 minutos después de su envío.</span>}
                  {seconds !== null && !expired && <span>El código caduca en {formatRemaining(seconds)}.</span>}
                  {expired && <span className="font-medium text-destructive">El código expiró. Solicita uno nuevo.</span>}
                </div>

                {notice && <p role="status" className="text-sm text-brand-teal">{notice}</p>}
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" size="lg" variant="brand" disabled={submitting || expired || code.length !== 6} className="flex-1">
                    {submitting ? 'Validando…' : 'Validar correo'}
                  </Button>
                  <Button type="button" size="lg" variant="outline" disabled={submitting} onClick={() => void resend()} className="flex-1">
                    Reenviar código
                  </Button>
                </div>
              </form>

              <Link to="/login" className="mt-7 inline-block text-sm text-brand-gold underline underline-offset-4 hover:text-foreground">
                Volver al inicio de sesión
              </Link>
            </>
          )}
        </div>
      </section>

      <div aria-hidden="true" className="hidden items-center justify-end 2xl:flex">
        <img src={rightIllustration} alt="" className="h-auto w-full max-w-[25rem] translate-x-8 select-none object-contain" />
      </div>
    </main>
  )
}
