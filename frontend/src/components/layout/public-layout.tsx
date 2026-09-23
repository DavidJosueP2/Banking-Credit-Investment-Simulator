import { Link, Outlet, ScrollRestoration } from 'react-router-dom'

import { useAuth } from '@/app/providers/auth-provider'
import { useInstitutionSettings } from '@/app/providers/settings-provider'
import { BrandLogo } from '@/components/shared/brand-logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'

export function PublicLayout() {
  const { account, hasPermission } = useAuth()
  const { settings } = useInstitutionSettings()
  const { institution, landing, credit, investment } = settings
  const hasPublicProducts = landing.servicesEnabled === 'true' && (credit.moduleEnabled === 'true' || investment.moduleEnabled === 'true')
  const destination = account ? hasPermission('admin.dashboard.view') ? '/admin' : '/cuenta' : '/login'

  return (
    <div className="min-h-svh">
      <ScrollRestoration />
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:px-4 focus:py-2">
        Ir al contenido
      </a>
      <header className="sticky top-0 z-40 bg-background">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <Link to="/" aria-label={`${institution.institutionName}, inicio`}>
            <BrandLogo className="h-12 w-44 sm:w-48" decorative />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex" aria-label="Navegación principal">
            {hasPublicProducts && <a className="hover:text-brand-teal" href="/#servicios">{landing.headerServicesLabel}</a>}
            {credit.moduleEnabled === 'true' && <a className="hover:text-brand-teal" href="/#creditos">{credit.displayName}</a>}
            {investment.moduleEnabled === 'true' && <a className="hover:text-brand-teal" href="/#inversiones">{investment.displayName}</a>}
            {landing.processEnabled === 'true' && <a className="hover:text-brand-teal" href="/#proceso">{landing.headerProcessLabel}</a>}
          </nav>
          <div className="flex items-center gap-3">
            <Link className="hidden px-1 py-2 text-sm font-medium text-foreground transition-colors hover:text-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:inline" to={destination}>
              {account ? hasPermission('admin.dashboard.view') ? 'Ir al panel' : 'Mi cuenta' : 'Ingresar'}
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex items-center justify-between gap-4 px-5 py-3 text-sm sm:px-8 md:hidden" aria-label="Navegación móvil">
          {credit.moduleEnabled === 'true' && <a href="/#creditos" className="hover:text-brand-teal">{credit.displayName}</a>}
          {investment.moduleEnabled === 'true' && <a href="/#inversiones" className="hover:text-brand-teal">{investment.displayName}</a>}
          <Link to={destination} className="text-brand-teal hover:text-foreground">{account ? 'Mi cuenta' : 'Ingresar'}</Link>
        </nav>
      </header>
      <Outlet />
      <footer className="bg-muted/40 px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_minmax(0,0.8fr)]">
          <div className="max-w-md">
            <BrandLogo className="h-12 w-44" decorative />
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              {institution.description}
            </p>
          </div>
          <nav aria-label="Productos" className="text-sm">
            <p className="font-medium text-foreground">{landing.footerProductsHeading}</p>
            <div className="mt-4 flex flex-col items-start gap-3 text-muted-foreground">
              {credit.moduleEnabled === 'true' && <a href="/#creditos" className="hover:text-brand-teal">{credit.displayName}</a>}
              {investment.moduleEnabled === 'true' && <a href="/#inversiones" className="hover:text-brand-teal">{investment.displayName}</a>}
              {landing.processEnabled === 'true' && <a href="/#proceso" className="hover:text-brand-teal">{landing.headerProcessLabel}</a>}
            </div>
          </nav>
          <nav aria-label="Acceso" className="text-sm">
            <p className="font-medium text-foreground">{landing.footerAccessHeading}</p>
            <div className="mt-4 flex flex-col items-start gap-3 text-muted-foreground">
              <Link to={destination} className="hover:text-brand-teal">
                {account && hasPermission('admin.dashboard.view') ? 'Panel administrativo' : account ? 'Mi cuenta' : 'Ingresar'}
              </Link>
              <Link to="/" className="hover:text-brand-teal">{landing.footerHomeLabel}</Link>
            </div>
          </nav>
          <div className="text-sm">
            <p className="font-medium text-foreground">{landing.footerContactHeading}</p>
            <address className="mt-4 flex flex-col items-start gap-3 not-italic text-muted-foreground">
              <a href={`mailto:${institution.supportEmail}`} className="break-all hover:text-brand-teal">{institution.supportEmail}</a>
              <a href={`tel:${institution.supportPhone.replace(/\s/g, '')}`} className="hover:text-brand-teal">{institution.supportPhone}</a>
              <span>{institution.address}</span>
            </address>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t pt-6 text-xs leading-5 text-muted-foreground">
          {institution.legalNotice}
        </div>
      </footer>
    </div>
  )
}
