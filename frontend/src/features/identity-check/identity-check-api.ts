import { api } from '@/lib/api'
import type { TemporaryCredentials } from '@/features/profile/profile-api'
import type { IdType } from '@/features/registration/registration-api'

export type DocumentSide = 'FRONT' | 'BACK'

/** Lo que la persona escribe: la cédula lleva código dactilar y el pasaporte su fecha de vencimiento. */
export interface IdentityClaim {
  idType: IdType
  idNumber: string
  fingerprintCode: string | null
  expiryDate: string | null
}

export interface VerifiedIdentity {
  idType: IdType
  idNumber: string
  firstNames: string | null
  lastNames: string | null
  birthDate: string | null
}

export interface LivenessTicket extends TemporaryCredentials {
  sessionId: string
}

export interface IdentityOutcome {
  result: 'APPROVED' | 'REJECTED'
  detail: string
  identity: VerifiedIdentity | null
}

/** El registro usa /public/registration/identity; la actualización desde Mi perfil, /profile/identity. */
export type IdentityEndpoint = '/public/registration/identity' | '/profile/identity'

export async function analyzeDocument(endpoint: IdentityEndpoint, claim: IdentityClaim, side: DocumentSide, file: File) {
  const body = new FormData()
  body.append('idType', claim.idType)
  body.append('idNumber', claim.idNumber)
  if (claim.fingerprintCode) body.append('fingerprintCode', claim.fingerprintCode)
  if (claim.expiryDate) body.append('expiryDate', claim.expiryDate)
  body.append('side', side)
  body.append('file', file)
  await api.post(`${endpoint}/documents`, body, {
    headers: { 'Content-Type': undefined },
  })
}

export async function startLiveness(endpoint: IdentityEndpoint, claim: IdentityClaim) {
  return (await api.post<LivenessTicket>(`${endpoint}/liveness`, claim)).data
}

export async function completeLiveness(endpoint: IdentityEndpoint, sessionId: string) {
  return (await api.post<IdentityOutcome>(`${endpoint}/complete`, { sessionId })).data
}
