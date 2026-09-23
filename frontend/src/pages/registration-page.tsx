import { CircleCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import type { VerifiedIdentity } from '@/features/identity-check/identity-check-api'
import { IdentityFlow } from '@/features/identity-check/identity-flow'
import { messageFrom } from '@/features/identity-check/utils'
import {
  idTypeLabels,
  registerAccount,
  resendRegistrationCode,
  verifyRegistrationEmail,
} from '@/features/registration/registration-api'

type Step = 'identity' | 'account' | 'verification' | 'done'

function maximumBirthDate() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 18)
  return date.toISOString().slice(0, 10)
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function RegistrationPage() {
  const { account } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('identity')
  const [verified, setVerified] = useState<VerifiedIdentity | null>(null)
  const [firstNames, setFirstNames] = useState('')
  const [lastNames, setLastNames] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (account) return <Navigate to="/cuenta" replace />

  function identityConfirmed(identity: VerifiedIdentity) {
    setVerified(identity)
    setError('')
    setStep('account')
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 12) {
      setError('La contraseña debe tener al menos 12 caracteres')
      return
    }
    if (!/^[A-Za-z0-9._]{4,30}$/.test(username.trim())) {
      setError('El usuario debe tener entre 4 y 30 caracteres: letras, números, punto o guion bajo')
      return
    }
    setSubmitting(true)
    try {
      await registerAccount({
        firstNames: verified?.firstNames ? null : firstNames.trim(),
        lastNames: verified?.lastNames ? null : lastNames.trim(),
        birthDate: verified?.birthDate ? null : birthDate,
        phone: phone.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        password,
        // Sin aceptar las políticas no se puede subir el documento, así que aquí ya están aceptadas.
        acceptedPolicies: true,
      })
      setNotice(`Enviamos un código de 6 dígitos a ${email.trim()}.`)
      setStep('verification')
    } catch (cause) {
      setError(messageFrom(cause, 'No pudimos crear tu cuenta. Inténtalo de nuevo.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await verifyRegistrationEmail(email.trim(), code)
      setStep('done')
    } catch (cause) {
      setError(messageFrom(cause, 'No pudimos validar el código. Inténtalo de nuevo.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function resendCode() {
    setError('')
    setNotice('')
    setSubmitting(true)
    try {
      await resendRegistrationCode(email.trim())
      setCode('')
      setNotice('Te enviamos un código nuevo.')
    } catch (cause) {
      setError(messageFrom(cause, 'No pudimos reenviar el código.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main id="contenido" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
      <h1 className="text-3xl sm:text-4xl">Crea tu cuenta Brunexa</h1>

      <section className="mt-10">
        {step === 'identity' && (
          <IdentityFlow endpoint="/public/registration/identity" requireConsent onVerified={identityConfirmed} />
        )}

        {step === 'account' && verified && (
          <form onSubmit={createAccount} className="space-y-8">
            <div className="rounded-lg border border-brand-teal/40 bg-brand-teal/5 p-5">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-brand-teal">
                <CircleCheck className="size-4" aria-hidden /> Identidad verificada
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-sm text-muted-foreground">Documento</dt><dd className="mt-1 font-medium">{idTypeLabels[verified.idType]} {verified.idNumber}</dd></div>
                {verified.firstNames && <div><dt className="text-sm text-muted-foreground">Nombres</dt><dd className="mt-1 font-medium">{verified.firstNames}</dd></div>}
                {verified.lastNames && <div><dt className="text-sm text-muted-foreground">Apellidos</dt><dd className="mt-1 font-medium">{verified.lastNames}</dd></div>}
                {verified.birthDate && <div><dt className="text-sm text-muted-foreground">Fecha de nacimiento</dt><dd className="mt-1 font-medium">{formatDate(verified.birthDate)}</dd></div>}
              </dl>
            </div>

            {(!verified.firstNames || !verified.lastNames || !verified.birthDate) && (
              <div>
                <p className="text-sm text-muted-foreground">
                  No alcanzamos a leer estos datos en tu documento. Escríbelos tal como aparecen en él.
                </p>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {!verified.firstNames && (
                    <div className="space-y-2">
                      <Label htmlFor="registro-nombres">Nombres</Label>
                      <Input id="registro-nombres" autoComplete="given-name" value={firstNames}
                        onChange={(event) => setFirstNames(event.target.value)} required />
                    </div>
                  )}
                  {!verified.lastNames && (
                    <div className="space-y-2">
                      <Label htmlFor="registro-apellidos">Apellidos</Label>
                      <Input id="registro-apellidos" autoComplete="family-name" value={lastNames}
                        onChange={(event) => setLastNames(event.target.value)} required />
                    </div>
                  )}
                  {!verified.birthDate && (
                    <div className="space-y-2">
                      <Label htmlFor="registro-nacimiento">Fecha de nacimiento</Label>
                      <Input id="registro-nacimiento" type="date" max={maximumBirthDate()} value={birthDate}
                        onChange={(event) => setBirthDate(event.target.value)} required />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="registro-usuario">Usuario</Label>
                <Input id="registro-usuario" autoComplete="username" value={username}
                  onChange={(event) => setUsername(event.target.value)} required />
                <p className="text-sm text-muted-foreground">Con este usuario ingresarás a Brunexa.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="registro-telefono">Teléfono</Label>
                <Input id="registro-telefono" type="tel" autoComplete="tel" value={phone}
                  onChange={(event) => setPhone(event.target.value)} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="registro-correo">Correo electrónico</Label>
                <Input id="registro-correo" type="email" autoComplete="email" value={email}
                  onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registro-clave">Contraseña</Label>
                <Input id="registro-clave" type="password" autoComplete="new-password" value={password}
                  onChange={(event) => setPassword(event.target.value)} required />
                <p className="text-sm text-muted-foreground">Debe tener al menos 12 caracteres.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="registro-clave-confirmacion">Confirmar contraseña</Label>
                <Input id="registro-clave-confirmacion" type="password" autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)} required />
              </div>
            </div>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting} className="w-full sm:w-48">
                {submitting ? 'Creando…' : 'Crear cuenta'}
              </Button>
            </div>
          </form>
        )}

        {step === 'verification' && (
          <form onSubmit={confirmCode} className="max-w-md space-y-5">
            {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
            <div className="space-y-2">
              <Label htmlFor="registro-codigo">Código de verificación</Label>
              <InputOTP id="registro-codigo" maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <p className="text-sm text-muted-foreground">El código caduca en 15 minutos.</p>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting || code.length < 6} className="w-full">
              {submitting ? 'Validando…' : 'Validar correo'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" disabled={submitting} onClick={resendCode}>
              Reenviar código
            </Button>
          </form>
        )}

        {step === 'done' && (
          <div className="max-w-md space-y-5">
            <p className="leading-7">
              Validamos tu correo. Ya puedes ingresar con el usuario {username.trim().toLowerCase()}.
            </p>
            <Button type="button" className="w-full" onClick={() => navigate('/login', { replace: true })}>
              Ir a ingresar
            </Button>
          </div>
        )}
      </section>

      <Link to="/" className="mt-6 inline-block text-sm text-brand-gold underline underline-offset-4 hover:text-foreground">
        Volver al inicio
      </Link>
    </main>
  )
}
