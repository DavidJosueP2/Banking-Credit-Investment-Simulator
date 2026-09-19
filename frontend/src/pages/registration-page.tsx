import axios from 'axios'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  idTypeLabels,
  registerAccount,
  resendRegistrationCode,
  verifyRegistrationEmail,
  type IdType,
} from '@/features/registration/registration-api'

type Step = 'identity' | 'details' | 'verification' | 'done'

const documentHints: Record<IdType, string> = {
  CEDULA: 'Ingresa tus 10 dígitos',
  PASAPORTE: 'Ingresa tu número de pasaporte',
}

function maximumBirthDate() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 18)
  return date.toISOString().slice(0, 10)
}

function messageFrom(cause: unknown, fallback: string) {
  if (axios.isAxiosError(cause)) {
    const detail = cause.response?.data as { message?: string } | undefined
    if (detail?.message) return detail.message
  }
  return fallback
}

export function RegistrationPage() {
  const { account } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('identity')
  const [idType, setIdType] = useState<IdType>('CEDULA')
  const [idNumber, setIdNumber] = useState('')
  const [acceptedPolicies, setAcceptedPolicies] = useState(false)
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

  function startDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const value = idNumber.trim()
    if (idType === 'CEDULA' && !/^\d{10}$/.test(value)) {
      setError('La cédula debe tener 10 dígitos')
      return
    }
    if (idType === 'PASAPORTE' && !/^[A-Za-z0-9]{6,20}$/.test(value)) {
      setError('El pasaporte no es válido')
      return
    }
    setStep('details')
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
        idType,
        idNumber: idNumber.trim(),
        firstNames: firstNames.trim(),
        lastNames: lastNames.trim(),
        birthDate,
        phone: phone.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        password,
        acceptedPolicies,
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
    <main id="contenido" className="mx-auto flex min-h-[65svh] max-w-7xl items-center px-5 py-16 sm:px-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl sm:text-4xl">Crea tu cuenta Brunexa</h1>
        <p className="mt-4 max-w-[55ch] leading-7 text-muted-foreground">
          {step === 'identity' && 'Empecemos por tu documento de identidad.'}
          {step === 'details' && 'Completa tus datos personales y las credenciales de acceso.'}
          {step === 'verification' && 'Valida tu correo electrónico para terminar.'}
          {step === 'done' && 'Tu cuenta quedó lista.'}
        </p>

        {step === 'identity' && (
          <form onSubmit={startDetails} className="mt-8 space-y-5">
            <Tabs value={idType} onValueChange={(value) => { setIdType(value as IdType); setIdNumber('') }}>
              <TabsList className="w-full">
                <TabsTrigger value="CEDULA" className="flex-1">{idTypeLabels.CEDULA}</TabsTrigger>
                <TabsTrigger value="PASAPORTE" className="flex-1">{idTypeLabels.PASAPORTE}</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="space-y-2">
              <Label htmlFor="registro-documento">Número de identificación</Label>
              <Input id="registro-documento" inputMode={idType === 'CEDULA' ? 'numeric' : 'text'}
                placeholder={documentHints[idType]} value={idNumber}
                onChange={(event) => setIdNumber(event.target.value)} required />
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="registro-politicas" checked={acceptedPolicies}
                onCheckedChange={(value) => setAcceptedPolicies(value === true)} />
              <Label htmlFor="registro-politicas" className="text-sm font-normal leading-6 text-muted-foreground">
                Acepto el acuerdo de uso de canales electrónicos y las políticas de privacidad y tratamiento de datos personales.
              </Label>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={!acceptedPolicies || !idNumber.trim()} className="w-full">
              Continuar
            </Button>
          </form>
        )}

        {step === 'details' && (
          <form onSubmit={createAccount} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="registro-nombres">Nombres</Label>
              <Input id="registro-nombres" autoComplete="given-name" value={firstNames}
                onChange={(event) => setFirstNames(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registro-apellidos">Apellidos</Label>
              <Input id="registro-apellidos" autoComplete="family-name" value={lastNames}
                onChange={(event) => setLastNames(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registro-nacimiento">Fecha de nacimiento</Label>
              <Input id="registro-nacimiento" type="date" max={maximumBirthDate()} value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)} required />
              <p className="text-sm text-muted-foreground">Debes ser mayor de edad.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="registro-telefono">Teléfono</Label>
              <Input id="registro-telefono" type="tel" autoComplete="tel" value={phone}
                onChange={(event) => setPhone(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registro-usuario">Usuario</Label>
              <Input id="registro-usuario" autoComplete="username" value={username}
                onChange={(event) => setUsername(event.target.value)} required />
              <p className="text-sm text-muted-foreground">Con este usuario ingresarás a Brunexa.</p>
            </div>
            <div className="space-y-2">
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
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setError(''); setStep('identity') }}>
                Volver
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Creando…' : 'Crear cuenta'}
              </Button>
            </div>
          </form>
        )}

        {step === 'verification' && (
          <form onSubmit={confirmCode} className="mt-8 space-y-5">
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
          <div className="mt-8 space-y-5">
            <p className="leading-7">
              Validamos tu correo. Ya puedes ingresar con el usuario {username.trim().toLowerCase()} y completar tu perfil desde tu cuenta.
            </p>
            <Button type="button" className="w-full" onClick={() => navigate('/login', { replace: true })}>
              Ir a ingresar
            </Button>
          </div>
        )}

        <Link to="/" className="mt-6 inline-block text-sm text-brand-gold underline underline-offset-4 hover:text-foreground">
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
