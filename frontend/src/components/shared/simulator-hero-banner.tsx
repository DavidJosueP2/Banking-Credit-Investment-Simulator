import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface SimulatorHeroBannerProps {
  breadcrumbs: BreadcrumbItem[]
  title: string
  description: string
  imageSrc: string
  imageAlt: string
  accentBadge?: string
}

export function SimulatorHeroBanner({
  breadcrumbs,
  title,
  description,
  imageSrc,
  imageAlt,
  accentBadge,
}: SimulatorHeroBannerProps) {
  return (
    <section
      className="relative w-full border-b border-brand-teal/25 bg-brand-teal/15 dark:border-brand-teal/20 dark:bg-brand-teal/10 overflow-hidden"
      aria-label={title}
    >
      <div className="mx-auto flex max-w-7xl flex-col justify-between px-5 pt-7 sm:px-8 sm:pt-9 md:flex-row md:items-end md:gap-8 lg:gap-12">
        {/* Left Column: Breadcrumbs, Title, Subtitle */}
        <div className="max-w-2xl pb-6 sm:pb-8 md:pb-10 pt-1">
          {/* Breadcrumb trail */}
          <nav aria-label="Miga de pan" className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <div key={idx} className="flex items-center gap-2">
                  {idx > 0 && <span className="text-muted-foreground/40 text-[11px]" aria-hidden="true">/</span>}
                  {crumb.href && !isLast ? (
                    <Link
                      to={crumb.href}
                      className="transition-colors hover:text-brand-teal hover:underline"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'font-semibold text-foreground' : undefined}>
                      {crumb.label}
                    </span>
                  )}
                </div>
              )
            })}
          </nav>

          {accentBadge && (
            <span className="mb-3 inline-block rounded-full bg-brand-teal/15 px-3 py-1 text-xs font-medium text-brand-teal border border-brand-teal/30">
              {accentBadge}
            </span>
          )}

          <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem] lg:leading-[1.15]">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>

        {/* Right Column: Person Cut-out Image */}
        <div className="flex shrink-0 justify-center self-end md:justify-end">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="h-44 sm:h-52 md:h-60 lg:h-68 w-auto object-contain object-bottom drop-shadow-xs select-none pointer-events-none"
            loading="eager"
          />
        </div>
      </div>
    </section>
  )
}
