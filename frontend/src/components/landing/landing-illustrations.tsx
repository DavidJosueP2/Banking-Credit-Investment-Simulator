import leftIllustration from '@/assets/landing/brunexa-playful-left.svg'
import rightIllustration from '@/assets/landing/brunexa-playful-right.svg'
import { cn } from '@/lib/utils'

export function HeroIllustrations() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden select-none overflow-hidden min-[1450px]:block"
    >
      <img
        src={leftIllustration}
        alt=""
        className="absolute left-[-3.5rem] top-1/2 h-[25rem] w-auto -translate-y-1/2 2xl:left-[1.5vw] 2xl:h-[29rem] dark:opacity-80"
      />
      <img
        src={rightIllustration}
        alt=""
        className="absolute right-[-2.5rem] top-1/2 h-[25rem] w-auto -translate-y-1/2 2xl:right-[1.5vw] 2xl:h-[29rem] dark:opacity-80"
      />
    </div>
  )
}

type LandingCharacterProps = {
  variant: 'green' | 'coin' | 'orange'
  className?: string
}

export function LandingCharacter({ variant, className }: LandingCharacterProps) {
  const isGreen = variant === 'green'

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none size-36 select-none overflow-hidden',
        className,
      )}
    >
      <img
        src={isGreen ? leftIllustration : rightIllustration}
        alt=""
        className={cn(
          'relative max-w-none dark:opacity-80',
          isGreen && '-left-14 -top-25 w-[22rem]',
          variant === 'coin' && '-left-17 -top-79 w-[22rem]',
          variant === 'orange' && '-left-29 -top-26 w-[22rem]',
        )}
      />
    </div>
  )
}
