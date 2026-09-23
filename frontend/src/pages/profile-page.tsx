import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IdentityFlow } from '@/features/identity-check/identity-flow'
import { messageFrom } from '@/features/identity-check/utils'
import { getProfile, profileKeys, updateContact } from '@/features/profile/profile-api'
import { idTypeLabels } from '@/features/registration/registration-api'

export function ProfilePage() {
  const client = useQueryClient()
  const profile = useQuery({ queryKey: profileKeys.profile, queryFn: getProfile })
  const [draft, setDraft] = useState<{ phone: string; address: string } | null>(null)
  const [updatingDocument, setUpdatingDocument] = useState(false)
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

  async function documentUpdated() {
    setUpdatingDocument(false)
    await client.invalidateQueries({ queryKey: profileKeys.profile })
    await client.invalidateQueries({ queryKey: ['auth', 'me'] })
    setNotice('Documento actualizado.')
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
      <h1 className="text-3xl text-brand-teal sm:text-4xl">Mi perfil</h1>

      <section className="mt-10 border-y py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl">Datos personales</h2>
          {!updatingDocument && (
            <Button type="button" variant="outline" onClick={() => { setNotice(''); setUpdatingDocument(true) }}>
              Actualizar mi documento
            </Button>
          )}
        </div>
        <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-sm text-muted-foreground">Documento</dt><dd className="mt-1 font-medium">{idTypeLabels[data.idType]} {data.idNumber}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Nombres</dt><dd className="mt-1 font-medium">{data.firstNames} {data.lastNames}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Fecha de nacimiento</dt><dd className="mt-1 font-medium">{data.birthDate}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Correo</dt><dd className="mt-1 font-medium">{data.emailVerified ? 'Verificado' : 'Sin verificar'}</dd></div>
        </dl>

        {updatingDocument && (
          <div className="mt-8">
            <p className="mb-6 max-w-[65ch] text-sm leading-6 text-muted-foreground">
              Sube tu documento vigente y confirma tu rostro. Tus datos se actualizan con lo que diga el documento.
            </p>
            <IdentityFlow endpoint="/profile/identity" onVerified={() => void documentUpdated()}
              onCancel={() => setUpdatingDocument(false)} />
          </div>
        )}
      </section>

      <section className="mt-10 max-w-3xl">
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

      {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
      {notice && <p className="mt-5 text-sm text-brand-teal">{notice}</p>}

      <Link to="/cuenta" className="mt-10 inline-block text-sm text-brand-gold underline underline-offset-4 hover:text-foreground">
        Volver a mi cuenta
      </Link>
    </main>
  )
}
