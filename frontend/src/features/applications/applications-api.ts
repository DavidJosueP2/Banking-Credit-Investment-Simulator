import { api } from '@/lib/api'
import type { TemporaryCredentials } from '@/features/profile/profile-api'

export type ProductType = 'CREDIT' | 'INVESTMENT'
export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'OBSERVED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type TermUnit = 'DAYS' | 'MONTHS' | 'YEARS'
export type BiometricResult = 'APPROVED' | 'MANUAL_REVIEW' | 'REJECTED'

/** Parámetros que definen una simulación. Los resultados siempre los vuelve a calcular el servidor. */
export interface Scenario {
  productType: ProductType
  productId: number
  productName?: string
  amount: number
  term: number
  /** Inversiones: unidad del plazo (días si falta). Créditos: solo para mostrar; el servidor usa la del producto. */
  termUnit?: TermUnit
  amortizationSystem?: 'FRANCES' | 'ALEMAN'
  payoutFrequency?: string
  assetCost?: number
  /** Cobros opcionales (p. ej. donaciones) que la persona decidió agregar. */
  optionalCharges?: number[]
}

export interface Readiness {
  fullName: string
  hasProfile: boolean
  emailVerified: boolean
  identityVerified: boolean
  identityVerifiedAt: string | null
  ready: boolean
}

export interface SavedSimulation {
  id: number
  productType: ProductType
  productId: number
  productName: string
  label: string | null
  amount: number
  term: number
  termUnit: TermUnit
  amortizationSystem: 'FRANCES' | 'ALEMAN' | null
  payoutFrequency: string | null
  assetCost: number | null
  annualRate: number
  periodicPayment: number | null
  totalInterest: number
  totalAmount: number
  optionalCharges: number[]
  createdAt: string
}

export interface ApplicationSummary {
  id: number
  code: string
  productType: ProductType
  productId: number
  productName: string
  amount: number
  term: number
  termUnit: TermUnit
  amortizationSystem: 'FRANCES' | 'ALEMAN' | null
  payoutFrequency: string | null
  annualRate: number
  periodicPayment: number | null
  totalAmount: number
  status: ApplicationStatus
  biometricResult: BiometricResult | null
  customerName: string
  reviewerName: string | null
  submittedAt: string | null
  decidedAt: string | null
  createdAt: string
  updatedAt: string
  nextDueDate: string | null
  nextPayment: number | null
  elapsedInstallments: number
  totalInstallments: number
  projectedBalance: number | null
}

export interface Installment {
  number: number
  dueDate: string
  openingBalance: number | null
  principal: number
  interest: number
  insurance: number
  charges: number
  withholding: number
  payment: number
  closingBalance: number | null
}

export interface ApplicationEvent {
  fromStatus: ApplicationStatus | null
  toStatus: ApplicationStatus
  comment: string | null
  actorName: string | null
  byCustomer: boolean
  createdAt: string
}

export interface ApplicationDocument {
  id: number
  fileName: string
  contentType: string
  sizeBytes: number
  byCustomer: boolean
  uploadedAt: string
}

export interface PaymentRecord {
  id: number
  installmentNumber: number
  amount: number
  paidAt: string
  note: string | null
  recordedByName: string
  recordedAt: string
}

/** Los saldos pactados solo se liberan con cuotas completas, nunca con abonos parciales. */
export function hasPaymentMismatch(item: { schedule: Installment[]; payments: PaymentRecord[] }) {
  return item.payments.some((payment) => {
    const row = item.schedule.find((installment) => installment.number === payment.installmentNumber)
    return !row || Math.round(payment.amount * 100) !== Math.round(row.payment * 100)
  })
}

export interface ApplicationDetail {
  id: number
  code: string
  productType: ProductType
  productId: number
  productName: string
  amount: number
  term: number
  termUnit: TermUnit
  amortizationSystem: 'FRANCES' | 'ALEMAN' | null
  payoutFrequency: string | null
  assetCost: number | null
  annualRate: number
  periodicPayment: number | null
  totalInterest: number
  totalInsurance: number
  totalCharges: number
  totalWithholding: number
  totalAmount: number
  monthlyIncome: number | null
  /** Detalle libre del destino u origen de fondos (opcional salvo con "Otro"). */
  purpose: string | null
  status: ApplicationStatus
  biometricResult: BiometricResult | null
  biometricAttemptsLeft: number
  reviewerName: string | null
  decisionComment: string | null
  scheduleBaseDate: string
  submittedAt: string | null
  decidedAt: string | null
  createdAt: string
  updatedAt: string
  optionalCharges: number[]
  recommendation: 'APPROVE' | 'REJECT' | null
  recommendationComment: string | null
  recommendedByName: string | null
  recommendedAt: string | null
  decidedByName: string | null
  schedule: Installment[]
  events: ApplicationEvent[]
  documents: ApplicationDocument[]
  /** Cuotas ya cobradas de verdad (no por fecha); 0 si ninguna. */
  paidThroughInstallment: number
  payments: PaymentRecord[]
  declaration: ApplicantDeclaration
  /** El tipo de crédito o plan sigue ofreciéndose; lo ya aprobado conserva sus condiciones igual. */
  productAvailable: boolean
}

/** Lo que el cliente declaró al solicitar. */
export interface ApplicantDeclaration {
  purposeCategory: string | null
  employmentType: string | null
  monthlyExpenses: number | null
  fundsSource: string | null
  fundsLawfulDeclared: boolean
}

export interface CustomerFile {
  userId: number
  fullName: string
  username: string
  email: string
  idType: 'CEDULA' | 'PASAPORTE' | null
  idNumber: string | null
  birthDate: string | null
  phone: string | null
  address: string | null
  emailVerified: boolean
  identityVerifiedAt: string | null
  documentFront: boolean
  documentBack: boolean
  otherApplications: ApplicationSummary[]
}

/** Lo que la persona que revisa puede hacer ahora; lo decide el servidor (separación de funciones). */
export interface ReviewActions {
  canTake: boolean
  canObserve: boolean
  canRecommend: boolean
  canDecide: boolean
  canFinalize: boolean
  canReturn: boolean
  /** Bookkeeping de cuotas cobradas; no es parte de la decisión de crédito. */
  canRegisterPayment: boolean
  advisorApprovalLimit: number | null
  withinAdvisorLimit: boolean
  notice: string | null
}

export interface ReviewDetail {
  application: ApplicationDetail
  customer: CustomerFile
  actions: ReviewActions
}

export interface NewApplicationInput extends Scenario {
  monthlyIncome?: number
  purpose: string
  purposeCategory?: string
  employmentType?: string
  monthlyExpenses?: number
  fundsSource?: string
  fundsLawfulDeclared?: boolean
}

export interface LivenessTicket extends TemporaryCredentials {
  sessionId: string
}

export interface LivenessOutcome {
  result: BiometricResult
  livenessConfidence: number | null
  matchSimilarity: number | null
  detail: string
}

export type Decision = 'APPROVE' | 'REJECT' | 'OBSERVE' | 'RECOMMEND_APPROVE' | 'RECOMMEND_REJECT' | 'RETURN'

export const applicationKeys = {
  readiness: ['client', 'readiness'] as const,
  simulations: ['client', 'simulations'] as const,
  mine: ['client', 'applications'] as const,
  mineDetail: (id: number) => ['client', 'applications', id] as const,
  queue: ['admin', 'applications'] as const,
  review: (id: number) => ['admin', 'applications', id] as const,
}

// ─── Cliente ────────────────────────────────────────────────────────────────

export async function getReadiness() {
  return (await api.get<Readiness>('/client/readiness')).data
}

export async function getSavedSimulations() {
  return (await api.get<SavedSimulation[]>('/client/simulations')).data
}

export async function saveSimulation(input: Scenario & { label?: string }) {
  return (await api.post<SavedSimulation>('/client/simulations', input)).data
}

export async function deleteSimulation(id: number) {
  await api.delete(`/client/simulations/${id}`)
}

export async function getMyApplications() {
  return (await api.get<ApplicationSummary[]>('/client/applications')).data
}

export async function getMyApplication(id: number) {
  return (await api.get<ApplicationDetail>(`/client/applications/${id}`)).data
}

export async function createApplication(input: NewApplicationInput) {
  return (await api.post<ApplicationDetail>('/client/applications', input)).data
}

export async function startApplicationBiometric(id: number) {
  return (await api.post<LivenessTicket>(`/client/applications/${id}/biometric/start`)).data
}

export async function completeApplicationBiometric(id: number, sessionId: string) {
  return (await api.post<{ outcome: LivenessOutcome; application: ApplicationDetail }>(
    `/client/applications/${id}/biometric/complete`, { sessionId })).data
}

export async function cancelApplication(id: number, comment?: string) {
  return (await api.post<ApplicationDetail>(`/client/applications/${id}/cancel`, { comment })).data
}

export async function respondToObservation(id: number, comment: string) {
  return (await api.post<ApplicationDetail>(`/client/applications/${id}/respond`, { comment })).data
}

export async function uploadApplicationDocument(id: number, file: File) {
  const form = new FormData()
  form.append('file', file)
  // El navegador agrega el boundary correcto de multipart; fijar Content-Type a mano lo omite en algunos navegadores.
  return (await api.post<ApplicationDocument>(`/client/applications/${id}/documents`, form)).data
}

export async function deleteApplicationDocument(id: number, documentId: number) {
  await api.delete(`/client/applications/${id}/documents/${documentId}`)
}

export async function openClientDocument(id: number, documentId: number) {
  return openBlob(`/client/applications/${id}/documents/${documentId}`)
}

// ─── Asesor ─────────────────────────────────────────────────────────────────

export async function getReviewQueue() {
  return (await api.get<ApplicationSummary[]>('/admin/applications')).data
}

export async function getReviewDetail(id: number) {
  return (await api.get<ReviewDetail>(`/admin/applications/${id}`)).data
}

export async function takeApplication(id: number) {
  return (await api.post<ReviewDetail>(`/admin/applications/${id}/take`)).data
}

export async function decideApplication(id: number, decision: Decision, comment: string) {
  return (await api.post<ReviewDetail>(`/admin/applications/${id}/decision`, { decision, comment })).data
}

export async function openReviewDocument(id: number, documentId: number) {
  return openBlob(`/admin/applications/${id}/documents/${documentId}`)
}

export async function openIdentityDocument(id: number, side: 'front' | 'back') {
  return openBlob(`/admin/applications/${id}/identity/${side}`)
}

/** Confirma la cuota completa del cronograma; el servidor calcula número y monto. */
export async function registerPayment(id: number, input: { paidAt: string; note?: string }) {
  return (await api.post<ReviewDetail>(`/admin/applications/${id}/payments`, input)).data
}

export async function deletePayment(id: number, paymentId: number) {
  return (await api.delete<ReviewDetail>(`/admin/applications/${id}/payments/${paymentId}`)).data
}

/** Los archivos requieren la cookie de sesión: se descargan con axios y se abren como blob. */
async function openBlob(url: string) {
  const { data } = await api.get<Blob>(url, { responseType: 'blob' })
  const objectUrl = URL.createObjectURL(data)
  window.open(objectUrl, '_blank', 'noopener')
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

// ─── Etiquetas ──────────────────────────────────────────────────────────────

export const productTypeLabels: Record<ProductType, string> = {
  CREDIT: 'Crédito',
  INVESTMENT: 'Inversión',
}

export const statusLabels: Record<ApplicationStatus, string> = {
  DRAFT: 'Por confirmar',
  SUBMITTED: 'Enviada',
  IN_REVIEW: 'En revisión',
  OBSERVED: 'Con observaciones',
  PENDING_APPROVAL: 'En aprobación',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
}

export const statusTones: Record<ApplicationStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  IN_REVIEW: 'info',
  OBSERVED: 'warning',
  PENDING_APPROVAL: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
}

/** Reglas de adjuntos: las mismas que valida el servidor (tipo real del archivo, tamaño y cantidad). */
export const DOCUMENT_RULES = {
  accept: 'application/pdf,image/jpeg,image/png',
  formats: 'PDF, JPG o PNG',
  maxFiles: 6,
  maxMegabytes: 5,
}

/** Destino del crédito (mismos códigos que el backend). */
export const creditPurposeLabels: Record<string, string> = {
  CONSUMO_BIENES: 'Compra de bienes (electrodomésticos, equipos, muebles)',
  VEHICULO: 'Vehículo',
  EDUCACION: 'Educación',
  SALUD: 'Salud',
  VIVIENDA: 'Vivienda o remodelación',
  CONSOLIDACION_DEUDAS: 'Pagar otras deudas',
  NEGOCIO: 'Mi negocio (capital de trabajo o equipos)',
  VIAJE: 'Viaje',
  OTRO: 'Otro',
}

export const employmentLabels: Record<string, string> = {
  DEPENDIENTE: 'Empleado con relación de dependencia',
  INDEPENDIENTE: 'Profesional independiente',
  NEGOCIO_PROPIO: 'Negocio propio',
  JUBILADO: 'Jubilado',
  OTRO: 'Otra situación',
}

/** Origen de los fondos para invertir (debida diligencia). */
export const fundsSourceLabels: Record<string, string> = {
  SUELDO_AHORROS: 'Ahorros de mi sueldo',
  NEGOCIO: 'Ingresos de mi negocio o actividad',
  VENTA_BIEN: 'Venta de un bien (casa, vehículo…)',
  HERENCIA_DONACION: 'Herencia o donación',
  JUBILACION_LIQUIDACION: 'Jubilación, liquidación o indemnización',
  INVERSIONES: 'Vencimiento de otras inversiones',
  OTRO: 'Otro',
}

export const systemLabels: Record<'FRANCES' | 'ALEMAN', string> = {
  FRANCES: 'Francés (cuota fija)',
  ALEMAN: 'Alemán (capital fijo)',
}

const termUnitNames: Record<TermUnit, [string, string]> = {
  DAYS: ['día', 'días'],
  MONTHS: ['mes', 'meses'],
  YEARS: ['año', 'años'],
}

export function formatTerm(term: number, unit: TermUnit) {
  const [singular, plural] = termUnitNames[unit] ?? ['', '']
  return `${term} ${term === 1 ? singular : plural}`
}

/** La API guarda la tasa en porcentaje (15.5 = 15,5 %). */
export function formatRate(rate: number) {
  return `${new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 }).format(rate)} %`
}

/** Aprobado y con todas las cuotas o pagos registrados: el producto quedó cerrado. */
export function isSettled(item: { status: ApplicationStatus; elapsedInstallments?: number; totalInstallments?: number; paidThroughInstallment?: number; schedule?: Installment[] }) {
  if (item.status !== 'APPROVED') return false
  const total = item.totalInstallments ?? item.schedule?.length ?? 0
  const paid = item.elapsedInstallments ?? item.paidThroughInstallment ?? 0
  return total > 0 && paid >= total
}

export const settledLabels: Record<ProductType, string> = {
  CREDIT: 'Pagado',
  INVESTMENT: 'Liquidada',
}

export const OPEN_STATUSES: ApplicationStatus[] = ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'OBSERVED', 'PENDING_APPROVAL']
