import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react'
import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type ExportFormat = 'pdf' | 'excel'

interface DownloadMenuProps {
  onSelect: (format: ExportFormat) => void
  /** Formato que se está generando; deshabilita el menú mientras tanto. */
  pending?: ExportFormat | null
  label?: string
  variant?: ComponentProps<typeof Button>['variant']
  size?: ComponentProps<typeof Button>['size']
  className?: string
}

/** Un solo botón "Descargar" que deja elegir el formato: PDF o Excel. */
export function DownloadMenu({ onSelect, pending = null, label = 'Descargar', variant = 'outline', size = 'sm', className }: DownloadMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={variant} size={size} disabled={pending !== null} className={className}>
          <Download className="size-4" aria-hidden="true" />
          {pending ? `Generando ${pending === 'pdf' ? 'PDF' : 'Excel'}…` : label}
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => onSelect('pdf')}>
          <FileText aria-hidden="true" />PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect('excel')}>
          <FileSpreadsheet aria-hidden="true" />Excel (.xlsx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
