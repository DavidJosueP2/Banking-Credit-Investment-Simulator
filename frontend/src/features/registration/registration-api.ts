import { api } from '@/lib/api'

export type IdType = 'CEDULA' | 'PASAPORTE'

/** El documento viaja en la sesión ya verificada; nombres y fecha solo si el documento no los trajo. */
export interface RegistrationInput {
  firstNames: string | null
  lastNames: string | null
  birthDate: string | null
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
