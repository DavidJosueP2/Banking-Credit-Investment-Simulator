import { api } from '@/lib/api'
import {
  type SimulacionResult,
  type SistemaAmortizacion,
  type SimulacionClienteRequest,
  type SimulacionClienteResponse,
} from '@/types'

export interface SimulacionRequest {
  productoId?: number
  monto: number
  plazoMeses: number
  tasaEfectiva: number
  sistema: SistemaAmortizacion
  tipoTasaUsada?: string
  incluirCargos?: boolean
  incluirSeguros?: boolean
  seguroDesgravamenPct?: number
  fechaDesembolso?: string
  segmentoBce?: string
}

const cleanUrl = (url: string) => url.startsWith('/api') ? url.substring(4) : url

export const simuladorService = {
  /**
   * Simulación simplificada para el Cliente / Usuario Normal
   * Endpoint: POST /api/simulador/calcular
   */
  calcularCliente: async (req: SimulacionClienteRequest): Promise<SimulacionClienteResponse> => {
    const { data } = await api.post<SimulacionClienteResponse>(cleanUrl('/api/simulador/calcular'), req)
    return data
  },

  /**
   * Simulación técnica / avanzada
   * Endpoint: POST /api/creditos/simular
   */
  simular: async (req: SimulacionRequest): Promise<SimulacionResult> => {
    const { data } = await api.post<SimulacionResult>(cleanUrl('/api/creditos/simular'), req)
    return data
  },
}
