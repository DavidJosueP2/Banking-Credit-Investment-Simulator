import { api } from '@/lib/api'
import type { IdType } from '@/features/registration/registration-api'

export interface Profile {
  idType: IdType
  idNumber: string
  firstNames: string
  lastNames: string
  birthDate: string
  phone: string | null
  address: string | null
  emailVerified: boolean
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

export async function getLivenessCredentials() {
  return (await api.post<TemporaryCredentials>('/dev/liveness/credentials')).data
}

export async function createLivenessSession() {
  return (await api.post<{ sessionId: string }>('/dev/liveness/session')).data
}

export async function getLivenessOutcome(sessionId: string) {
  return (await api.get<LivenessOutcome>(`/dev/liveness/session/${sessionId}`)).data
}
