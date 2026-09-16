import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusBadgeVariants = cva(
  'gap-1.5 border font-medium [&_[data-slot=status-dot]]:size-1.5 [&_[data-slot=status-dot]]:rounded-full',
  {
    variants: {
      tone: {
        neutral:
          'border-border bg-muted text-muted-foreground [&_[data-slot=status-dot]]:bg-muted-foreground',
        success:
          'border-brand-teal/30 bg-accent text-accent-foreground [&_[data-slot=status-dot]]:bg-brand-teal',
        warning:
          'border-brand-gold/30 bg-secondary text-secondary-foreground [&_[data-slot=status-dot]]:bg-brand-gold',
        danger:
          'border-red-200 bg-red-50 text-red-800 [&_[data-slot=status-dot]]:bg-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
        info: 'border-sky-200 bg-sky-50 text-sky-800 [&_[data-slot=status-dot]]:bg-sky-600 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
)

interface StatusBadgeProps
  extends React.ComponentProps<typeof Badge>,
    VariantProps<typeof statusBadgeVariants> {
  showDot?: boolean
}

export function StatusBadge({
  tone,
  showDot = true,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(statusBadgeVariants({ tone }), className)}
      {...props}
    >
      {showDot && <span data-slot="status-dot" aria-hidden="true" />}
      {children}
    </Badge>
  )
}
