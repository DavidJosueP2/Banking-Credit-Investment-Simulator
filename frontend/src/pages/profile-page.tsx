import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  confirmDocument,
  enrollFace,
  getProfile,
  profileKeys,
  updateContact,
  uploadDocument,
  type DocumentReview,
  type DocumentSide,
} from '@/features/profile/profile-api'

const documentLabels: Record<string, string> = {
  NONE: 'Sin subir',
  PENDING: 'En revisión',
  ACCEPTED: 'Verificado',
  REJECTED: 'Rechazado',
}

function messageFrom(cause: unknown, fallback: string) {
  if (axios.isAxiosError(cause)) {
    const detail = cause.response?.data as { message?: string } | undefined
    if (detail?.message) return detail.message
  }
  return fallback
}

export function ProfilePage() {
  const client = useQueryClient()
  const profile = useQuery({ queryKey: profileKeys.profile, queryFn: getProfile })
  const [draft, setDraft] = useState<{ phone: string; address: string } | null>(null)
  const [consent, setConsent] = useState(false)
  const [review, setReview] = useState<DocumentReview | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await updateContact({ phone: contact.phone.trim(), address: contact.address.trim() })
      await client.invalidateQueries({ queryKey: profileKeys.profile })
      setDraft(null)
      setNotice('Datos de contacto actualizados.')
    } catch (cause) {
      setError(messageFrom(cause, 'No pudimos guardar tus datos.'))
    } finally {
      setBusy(false)
    }
  }

  async function sendDocument(side: DocumentSide, file: File | undefined) {
    if (!file) return
    setError('')
    setNotice('')
    setReview(null)
    setBusy(true)
    try {
      const result = await uploadDocument(side, file, side === 'FRONT' && consent)
      await client.invalidateQueries({ queryKey: profileKeys.profile })
      if (side === 'FRONT') {
        setReview(result)
      } else {
        setNotice('Reverso guardado.')
      }
    } catch (cause) {
      setError(messageFrom(cause, 'No pudimos procesar la imagen.'))
    } finally {
      setBusy(false)
    }
  }

  async function registerFace() {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await enrollFace()
      await client.invalidateQueries({ queryKey: profileKeys.profile })
      setNotice('Rostro registrado. Ya puedes usar la verificación biométrica.')
    } catch (cause) {
      setError(messageFrom(cause, 'No pudimos registrar tu rostro.'))
    } finally {
      setBusy(false)
    }
  }

  async function acceptReadData() {
    setError('')
    setBusy(true)
    try {
      await confirmDocument()
      await client.invalidateQueries({ queryKey: profileKeys.profile })
      setReview(null)
      setNotice('Documento verificado. Tus datos quedaron confirmados.')
    } catch (cause) {
      setError(messageFrom(cause, 'No pudimos confirmar el documento.'))
    } finally {
      setBusy(false)
    }
  }

  if (profile.isPending) {
    return <main id="contenido" className="mx-auto max-w-7xl px-5 py-16 text-sm text-muted-foreground sm:px-8">Cargando tu perfil…</main>
  }
  if (profile.isError || !profile.data) {
    return (
      <main id="contenido" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <h1 className="text-2xl">No pudimos cargar tu perfil</h1>
        <p className="mt-3 text-muted-foreground">
          {messageFrom(profile.error, 'Comprueba el servidor e intenta de nuevo.')}
        </p>
      </main>
    )
  }

  const data = profile.data
  const contact = draft ?? { phone: data.phone ?? '', address: data.address ?? '' }

  return (
    <main id="contenido" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl text-brand-teal sm:text-4xl">Mi perfil</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Completa tus datos y verifica tu identidad para poder solicitar créditos e inversiones.
        </p>

        <section className="mt-10 border-y py-8">
          <h2 className="text-xl">Datos personales</h2>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2">
            <div><dt className="text-sm text-muted-foreground">Documento</dt><dd className="mt-1 font-medium">{data.idType === 'CEDULA' ? 'Cédula' : 'Pasaporte'} {data.idNumber}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Nombres</dt><dd className="mt-1 font-medium">{data.firstNames} {data.lastNames}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Fecha de nacimiento</dt><dd className="mt-1 font-medium">{data.birthDate}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Correo</dt><dd className="mt-1 font-medium">{data.emailVerified ? 'Verificado' : 'Sin verificar'}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Documento de identidad</dt><dd className="mt-1 font-medium">{documentLabels[data.documentStatus]}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Rostro registrado</dt><dd className="mt-1 font-medium">{data.biometricEnrolled ? 'Sí' : 'No'}</dd></div>
          </dl>
        </section>

        <section className="mt-10">
          <h2 className="text-xl">Contacto</h2>
          <form onSubmit={saveContact} className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="perfil-telefono">Teléfono</Label>
              <Input id="perfil-telefono" type="tel" autoComplete="tel" value={contact.phone}
                onChange={(event) => setDraft({ ...contact, phone: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perfil-direccion">Dirección</Label>
              <Input id="perfil-direccion" autoComplete="street-address" value={contact.address}
                onChange={(event) => setDraft({ ...contact, address: event.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contacto'}</Button>
            </div>
          </form>
        </section>

        <section className="mt-12 border-t pt-8">
          <h2 className="text-xl">Verificación de identidad</h2>
          <p className="mt-3 max-w-[65ch] leading-7 text-muted-foreground">
            Sube una foto del anverso de tu cédula. Leemos los datos automáticamente y los comparamos
            con los de tu cuenta.
          </p>

          <div className="mt-6 rounded-md border p-5">
            <div className="flex items-start gap-3">
              <Checkbox id="perfil-consentimiento" checked={consent}
                onCheckedChange={(value) => setConsent(value === true)} />
              <Label htmlFor="perfil-consentimiento" className="text-sm font-normal leading-6 text-muted-foreground">
                Autorizo que Brunexa registre la plantilla biométrica de mi rostro, obtenida de la foto de mi
                cédula, para verificar mi identidad en operaciones sensibles. Se guarda una representación
                matemática, nunca la fotografía de mi rostro.
              </Label>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Si prefieres no usar biometría, puedes verificar tu identidad de forma presencial en una agencia.
            </p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="perfil-anverso">Anverso de la cédula</Label>
              <Input id="perfil-anverso" type="file" accept="image/jpeg,image/png" disabled={busy}
                onChange={(event) => void sendDocument('FRONT', event.target.files?.[0])} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perfil-reverso">Reverso (opcional)</Label>
              <Input id="perfil-reverso" type="file" accept="image/jpeg,image/png" disabled={busy}
                onChange={(event) => void sendDocument('BACK', event.target.files?.[0])} />
            </div>
          </div>

          {data.documentStatus !== 'NONE' && !data.biometricEnrolled && (
            <div className="mt-6 rounded-md border border-brand-gold/40 p-5">
              <p className="text-sm leading-6">
                Tu documento está cargado pero todavía no registramos tu rostro, así que no puedes usar la
                verificación biométrica. Marca la autorización de arriba y regístralo con la foto que ya subiste.
              </p>
              <Button type="button" className="mt-4" disabled={busy || !consent}
                onClick={() => void registerFace()}>
                {busy ? 'Registrando…' : 'Registrar mi rostro'}
              </Button>
            </div>
          )}

          {review && (
            <div className="mt-6 rounded-md border p-5">
              <h3 className="font-medium">Esto leímos de tu cédula</h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><dt className="text-sm text-muted-foreground">Cédula</dt><dd className="mt-1">{review.idNumber}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Apellidos</dt><dd className="mt-1">{review.lastNames ?? '—'}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Nombres</dt><dd className="mt-1">{review.firstNames ?? '—'}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Fecha de nacimiento</dt><dd className="mt-1">{review.birthDate ?? '—'}</dd></div>
              </dl>
              {review.differences.length > 0 && (
                <p className="mt-4 text-sm text-brand-gold">
                  No coincide con lo registrado en: {review.differences.join(', ')}. Al confirmar, se usarán
                  los datos del documento.
                </p>
              )}
              <p className="mt-4 text-sm text-muted-foreground">
                {review.faceEnrolled
                  ? 'Registramos la plantilla de tu rostro para futuras operaciones.'
                  : 'No registramos biometría porque no diste tu autorización.'}
              </p>
              <Button type="button" className="mt-5" disabled={busy} onClick={() => void acceptReadData()}>
                {busy ? 'Confirmando…' : 'Confirmar mis datos'}
              </Button>
            </div>
          )}

          {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
          {notice && <p className="mt-5 text-sm text-brand-teal">{notice}</p>}
        </section>

        <Link to="/cuenta" className="mt-10 inline-block text-sm text-brand-gold underline underline-offset-4 hover:text-foreground">
          Volver a mi cuenta
        </Link>
      </div>
    </main>
  )
}
