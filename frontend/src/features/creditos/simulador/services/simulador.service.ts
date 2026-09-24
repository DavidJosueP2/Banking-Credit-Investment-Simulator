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

// ─── Catálogo de Respaldo por defecto (Normativa Oficial BCE 2026) ───────────
export const PRODUCTOS_FALLBACK: ProductoSimulador[] = [
  {
    id: 1,
    nombre: 'Crédito de Consumo',
    descripcion: 'Financiamiento personal y adquisición de bienes y servicios para personas naturales',
    tasaNominal: 15.50,
    desgravamen: 0.0550,
    montoMin: 500,
    montoMax: 30000,
    plazoMin: 6,
    plazoMax: 60,
    unidadPlazo: 'MESES',
    sistemasPermitidos: ['FRANCES', 'ALEMAN'],
    segmentoBce: 'Consumo Prioritario',
    cargosIndirectos: [
      {
        nombre: 'Gastos de Instrumentación Notarial',
        tipoCargo: 'FIJO',
        valor: 15.00,
        periodicidad: 'UNICO',
        baseCalculo: 'FIJO',
        normaAplicable: 'Resolución SB-2025-010',
        obligatorio: false,
      },
    ],
  },
  {
    id: 2,
    nombre: 'Microcrédito Minorista',
    descripcion: 'Crédito ágil para microempresarios, talleres y emprendimientos comerciales',
    tasaNominal: 22.00,
    desgravamen: 0.0700,
    montoMin: 300,
    montoMax: 3000,
    plazoMin: 3,
    plazoMax: 36,
    unidadPlazo: 'MESES',
    sistemasPermitidos: ['FRANCES', 'ALEMAN'],
    segmentoBce: 'Microcrédito Minorista',
    cargosIndirectos: [],
  },
  {
    id: 3,
    nombre: 'Crédito Vivienda VIP',
    descripcion: 'Financiamiento hipotecario con tasa subsidiada del 4.99% para primera vivienda',
    tasaNominal: 4.99,
    desgravamen: 0.0250,
    montoMin: 20000,
    montoMax: 105000,
    plazoMin: 5,
    plazoMax: 25,
    unidadPlazo: 'ANIOS',
    sistemasPermitidos: ['FRANCES', 'ALEMAN'],
    segmentoBce: 'Vivienda de Interés Público (VIP)',
    cargosIndirectos: [
      {
        nombre: 'Seguro de Incendio y Terremoto',
        tipoCargo: 'PORCENTAJE',
        valor: 0.0200,
        periodicidad: 'MENSUAL',
        baseCalculo: 'SALDO_DEUDOR',
        normaAplicable: 'Normativa SB Seguros Hipotecarios',
        obligatorio: true,
      },
    ],
  },
  {
    id: 4,
    nombre: 'Crédito Productivo PYMES',
    descripcion: 'Capital de trabajo, inventario y adquisición de activos fijos para pequeñas y medianas empresas',
    tasaNominal: 11.50,
    desgravamen: 0.0300,
    montoMin: 5000,
    montoMax: 500000,
    plazoMin: 12,
    plazoMax: 60,
    unidadPlazo: 'MESES',
    sistemasPermitidos: ['FRANCES', 'ALEMAN'],
    segmentoBce: 'Productivo PYMES',
    cargosIndirectos: [],
  },
  {
    id: 5,
    nombre: 'Crédito Educativo Superior',
    descripcion: 'Financiamiento para estudios universitarios de pregrado y posgrado nacional e internacional',
    tasaNominal: 9.00,
    desgravamen: 0.0300,
    montoMin: 1000,
    montoMax: 20000,
    plazoMin: 12,
    plazoMax: 84,
    unidadPlazo: 'MESES',
    sistemasPermitidos: ['FRANCES'],
    segmentoBce: 'Educativo',
    cargosIndirectos: [],
  },
]

export const simuladorService = {
  /**
   * Catálogo dinámico de Tipos de Crédito configurados para el simulador de clientes.
   * Endpoint público: GET /api/public/creditos/activos
   */
  obtenerProductos: async (): Promise<ProductoSimulador[]> => {
    try {
      const { data } = await api.get<ProductoSimulador[]>(cleanUrl('/api/public/creditos/activos'))
      if (Array.isArray(data) && data.length > 0) {
        return data
      }
      const fallbackResp = await api.get<ProductoSimulador[]>(cleanUrl('/api/simulador/productos'))
      if (Array.isArray(fallbackResp.data) && fallbackResp.data.length > 0) {
        return fallbackResp.data
      }
      return PRODUCTOS_FALLBACK
    } catch {
      try {
        const { data } = await api.get<ProductoSimulador[]>(cleanUrl('/api/simulador/productos'))
        if (Array.isArray(data) && data.length > 0) return data
      } catch {}
      return PRODUCTOS_FALLBACK
    }
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
