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

  cambiarEstado: async (id: number, active: boolean): Promise<ConfigurarCreditoResponse> => {
    const { data } = await api.patch<ConfigurarCreditoResponse>(cleanUrl(`/api/admin/creditos/${id}/estado`), { active })
    return data
  },

  // ─── Segmentos ───────────────────────────────────────────────────────────
  getSegmentos: async (): Promise<SegmentoCredito[]> => {
    const { data } = await api.get<SegmentoCredito[]>(cleanUrl('/api/creditos/segmentos'))
    return data
  },
  createSegmento: async (dto: Partial<SegmentoCredito>): Promise<SegmentoCredito> => {
    const { data } = await api.post<SegmentoCredito>(cleanUrl('/api/creditos/segmentos'), dto)
    return data
  },
  updateSegmento: async (id: number, dto: Partial<SegmentoCredito>): Promise<SegmentoCredito> => {
    const { data } = await api.put<SegmentoCredito>(cleanUrl(`/api/creditos/segmentos/${id}`), dto)
    return data
  },
  toggleSegmento: async (id: number): Promise<void> => {
    await api.patch(cleanUrl(`/api/creditos/segmentos/${id}/toggle`))
  },

  // ─── Tipos ───────────────────────────────────────────────────────────────
  getTipos: async (segmentoId?: number): Promise<TipoCredito[]> => {
    const { data } = await api.get<TipoCredito[]>(cleanUrl('/api/creditos/tipos'), {
      params: segmentoId ? { segmentoId } : undefined,
    })
    return data
  },
  createTipo: async (dto: Partial<TipoCredito>): Promise<TipoCredito> => {
    const { data } = await api.post<TipoCredito>(cleanUrl('/api/creditos/tipos'), dto)
    return data
  },
  updateTipo: async (id: number, dto: Partial<TipoCredito>): Promise<TipoCredito> => {
    const { data } = await api.put<TipoCredito>(cleanUrl(`/api/creditos/tipos/${id}`), dto)
    return data
  },
  toggleTipo: async (id: number): Promise<void> => {
    await api.patch(cleanUrl(`/api/creditos/tipos/${id}/toggle`))
  },

  // ─── Productos ───────────────────────────────────────────────────────────
  getProductos: async (tipoId?: number): Promise<ProductoCredito[]> => {
    const { data } = await api.get<ProductoCredito[]>(cleanUrl('/api/creditos/productos'), {
      params: tipoId ? { tipoId } : undefined,
    })
    return data
  },
  createProducto: async (dto: Partial<ProductoCredito>): Promise<ProductoCredito> => {
    const { data } = await api.post<ProductoCredito>(cleanUrl('/api/creditos/productos'), dto)
    return data
  },
  updateProducto: async (id: number, dto: Partial<ProductoCredito>): Promise<ProductoCredito> => {
    const { data } = await api.put<ProductoCredito>(cleanUrl(`/api/creditos/productos/${id}`), dto)
    return data
  },
  toggleProducto: async (id: number): Promise<void> => {
    await api.patch(cleanUrl(`/api/creditos/productos/${id}/toggle`))
  },

  // ─── Tasas ───────────────────────────────────────────────────────────────
  getTasas: async (params?: { productoId?: number; tipoTasa?: string; globales?: boolean }): Promise<TasaCredito[]> => {
    const { data } = await api.get<TasaCredito[]>(cleanUrl('/api/creditos/tasas'), { params })
    return data
  },
  createTasa: async (dto: Partial<TasaCredito>): Promise<TasaCredito> => {
    const { data } = await api.post<TasaCredito>(cleanUrl('/api/creditos/tasas'), dto)
    return data
  },
  updateTasa: async (id: number, dto: Partial<TasaCredito>): Promise<TasaCredito> => {
    const { data } = await api.put<TasaCredito>(cleanUrl(`/api/creditos/tasas/${id}`), dto)
    return data
  },
  toggleTasa: async (id: number): Promise<void> => {
    await api.patch(cleanUrl(`/api/creditos/tasas/${id}/toggle`))
  },

  // ─── Rangos ──────────────────────────────────────────────────────────────
  getRangos: async (productoId?: number): Promise<RangoCredito[]> => {
    const { data } = await api.get<RangoCredito[]>(cleanUrl('/api/creditos/rangos'), {
      params: productoId ? { productoId } : undefined,
    })
    return data
  },
  createRango: async (dto: Partial<RangoCredito>): Promise<RangoCredito> => {
    const { data } = await api.post<RangoCredito>(cleanUrl('/api/creditos/rangos'), dto)
    return data
  },
  updateRango: async (id: number, dto: Partial<RangoCredito>): Promise<RangoCredito> => {
    const { data } = await api.put<RangoCredito>(cleanUrl(`/api/creditos/rangos/${id}`), dto)
    return data
  },
  toggleRango: async (id: number): Promise<void> => {
    await api.patch(cleanUrl(`/api/creditos/rangos/${id}/toggle`))
  },

  // ─── Cargos ──────────────────────────────────────────────────────────────
  getCargos: async (productoId?: number): Promise<CargoCredito[]> => {
    const { data } = await api.get<CargoCredito[]>(cleanUrl('/api/creditos/cargos'), {
      params: productoId ? { productoId } : undefined,
    })
    return data
  },
  createCargo: async (dto: Partial<CargoCredito>): Promise<CargoCredito> => {
    const { data } = await api.post<CargoCredito>(cleanUrl('/api/creditos/cargos'), dto)
    return data
  },
  updateCargo: async (id: number, dto: Partial<CargoCredito>): Promise<CargoCredito> => {
    const { data } = await api.put<CargoCredito>(cleanUrl(`/api/creditos/cargos/${id}`), dto)
    return data
  },
  toggleCargo: async (id: number): Promise<void> => {
    await api.patch(cleanUrl(`/api/creditos/cargos/${id}/toggle`))
  },

  // ─── Seguros ─────────────────────────────────────────────────────────────
  getSeguros: async (productoId?: number): Promise<SeguroCredito[]> => {
    const { data } = await api.get<SeguroCredito[]>(cleanUrl('/api/creditos/seguros'), {
      params: productoId ? { productoId } : undefined,
    })
    return data
  },
  createSeguro: async (dto: Partial<SeguroCredito>): Promise<SeguroCredito> => {
    const { data } = await api.post<SeguroCredito>(cleanUrl('/api/creditos/seguros'), dto)
    return data
  },
  updateSeguro: async (id: number, dto: Partial<SeguroCredito>): Promise<SeguroCredito> => {
    const { data } = await api.put<SeguroCredito>(cleanUrl(`/api/creditos/seguros/${id}`), dto)
    return data
  },
  toggleSeguro: async (id: number): Promise<void> => {
    await api.patch(cleanUrl(`/api/creditos/seguros/${id}/toggle`))
  },
}
