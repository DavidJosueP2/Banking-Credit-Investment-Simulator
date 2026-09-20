import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { useAuth, type Account } from '@/app/providers/auth-provider'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const [formError, setFormError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('')
  const [creating, setCreating] = useState(false)

  function edit(user: Account) {
    setEditing(user)
    setSelectedRoles(user.roles)
    setMessage('')
    setFormError('')
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
      setFormError(requestError(error))
    } finally {
      setSaving(false)
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setMessage('')
    try {
      await api.post('/admin/users', { username: newUsername.trim().toLowerCase(), email: newEmail, fullName: newName, password: newPassword, roles: [newRole] })
      await client.invalidateQueries({ queryKey: ['admin', 'users'] })
      setNewName('')
      setNewEmail('')
      setNewUsername('')
      setNewPassword('')
      setNewRole('')
      setCreateOpen(false)
      setMessage('Cuenta creada. Entrega la contraseña al usuario por un canal seguro.')
    } catch (error) {
      setFormError(requestError(error))
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

  function changeCreateOpen(open: boolean) {
    if (creating) return
    setCreateOpen(open)
    setFormError('')
    if (!open) {
      setNewName('')
      setNewEmail('')
      setNewUsername('')
      setNewPassword('')
      setNewRole('')
    }
  }

  return (
    <div className="space-y-10">
      <Dialog open={createOpen} onOpenChange={changeCreateOpen}>
        <PageHeader title="Usuarios, roles y permisos"
          description="Administra las cuentas y consulta las autoridades definidas para cada rol de Brunexa."
          actions={<DialogTrigger asChild><Button variant="gold">Nuevo usuario</Button></DialogTrigger>}
          className="border-b pb-8" />

        <DialogContent className="max-w-2xl" showCloseButton={!creating}>
          <DialogHeader>
            <DialogTitle>Crear usuario</DialogTitle>
            <DialogDescription>Registra la cuenta y asigna su rol inicial. La contraseña debe comunicarse por un canal seguro.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createUser} className="space-y-6">
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="new-name">Nombre completo</Label><Input id="new-name" value={newName} onChange={(event) => setNewName(event.target.value)} required maxLength={120} autoComplete="name" /></div>
              <div className="space-y-2"><Label htmlFor="new-email">Correo electrónico</Label><Input id="new-email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required autoComplete="email" /></div>
              <div className="space-y-2"><Label htmlFor="new-username">Usuario</Label><Input id="new-username" value={newUsername} onChange={(event) => setNewUsername(event.target.value)} required minLength={4} maxLength={30} autoComplete="off" /></div>
              <div className="space-y-2"><Label htmlFor="new-password">Contraseña inicial</Label><Input id="new-password" type="password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required autoComplete="new-password" /></div>
              <div className="space-y-2"><Label htmlFor="new-role">Rol inicial</Label><Select value={newRole} onValueChange={setNewRole} required><SelectTrigger id="new-role" className="w-full"><SelectValue placeholder="Selecciona un rol" /></SelectTrigger><SelectContent>{roles.data.map((role) => <SelectItem key={role.code} value={role.code}>{role.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={creating}>Cancelar</Button></DialogClose>
              <Button type="submit" variant="gold" disabled={creating || !newRole}>{creating ? 'Creando…' : 'Crear cuenta'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {message && <p role="status" className="border-t border-brand-teal pt-3 text-sm text-foreground">{message}</p>}

      <Tabs defaultValue="users" className="gap-6">
        <TabsList aria-label="Secciones de usuarios y roles" className="h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="users" className="h-11 flex-none rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-1 shadow-none data-[state=active]:border-brand-teal data-[state=active]:bg-transparent data-[state=active]:text-brand-teal data-[state=active]:shadow-none">Usuarios</TabsTrigger>
          <TabsTrigger value="roles" className="h-11 flex-none rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-1 shadow-none data-[state=active]:border-brand-teal data-[state=active]:bg-transparent data-[state=active]:text-brand-teal data-[state=active]:shadow-none">Matriz de roles</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-5">
          <p className="text-sm text-muted-foreground">{users.data.length} cuenta{users.data.length === 1 ? '' : 's'} registrada{users.data.length === 1 ? '' : 's'}.</p>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table className="min-w-170">
              <TableHeader><TableRow>
                <TableHead>Nombre</TableHead><TableHead>Correo</TableHead><TableHead>Roles</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {users.data.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Aún no hay cuentas. Crea el primer usuario para comenzar.</TableCell></TableRow>}
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
        </TabsContent>

        <TabsContent value="roles" className="space-y-5">
          <p className="text-sm text-muted-foreground">Permisos configurados en el backend para cada rol.</p>
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
        </TabsContent>
      </Tabs>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open && !saving) { setEditing(null); setFormError('') } }}>
        <DialogContent showCloseButton={!saving}>
          <DialogHeader>
            <DialogTitle>Editar roles de {editing?.fullName}</DialogTitle>
            <DialogDescription>Selecciona las autoridades necesarias. Los cambios se aplicarán en la siguiente petición.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveRoles} className="space-y-6">
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <div className="space-y-3">
              {roles.data.map((role) => <label key={role.code} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-muted">
                <input type="checkbox" checked={selectedRoles.includes(role.code)}
                  onChange={(event) => setSelectedRoles((current) => event.target.checked ? [...current, role.code] : current.filter((code) => code !== role.code))}
                  disabled={editing?.username === account?.username && role.code === 'administrator'}
                  className="size-4 accent-brand-teal" />
                {role.label}
              </label>)}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={saving}>Cancelar</Button></DialogClose>
              <Button type="submit" variant="brand" disabled={saving || selectedRoles.length === 0}>{saving ? 'Guardando…' : 'Guardar roles'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
