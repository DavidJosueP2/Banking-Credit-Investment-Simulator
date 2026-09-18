import { useQuery } from '@tanstack/react-query'
import { institutionService } from '../services/institution.service'

export function useInstitution() {
  return useQuery({
    queryKey: ['institution'],
    queryFn: institutionService.get,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}
