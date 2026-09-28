import { useMutation } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { messageFrom } from '@/features/identity-check/utils'
import { api } from '@/lib/api'

const MINIMUM_LENGTH = 12

async function changePassword(input: { currentPassword: string; newPassword: string }) {
  await api.put('/auth/password', input)
}

/** Cambio de contraseña con la actual (una sesión robada no basta). Llega un correo de aviso. */
export function ChangePasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const section = useRef<HTMLElement>(null)
  const { hash } = useLocation()
  // El enlace "No fui yo" del correo llega a /cuenta#seguridad.
  useEffect(() => {
    if (hash === '#seguridad') section.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])
  const change = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setCurrent('')
      setNext('')
      setConfirm('')
      toast.success('Contraseña actualizada', { description: 'Cerramos tu sesión en los demás dispositivos y te enviamos un correo de confirmación.' })
    },
    onError: (cause) => setError(messageFrom(cause, 'No se pudo cambiar la contraseña.')),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (next.length < MINIMUM_LENGTH) return setError(`La nueva contraseña debe tener al menos ${MINIMUM_LENGTH} caracteres.`)
    if (next !== confirm) return setError('La confirmación no coincide con la nueva contraseña.')
    change.mutate({ currentPassword: current, newPassword: next })
  }

  return (
    <section ref={section} id="seguridad" aria-labelledby="security-title" className="mt-12 scroll-mt-24 rounded-xl border p-6">
      <h2 id="security-title" className="flex items-center gap-2 text-xl"><KeyRound className="size-5 text-brand-teal" aria-hidden="true" />Seguridad</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Te avisamos por correo cada vez que alguien inicia sesión en tu cuenta. Si recibiste un aviso que no reconoces,
        cambia tu contraseña aquí: se cerrará la sesión en todos tus otros dispositivos.
      </p>
      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="current-password">Contraseña actual</Label>
          <Input id="current-password" type="password" autoComplete="current-password" required value={current} onChange={(event) => setCurrent(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">Nueva contraseña</Label>
          <Input id="new-password" type="password" autoComplete="new-password" required minLength={MINIMUM_LENGTH} value={next} onChange={(event) => setNext(event.target.value)} aria-describedby="new-password-hint" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confírmala</Label>
          <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </div>
        <p id="new-password-hint" className="text-xs text-muted-foreground sm:col-span-3">Mínimo {MINIMUM_LENGTH} caracteres y distinta de la actual.</p>
        {error && <p role="alert" className="text-sm text-destructive sm:col-span-3">{error}</p>}
        <div className="sm:col-span-3">
          <Button type="submit" variant="brand" disabled={change.isPending}>{change.isPending ? 'Guardando…' : 'Cambiar contraseña'}</Button>
        </div>
      </form>
    </section>
  )
}
