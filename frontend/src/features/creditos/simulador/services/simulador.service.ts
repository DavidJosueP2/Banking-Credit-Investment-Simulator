import { api } from '@/lib/api'
import {
  type SimulacionResult,
  type SistemaAmortizacion,
  type SimulacionClienteRequest,
  type SimulacionClienteResponse,
  type EntidadCredito,
  type ProductoSimulador,
  type ReglaNormativa,
} from '@/types'

export interface CapacidadPagoRequest {
  productoId: number
  cuotaDisponible: number
  plazo: number
  sistema: SistemaAmortizacion
  cargosOpcionales?: number[]
}

export interface CapacidadPagoResponse {
  montoMaximo: number
  cuotaMaxima: number
  limitadoPorProducto: boolean
  simulacion: SimulacionClienteResponse
}

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
   * Catálogo dinámico de Tipos de Crédito configurados para el simulador de clientes.
   * Endpoint público: GET /api/public/creditos/activos
   */
  obtenerProductos: async (): Promise<ProductoSimulador[]> => {
    // Solo productos creados por los asesores y vigentes: no hay catálogo de respaldo estático.
    const { data } = await api.get<ProductoSimulador[]>(cleanUrl('/api/public/creditos/activos'))
    return Array.isArray(data) ? data : []
  },

  /**
   * Consulta de límites normativos vigentes (BCE / JPRFM)
   * Endpoint: GET /api/simulador/normativa/vigente
   */
  obtenerNormativaVigente: async (): Promise<ReglaNormativa[]> => {
    try {
      const { data } = await api.get<ReglaNormativa[]>(cleanUrl('/api/simulador/normativa/vigente'))
      return data || []
    } catch {
      return []
    }
  },

  /**
   * Catálogo de entidades legado
   * Endpoint: GET /api/simulador/entidades
   */
  obtenerEntidades: async (): Promise<EntidadCredito[]> => {
    try {
      const { data } = await api.get<EntidadCredito[]>(cleanUrl('/api/simulador/entidades'))
      return data
    } catch {
      return []
    }
  },

  /**
   * Simulación para el Cliente / Usuario Normal
   * Endpoint: POST /api/simulador/calcular
   */
  /** ¿Cuánto me prestan? Mayor monto cuya cuota más alta no supera la cuota disponible. */
  capacidadPago: async (req: CapacidadPagoRequest): Promise<CapacidadPagoResponse> => {
    const { data } = await api.post<CapacidadPagoResponse>(cleanUrl('/api/simulador/capacidad'), req)
    return data
  },

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
