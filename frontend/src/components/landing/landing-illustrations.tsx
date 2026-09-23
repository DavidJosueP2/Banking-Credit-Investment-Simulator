import leftIllustration from '@/assets/landing/brunexa-playful-left.svg'
import rightIllustration from '@/assets/landing/brunexa-playful-right.svg'
import accessAccent from '@/assets/landing/brunexa-access-accent.svg'
import perspectiveAccent from '@/assets/landing/brunexa-perspective-accent.svg'
import servicesAccent from '@/assets/landing/brunexa-services-accent.svg'
import { cn } from '@/lib/utils'

type HeroIllustrationProps = {
  side: 'left' | 'right'
}

export function HeroIllustration({ side }: HeroIllustrationProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none hidden h-full min-w-0 select-none items-center 2xl:flex',
        side === 'left' ? 'justify-start' : 'justify-end',
      )}
    >
      <img
        src={side === 'left' ? leftIllustration : rightIllustration}
        alt=""
        className="h-auto w-full max-w-[26.25rem] object-contain"
      />
    </div>
  )
}

const accentRegistry = {
  services: servicesAccent,
  perspective: perspectiveAccent,
  access: accessAccent,
}

type LandingAccentProps = {
  variant: keyof typeof accentRegistry
  className?: string
}

export function LandingAccent({ variant, className }: LandingAccentProps) {
  return (
    <img
      aria-hidden="true"
      src={accentRegistry[variant]}
      alt=""
      className={cn('pointer-events-none h-auto w-32 select-none object-contain', className)}
    />
  )
}
