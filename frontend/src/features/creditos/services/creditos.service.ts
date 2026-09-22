import { api } from '@/lib/api'
import {
  type SegmentoCredito,
  type TipoCredito,
  type ProductoCredito,
  type TasaCredito,
  type RangoCredito,
  type CargoCredito,
  type SeguroCredito,
  type ConfigurarCreditoRequest,
  type ConfigurarCreditoResponse,
} from '@/types'

const cleanUrl = (url: string) => url.startsWith('/api') ? url.substring(4) : url

export const creditosService = {
  // ─── Configuración Asesor (BCE) ──────────────────────────────────────────
  configurarCredito: async (dto: ConfigurarCreditoRequest): Promise<ConfigurarCreditoResponse> => {
    const { data } = await api.post<ConfigurarCreditoResponse>(cleanUrl('/api/admin/creditos/configurar'), dto)
    return data
  },

  getConfigurados: async (): Promise<ConfigurarCreditoResponse[]> => {
    const { data } = await api.get<ConfigurarCreditoResponse[]>(cleanUrl('/api/admin/creditos/configurar'))
    return data
  },

  // ─── Segmentos ───────────────────────────────────────────────────────────
  getSegmentos: async (): Promise<SegmentoCredito[]> => {
    const { data } = await api.get<SegmentoCredito[]>('/api/creditos/segmentos')
    return data
  },
  createSegmento: async (dto: Partial<SegmentoCredito>): Promise<SegmentoCredito> => {
    const { data } = await api.post<SegmentoCredito>('/api/creditos/segmentos', dto)
    return data
  },
  updateSegmento: async (id: number, dto: Partial<SegmentoCredito>): Promise<SegmentoCredito> => {
    const { data } = await api.put<SegmentoCredito>(`/api/creditos/segmentos/${id}`, dto)
    return data
  },
  toggleSegmento: async (id: number): Promise<void> => {
    await api.patch(`/api/creditos/segmentos/${id}/toggle`)
  },

  // ─── Tipos ───────────────────────────────────────────────────────────────
  getTipos: async (segmentoId?: number): Promise<TipoCredito[]> => {
    const { data } = await api.get<TipoCredito[]>('/api/creditos/tipos', {
      params: segmentoId ? { segmentoId } : undefined,
    })
    return data
  },
  createTipo: async (dto: Partial<TipoCredito>): Promise<TipoCredito> => {
    const { data } = await api.post<TipoCredito>('/api/creditos/tipos', dto)
    return data
  },
  updateTipo: async (id: number, dto: Partial<TipoCredito>): Promise<TipoCredito> => {
    const { data } = await api.put<TipoCredito>(`/api/creditos/tipos/${id}`, dto)
    return data
  },
  toggleTipo: async (id: number): Promise<void> => {
    await api.patch(`/api/creditos/tipos/${id}/toggle`)
  },

  // ─── Productos ───────────────────────────────────────────────────────────
  getProductos: async (tipoId?: number): Promise<ProductoCredito[]> => {
    const { data } = await api.get<ProductoCredito[]>('/api/creditos/productos', {
      params: tipoId ? { tipoId } : undefined,
    })
    return data
  },
  createProducto: async (dto: Partial<ProductoCredito>): Promise<ProductoCredito> => {
    const { data } = await api.post<ProductoCredito>('/api/creditos/productos', dto)
    return data
  },
  updateProducto: async (id: number, dto: Partial<ProductoCredito>): Promise<ProductoCredito> => {
    const { data } = await api.put<ProductoCredito>(`/api/creditos/productos/${id}`, dto)
    return data
  },
  toggleProducto: async (id: number): Promise<void> => {
    await api.patch(`/api/creditos/productos/${id}/toggle`)
  },

  // ─── Tasas ───────────────────────────────────────────────────────────────
  getTasas: async (params?: { productoId?: number; tipoTasa?: string; globales?: boolean }): Promise<TasaCredito[]> => {
    const { data } = await api.get<TasaCredito[]>('/api/creditos/tasas', { params })
    return data
  },
  createTasa: async (dto: Partial<TasaCredito>): Promise<TasaCredito> => {
    const { data } = await api.post<TasaCredito>('/api/creditos/tasas', dto)
    return data
  },
  updateTasa: async (id: number, dto: Partial<TasaCredito>): Promise<TasaCredito> => {
    const { data } = await api.put<TasaCredito>(`/api/creditos/tasas/${id}`, dto)
    return data
  },
  toggleTasa: async (id: number): Promise<void> => {
    await api.patch(`/api/creditos/tasas/${id}/toggle`)
  },

  // ─── Rangos ──────────────────────────────────────────────────────────────
  getRangos: async (productoId?: number): Promise<RangoCredito[]> => {
    const { data } = await api.get<RangoCredito[]>('/api/creditos/rangos', {
      params: productoId ? { productoId } : undefined,
    })
    return data
  },
  createRango: async (dto: Partial<RangoCredito>): Promise<RangoCredito> => {
    const { data } = await api.post<RangoCredito>('/api/creditos/rangos', dto)
    return data
  },
  updateRango: async (id: number, dto: Partial<RangoCredito>): Promise<RangoCredito> => {
    const { data } = await api.put<RangoCredito>(`/api/creditos/rangos/${id}`, dto)
    return data
  },
  toggleRango: async (id: number): Promise<void> => {
    await api.patch(`/api/creditos/rangos/${id}/toggle`)
  },

  // ─── Cargos ──────────────────────────────────────────────────────────────
  getCargos: async (productoId?: number): Promise<CargoCredito[]> => {
    const { data } = await api.get<CargoCredito[]>('/api/creditos/cargos', {
      params: productoId ? { productoId } : undefined,
    })
    return data
  },
  createCargo: async (dto: Partial<CargoCredito>): Promise<CargoCredito> => {
    const { data } = await api.post<CargoCredito>('/api/creditos/cargos', dto)
    return data
  },
  updateCargo: async (id: number, dto: Partial<CargoCredito>): Promise<CargoCredito> => {
    const { data } = await api.put<CargoCredito>(`/api/creditos/cargos/${id}`, dto)
    return data
  },
  toggleCargo: async (id: number): Promise<void> => {
    await api.patch(`/api/creditos/cargos/${id}/toggle`)
  },

  // ─── Seguros ─────────────────────────────────────────────────────────────
  getSeguros: async (productoId?: number): Promise<SeguroCredito[]> => {
    const { data } = await api.get<SeguroCredito[]>('/api/creditos/seguros', {
      params: productoId ? { productoId } : undefined,
    })
    return data
  },
  createSeguro: async (dto: Partial<SeguroCredito>): Promise<SeguroCredito> => {
    const { data } = await api.post<SeguroCredito>('/api/creditos/seguros', dto)
    return data
  },
  updateSeguro: async (id: number, dto: Partial<SeguroCredito>): Promise<SeguroCredito> => {
    const { data } = await api.put<SeguroCredito>(`/api/creditos/seguros/${id}`, dto)
    return data
  },
  toggleSeguro: async (id: number): Promise<void> => {
    await api.patch(`/api/creditos/seguros/${id}/toggle`)
  },
}
