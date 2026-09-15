import { Link, Outlet } from 'react-router-dom'

import { useAuth } from '@/app/providers/auth-provider'
import { BrandLogo } from '@/components/shared/brand-logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'

export function PublicLayout() {
  const { account, hasPermission } = useAuth()
  const destination = account ? hasPermission('admin.dashboard.view') ? '/admin' : '/cuenta' : '/login'

  return (
    <div className="min-h-svh">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:px-4 focus:py-2">
        Ir al contenido
      </a>
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <Link to="/" aria-label="Brunexa Bank, inicio">
            <BrandLogo className="h-14 w-48 sm:h-16 sm:w-56" decorative />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex" aria-label="Navegación principal">
            <a className="hover:text-brand-teal" href="/#creditos">Créditos</a>
            <a className="hover:text-brand-teal" href="/#inversiones">Inversiones</a>
            <a className="hover:text-brand-teal" href="/#recorrido">Cómo funciona</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link className="hidden text-sm font-medium text-brand-teal hover:text-foreground lg:inline" to={destination}>
              {account ? hasPermission('admin.dashboard.view') ? 'Ir al panel' : 'Mi cuenta' : 'Ingresar'}
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex items-center justify-between gap-4 border-t px-5 py-3 text-sm sm:px-8 md:hidden" aria-label="Navegación móvil">
          <a href="/#creditos" className="hover:text-brand-teal">Créditos</a>
          <a href="/#inversiones" className="hover:text-brand-teal">Inversiones</a>
          <Link to={destination} className="text-brand-teal hover:text-foreground">{account ? 'Mi cuenta' : 'Ingresar'}</Link>
        </nav>
      </header>
      <Outlet />
      <footer className="border-t px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>Brunexa Bank es una institución ficticia. No ofrece productos financieros reales.</p>
          <Link to={destination} className="font-medium text-foreground hover:text-brand-teal">
            {account && hasPermission('admin.dashboard.view') ? 'Panel interno' : 'Acceso a Brunexa'}
          </Link>
        </div>
      </footer>
    </div>
  )
}
