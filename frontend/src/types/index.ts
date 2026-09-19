// Tipos globales del sistema financiero

export interface InstitutionData {
  id: number
  nombre: string
  nombreComercial?: string
  ruc?: string
  logoUrl?: string
  direccion?: string
  telefono?: string
  email?: string
  sitioWeb?: string
  ciudad?: string
  provincia?: string
  descripcion?: string
  horarios?: string
  colorPrimario?: string
  colorSecundario?: string
  infoLegal?: string
  terminosCondiciones?: string
  politicaPrivacidad?: string
  activo: boolean
  actualizadoEn: string
}

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

export interface CuotaSimulacion {
  numeroCuota: number
  /** Fecha exacta de vencimiento de la cuota (ISO-8601) */
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
  /** Fecha de desembolso (ISO-8601) */
  fechaDesembolso?: string
  /** Tasa anual del seguro de desgravamen (%) */
  seguroDesgravamenPct?: number
  tablaCuotas: CuotaSimulacion[]
}

export type RolUsuario = 'ADMIN' | 'ASESOR' | 'CLIENTE'

export interface Usuario {
  id: number
  nombre: string
  apellido: string
  email: string
  rol: RolUsuario
}

export interface AuthResponse {
  token: string
  tipo: string
  usuarioId: number
  nombre: string
  apellido: string
  email: string
  rol: RolUsuario
}

export interface ApiError {
  message: string
  status: number
}
