import { api } from '@/lib/api'
import { type SegmentoCredito, type TipoCredito, type ProductoCredito, type TasaCredito } from '@/types'

export const creditosService = {
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
}
