import { api } from '@/lib/api'

export type PayoutFrequency = 'AT_MATURITY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUAL'

export interface InvestmentRate {
  id?: number
  label: string
  minimumAmount: number
  maximumAmount: number
  minimumTermDays: number
  maximumTermDays: number
  annualRate: number
  position?: number
}

export interface InvestmentProduct {
  id: number
  name: string
  description: string
  currency: string
  minimumAmount: number
  maximumAmount: number
  minimumTermDays: number
  maximumTermDays: number
  payoutFrequency: PayoutFrequency
  dayCountBasis: 360 | 365
  withholdingRate: number
  active: boolean
  createdAt: string
  updatedAt: string
  rates: InvestmentRate[]
}

export interface InvestmentProductInput {
  name: string
  description: string
  minimumAmount: number
  maximumAmount: number
  minimumTermDays: number
  maximumTermDays: number
  payoutFrequency: PayoutFrequency
  dayCountBasis: 360 | 365
  withholdingRate: number
  active: boolean
  rates: InvestmentRate[]
}

export interface SimulationRequest {
  productId: number
  amount: number
  termDays: number
}

export interface InvestmentPayment {
  number: number
  paymentDate: string
  periodDays: number
  grossInterest: number
  withholding: number
  netInterest: number
  capital: number
  totalPayment: number
}

export interface SimulationResult {
  reference: string
  simulationDate: string
  productId: number
  productName: string
  currency: string
  amount: number
  termDays: number
  rateLabel: string
  annualRate: number
  payoutFrequency: PayoutFrequency
  dayCountBasis: number
  withholdingRate: number
  grossInterest: number
  withholding: number
  netInterest: number
  maturityValue: number
  maturityDate: string
  payments: InvestmentPayment[]
}

export const investmentKeys = {
  publicProducts: ['public', 'investment-products'] as const,
  adminProducts: ['admin', 'investment-products'] as const,
}

export async function getPublicInvestmentProducts() {
  return (await api.get<InvestmentProduct[]>('/public/investments/products')).data
}

export async function getAdminInvestmentProducts() {
  return (await api.get<InvestmentProduct[]>('/admin/investments/products')).data
}

export async function createInvestmentProduct(input: InvestmentProductInput) {
  return (await api.post<InvestmentProduct>('/admin/investments/products', input)).data
}

export async function updateInvestmentProduct(id: number, input: InvestmentProductInput) {
  return (await api.put<InvestmentProduct>(`/admin/investments/products/${id}`, input)).data
}

export async function setInvestmentProductStatus(id: number, active: boolean) {
  return (await api.patch<InvestmentProduct>(`/admin/investments/products/${id}/status`, { active })).data
}

export async function simulateInvestment(input: SimulationRequest) {
  return (await api.post<SimulationResult>('/public/investments/simulations', input)).data
}

export async function downloadInvestmentPdf(input: SimulationRequest) {
  return (await api.post<Blob>('/public/investments/simulations/pdf', input, { responseType: 'blob' })).data
}

export const payoutLabels: Record<PayoutFrequency, string> = {
  AT_MATURITY: 'Al vencimiento',
  MONTHLY: 'Mensual',
  BIMONTHLY: 'Bimestral',
  QUARTERLY: 'Trimestral',
  SEMIANNUAL: 'Semestral',
}
