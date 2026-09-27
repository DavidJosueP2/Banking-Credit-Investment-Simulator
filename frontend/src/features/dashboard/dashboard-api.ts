import { api } from '@/lib/api'

export interface Kpi {
  key: string
  label: string
  value: number
  format: 'COUNT' | 'CURRENCY'
  hint: string | null
  href: string | null
}

export interface DashboardSummary {
  kpis: Kpi[]
  applicationsByStatus: Record<string, number>
}

export async function getDashboardSummary() {
  return (await api.get<DashboardSummary>('/admin/dashboard')).data
}
