import { ArrowRight, ChartNoAxesCombined, Landmark } from 'lucide-react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '@/components/shared/brand-logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'

export function HomePage() {
  return (
    <div className="min-h-svh">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:px-4 focus:py-2"
      >
        Ir al contenido
      </a>

      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <Link to="/" aria-label="Brunexa Bank, inicio">
            <BrandLogo className="h-14 w-48 sm:h-16 sm:w-56" decorative />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium md:flex" aria-label="Navegación principal">
            <a className="hover:text-brand-teal" href="#creditos">Créditos</a>
            <a className="hover:text-brand-teal" href="#inversiones">Inversiones</a>
            <a className="hover:text-brand-teal" href="#recorrido">Recorrido</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link className="hidden text-sm text-muted-foreground hover:text-brand-teal lg:inline" to="/admin">
              Panel de demostración
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex items-center justify-between gap-4 border-t px-5 py-3 text-sm md:hidden sm:px-8" aria-label="Navegación móvil">
          <a href="#creditos" className="hover:text-brand-teal">Créditos</a>
          <a href="#inversiones" className="hover:text-brand-teal">Inversiones</a>
          <Link to="/admin" className="text-muted-foreground hover:text-brand-teal">Panel</Link>
        </nav>
      </header>

      <main id="contenido">
        <section className="border-b">
          <div className="mx-auto grid min-h-145 max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-16">
            <div className="max-w-2xl">
              <h1 className="max-w-[14ch] text-4xl sm:text-5xl lg:text-6xl">
                Explora tus opciones con <span className="text-brand-teal">claridad.</span>
              </h1>
              <p className="mt-7 max-w-[65ch] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Brunexa reunirá simuladores de crédito e inversión para comparar
                escenarios antes de tomar una decisión. Esta es una vista
                preliminar: los productos, tasas y procesos todavía se están definiendo.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <Button asChild size="lg">
                  <a href="#simuladores">
                    Conocer los simuladores
                    <ArrowRight aria-hidden="true" />
                  </a>
                </Button>
                <a href="#recorrido" className="text-sm font-medium text-brand-gold underline underline-offset-4 hover:text-foreground">
                  Ver el recorrido previsto
                </a>
              </div>
            </div>
            <div className="flex items-center justify-center" aria-hidden="true">
              <BrandLogo variant="mark" className="size-64 sm:size-80 lg:size-96" decorative />
            </div>
          </div>
        </section>

        <section id="simuladores" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-3xl sm:text-4xl">Simuladores <span className="text-brand-teal">en preparación</span></h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              El sistema se organizará alrededor de dos herramientas públicas,
              configuradas previamente por el equipo interno.
            </p>
          </div>

          <article id="creditos" className="grid gap-5 border-t py-9 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] sm:items-start sm:gap-8">
            <div className="flex items-center gap-3">
              <Landmark className="size-6 text-brand-teal" aria-hidden="true" />
              <h3 className="text-2xl">Créditos</h3>
            </div>
            <p className="max-w-[65ch] leading-7 text-muted-foreground">
              Elige monto, plazo, tipo de crédito y sistema de amortización para
              revisar una tabla de pagos y descargar un reporte cuando el módulo esté listo.
            </p>
            <span className="text-sm font-medium text-brand-gold">En diseño</span>
          </article>

          <article id="inversiones" className="grid gap-5 border-y py-9 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] sm:items-start sm:gap-8">
            <div className="flex items-center gap-3">
              <ChartNoAxesCombined className="size-6 text-brand-teal" aria-hidden="true" />
              <h3 className="text-2xl">Inversiones</h3>
            </div>
            <p className="max-w-[65ch] leading-7 text-muted-foreground">
              Explora monto, plazo y rendimiento proyectado. Más adelante,
              un cliente identificado podrá continuar con documentación y validación de identidad.
            </p>
            <span className="text-sm font-medium text-brand-gold">En diseño</span>
          </article>
        </section>

        <section id="recorrido" className="border-t bg-muted/50">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <h2 className="max-w-2xl text-3xl sm:text-4xl">Así se construirá la experiencia</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
              <li className="border-t border-brand-gold/50 pt-5">
                <h3 className="text-xl">Configuración</h3>
                <p className="mt-3 leading-7 text-muted-foreground">El equipo interno definirá productos, tasas y cargos con información verificable.</p>
              </li>
              <li className="border-t border-brand-gold/50 pt-5">
                <h3 className="text-xl">Simulación</h3>
                <p className="mt-3 leading-7 text-muted-foreground">Cada persona podrá revisar proyecciones claras y llevarse un reporte de su escenario.</p>
              </li>
              <li className="border-t border-brand-gold/50 pt-5">
                <h3 className="text-xl">Solicitud</h3>
                <p className="mt-3 leading-7 text-muted-foreground">La inversión en línea se completará en un espacio de cliente con controles de identidad y documentación.</p>
              </li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>Brunexa Bank es una institución ficticia. Este boceto no ofrece productos financieros reales.</p>
          <Link to="/admin" className="font-medium text-foreground hover:text-brand-teal">Ver panel de demostración</Link>
        </div>
      </footer>
    </div>
  )
}
