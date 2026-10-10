import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <h1 className="text-2xl tracking-tight text-balance text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 lg:shrink-0">{actions}</div>}
    </header>
  )
}
