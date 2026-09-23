import type { PropsWithChildren } from 'react'

import { useInstitutionSettings } from '@/app/providers/settings-provider'
import leftIllustration from '@/assets/landing/brunexa-login-left.svg'
import rightIllustration from '@/assets/landing/brunexa-login-right.svg'
import { cn } from '@/lib/utils'

type IllustratedAccessLayoutProps = PropsWithChildren<{
  contentClassName?: string
}>

export function IllustratedAccessLayout({ children, contentClassName }: IllustratedAccessLayoutProps) {
  const { settings } = useInstitutionSettings()
  const illustrationsVisible = settings.landing.decorativeIllustrationsEnabled === 'true'

  return (
    <main
      id="contenido"
      className={cn(
        'grid min-h-[calc(100svh-7.5rem)] w-full overflow-hidden md:min-h-[calc(100svh-4.5rem)]',
        illustrationsVisible
          ? '2xl:grid-cols-[minmax(15rem,1fr)_minmax(0,34rem)_minmax(15rem,1fr)]'
          : 'place-items-center',
      )}
    >
      {illustrationsVisible && (
        <div aria-hidden="true" className="hidden items-center justify-start 2xl:flex">
          <img
            src={leftIllustration}
            alt=""
            className="h-auto w-full max-w-[26rem] -translate-x-8 select-none object-contain"
          />
        </div>
      )}

      <div
        className={cn(
          'relative z-10 flex w-full items-center px-5 py-14 sm:px-8 lg:py-20',
          illustrationsVisible && '2xl:col-start-2',
          contentClassName,
        )}
      >
        {children}
      </div>

      {illustrationsVisible && (
        <div aria-hidden="true" className="hidden items-center justify-end 2xl:flex">
          <img
            src={rightIllustration}
            alt=""
            className="h-auto w-full max-w-[25rem] translate-x-8 select-none object-contain"
          />
        </div>
      )}
    </main>
  )
}
