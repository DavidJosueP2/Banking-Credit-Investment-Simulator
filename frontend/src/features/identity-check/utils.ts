import axios from 'axios'

export function messageFrom(cause: unknown, fallback: string) {
  if (axios.isAxiosError(cause)) {
    const detail = cause.response?.data as { message?: string } | undefined
    if (detail?.message) return detail.message
  }
  return fallback
}

/**
 * El análisis puede resolverse en medio segundo; se sostiene la animación un mínimo para que la
 * persona alcance a ver que su documento se está revisando.
 */
export async function withMinimumDuration<T>(work: Promise<T>, milliseconds: number) {
  const [result] = await Promise.allSettled([
    work,
    new Promise((resolve) => window.setTimeout(resolve, milliseconds)),
  ])
  if (result.status === 'rejected') throw result.reason
  return result.value
}
