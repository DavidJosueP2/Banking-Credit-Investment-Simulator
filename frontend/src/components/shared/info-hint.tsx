import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/** Muestra ayuda contextual al pulsar el icono con ratón, teclado o pantalla táctil. */
export function InfoHint({ label, children, id }: { label: string; children: ReactNode; id?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Info className="size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      {id && <span id={id} className="sr-only">{children}</span>}
      <PopoverContent className="max-w-[calc(100vw-2rem)] text-sm leading-relaxed" sideOffset={6}>
        {children}
      </PopoverContent>
    </Popover>
  )
}
