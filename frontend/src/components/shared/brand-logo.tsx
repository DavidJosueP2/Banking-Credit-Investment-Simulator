import fullDark from '@/assets/bank/Full-dark-mode.png'
import fullLight from '@/assets/bank/Full.png'
import markDark from '@/assets/bank/logo-dark-mode.png'
import markLight from '@/assets/bank/logo.png'
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
  const isFull = variant === 'full'
  const alt = decorative ? '' : isFull ? 'Brunexa Bank' : 'Brunexa'

  return (
    <span className={cn('relative block shrink-0', className)}>
      <img
        src={isFull ? fullLight : markLight}
        alt={alt}
        className="h-full w-full object-contain dark:hidden"
      />
      <img
        src={isFull ? fullDark : markDark}
        alt={alt}
        className={cn(
          'hidden h-full w-full object-contain dark:block',
          isFull && 'dark:scale-[1.6]',
        )}
      />
    </span>
  )
}
