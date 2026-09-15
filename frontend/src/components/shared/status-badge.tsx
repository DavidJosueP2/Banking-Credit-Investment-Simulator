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
          'border-emerald-200 bg-emerald-50 text-emerald-800 [&_[data-slot=status-dot]]:bg-emerald-600 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
        warning:
          'border-amber-200 bg-amber-50 text-amber-800 [&_[data-slot=status-dot]]:bg-amber-600 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
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
