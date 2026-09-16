export const DEFAULT_LOCALE = 'es-EC'
export const DEFAULT_CURRENCY = 'USD'

type DateValue = Date | string | number | null | undefined

function toDate(value: DateValue): Date | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

export function formatCurrency(
  value: number | null | undefined,
  currency = DEFAULT_CURRENCY,
  locale = DEFAULT_LOCALE,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—'
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercentage(
  value: number | null | undefined,
  locale = DEFAULT_LOCALE,
  maximumFractionDigits = 2,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—'
  }

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value)
}

export function formatDate(
  value: DateValue,
  locale = DEFAULT_LOCALE,
): string {
  const date = toDate(value)

  if (!date) {
    return '—'
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

export function formatDateTime(
  value: DateValue,
  locale = DEFAULT_LOCALE,
): string {
  const date = toDate(value)

  if (!date) {
    return '—'
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
