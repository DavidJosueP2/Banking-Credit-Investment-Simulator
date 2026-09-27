import { useMutation } from '@tanstack/react-query'
import { HandCoins } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { simuladorService, type CapacidadPagoResponse } from '@/features/creditos/simulador/services/simulador.service'
import { messageFrom } from '@/features/identity-check/utils'
import { formatCurrency } from '@/lib/formatters'
import type { SistemaAmortizacion } from '@/types'

interface CapacidadPagoCardProps {
  productoId: number
  plazo: number
  sistema: SistemaAmortizacion
  cargosOpcionales: number[]
  anual: boolean
  onUsar: (resultado: CapacidadPagoResponse) => void
}

/** Calcula el monto que alcanza con la cuota que la persona puede pagar, con el plazo y sistema elegidos. */
export function CapacidadPagoCard({ productoId, plazo, sistema, cargosOpcionales, anual, onUsar }: CapacidadPagoCardProps) {
  const [abierta, setAbierta] = useState(false)
  const [cuota, setCuota] = useState('')
  const calcular = useMutation({ mutationFn: simuladorService.capacidadPago })
  const resultado = calcular.data
  const periodo = anual ? 'año' : 'mes'

  // Vive dentro del formulario del simulador: no puede ser otro <form>, así que calcula con su propio botón.
  function submit() {
    if (!cuota || Number(cuota) <= 0) return
    calcular.mutate({ productoId, cuotaDisponible: Number(cuota), plazo, sistema, cargosOpcionales })
  }

  if (!abierta) {
    return (
      <button type="button" onClick={() => setAbierta(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-brand-teal/40 px-3.5 py-2.5 text-left text-xs text-brand-teal hover:bg-brand-teal/5">
        <HandCoins className="size-4 shrink-0" aria-hidden="true" />
        <span><strong className="font-medium">¿Cuánto me prestan?</strong> Dinos cuánto puedes pagar por {anual ? 'año' : 'mes'} y te decimos el monto máximo.</span>
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand-teal/30 bg-brand-teal/5 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-medium text-foreground">
          <HandCoins className="size-4 text-brand-teal" aria-hidden="true" />¿Cuánto me prestan?
        </p>
        <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setAbierta(false)}>Cerrar</button>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="cuota-disponible" className="text-[11px] text-muted-foreground">Cuota que puedes pagar cada {periodo}</Label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs text-muted-foreground">$</span>
            <Input id="cuota-disponible" type="number" min="1" step="1" value={cuota}
              onChange={(e) => setCuota(e.target.value)} className="pl-7 text-xs"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }} />
          </div>
        </div>
        <Button type="button" size="sm" variant="brand" disabled={calcular.isPending || !cuota} onClick={submit}>
          {calcular.isPending ? 'Calculando…' : 'Calcular'}
        </Button>
      </div>
      <div className="space-y-1 text-[11px] leading-4 text-muted-foreground">
        <p>
          Es el cálculo al revés: en vez de elegir el monto y ver la cuota, eliges la cuota y te decimos el monto más alto
          que puedes pedir sin pasarte, con el seguro de desgravamen y los cobros incluidos.
        </p>
        <p>
          Se calcula con lo que tienes abajo: <strong className="font-medium text-foreground">{plazo} {anual ? 'años' : 'meses'}</strong>,
          sistema <strong className="font-medium text-foreground">{sistema === 'FRANCES' ? 'francés' : 'alemán'}</strong>. Si los cambias, vuelve a calcular.
        </p>
      </div>
      {calcular.isError && <p role="alert" className="text-[11px] text-destructive">{messageFrom(calcular.error, 'No pudimos calcularlo.')}</p>}
      {resultado && !calcular.isPending && (
        <div className="rounded-lg bg-card p-3 text-xs" aria-live="polite">
          <p className="text-muted-foreground">Te pueden prestar hasta</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(resultado.montoMaximo)}</p>
          <p className="mt-1 text-muted-foreground">
            Cuota más alta: {formatCurrency(resultado.cuotaMaxima)}.
            {resultado.limitadoPorProducto && ' Es el máximo que ofrece este tipo de crédito: tu cuota alcanzaría para más.'}
          </p>
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => onUsar(resultado)}>
            Usar este monto y ver la tabla
          </Button>
        </div>
      )}
    </div>
  )
}
