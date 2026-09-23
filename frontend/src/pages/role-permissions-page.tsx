import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Ban, Check, CircleCheck, Copy, Eye, EyeOff, MailCheck, RefreshCw, UserRoundCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { useAuth, type Account } from '@/app/providers/auth-provider'
import { PageHeader } from '@/components/shared/page-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type Role = { code: string; label: string; permissions: string[] }
type PermissionInfo = { code: string; label: string; area: string }
type PasswordMode = 'manual' | 'generated'
type PendingVerification = { email: string; expiresAt: string }
type CreatedInternalUser = {
  account: Account
  verification: PendingVerification
  temporaryPassword: string | null
}

const internalRoleCodes = new Set(['credit_advisor', 'investment_advisor', 'administrator'])

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
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('manual')
  const [newRole, setNewRole] = useState('')
  const [creating, setCreating] = useState(false)
  const [creationResult, setCreationResult] = useState<CreatedInternalUser | null>(null)
  const [changingStatus, setChangingStatus] = useState<number | null>(null)
  const [resendingVerification, setResendingVerification] = useState<number | null>(null)

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
    setFormError('')
    try {
      const { data } = await api.post<CreatedInternalUser>('/admin/users', {
        username: newUsername.trim().toLowerCase(),
        email: newEmail.trim(),
        fullName: newName.trim(),
        password: passwordMode === 'manual' ? newPassword : null,
        passwordMode,
        roles: [newRole],
      })
      await client.invalidateQueries({ queryKey: ['admin', 'users'] })
      setNewPassword('')
      setCreationResult(data)
    } catch (error) {
      setFormError(requestError(error))
    } finally {
      setCreating(false)
    }
  }

  async function changeStatus(user: Account) {
    setChangingStatus(user.id)
    setMessage('')
    setFormError('')
    try {
      await api.put(`/admin/users/${user.id}/status`, { enabled: !user.enabled })
      await client.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success(user.enabled ? 'Cuenta bloqueada' : 'Cuenta desbloqueada', {
        description: user.enabled
          ? `${user.fullName} perderá el acceso desde su siguiente petición.`
          : `${user.fullName} puede volver a ingresar si su correo está verificado.`,
      })
    } catch (error) {
      toast.error('No se pudo cambiar el estado de la cuenta', { description: requestError(error) })
    } finally {
      setChangingStatus(null)
    }
  }

  async function resendVerification(user: Account) {
    setResendingVerification(user.id)
    try {
      await api.post(`/admin/users/${user.id}/verification/resend`)
      toast.success('Código reenviado', { description: `Enviamos un código nuevo a ${user.email}.` })
    } catch (error) {
      toast.error('No se pudo reenviar el código', { description: requestError(error) })
    } finally {
      setResendingVerification(null)
    }
  }

  async function copyTemporaryPassword() {
    if (!creationResult?.temporaryPassword) return
    try {
      await navigator.clipboard.writeText(creationResult.temporaryPassword)
      toast.success('Contraseña copiada')
    } catch {
      toast.error('No se pudo copiar la contraseña. Selecciónala manualmente.')
    }
  }

  if (users.isPending || roles.isPending || permissions.isPending) {
    return <div className="py-10 text-sm text-muted-foreground">Cargando usuarios y permisos…</div>
  }
  if (users.isError || roles.isError || permissions.isError) {
    return <div className="py-10"><h1 className="text-2xl">No se pudo cargar la administración de accesos</h1><p className="mt-3 text-muted-foreground">Comprueba el servidor e intenta actualizar la página.</p></div>
  }

  const roleByCode = new Map(roles.data.map((role) => [role.code, role.label]))
  const internalRoles = roles.data.filter((role) => internalRoleCodes.has(role.code))

  function changeCreateOpen(open: boolean) {
    if (creating) return
    setCreateOpen(open)
    setFormError('')
    setCreationResult(null)
    if (!open) {
      setNewName('')
      setNewEmail('')
      setNewUsername('')
      setNewPassword('')
      setShowNewPassword(false)
      setPasswordMode('manual')
      setNewRole('')
    }
  }

  return (
    <div className="space-y-10">
      <Dialog open={createOpen} onOpenChange={changeCreateOpen}>
        <PageHeader title="Usuarios, roles y permisos"
          description="Administra las cuentas y consulta las autoridades definidas para cada rol de Brunexa."
          actions={<DialogTrigger asChild><Button variant="gold">Nuevo integrante</Button></DialogTrigger>}
          className="border-b pb-8" />

        <DialogContent className="max-w-2xl" showCloseButton={!creating}>
          {creationResult ? (
            <div className="space-y-6">
              <DialogHeader>
                <CircleCheck className="size-9 text-brand-teal" aria-hidden="true" />
                <DialogTitle>Cuenta interna creada</DialogTitle>
                <DialogDescription>
                  Enviamos un código de seis dígitos a {creationResult.verification.email}. La cuenta no podrá ingresar hasta verificarlo.
                </DialogDescription>
              </DialogHeader>

              <dl className="grid gap-4 rounded-xl bg-muted/60 p-5 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Personal</dt><dd className="mt-1 font-medium">{creationResult.account.fullName}</dd></div>
                <div><dt className="text-muted-foreground">Usuario</dt><dd className="mt-1 font-medium">{creationResult.account.username}</dd></div>
                <div><dt className="text-muted-foreground">Rol inicial</dt><dd className="mt-1 font-medium">{creationResult.account.roles.map((role) => roleByCode.get(role) ?? role).join(', ')}</dd></div>
                <div><dt className="text-muted-foreground">Código válido hasta</dt><dd className="mt-1 font-medium">{new Date(creationResult.verification.expiresAt).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
              </dl>

              {creationResult.temporaryPassword && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="temporary-password">Contraseña generada</Label>
                    <p className="mt-1 text-sm text-muted-foreground">Se mostrará únicamente en este momento. Compártela por un canal seguro.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input id="temporary-password" readOnly value={creationResult.temporaryPassword} className="font-mono" />
                    <Button type="button" variant="outline" size="icon" onClick={() => void copyTemporaryPassword()} aria-label="Copiar contraseña temporal">
                      <Copy aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="brand">Entendido</Button></DialogClose>
              </DialogFooter>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Crear integrante interno</DialogTitle>
                <DialogDescription>Registra asesores o administradores. Las cuentas de clientes se crean únicamente desde el registro público.</DialogDescription>
              </DialogHeader>
              <form onSubmit={createUser} className="space-y-6">
                {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="new-name">Nombre completo</Label><Input id="new-name" value={newName} onChange={(event) => setNewName(event.target.value)} required maxLength={120} autoComplete="name" /></div>
                  <div className="space-y-2"><Label htmlFor="new-email">Correo institucional</Label><Input id="new-email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required maxLength={254} autoComplete="email" /></div>
                  <div className="space-y-2"><Label htmlFor="new-username">Usuario</Label><Input id="new-username" value={newUsername} onChange={(event) => setNewUsername(event.target.value)} required minLength={4} maxLength={30} pattern="[A-Za-z0-9._]+" autoComplete="off" /></div>
                  <div className="space-y-2"><Label htmlFor="new-role">Rol inicial</Label><Select value={newRole} onValueChange={setNewRole} required><SelectTrigger id="new-role" className="w-full"><SelectValue placeholder="Selecciona un rol interno" /></SelectTrigger><SelectContent>{internalRoles.map((role) => <SelectItem key={role.code} value={role.code}>{role.label}</SelectItem>)}</SelectContent></Select></div>
                </div>

                <div className="space-y-3">
                  <Label>Contraseña inicial</Label>
                  <RadioGroup value={passwordMode} onValueChange={(value) => setPasswordMode(value as PasswordMode)} className="grid gap-3 sm:grid-cols-2">
                    <label className={cn('flex cursor-pointer gap-3 rounded-xl border p-4', passwordMode === 'manual' && 'border-brand-teal bg-brand-teal/5')}>
                      <RadioGroupItem value="manual" id="password-manual" className="mt-1" />
                      <span><span className="block font-medium">Definir manualmente</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">El administrador escribe la contraseña inicial.</span></span>
                    </label>
                    <label className={cn('flex cursor-pointer gap-3 rounded-xl border p-4', passwordMode === 'generated' && 'border-brand-teal bg-brand-teal/5')}>
                      <RadioGroupItem value="generated" id="password-generated" className="mt-1" />
                      <span><span className="block font-medium">Generar automáticamente</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">Brunexa crea una clave segura que se muestra una sola vez.</span></span>
                    </label>
                  </RadioGroup>
                </div>

                {passwordMode === 'manual' && (
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Contraseña inicial</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        minLength={12}
                        maxLength={128}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        required
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        aria-label={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        title={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showNewPassword ? (
                          <EyeOff className="size-4.5" aria-hidden="true" />
                        ) : (
                          <Eye className="size-4.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground">Debe contener al menos 12 caracteres.</p>
                  </div>
                )}

                <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
                  <MailCheck className="mt-0.5 size-5 shrink-0 text-brand-teal" aria-hidden="true" />
                  <p>Al crear la cuenta enviaremos un código que caduca en 15 minutos. El acceso permanecerá bloqueado hasta verificar el correo.</p>
                </div>

                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline" disabled={creating}>Cancelar</Button></DialogClose>
                  <Button type="submit" variant="gold" disabled={creating || !newRole || (passwordMode === 'manual' && newPassword.length < 12)}>{creating ? 'Creando y enviando…' : 'Crear y enviar código'}</Button>
                </DialogFooter>
              </form>
            </>
          )}
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
            <Table className="min-w-230">
              <TableHeader><TableRow>
                <TableHead>Nombre</TableHead><TableHead>Correo</TableHead><TableHead>Roles</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {users.data.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Aún no hay cuentas. Crea el primer usuario para comenzar.</TableCell></TableRow>}
                {users.data.map((user) => <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell className="max-w-64 break-words">{user.email}</TableCell>
                  <TableCell>{user.roles.map((role) => roleByCode.get(role) ?? role).join(', ')}</TableCell>
                  <TableCell>
                    {!user.enabled && <Badge variant="destructive">Bloqueado</Badge>}
                    {user.enabled && !user.emailVerified && <Badge variant="outline" className="border-brand-gold/50 text-brand-gold">Correo pendiente</Badge>}
                    {user.enabled && user.emailVerified && <Badge variant="outline" className="border-brand-teal/50 text-brand-teal">Activo</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      {!user.emailVerified && (
                        <Button variant="outline" size="sm" disabled={resendingVerification === user.id} onClick={() => void resendVerification(user)}>
                          <RefreshCw className={resendingVerification === user.id ? 'animate-spin' : undefined} aria-hidden="true" />
                          {resendingVerification === user.id ? 'Enviando…' : 'Reenviar código'}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => edit(user)}>Editar roles</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant={user.enabled ? 'outline' : 'brand'}
                            size="sm"
                            disabled={changingStatus === user.id || user.username === account?.username}
                            title={user.username === account?.username ? 'No puedes bloquear tu propia cuenta' : undefined}
                          >
                            {user.enabled ? <Ban aria-hidden="true" /> : <UserRoundCheck aria-hidden="true" />}
                            {user.enabled ? 'Bloquear' : 'Desbloquear'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{user.enabled ? 'Bloquear cuenta' : 'Desbloquear cuenta'}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {user.enabled
                                ? `${user.fullName} perderá el acceso al sistema y su sesión dejará de ser válida.`
                                : `${user.fullName} recuperará el acceso. Si su correo continúa pendiente, deberá verificarlo antes de ingresar.`}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void changeStatus(user)}>
                              {user.enabled ? 'Bloquear cuenta' : 'Desbloquear cuenta'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
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
