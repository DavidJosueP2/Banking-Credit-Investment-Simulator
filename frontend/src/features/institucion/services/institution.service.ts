import { api } from '@/lib/api'
import { type InstitutionData } from '@/types'

export const institutionService = {
  get: async (): Promise<InstitutionData | null> => {
    try {
      const { data } = await api.get<InstitutionData>('/api/institucion')
      return data
    } catch {
      return null
    }
  },

  upsert: async (dto: Partial<InstitutionData>): Promise<InstitutionData> => {
    const { data } = await api.put<InstitutionData>('/api/institucion', dto)
    return data
  },

  updateLogo: async (logoUrl: string): Promise<InstitutionData> => {
    const { data } = await api.patch<InstitutionData>('/api/institucion/logo', null, {
      params: { logoUrl },
    })
    return data
  },
}
