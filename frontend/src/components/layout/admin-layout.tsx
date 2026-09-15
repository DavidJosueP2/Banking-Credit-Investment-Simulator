import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/providers/auth-provider'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

export function AdminLayout() {
  const { account, logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  async function signOut() {
    setSigningOut(true)
    setLogoutError('')
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      setLogoutError('No se pudo cerrar la sesión. Intenta de nuevo.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SidebarTrigger aria-label="Alternar navegación" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="hidden text-sm font-medium text-brand-teal sm:inline">Panel administrativo</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-40 truncate text-xs text-muted-foreground lg:inline" title={account?.email}>
              {account?.fullName}
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut} disabled={signingOut}>
              {signingOut ? 'Saliendo…' : 'Salir'}
            </Button>
          </div>
        </header>
        {logoutError && <p role="alert" className="border-b px-4 py-2 text-sm text-destructive">{logoutError}</p>}
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
            <div className="mt-12 border-t pt-5 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-brand-gold">Brunexa Bank · Ir al inicio público</Link>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
