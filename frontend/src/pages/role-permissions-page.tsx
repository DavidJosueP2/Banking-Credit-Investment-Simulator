import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { useAuth, type Account } from '@/app/providers/auth-provider'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'

type Role = { code: string; label: string; permissions: string[] }
type PermissionInfo = { code: string; label: string; area: string }

function requestError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? 'La operación no se pudo completar.'
  }
  return 'La operación no se pudo completar.'
}

export function RolePermissionsPage() {
  const client = useQueryClient()
  const { account } = useAuth()
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: async () => (await api.get<Account[]>('/admin/users')).data })
  const roles = useQuery({ queryKey: ['admin', 'roles'], queryFn: async () => (await api.get<Role[]>('/admin/roles')).data })
  const permissions = useQuery({ queryKey: ['admin', 'permissions'], queryFn: async () => (await api.get<PermissionInfo[]>('/admin/permissions')).data })
  const [editing, setEditing] = useState<Account | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('')
  const [creating, setCreating] = useState(false)

  function edit(user: Account) {
    setEditing(user)
    setSelectedRoles(user.roles)
    setMessage('')
  }

  async function saveRoles(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setSaving(true)
    setMessage('')
    try {
      await api.put(`/admin/users/${editing.id}/roles`, { roles: selectedRoles })
      await client.invalidateQueries({ queryKey: ['admin', 'users'] })
      setEditing(null)
      setMessage('Roles actualizados. El servidor comprobará los nuevos accesos en la siguiente petición.')
    } catch (error) {
      setMessage(requestError(error))
    } finally {
      setSaving(false)
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setMessage('')
    try {
      await api.post('/admin/users', { email: newEmail, fullName: newName, password: newPassword, roles: [newRole] })
      await client.invalidateQueries({ queryKey: ['admin', 'users'] })
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewRole('')
      setMessage('Cuenta creada. Entrega la contraseña al usuario por un canal seguro.')
    } catch (error) {
      setMessage(requestError(error))
    } finally {
      setCreating(false)
    }
  }

  if (users.isPending || roles.isPending || permissions.isPending) {
    return <div className="py-10 text-sm text-muted-foreground">Cargando usuarios y permisos…</div>
  }
  if (users.isError || roles.isError || permissions.isError) {
    return <div className="py-10"><h1 className="text-2xl">No se pudo cargar la administración de accesos</h1><p className="mt-3 text-muted-foreground">Comprueba el servidor e intenta actualizar la página.</p></div>
  }

  const roleByCode = new Map(roles.data.map((role) => [role.code, role.label]))

  return (
    <div className="space-y-12">
      <PageHeader title="Usuarios, roles y permisos"
        description="Las cuentas y sus autoridades se almacenan en Brunexa. Solo un administrador puede asignar accesos." />

      {message && <p role="status" className="border-t border-brand-gold pt-3 text-sm text-foreground">{message}</p>}

      <section aria-labelledby="users-title" className="space-y-5">
        <div>
          <h2 id="users-title" className="text-xl text-brand-gold">Usuarios</h2>
          <p className="mt-2 text-sm text-muted-foreground">{users.data.length} cuenta{users.data.length === 1 ? '' : 's'} registrada{users.data.length === 1 ? '' : 's'}.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table className="min-w-170">
            <TableHeader><TableRow>
              <TableHead>Nombre</TableHead><TableHead>Correo</TableHead><TableHead>Roles</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {users.data.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Aún no hay cuentas. Configura el administrador inicial en el backend.</TableCell></TableRow>}
              {users.data.map((user) => <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.roles.map((role) => roleByCode.get(role) ?? role).join(', ')}</TableCell>
                <TableCell className={user.enabled ? 'text-brand-teal' : 'text-muted-foreground'}>{user.enabled ? 'Activo' : 'Inactivo'}</TableCell>
                <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => edit(user)}>Editar roles</Button></TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </div>
      </section>

      {editing && <section aria-labelledby="edit-title" className="max-w-xl border-t pt-7">
        <h2 id="edit-title" className="text-xl text-brand-teal">Roles de {editing.fullName}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Selecciona las autoridades necesarias. Los cambios se aplican en la siguiente petición.</p>
        <form onSubmit={saveRoles} className="mt-5 space-y-4">
          {roles.data.map((role) => <label key={role.code} className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={selectedRoles.includes(role.code)}
              onChange={(event) => setSelectedRoles((current) => event.target.checked ? [...current, role.code] : current.filter((code) => code !== role.code))}
              disabled={editing.email === account?.email && role.code === 'administrator'}
              className="size-4 accent-brand-teal" />
            {role.label}
          </label>)}
          <div className="flex gap-3">
            <Button type="submit" disabled={saving || selectedRoles.length === 0}>{saving ? 'Guardando…' : 'Guardar roles'}</Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
          </div>
        </form>
      </section>}

      <section aria-labelledby="create-title" className="max-w-2xl border-t pt-7">
        <h2 id="create-title" className="text-xl text-brand-gold">Crear usuario</h2>
        <p className="mt-2 text-sm text-muted-foreground">La contraseña inicial no se guarda en texto plano y debe comunicarse fuera del sistema.</p>
        <form onSubmit={createUser} className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="new-name">Nombre completo</Label><Input id="new-name" value={newName} onChange={(event) => setNewName(event.target.value)} required maxLength={120} /></div>
          <div className="space-y-2"><Label htmlFor="new-email">Correo electrónico</Label><Input id="new-email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="new-password">Contraseña inicial</Label><Input id="new-password" type="password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="new-role">Rol inicial</Label><Select value={newRole} onValueChange={setNewRole} required><SelectTrigger id="new-role" className="w-full"><SelectValue placeholder="Selecciona un rol" /></SelectTrigger><SelectContent>{roles.data.map((role) => <SelectItem key={role.code} value={role.code}>{role.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="sm:col-span-2"><Button type="submit" disabled={creating || !newRole}>{creating ? 'Creando…' : 'Crear cuenta'}</Button></div>
        </form>
      </section>

      <section aria-labelledby="permissions-title" className="space-y-5 border-t pt-7">
        <div><h2 id="permissions-title" className="text-xl text-brand-teal">Matriz de autoridades</h2><p className="mt-2 text-sm text-muted-foreground">Permisos configurados en el backend para cada rol.</p></div>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table className="min-w-215">
            <caption className="sr-only">Permisos por rol de Brunexa</caption>
            <TableHeader><TableRow><TableHead className="min-w-65">Permiso</TableHead>{roles.data.map((role) => <TableHead key={role.code} className="min-w-32 text-center">{role.label}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{permissions.data.map((permission) => <TableRow key={permission.code}>
              <TableCell><span className="block font-medium">{permission.label}</span><span className="text-xs text-muted-foreground">{permission.area}</span></TableCell>
              {roles.data.map((role) => <TableCell key={role.code} className="text-center">{role.permissions.includes(permission.code) ? <Check className="mx-auto size-4 text-brand-teal" aria-label="Permitido" /> : <span className="text-muted-foreground" aria-label="No permitido">—</span>}</TableCell>)}
            </TableRow>)}</TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
