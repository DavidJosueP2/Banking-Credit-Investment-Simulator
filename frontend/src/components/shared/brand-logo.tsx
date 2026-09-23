import fullDark from '@/assets/bank/Full-dark-mode.png'
import fullLight from '@/assets/bank/Full.png'
import markDark from '@/assets/bank/logo-dark-mode.png'
import markLight from '@/assets/bank/logo.png'
import { useInstitutionSettings } from '@/app/providers/settings-provider'
import { cn } from '@/lib/utils'

interface BrandLogoProps {
  variant?: 'full' | 'mark'
  className?: string
  decorative?: boolean
}

export function BrandLogo({
  variant = 'full',
  className,
  decorative = false,
}: BrandLogoProps) {
  const { assets, settings } = useInstitutionSettings()
  const isFull = variant === 'full'
  const alt = decorative ? '' : isFull ? settings.institution.institutionName : settings.institution.shortName
  const lightSource = isFull ? assets.fullLogoLight ?? fullLight : assets.markLogoLight ?? markLight
  const darkSource = isFull ? assets.fullLogoDark ?? fullDark : assets.markLogoDark ?? markDark

  return (
    <span className={cn('relative block shrink-0', className)}>
      <img
        src={lightSource}
        alt={alt}
        className="h-full w-full object-contain dark:hidden"
      />
      <img
        src={darkSource}
        alt={alt}
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  )
}
