import { api } from '@/lib/api'

export type IdType = 'CEDULA' | 'PASAPORTE'

export interface RegistrationInput {
  idType: IdType
  idNumber: string
  firstNames: string
  lastNames: string
  birthDate: string
  phone: string
  username: string
  email: string
  password: string
  acceptedPolicies: boolean
}

export interface PendingVerification {
  email: string
  expiresAt: string
}

export async function registerAccount(input: RegistrationInput) {
  return (await api.post<PendingVerification>('/public/registration', input)).data
}

export async function verifyRegistrationEmail(email: string, code: string) {
  await api.post('/public/registration/email/verify', { email, code })
}

export async function resendRegistrationCode(email: string) {
  return (await api.post<PendingVerification>('/public/registration/email/resend', { email })).data
}

export const idTypeLabels: Record<IdType, string> = {
  CEDULA: 'Cédula',
  PASAPORTE: 'Pasaporte',
}
