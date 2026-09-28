import { useCallback } from 'react'

import { useInstitutionSettings } from '@/app/providers/settings-provider'
import fullDark from '@/assets/bank/Full-dark-mode.png'
import fullLight from '@/assets/bank/Full.png'

/** Identidad visual de la institución para los archivos exportados (PDF y Excel). */
export interface ExportBranding {
  institutionName: string
  legalNotice: string
  /** Colores de marca en hex (#08747b). */
  primary: string
  secondary: string
  /** Logo ya convertido a PNG, pensado para ir sobre la franja de color principal. */
  logo: { dataUrl: string; base64: string; width: number; height: number } | null
}

const logoCache = new Map<string, Promise<ExportBranding['logo']>>()

/**
 * Devuelve una función que arma la marca en el momento de exportar. Toma el logo configurado en el
 * panel (o el de la app si no hay uno) igual que el PDF de inversiones del backend: sobre una franja
 * oscura usa la versión clara del logo y al revés.
 */
export function useExportBranding() {
  const { settings, assets } = useInstitutionSettings()

  return useCallback(async (): Promise<ExportBranding> => {
    const primary = normalizeHex(settings.appearance.brandPrimaryColor, '#08747b')
    const darkHeader = luminance(primary) < 0.52
    const candidates = darkHeader
      ? [assets.fullLogoDark, assets.markLogoDark, assets.fullLogoLight, fullDark]
      : [assets.fullLogoLight, assets.markLogoLight, assets.fullLogoDark, fullLight]
    return {
      institutionName: settings.institution.institutionName || 'Brunexa Bank',
      legalNotice: settings.institution.legalNotice,
      primary,
      secondary: normalizeHex(settings.appearance.brandSecondaryColor, '#946928'),
      logo: await firstLogo(candidates.filter((url): url is string => Boolean(url))),
    }
  }, [settings, assets])
}

async function firstLogo(urls: string[]): Promise<ExportBranding['logo']> {
  for (const url of urls) {
    if (!logoCache.has(url)) logoCache.set(url, toPng(url).catch(() => null))
    const logo = await logoCache.get(url)
    if (logo) return logo
  }
  return null
}

/** Descarga la imagen (incluidas WebP) y la redibuja como PNG: jsPDF y Excel aceptan PNG sin problemas. */
async function toPng(url: string): Promise<ExportBranding['logo']> {
  const response = await fetch(url)
  if (!response.ok) return null
  const bitmap = await createImageBitmap(await response.blob())
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(bitmap, 0, 0)
  const dataUrl = canvas.toDataURL('image/png')
  return { dataUrl, base64: dataUrl.split(',')[1], width: bitmap.width, height: bitmap.height }
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = normalizeHex(hex, '#000000').slice(1)
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)]
}

/** Color en formato ARGB que usa Excel (FF + RRGGBB). */
export function toArgb(hex: string) {
  return `FF${normalizeHex(hex, '#000000').slice(1).toUpperCase()}`
}

/** Mezcla el color con blanco: sirve para fondos suaves de la marca. */
export function tint(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount)
  return `#${[mix(r), mix(g), mix(b)].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((channel) => channel / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function normalizeHex(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback
}

/** Nombre de archivo sin tildes ni espacios. */
export function fileSlug(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
