import { ChevronDown, IdCard, LayoutDashboard, LogOut, UserRound, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/app/providers/auth-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** Acceso a la cuenta desde el sitio público: sin sesión, "Ingresar"; con sesión, menú con cierre de sesión. */
export function AccountMenu() {
  const { account, hasPermission, logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  if (!account) {
    return (
      <Link to="/login" className="px-1 py-2 text-sm font-medium text-brand-teal transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Ingresar
      </Link>
    )
  }

  const staff = hasPermission('admin.dashboard.view')
  const client = hasPermission('own.requests.read')
  const firstName = account.fullName.split(' ')[0] || account.username

  async function signOut() {
    setSigningOut(true)
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      toast.error('No se pudo cerrar la sesión. Intenta de nuevo.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-brand-teal" aria-label={`Menú de la cuenta de ${account.fullName}`}>
          <UserRound className="size-4" aria-hidden="true" />
          <span className="max-w-28 truncate">{firstName}</span>
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium">{account.fullName}</span>
          <span className="block truncate text-xs text-muted-foreground">{account.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {client && (
          <DropdownMenuItem asChild>
            <Link to="/cliente"><Wallet aria-hidden="true" />Mi espacio</Link>
          </DropdownMenuItem>
        )}
        {staff && (
          <DropdownMenuItem asChild>
            <Link to="/admin"><LayoutDashboard aria-hidden="true" />Panel interno</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/cuenta"><UserRound aria-hidden="true" />Mi cuenta</Link>
        </DropdownMenuItem>
        {client && (
          <DropdownMenuItem asChild>
            <Link to="/perfil"><IdCard aria-hidden="true" />Mi perfil e identidad</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={signingOut} onSelect={() => void signOut()}>
          <LogOut aria-hidden="true" />{signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
