import {
  ArrowLeft,
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
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import creditImage from '@/assets/landing/brunexa-creditos.png'
import investmentImage from '@/assets/landing/brunexa-inversiones.png'
import carouselCommunityImage from '@/assets/landing/carrusel/brooke-cagle--uHVRvDr7pg-unsplash.jpg'
import carouselIdentityImage from '@/assets/landing/carrusel/debashis-rc-biswas-dyPFnxxUhYk-unsplash.jpg'
import carouselPerspectiveImage from '@/assets/landing/carrusel/zalfa-imani-1xp5VxvyKL0-unsplash.jpg'
import { useAuth } from '@/app/providers/auth-provider'
import { useInstitutionSettings } from '@/app/providers/settings-provider'
import { HeroIllustration, LandingAccent } from '@/components/landing/landing-illustrations'
import { BrandLogo } from '@/components/shared/brand-logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

function landingText(value: string, shortName: string, description: string) {
  return value.replaceAll('{shortName}', shortName).replaceAll('{description}', description)
}

export function HomePage() {
  const navigate = useNavigate()
  const { account, isPending: authPending, refreshAccount } = useAuth()
  const { settings, assets } = useInstitutionSettings()
  const { institution, landing, credit, investment } = settings
  const decorativeIllustrationsVisible = landing.decorativeIllustrationsEnabled === 'true'
  const creditVisible = credit.moduleEnabled === 'true'
  const investmentVisible = investment.moduleEnabled === 'true'
  const [currentSlide, setCurrentSlide] = useState(0)
  const [checkingAccess, setCheckingAccess] = useState(false)
  const carouselSlides = [
    {
      id: 'general',
      title: landingText(landing.bannerGeneralTitle, institution.shortName, institution.description),
      description: landingText(landing.bannerGeneralDescription, institution.shortName, institution.description),
      image: assets.heroImage ?? carouselIdentityImage,
      alt: landing.bannerGeneralImageAlt,
      href: creditVisible ? '#creditos' : investmentVisible ? '#inversiones' : undefined,
      action: creditVisible ? landing.bannerGeneralButton : investmentVisible ? landing.bannerGeneralInvestmentButton : undefined,
    },
    ...(creditVisible ? [{
      id: 'creditos',
      title: landing.bannerCreditTitle,
      description: landing.bannerCreditDescription,
      image: assets.carouselCreditImage ?? carouselCommunityImage,
      alt: landing.bannerCreditImageAlt,
      href: '#creditos',
      action: landing.bannerCreditButton,
    }] : []),
    ...(investmentVisible ? [{
      id: 'inversiones',
      title: landing.bannerInvestmentTitle,
      description: landing.bannerInvestmentDescription,
      image: assets.carouselInvestmentImage ?? carouselPerspectiveImage,
      alt: landing.bannerInvestmentImageAlt,
      href: '#inversiones',
      action: landing.bannerInvestmentButton,
    }] : []),
  ]

  useEffect(() => {
    if (currentSlide < carouselSlides.length) return
    setCurrentSlide(0)
  }, [carouselSlides.length, currentSlide])

  useEffect(() => {
    if (landing.bannerEnabled !== 'true' || carouselSlides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = window.setTimeout(
      () => setCurrentSlide((slide) => (slide + 1) % carouselSlides.length),
      Number(landing.bannerIntervalSeconds) * 1_000,
    )
    return () => window.clearTimeout(timer)
  }, [carouselSlides.length, currentSlide, landing.bannerEnabled, landing.bannerIntervalSeconds])

  function showPreviousSlide() {
    setCurrentSlide((slide) => (slide - 1 + carouselSlides.length) % carouselSlides.length)
  }

  function showNextSlide() {
    setCurrentSlide((slide) => (slide + 1) % carouselSlides.length)
  }

  const services = [
    {
      title: landing.creditServiceTitle,
      description: landing.creditServiceDescription,
      icon: serviceIcon(landing.creditServiceIcon, 'wallet-cards'),
      href: '#creditos', linkLabel: landing.creditServiceButton, area: 'credit',
    },
    {
      title: landing.amortizationServiceTitle,
      description: landing.amortizationServiceDescription,
      icon: serviceIcon(landing.amortizationServiceIcon, 'bar-chart'),
      href: '#creditos', linkLabel: landing.amortizationServiceButton, area: 'credit',
    },
    {
      title: landing.investmentServiceTitle,
      description: landing.investmentServiceDescription,
      icon: serviceIcon(landing.investmentServiceIcon, 'trending-up'),
      href: '#inversiones', linkLabel: landing.investmentServiceButton, area: 'investment',
    },
    {
      title: landing.applicationServiceTitle,
      description: landing.applicationServiceDescription,
      icon: serviceIcon(landing.applicationServiceIcon, 'upload'),
      href: '#proceso', linkLabel: landing.applicationServiceButton, area: 'investment',
    },
  ]
  const visibleServices = services.filter((service) =>
    (service.area === 'credit' ? creditVisible : investmentVisible)
    && (service.href !== '#proceso' || landing.processEnabled === 'true'),
  )
  const CreditSectionIcon = serviceIcon(landing.creditSectionIcon, 'landmark')
  const InvestmentSectionIcon = serviceIcon(landing.investmentSectionIcon, 'trending-up')
  const InvestmentFeatureOneIcon = serviceIcon(landing.investmentFeatureOneIcon, 'sliders')
  const InvestmentFeatureTwoIcon = serviceIcon(landing.investmentFeatureTwoIcon, 'shield')
  const closingAccessLabel = account
    ? account.permissions.includes('admin.dashboard.view') ? 'Ir al panel' : 'Mi cuenta'
    : landingText(landing.closingButton, institution.shortName, institution.description)

  async function openAccount() {
    if (checkingAccess) return
    setCheckingAccess(true)
    try {
      const current = await refreshAccount()
      const destination = !current ? '/login' : current.permissions.includes('admin.dashboard.view') ? '/admin' : '/cuenta'
      navigate(destination)
    } catch {
      toast.error('No se pudo comprobar tu sesión. Inténtalo de nuevo.')
    } finally {
      setCheckingAccess(false)
    }
  }

  return (
    <main id="contenido">
      <section className="relative isolate grid min-h-[calc(100dvh-7.5rem)] w-full items-center overflow-hidden bg-background md:min-h-[calc(100dvh-4.5rem)] 2xl:grid-cols-[minmax(15rem,1fr)_minmax(0,44rem)_minmax(15rem,1fr)]" aria-labelledby="landing-intro-title">
        {decorativeIllustrationsVisible && <HeroIllustration side="left" />}
        <div className="relative z-10 mx-auto w-full px-5 py-14 text-center sm:px-8 sm:py-16 lg:py-20 2xl:col-start-2">
          <BrandLogo
            variant="mark"
            className="mx-auto mb-4 size-8 sm:size-9"
            decorative
          />
          <h1 id="landing-intro-title" className="mx-auto text-balance text-[2.5rem] font-normal leading-[1.1] tracking-[-0.01em] sm:text-[3.25rem] lg:text-[3.75rem] lg:leading-[1.08]">
            <span className="block">{landing.heroTitle}</span>
            <span className="block text-brand-teal">{landing.heroHighlight}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[60ch] text-balance text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            {landing.heroDescription}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {creditVisible && <Button asChild size="lg" variant="brand">
              <a href="#creditos">{landing.heroCreditButton} <ArrowRight aria-hidden="true" /></a>
            </Button>}
            {investmentVisible && <Button asChild size="lg" variant="gold-outline">
              <a href="#inversiones">{landing.heroInvestmentButton}</a>
            </Button>}
          </div>
        </div>
        {decorativeIllustrationsVisible && <HeroIllustration side="right" />}
      </section>

      {landing.bannerEnabled === 'true' && <section aria-label="Destacados de Brunexa">
        <div className="relative min-h-92 overflow-hidden bg-primary sm:min-h-96 lg:min-h-100">
          {carouselSlides.map((slide, index) => {
            const isActive = currentSlide === index

            return (
              <article
                key={slide.id}
                aria-hidden={!isActive}
                className={cn(
                  'absolute inset-0 min-h-92 overflow-hidden transition-opacity duration-1000 ease-in-out will-change-[opacity] motion-reduce:transition-none sm:min-h-96 lg:min-h-100',
                  isActive ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0',
                )}
              >
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className="absolute inset-0 size-full object-cover"
                  fetchPriority={index === 0 ? 'high' : undefined}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
                <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
                <div className="relative flex min-h-92 items-center px-8 py-12 sm:min-h-96 sm:px-14 lg:min-h-100 lg:px-20">
                  <div className="max-w-2xl text-white">
                    <h2 className="max-w-[19ch] text-3xl tracking-[-0.025em] sm:text-4xl">{slide.title}</h2>
                    <p className="mt-4 max-w-[58ch] text-sm leading-6 text-white/85 sm:text-base sm:leading-7">
                      {slide.description}
                    </p>
                    {slide.href && slide.action && (
                      <Button asChild size="lg" variant="gold" className="mt-6">
                        <a href={slide.href} tabIndex={isActive ? undefined : -1}>{slide.action} <ArrowRight aria-hidden="true" /></a>
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}

          {carouselSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={showPreviousSlide}
                aria-label="Ver destacado anterior"
                className="absolute left-3 top-1/2 z-20 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/35 text-white transition-colors hover:bg-black/55 sm:left-5"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={showNextSlide}
                aria-label="Ver siguiente destacado"
                className="absolute right-3 top-1/2 z-20 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/35 text-white transition-colors hover:bg-black/55 sm:right-5"
              >
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
              <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2" aria-label="Seleccionar destacado">
                {carouselSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setCurrentSlide(index)}
                    className={`h-1.5 rounded-full transition-[width,background-color] ${currentSlide === index ? 'w-7 bg-brand-gold' : 'w-2.5 bg-white/65 hover:bg-white'}`}
                    aria-label={`Ver destacado ${index + 1}`}
                    aria-current={currentSlide === index ? 'true' : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>}

      {landing.servicesEnabled === 'true' && visibleServices.length > 0 && <section id="servicios" className="relative isolate scroll-mt-24 overflow-hidden px-5 py-20 sm:px-8 lg:py-24">
        {decorativeIllustrationsVisible && <LandingAccent variant="services" className="absolute right-0 top-7 hidden 2xl:block" />}
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-end">
            <h2 className="max-w-[14ch] text-3xl tracking-tight sm:text-4xl">{landing.servicesTitle}</h2>
            <p className="max-w-[65ch] leading-7 text-muted-foreground lg:justify-self-end">
              {landing.servicesDescription}
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {visibleServices.map((service) => (
              <article
                key={service.title}
                className="group flex flex-col items-center justify-between rounded-2xl bg-card p-6 text-center sm:p-8"
              >
                <div className="flex flex-col items-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-muted/80 text-foreground transition-colors group-hover:bg-muted">
                    <service.icon className="size-6 text-brand-teal" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-lg font-medium text-foreground">{service.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                </div>
                <div className="mt-6 pt-2">
                  <a
                    href={service.href}
                    className="inline-flex items-center justify-center text-sm font-medium text-brand-teal transition-colors hover:underline hover:text-brand-teal/80"
                  >
                    {service.linkLabel}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>}

      {landing.perspectiveEnabled === 'true' && (creditVisible || investmentVisible) && (
        <section className="relative isolate overflow-hidden bg-muted/30 px-5 py-16 sm:px-8 lg:py-20" aria-labelledby="landing-perspective-title">
          {decorativeIllustrationsVisible && <LandingAccent variant="perspective" className="absolute bottom-3 left-0 hidden 2xl:block" />}
          <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
            <div>
              <h2 id="landing-perspective-title" className="max-w-[20ch] text-3xl tracking-tight sm:text-4xl">{landing.perspectiveTitle}</h2>
              <p className="mt-5 max-w-[58ch] leading-7 text-muted-foreground">{landing.perspectiveDescription}</p>
            </div>
            <div className="grid gap-7 sm:grid-cols-2 lg:items-center">
              {creditVisible && <div>
                <h3 className="text-lg text-brand-teal">{landing.perspectiveCreditTitle}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{landing.perspectiveCreditDescription}</p>
              </div>}
              {investmentVisible && <div>
                <h3 className="text-lg text-brand-gold">{landing.perspectiveInvestmentTitle}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{landing.perspectiveInvestmentDescription}</p>
              </div>}
            </div>
          </div>
        </section>
      )}

      {creditVisible && <section id="creditos" className="scroll-mt-24 border-t bg-muted/40 px-5 pt-20 pb-10 sm:px-8 lg:pt-28 lg:pb-12">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          <figure>
            <img
              src={assets.creditImage ?? creditImage}
              alt={landing.creditImageAlt}
              className="aspect-[3/2] w-full rounded-xl object-cover"
              loading="lazy"
            />
            <figcaption className="mt-4 text-sm text-muted-foreground">{landing.creditImageCaption}</figcaption>
          </figure>

          <div className="max-w-xl">
            <CreditSectionIcon className="size-7 text-brand-teal" aria-hidden="true" />
            <h2 className="mt-6 text-3xl tracking-tight sm:text-4xl">{landing.creditTitle}</h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              {landing.creditDescription}
            </p>
            <ul className="mt-7 space-y-4 text-sm">
              {[landing.creditBulletOne, landing.creditBulletTwo, landing.creditBulletThree].map((bullet, index) => (
                <li key={index} className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-brand-teal" aria-hidden="true" /><span>{bullet}</span></li>
              ))}
            </ul>
            <p className="mt-8 text-sm font-medium text-brand-gold">{landing.creditStatusLabel}</p>
          </div>
        </div>
      </section>}

      {investmentVisible && <section id="inversiones" className="scroll-mt-24 px-5 pt-10 pb-20 sm:px-8 lg:pt-12 lg:pb-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="max-w-xl lg:order-1">
            <InvestmentSectionIcon className="size-7 text-brand-gold" aria-hidden="true" />
            <h2 className="mt-6 text-3xl tracking-tight sm:text-4xl">{landing.investmentTitle}</h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              {landing.investmentDescription} {landing.investmentDetail}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-card p-5 sm:p-6">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted/80 text-foreground">
                  <InvestmentFeatureOneIcon className="size-5 text-brand-teal" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-medium text-foreground">{landing.investmentFeatureOneTitle}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{landing.investmentFeatureOneDescription}</p>
              </div>
              <div className="rounded-2xl bg-card p-5 sm:p-6">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted/80 text-foreground">
                  <InvestmentFeatureTwoIcon className="size-5 text-brand-teal" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-medium text-foreground">{landing.investmentFeatureTwoTitle}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{landing.investmentFeatureTwoDescription}</p>
              </div>
            </div>
            <p className="mt-8 text-sm font-medium text-brand-gold">{landing.investmentStatusLabel}</p>
            {investment.simulatorEnabled === 'true' && (
              <Button asChild size="lg" variant="gold" className="mt-5">
                <Link to="/inversiones/simulador">Simular mi inversión <ArrowRight aria-hidden="true" /></Link>
              </Button>
            )}
          </div>

          <figure className="lg:order-2">
            <img
              src={assets.investmentImage ?? investmentImage}
              alt={landing.investmentImageAlt}
              className="aspect-[3/2] w-full rounded-xl object-cover"
              loading="lazy"
            />
            <figcaption className="mt-4 text-sm text-muted-foreground">{landing.investmentImageCaption}</figcaption>
          </figure>
        </div>
      </section>}

      {landing.processEnabled === 'true' && <section id="proceso" className="scroll-mt-24 bg-foreground px-5 py-16 text-background sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
            <h2 className="max-w-[22ch] text-3xl tracking-[-0.02em] sm:text-4xl">{landing.processTitle}</h2>
            <p className="max-w-[58ch] leading-7 text-background/80 lg:justify-self-end">
              {landing.processDescription}
            </p>
          </div>
          <ol className="mt-10 grid gap-8 border-t border-background/25 pt-8 md:grid-cols-3 md:gap-10">
            <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4">
              <span className="pt-1 text-sm font-medium text-brand-gold">01</span>
              <div><h3 className="text-xl">{landing.processStepOneTitle}</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-background/80">{landing.processStepOneDescription}</p></div>
            </li>
            <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4">
              <span className="pt-1 text-sm font-medium text-brand-gold">02</span>
              <div><h3 className="text-xl">{landing.processStepTwoTitle}</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-background/80">{landing.processStepTwoDescription}</p></div>
            </li>
            <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4">
              <span className="pt-1 text-sm font-medium text-brand-gold">03</span>
              <div><h3 className="text-xl">{landing.processStepThreeTitle}</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-background/80">{landing.processStepThreeDescription}</p></div>
            </li>
          </ol>
        </div>
      </section>}

      {landing.closingEnabled === 'true' && <section className="relative isolate overflow-hidden px-5 py-20 sm:px-8 lg:py-24">
        {decorativeIllustrationsVisible && <LandingAccent variant="access" className="absolute right-0 top-1/2 hidden -translate-y-1/2 2xl:block" />}
        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)] lg:items-center">
          <div className="max-w-2xl">
            <h2 className="max-w-[22ch] text-3xl tracking-[-0.02em] sm:text-4xl">
              {landing.closingTitle} <span className="text-brand-teal">{landing.closingHighlight}</span>
            </h2>
            <p className="mt-5 max-w-[62ch] leading-7 text-muted-foreground">
              {landingText(landing.closingDescription, institution.shortName, institution.description)}
            </p>
          </div>
          <div>
            <ul className="space-y-4 text-sm text-foreground">
              {[
                ...(creditVisible ? [landing.closingBulletOne] : []),
                ...(investmentVisible ? [landing.closingBulletTwo] : []),
                landing.closingBulletThree,
              ].map((bullet, index) => (
                <li key={index} className="flex items-center gap-3"><Check className="size-4 shrink-0 text-brand-teal" aria-hidden="true" />{bullet}</li>
              ))}
            </ul>
            <Button type="button" size="lg" variant="brand" className="mt-8 w-full sm:w-auto"
              disabled={authPending || checkingAccess} onClick={() => void openAccount()}>
              {checkingAccess ? 'Comprobando acceso…' : closingAccessLabel}
              {!checkingAccess && <ArrowRight aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </section>}
    </main>
  )
}
