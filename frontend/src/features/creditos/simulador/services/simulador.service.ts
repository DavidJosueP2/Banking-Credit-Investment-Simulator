import { api } from '@/lib/api'
import { type SimulacionResult, type SistemaAmortizacion } from '@/types'

export interface SimulacionRequest {
  productoId?: number
  monto: number
  plazoMeses: number
  tasaEfectiva: number
  sistema: SistemaAmortizacion
  tipoTasaUsada?: string
}

export const simuladorService = {
  simular: async (req: SimulacionRequest): Promise<SimulacionResult> => {
    const { data } = await api.post<SimulacionResult>('/api/creditos/simular', req)
    return data
  },
}
