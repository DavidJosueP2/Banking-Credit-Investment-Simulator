import { api } from '@/lib/api'

export type PayoutFrequency = 'AT_MATURITY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'
export type CalculationMethod = 'SIMPLE' | 'COMPOUND'
export type RateType = 'NOMINAL_ANNUAL' | 'EFFECTIVE_ANNUAL'
export type TermUnit = 'DAYS' | 'MONTHS' | 'YEARS'
export type TermSelection = 'PREDEFINED' | 'RANGE'
export type TaxRuleType = 'PERCENTAGE' | 'FIXED'
export type TaxBase = 'GROSS_INTEREST' | 'CAPITAL' | 'TOTAL'
export type CalendarMode = 'FIXED_DAYS' | 'CALENDAR'

export interface InvestmentTermConfiguration {
  unit: TermUnit
  selection: TermSelection
  minimumValue: number
  maximumValue: number
  increment: number
  options: number[]
}

export interface InvestmentRate {
  id?: number
  label: string
  minimumAmount: number
  maximumAmount: number
  minimumTermDays: number
  maximumTermDays: number
  minimumTermValue: number
  maximumTermValue: number
  annualRate: number
  position?: number
}

export interface InvestmentTaxRule {
  id?: number
  name: string
  ruleType: TaxRuleType
  value: number
  base: TaxBase
  active: boolean
  exemptFromTermDays: number | null
  position?: number
}

/**
 * Costo adicional de la institución (seguro, comisión, donación), separado de la retención de IR: un porcentaje
 * del interés generado que se descuenta en cada pago, así nunca supera lo que gana el cliente.
 */
export interface InvestmentCharge {
  id?: number
  name: string
  percentage: number
  /** Si es false, el cliente decide si lo agrega en el simulador. */
  mandatory: boolean
  active: boolean
  /** Qué cubre o a qué se destina; obligatoria en los opcionales para que el cliente pueda decidir. */
  description: string | null
  position?: number
}

export interface InvestmentChargeDetail {
  id: number
  name: string
  percentage: number
  mandatory: boolean
  amount: number
  description: string | null
}

export interface InvestmentWithholdingDetail {
  name: string
  percentage: number
  amount: number
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
  termUnit: TermUnit
  termSelection: TermSelection
  minimumTermValue: number
  maximumTermValue: number
  termIncrement: number
  calculationMethod: CalculationMethod
  rateType: RateType
  capitalizationFrequency: PayoutFrequency | null
  calendarMode: CalendarMode
  dayCountBasis: 360 | 365
  withholdingRate: number
  active: boolean
  createdAt: string
  updatedAt: string
  terms: number[]
  payoutFrequencies: PayoutFrequency[]
  rates: InvestmentRate[]
  taxRules: InvestmentTaxRule[]
  termConfigurations: InvestmentTermConfiguration[]
  charges: InvestmentCharge[]
}

export interface InvestmentProductInput {
  name: string
  description: string
  minimumAmount: number
  maximumAmount: number
  minimumTermDays: number
  maximumTermDays: number
  termUnit: TermUnit
  termSelection: TermSelection
  minimumTermValue: number
  maximumTermValue: number
  termIncrement: number
  calculationMethod: CalculationMethod
  rateType: RateType
  capitalizationFrequency: PayoutFrequency | null
  calendarMode: CalendarMode
  dayCountBasis: 360 | 365
  withholdingRate: number
  active: boolean
  terms: number[]
  payoutFrequencies: PayoutFrequency[]
  rates: InvestmentRate[]
  taxRules: InvestmentTaxRule[]
  termConfigurations: InvestmentTermConfiguration[]
  charges: InvestmentCharge[]
}

export interface SimulationRequest {
  productId: number
  amount: number
  termValue: number
  termUnit: TermUnit
  payoutFrequency: PayoutFrequency
  /** Costos opcionales del plan que el cliente decidió agregar. */
  optionalCharges?: number[]
}

export interface InvestmentPayment {
  number: number
  paymentDate: string
  periodDays: number
  grossInterest: number
  withholding: number
  netInterest: number
  capital: number
  charges: number
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
  normalizedTermDays: number
  termValue: number
  termUnit: TermUnit
  rateLabel: string
  annualRate: number
  calculationMethod: CalculationMethod
  rateType: RateType
  payoutFrequency: PayoutFrequency
  capitalizationFrequency: PayoutFrequency | null
  dayCountBasis: number
  withholdingRate: number
  grossInterest: number
  withholding: number
  netInterest: number
  maturityValue: number
  maturityDate: string
  withholdingDetails: InvestmentWithholdingDetail[]
  withholdingNote: string
  payments: InvestmentPayment[]
  charges: number
  chargeDetails: InvestmentChargeDetail[]
  /** Rendimiento anual después de retención y costos, expresado igual que la tasa ofrecida. */
  netAnnualYield: number
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

export interface GoalRequest {
  productId: number
  targetAmount: number
  termValue: number
  termUnit: TermUnit
  payoutFrequency: SimulationRequest['payoutFrequency']
  optionalCharges?: number[]
}

export interface GoalResult {
  requiredAmount: number
  targetAmount: number
  /** El monto mínimo del producto ya alcanza la meta. */
  coveredByMinimum: boolean
  simulation: SimulationResult
}

/** Meta de ahorro: capital necesario para reunir un monto en el plazo elegido. */
export async function reachInvestmentGoal(input: GoalRequest) {
  return (await api.post<GoalResult>('/public/investments/goals', input)).data
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
  ANNUAL: 'Anual',
}

export const calculationMethodLabels: Record<CalculationMethod, string> = {
  SIMPLE: 'Interés simple',
  COMPOUND: 'Interés compuesto',
}

/** "5 % del interés generado". */
export function describeCharge(charge: Pick<InvestmentCharge, 'percentage'>) {
  return `${charge.percentage.toLocaleString('es-EC', { maximumFractionDigits: 4 })} % del interés generado`
}

export const rateTypeLabels: Record<RateType, string> = {
  NOMINAL_ANNUAL: 'Nominal anual',
  EFFECTIVE_ANNUAL: 'Efectiva anual',
}

export const termUnitLabels: Record<TermUnit, string> = {
  DAYS: 'Días',
  MONTHS: 'Meses',
  YEARS: 'Años',
}
