export type {
  ApiError,
  ApiFieldError,
  PageRequest,
  PageResponse,
} from './api'

// ─── Tipos del Simulador de Créditos ─────────────────────────────────────────

export interface SegmentoCredito {
  id: number
  codigo: string
  nombre: string
  descripcion?: string
  orden: number
  activo: boolean
  creadoEn: string
  actualizadoEn: string
}

export interface TipoCredito {
  id: number
  segmentoId: number
  segmentoNombre: string
  segmentoCodigo: string
  nombre: string
  descripcion?: string
  orden: number
  activo: boolean
  creadoEn: string
}

export interface ProductoCredito {
  id: number
  tipoCreditoId: number
  tipoCreditoNombre: string
  segmentoId: number
  segmentoNombre: string
  nombre: string
  descripcion?: string
  plazoMinMeses: number
  plazoMaxMeses: number
  montoMin: number
  montoMax: number
  requiereGarante: boolean
  imagenUrl?: string
  orden: number
  activo: boolean
  creadoEn: string
}

export type TipoTasa =
  | 'REFERENTIAL'
  | 'MAXIMUM'
  | 'INSTITUTIONAL'
  | 'ADMIN_CONFIGURED'
  | 'MARKET_REFERENCE'
  | 'ACADEMIC'

export interface TasaCredito {
  id: number
  productoId?: number
  productoNombre?: string
  fuenteId?: number
  fuenteNombre?: string
  fuenteCodigo?: string
  tipoTasa: TipoTasa
  nombre?: string
  valor: number
  fechaVigencia: string
  fechaFin?: string
  segmentoBce?: string
  institucionRef?: string
  observacion?: string
  urlFuente?: string
  activo: boolean
  creadoEn: string
}

export type TipoCargo = 'FIJO' | 'PORCENTAJE'

export type TipoSeguro = 'DESGRAVAMEN' | 'INCENDIO' | 'ROBO' | 'VIDA' | 'OTRO'

export interface RangoCredito {
  id: number
  productoId: number
  productoNombre?: string
  tasaId?: number
  tasaValor?: number
  tasaNombre?: string
  montoMin: number
  montoMax: number
  plazoMinMeses: number
  plazoMaxMeses: number
  descripcion?: string
  activo: boolean
  creadoEn: string
}

export interface CargoCredito {
  id: number
  productoId: number
  productoNombre?: string
  nombre: string
  tipoCargo: TipoCargo
  valor: number
  obligatorio: boolean
  descripcion?: string
  activo: boolean
  creadoEn: string
}

export interface SeguroCredito {
  id: number
  productoId: number
  productoNombre?: string
  nombre: string
  tipoSeguro: TipoSeguro
  valorPorcentaje: number
  obligatorio: boolean
  descripcion?: string
  activo: boolean
  creadoEn: string
}

export type SistemaAmortizacion = 'FRANCES' | 'ALEMAN'

export interface CuotaCliente {
  numeroCuota: number
  saldoInicial: number
  capital: number
  interes: number
  desgravamen: number
  cargosIndirectos?: number
  cuotaTotal: number
  saldoFinal: number
}

export interface CargoIndirectoInfo {
  id?: number
  nombre: string
  tipoCargo: 'FIJO' | 'PORCENTAJE' | string
  valor: number
  periodicidad: 'MENSUAL' | 'UNICO' | string
  baseCalculo: 'SALDO_DEUDOR' | 'MONTO_SOLICITADO' | 'FIJO' | string
  normaAplicable?: string
  obligatorio?: boolean
}

export interface ProductoSimulador {
  id: number
  nombre: string
  descripcion?: string
  tasaNominal: number
  desgravamen: number
  montoMin: number
  montoMax: number
  plazoMin: number
  plazoMax: number
  unidadPlazo: 'MESES' | 'ANIOS' | string
  sistemasPermitidos: SistemaAmortizacion[]
  segmentoBce?: string
  cargosIndirectos?: CargoIndirectoInfo[]
}

export interface ReglaNormativa {
  id?: number
  segmento: string
  tipoParametro: string
  limite: number
  unidad: string
  fechaInicioVigencia: string
  fechaFinVigencia?: string
  normativa: string
  resolucion?: string
  organismo: string
}

export interface EntidadCredito {
  id: number
  nombre: string
  tipo: 'Banco' | 'Cooperativa' | string
  tasaNominal: number
  desgravamen: number
  montoMin?: number
  montoMax?: number
  plazoMinMeses?: number
  plazoMaxMeses?: number
  sistemasPermitidos?: string
}

export interface SimulacionClienteRequest {
  productoId: number
  costoTotal?: number
  monto: number
  frecuencia?: 'MENSUAL' | 'ANUAL'
  plazo: number
  sistema: SistemaAmortizacion
  entidadId?: number
  creditTypeId?: number
  entidad?: string
  usuario?: string
}

export interface SimulacionClienteResponse {
  productoId: number
  nombreProducto: string
  entidad: string
  segmentoBce: string
  costoTotal?: number
  monto: number
  frecuencia: string
  plazoMeses: number
  totalCuotas: number
  tasaInteresAnual: number
  tasaDesgravamenMensual: number
  sistema: SistemaAmortizacion
  cuotaPeriodica: number
  totalCapital: number
  totalIntereses: number
  totalDesgravamen: number
  totalCargosIndirectos?: number
  totalPagar: number
  unidadPlazo?: string
  tablaCuotas: CuotaCliente[]
  usuario?: string
}

export interface CuotaSimulacion {
  numeroCuota: number
  fechaVencimiento?: string
  saldoInicial: number
  capital: number
  interes: number
  seguro: number
  cargo: number
  cuotaTotal: number
  saldoFinal: number
}

export interface SimulacionResult {
  sistema: SistemaAmortizacion
  monto: number
  plazoMeses: number
  tasaEfectivaAnual: number
  tasaMensual: number
  cuotaMensual: number
  totalIntereses: number
  totalCargos: number
  totalSeguros: number
  totalPagar: number
  fechaDesembolso?: string
  seguroDesgravamenPct?: number
  tablaCuotas: CuotaSimulacion[]
}

export interface CargoConfiguracionDto {
  id?: number
  nombre: string
  tipoCargo: 'FIJO' | 'PORCENTAJE' | string
  valor: number
  periodicidad?: 'MENSUAL' | 'UNICO' | string
  baseCalculo?: 'SALDO_DEUDOR' | 'MONTO_SOLICITADO' | 'FIJO' | string
  normaAplicable?: string
  obligatorio?: boolean
}

export interface ConfigurarCreditoRequest {
  nombre: string
  entidad: string
  segmentoBce: string
  montoMin: number
  montoMax: number
  plazoMinMeses: number
  plazoMaxMeses: number
  tasaInteres: number
  tasaDesgravamenMensual: number
  sistemasPermitidos: SistemaAmortizacion[]
  descripcion?: string
  unidadPlazo?: string
  cargosIndirectos?: CargoConfiguracionDto[]
}

export interface ConfigurarCreditoResponse {
  id: number
  nombre: string
  entidad: string
  segmentoBce: string
  montoMin: number
  montoMax: number
  plazoMinMeses: number
  plazoMaxMeses: number
  tasaInteres: number
  tasaDesgravamenMensual: number
  sistemasPermitidos: SistemaAmortizacion[]
  descripcion?: string
  activo: boolean
  creadoEn: string
  unidadPlazo?: string
  cargosIndirectos?: CargoConfiguracionDto[]
}

