import { api } from '@/lib/api'

export type DocumentSide = 'FRONT' | 'BACK'

export interface Profile {
  idType: string
  idNumber: string
  firstNames: string
  lastNames: string
  birthDate: string
  phone: string | null
  address: string | null
  emailVerified: boolean
  documentStatus: 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED'
  backUploaded: boolean
  biometricEnrolled: boolean
}

export interface DocumentReview {
  idNumber: string | null
  firstNames: string | null
  lastNames: string | null
  birthDate: string | null
  matchesProfile: boolean
  faceEnrolled: boolean
  differences: string[]
}

export interface LivenessOutcome {
  result: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW'
  livenessConfidence: number | null
  matchSimilarity: number | null
  detail: string
}

export interface TemporaryCredentials {
  region: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
  expiration: string
}

export const profileKeys = {
  profile: ['profile'] as const,
}

export async function getProfile() {
  return (await api.get<Profile>('/profile')).data
}

export async function updateContact(input: { phone: string; address: string }) {
  return (await api.put<Profile>('/profile', input)).data
}

export async function uploadDocument(side: DocumentSide, file: File, biometricConsent: boolean) {
  const body = new FormData()
  body.append('side', side)
  body.append('file', file)
  body.append('biometricConsent', String(biometricConsent))
  return (await api.post<DocumentReview>('/profile/documents', body, {
    headers: { 'Content-Type': undefined },
  })).data
}

export async function enrollFace() {
  const body = new FormData()
  body.append('biometricConsent', 'true')
  return (await api.post<Profile>('/profile/biometrics', body, {
    headers: { 'Content-Type': undefined },
  })).data
}

export async function confirmDocument() {
  return (await api.post<Profile>('/profile/documents/confirm')).data
}

export function documentImageUrl(side: DocumentSide) {
  return `${import.meta.env.VITE_API_BASE_URL}/profile/documents/${side}`
}

export async function getLivenessCredentials() {
  return (await api.post<TemporaryCredentials>('/dev/liveness/credentials')).data
}

export async function createLivenessSession() {
  return (await api.post<{ sessionId: string }>('/dev/liveness/session')).data
}

export async function getLivenessOutcome(sessionId: string) {
  return (await api.get<LivenessOutcome>(`/dev/liveness/session/${sessionId}`)).data
}
