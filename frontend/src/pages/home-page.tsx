import {
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  Landmark,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Upload,
  WalletCards,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import creditImage from '@/assets/landing/brunexa-creditos.png'
import heroImage from '@/assets/landing/brunexa-hero.png'
import investmentImage from '@/assets/landing/brunexa-inversiones.png'
import { useInstitutionSettings } from '@/app/providers/settings-provider'
import { Button } from '@/components/ui/button'

const iconRegistry = {
  'wallet-cards': WalletCards,
  'bar-chart': BarChart3,
  'trending-up': TrendingUp,
  upload: Upload,
  landmark: Landmark,
  'file-text': FileText,
  shield: ShieldCheck,
  sliders: SlidersHorizontal,
}

function serviceIcon(name: string, fallback: keyof typeof iconRegistry) {
  return iconRegistry[name as keyof typeof iconRegistry] ?? iconRegistry[fallback]
}

export function HomePage() {
  const { settings, assets } = useInstitutionSettings()
  const { institution, landing, credit, investment } = settings
  const creditVisible = credit.moduleEnabled === 'true'
  const investmentVisible = investment.moduleEnabled === 'true'
  const services = [
    {
      title: 'Simulador de crédito',
      description: 'Compara monto, plazo y sistema de amortización en un solo recorrido.',
      icon: serviceIcon(landing.creditServiceIcon, 'wallet-cards'),
      href: '#creditos', linkLabel: 'Explorar créditos', area: 'credit',
    },
    {
      title: 'Tabla de amortización',
      description: 'Revisa cómo se distribuyen capital, intereses y cargos en cada cuota.',
      icon: serviceIcon(landing.amortizationServiceIcon, 'bar-chart'),
      href: '#creditos', linkLabel: 'Conocer el cálculo', area: 'credit',
    },
    {
      title: 'Proyección de inversión',
      description: 'Analiza escenarios según el monto, el plazo y las condiciones definidas.',
      icon: serviceIcon(landing.investmentServiceIcon, 'trending-up'),
      href: '#inversiones', linkLabel: 'Explorar inversiones', area: 'investment',
    },
    {
      title: 'Solicitud digital',
      description: 'Continúa el proceso con documentación e identidad desde tu cuenta.',
      icon: serviceIcon(landing.applicationServiceIcon, 'upload'),
      href: '#proceso', linkLabel: 'Conocer el proceso', area: 'investment',
    },
  ]
  const visibleServices = services.filter((service) => service.area === 'credit' ? creditVisible : investmentVisible)

  return (
    <main id="contenido">
      <section className="overflow-hidden border-b">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:min-h-170 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-16 lg:py-24">
          <div className="max-w-xl">
            <h1 className="max-w-[12ch] text-4xl tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              {landing.heroTitle} <span className="text-brand-teal">{landing.heroHighlight}</span>
            </h1>
            <p className="mt-6 max-w-[62ch] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              {landing.heroDescription}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {creditVisible && <Button asChild size="lg" variant="brand">
                <a href="#creditos">Explorar créditos <ArrowRight aria-hidden="true" /></a>
              </Button>}
              {investmentVisible && <Button asChild size="lg" variant="gold-outline">
                <a href="#inversiones">Conocer inversiones</a>
              </Button>}
            </div>
            <div className="mt-10 flex max-w-lg flex-wrap gap-8 border-t pt-5 text-sm text-muted-foreground">
              {creditVisible && <p><span className="block font-medium text-foreground">{credit.displayName}</span>Cuotas y escenarios comparables.</p>}
              {investmentVisible && <p><span className="block font-medium text-foreground">{investment.displayName}</span>Proyecciones y proceso digital.</p>}
            </div>
          </div>

          <figure className="relative">
            <div className="overflow-hidden rounded-xl bg-muted">
              <img
                src={assets.heroImage ?? heroImage}
                alt="Pareja revisando sus opciones financieras en una computadora"
                className="aspect-[4/3] h-full w-full object-cover"
                fetchPriority="high"
              />
            </div>
            <figcaption className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-px w-10 bg-brand-gold" aria-hidden="true" />
              Información para analizar con calma.
            </figcaption>
          </figure>
        </div>
      </section>

      {visibleServices.length > 0 && <section id="servicios" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-end">
            <h2 className="max-w-[14ch] text-3xl tracking-tight sm:text-4xl">{landing.servicesTitle}</h2>
            <p className="max-w-[65ch] leading-7 text-muted-foreground lg:justify-self-end">
              {landing.servicesDescription}
            </p>
          </div>

          <div className="mt-12 divide-y border-y lg:grid lg:grid-cols-4 lg:divide-x lg:divide-y-0">
            {visibleServices.map((service) => (
              <article key={service.title} className="group px-1 py-8 lg:px-6 lg:first:pl-0 lg:last:pr-0">
                <service.icon className="size-6 text-brand-teal" aria-hidden="true" />
                <h3 className="mt-6 text-xl">{service.title}</h3>
                <p className="mt-3 min-h-18 text-sm leading-6 text-muted-foreground">{service.description}</p>
                <a href={service.href} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand-gold hover:text-foreground">
                  {service.linkLabel}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>}

      {creditVisible && <section id="creditos" className="scroll-mt-24 border-t bg-muted/40 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          <figure>
            <img
              src={assets.creditImage ?? creditImage}
              alt="Asesora explicando una alternativa de crédito a una clienta"
              className="aspect-[3/2] w-full rounded-xl object-cover"
              loading="lazy"
            />
            <figcaption className="mt-4 text-sm text-muted-foreground">Un escenario claro comienza con condiciones bien explicadas.</figcaption>
          </figure>

          <div className="max-w-xl">
            <Landmark className="size-7 text-brand-teal" aria-hidden="true" />
            <h2 className="mt-6 text-3xl tracking-tight sm:text-4xl">{landing.creditTitle}</h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              {landing.creditDescription}
            </p>
            <ul className="mt-7 space-y-4 text-sm">
              <li className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-brand-teal" aria-hidden="true" /><span>Sistemas de amortización francés y alemán.</span></li>
              <li className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-brand-teal" aria-hidden="true" /><span>Detalle de capital, interés, cuotas y cobros indirectos.</span></li>
              <li className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-brand-teal" aria-hidden="true" /><span>Tabla completa preparada para consulta y descarga.</span></li>
            </ul>
            <p className="mt-8 text-sm font-medium text-brand-gold">Simulador en preparación</p>
          </div>
        </div>
      </section>}

      {investmentVisible && <section id="inversiones" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="max-w-xl lg:order-1">
            <TrendingUp className="size-7 text-brand-gold" aria-hidden="true" />
            <h2 className="mt-6 text-3xl tracking-tight sm:text-4xl">{landing.investmentTitle}</h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              {landing.investmentDescription} Cuando decidas continuar, el proceso conectará tu perfil,
              documentos y validación de identidad.
            </p>
            <div className="mt-8 divide-y border-y">
              <div className="flex gap-4 py-5">
                <SlidersHorizontal className="mt-0.5 size-5 shrink-0 text-brand-teal" aria-hidden="true" />
                <div><h3 className="text-base">Escenarios configurables</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Compara plazos y condiciones sin perder de vista el detalle.</p></div>
              </div>
              <div className="flex gap-4 py-5">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-teal" aria-hidden="true" />
                <div><h3 className="text-base">Continuidad segura</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">La solicitud se vinculará a una cuenta identificada.</p></div>
              </div>
            </div>
            <p className="mt-8 text-sm font-medium text-brand-gold">Módulo de inversión en preparación</p>
          </div>

          <figure className="lg:order-2">
            <img
              src={assets.investmentImage ?? investmentImage}
              alt="Cliente y asesora revisando un escenario de inversión"
              className="aspect-[3/2] w-full rounded-xl object-cover"
              loading="lazy"
            />
            <figcaption className="mt-4 text-sm text-muted-foreground">Proyectar también significa entender cada condición.</figcaption>
          </figure>
        </div>
      </section>}

      <section id="proceso" className="scroll-mt-24 bg-primary px-5 py-20 text-primary-foreground sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <h2 className="max-w-[15ch] text-3xl tracking-tight sm:text-4xl">{landing.processTitle}</h2>
            <p className="max-w-[65ch] text-sm leading-7 text-primary-foreground/75 lg:justify-self-end">
              Cada etapa conserva la información necesaria para que el siguiente paso sea comprensible y verificable.
            </p>
          </div>
          <ol className="mt-12 grid gap-8 border-t border-primary-foreground/20 pt-8 md:grid-cols-3 md:gap-12">
            <li>
              <span className="text-sm font-medium text-brand-gold">01</span>
              <h3 className="mt-5 text-xl">Explora</h3>
              <p className="mt-3 text-sm leading-6 text-primary-foreground/70">Selecciona el producto y completa los parámetros del escenario que quieres analizar.</p>
            </li>
            <li>
              <span className="text-sm font-medium text-brand-gold">02</span>
              <h3 className="mt-5 text-xl">Compara</h3>
              <p className="mt-3 text-sm leading-6 text-primary-foreground/70">Revisa resultados, composición de pagos y condiciones antes de tomar una decisión.</p>
            </li>
            <li>
              <span className="text-sm font-medium text-brand-gold">03</span>
              <h3 className="mt-5 text-xl">Continúa</h3>
              <p className="mt-3 text-sm leading-6 text-primary-foreground/70">Accede a tu cuenta para completar documentación y los controles de identidad requeridos.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 border-y py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <FileText className="size-6 text-brand-gold" aria-hidden="true" />
            <h2 className="mt-5 max-w-[22ch] text-3xl tracking-tight">Toda la información relevante, en un mismo recorrido.</h2>
            <p className="mt-4 max-w-[65ch] leading-7 text-muted-foreground">Ingresa para consultar tu perfil y los accesos asignados dentro de {institution.shortName}.</p>
          </div>
          <Button asChild size="lg" variant="brand">
            <Link to="/login">Ingresar a Brunexa <ArrowRight aria-hidden="true" /></Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
