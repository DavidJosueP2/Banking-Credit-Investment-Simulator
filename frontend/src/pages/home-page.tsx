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
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import creditImage from '@/assets/landing/brunexa-creditos.png'
import investmentImage from '@/assets/landing/brunexa-inversiones.png'
import carouselCommunityImage from '@/assets/landing/carrusel/brooke-cagle--uHVRvDr7pg-unsplash.jpg'
import carouselIdentityImage from '@/assets/landing/carrusel/debashis-rc-biswas-dyPFnxxUhYk-unsplash.jpg'
import carouselPerspectiveImage from '@/assets/landing/carrusel/zalfa-imani-1xp5VxvyKL0-unsplash.jpg'
import { useAuth } from '@/app/providers/auth-provider'
import { useInstitutionSettings } from '@/app/providers/settings-provider'
import { BrandLogo } from '@/components/shared/brand-logo'
import { Button } from '@/components/ui/button'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

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
  const creditVisible = credit.moduleEnabled === 'true'
  const investmentVisible = investment.moduleEnabled === 'true'
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [checkingAccess, setCheckingAccess] = useState(false)
  const carouselSlides = [
    {
      id: 'brunexa',
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
    if (!carouselApi) return

    const updateCurrentSlide = () => setCurrentSlide(carouselApi.selectedScrollSnap())
    updateCurrentSlide()
    carouselApi.on('select', updateCurrentSlide)
    carouselApi.on('reInit', updateCurrentSlide)

    return () => {
      carouselApi.off('select', updateCurrentSlide)
      carouselApi.off('reInit', updateCurrentSlide)
    }
  }, [carouselApi])

  useEffect(() => {
    if (landing.bannerEnabled !== 'true' || !carouselApi || carouselSlides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = window.setTimeout(() => carouselApi.scrollNext(), Number(landing.bannerIntervalSeconds) * 1_000)
    return () => window.clearTimeout(timer)
  }, [carouselApi, carouselSlides.length, currentSlide, landing.bannerEnabled, landing.bannerIntervalSeconds])

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
      <section className="bg-muted/25 px-5 py-16 sm:px-8 sm:py-20 lg:py-24" aria-labelledby="landing-intro-title">
        <div className="mx-auto max-w-5xl text-center">
          <BrandLogo variant="mark" className="mx-auto mb-8 size-20 sm:size-24" />
          <h1 id="landing-intro-title" className="mx-auto max-w-[18ch] text-4xl font-bold leading-[1.12] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            {landing.heroTitle} <span className="text-brand-teal">{landing.heroHighlight}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[68ch] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
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
      </section>

      {landing.bannerEnabled === 'true' && <section>
        <Carousel
          opts={{ loop: true }}
          setApi={setCarouselApi}
          className="w-full"
          aria-label="Destacados de Brunexa">
          <CarouselContent className="ml-0">
            {carouselSlides.map((slide, index) => (
              <CarouselItem key={slide.id} className="pl-0">
                <article className="relative min-h-92 overflow-hidden bg-primary sm:min-h-96 lg:min-h-100">
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
                          <a href={slide.href}>{slide.action} <ArrowRight aria-hidden="true" /></a>
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              </CarouselItem>
            ))}
          </CarouselContent>

          {carouselSlides.length > 1 && (
            <>
              <CarouselPrevious
                aria-label="Ver destacado anterior"
                className="left-3 border-white/35 bg-black/35 text-white shadow-none hover:bg-black/55 hover:text-white sm:left-5" />
              <CarouselNext
                aria-label="Ver siguiente destacado"
                className="right-3 border-white/35 bg-black/35 text-white shadow-none hover:bg-black/55 hover:text-white sm:right-5" />
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2" aria-label="Seleccionar destacado">
                {carouselSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => carouselApi?.scrollTo(index)}
                    className={`h-1.5 rounded-full transition-[width,background-color] ${currentSlide === index ? 'w-7 bg-brand-gold' : 'w-2.5 bg-white/65 hover:bg-white'}`}
                    aria-label={`Ver destacado ${index + 1}`}
                    aria-current={currentSlide === index ? 'true' : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </Carousel>
      </section>}

      {landing.servicesEnabled === 'true' && visibleServices.length > 0 && <section id="servicios" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-24">
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

      {landing.perspectiveEnabled === 'true' && (creditVisible || investmentVisible) && (
        <section className="bg-muted/30 px-5 py-16 sm:px-8 lg:py-20" aria-labelledby="landing-perspective-title">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
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

      {creditVisible && <section id="creditos" className="scroll-mt-24 border-t bg-muted/40 px-5 py-20 sm:px-8 lg:py-28">
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

      {investmentVisible && <section id="inversiones" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="max-w-xl lg:order-1">
            <InvestmentSectionIcon className="size-7 text-brand-gold" aria-hidden="true" />
            <h2 className="mt-6 text-3xl tracking-tight sm:text-4xl">{landing.investmentTitle}</h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              {landing.investmentDescription} {landing.investmentDetail}
            </p>
            <div className="mt-8 divide-y border-y">
              <div className="flex gap-4 py-5">
                <InvestmentFeatureOneIcon className="mt-0.5 size-5 shrink-0 text-brand-teal" aria-hidden="true" />
                <div><h3 className="text-base">{landing.investmentFeatureOneTitle}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{landing.investmentFeatureOneDescription}</p></div>
              </div>
              <div className="flex gap-4 py-5">
                <InvestmentFeatureTwoIcon className="mt-0.5 size-5 shrink-0 text-brand-teal" aria-hidden="true" />
                <div><h3 className="text-base">{landing.investmentFeatureTwoTitle}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{landing.investmentFeatureTwoDescription}</p></div>
              </div>
            </div>
            <p className="mt-8 text-sm font-medium text-brand-gold">{landing.investmentStatusLabel}</p>
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

      {landing.closingEnabled === 'true' && <section className="px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)] lg:items-center">
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
