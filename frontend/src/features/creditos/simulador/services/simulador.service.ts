import { api } from '@/lib/api'
import { type SimulacionResult, type SistemaAmortizacion } from '@/types'

export interface SimulacionRequest {
  productoId?: number
  monto: number
  plazoMeses: number
  tasaEfectiva: number
  sistema: SistemaAmortizacion
  tipoTasaUsada?: string
  incluirCargos?: boolean
  incluirSeguros?: boolean
  /** Tasa anual del seguro de desgravamen en %, ej: 0.0699 */
  seguroDesgravamenPct?: number
  /** Fecha de desembolso en formato ISO-8601, ej: "2025-10-01" */
  fechaDesembolso?: string
  /** Segmento BCE para auditoría */
  segmentoBce?: string
}

export const simuladorService = {
  simular: async (req: SimulacionRequest): Promise<SimulacionResult> => {
    const { data } = await api.post<SimulacionResult>('/api/creditos/simular', req)
    return data
  },
}
