import { CircleAlert, CircleCheck, IdCard, ImageUp } from 'lucide-react'
import { useEffect, useId, useState, type DragEvent } from 'react'

import { cn } from '@/lib/utils'

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error'

interface DocumentScannerProps {
  label: string
  status: ScanStatus
  /** Mensajes que se alternan mientras el servidor analiza la imagen. */
  steps: string[]
  previewUrl: string | null
  error?: string
  disabled?: boolean
  onSelect: (file: File) => void
}

const accepted = ['image/jpeg', 'image/png']

function ScanOverlay({ steps }: { steps: string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((value) => Math.min(value + 1, steps.length - 1)), 850)
    return () => window.clearInterval(timer)
  }, [steps.length])

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="scan-grid absolute inset-0" />
      <div className="scan-beam absolute inset-x-0" />
      <span className="scan-corner left-3 top-3 origin-top-left rounded-tl-md border-l-2 border-t-2" />
      <span className="scan-corner right-3 top-3 origin-top-right rounded-tr-md border-r-2 border-t-2" />
      <span className="scan-corner bottom-3 left-3 origin-bottom-left rounded-bl-md border-b-2 border-l-2" />
      <span className="scan-corner bottom-3 right-3 origin-bottom-right rounded-br-md border-b-2 border-r-2" />
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 text-xs font-medium text-white">
        <span className="scan-dot size-1.5 shrink-0 rounded-full bg-brand-teal" />
        {steps[index]}
      </div>
    </div>
  )
}

export function DocumentScanner({
  label, status, steps, previewUrl, error, disabled: locked = false, onSelect,
}: DocumentScannerProps) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const disabled = locked || status === 'scanning'
  const showImage = previewUrl && status !== 'idle'

  function pick(file: File | undefined) {
    if (file && !disabled) onSelect(file)
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    const file = [...event.dataTransfer.files].find((candidate) => accepted.includes(candidate.type))
    pick(file)
  }

  return (
    <div className="min-w-0">
      <p className="text-sm font-medium">{label}</p>

      <label
        htmlFor={inputId}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        className={cn(
          'relative mt-2 block aspect-[1.586] overflow-hidden rounded-lg border transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40',
          !showImage && 'border-dashed bg-muted/40',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-brand-teal/60',
          dragging && 'border-brand-teal bg-brand-teal/5',
          status === 'done' && 'border-brand-teal',
          status === 'error' && 'border-destructive',
        )}
      >
        <input id={inputId} type="file" accept={accepted.join(',')} className="sr-only" disabled={disabled}
          onChange={(event) => { pick(event.target.files?.[0]); event.target.value = '' }} />

        {showImage ? (
          <img src={previewUrl} alt="" className={cn(
            'size-full object-cover transition-[filter] duration-500',
            status === 'scanning' && 'brightness-75 saturate-50',
          )} />
        ) : (
          <div className={cn('flex size-full flex-col items-center justify-center gap-3 p-4 text-center',
            locked && 'opacity-60')}>
            <IdCard className="size-9 text-muted-foreground" strokeWidth={1.4} aria-hidden />
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              <ImageUp className="size-4" aria-hidden /> Subir foto
            </span>
          </div>
        )}

        {status === 'scanning' && <ScanOverlay steps={steps} />}
        {status === 'done' && (
          <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-brand-teal text-brand-teal-foreground shadow">
            <CircleCheck className="size-4" aria-hidden />
            <span className="sr-only">{label} verificado</span>
          </span>
        )}
        {status === 'error' && (
          <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-destructive text-white shadow">
            <CircleAlert className="size-4" aria-hidden />
          </span>
        )}
      </label>

      <div className="mt-2 min-h-5 text-sm" aria-live="polite">
        {status === 'scanning' && <span className="sr-only">Analizando {label.toLowerCase()}…</span>}
        {status === 'error' && error && <p role="alert" className="text-destructive">{error}</p>}
        {(status === 'done' || status === 'error') && (
          <label htmlFor={inputId} className="mt-1 inline-block cursor-pointer text-brand-gold underline underline-offset-4 hover:text-foreground">
            Cambiar foto
          </label>
        )}
      </div>
    </div>
  )
}
