import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, type PropsWithChildren } from 'react'

import defaultFavicon from '@/assets/bank/logo.png'
import { useTheme } from '@/app/providers/theme-provider'
import {
  defaultInstitutionSettings,
  mergeSettings,
  type AssetKey,
  type SettingsResponse,
} from '@/app/settings/institution-settings'
import { api } from '@/lib/api'

export const settingsQueryKey = ['public', 'institution-settings'] as const

const SettingsContext = createContext<{
  settings: SettingsResponse['sections']
  assets: Partial<Record<AssetKey, string>>
  isUsingDefaults: boolean
} | null>(null)

function resolveAssetUrl(path: string) {
  const baseUrl = new URL(api.defaults.baseURL ?? '/api', window.location.origin)
  return new URL(path, baseUrl.origin).toString()
}

const serifFonts = new Set(['Libre Baskerville', 'Georgia', 'Times New Roman'])

function fontValue(font: string) {
  if (font === 'system-ui') return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  if (serifFonts.has(font)) return `"${font}", Georgia, "Times New Roman", serif`
  return `"${font}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
}

function contrastColor(hex: string) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
  const luminance = channels.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
  return luminance > 0.42 ? '#172022' : '#ffffff'
}

export function SettingsProvider({ children }: PropsWithChildren) {
  const { theme } = useTheme()
  const query = useQuery({
    queryKey: settingsQueryKey,
    queryFn: async () => (await api.get<SettingsResponse>('/public/settings')).data,
    retry: false,
    staleTime: 60_000,
  })
  const effective = useMemo(() => mergeSettings(query.data), [query.data])
  const assets = useMemo(() => Object.fromEntries(
    Object.entries(effective.assets).map(([key, path]) => [key, resolveAssetUrl(path)]),
  ) as Partial<Record<AssetKey, string>>, [effective.assets])

  useEffect(() => {
    const appearance = effective.sections.appearance
    const root = document.documentElement
    const dark = theme === 'dark'
    const primary = dark ? appearance.brandPrimaryDarkColor : appearance.brandPrimaryColor
    const secondary = dark ? appearance.brandSecondaryDarkColor : appearance.brandSecondaryColor
    root.style.setProperty('--brand-teal', primary)
    root.style.setProperty('--brand-gold', secondary)
    root.style.setProperty('--brand-teal-foreground', contrastColor(primary))
    root.style.setProperty('--brand-gold-foreground', contrastColor(secondary))
    root.style.setProperty('--ring', primary)
    root.style.setProperty('--sidebar-ring', primary)
    root.style.setProperty('--background', dark ? appearance.backgroundDarkColor : appearance.backgroundLightColor)
    root.style.setProperty('--foreground', dark ? appearance.foregroundDarkColor : appearance.foregroundLightColor)
    root.style.setProperty('--card', dark ? appearance.surfaceDarkColor : appearance.surfaceLightColor)
    root.style.setProperty('--card-foreground', dark ? appearance.foregroundDarkColor : appearance.foregroundLightColor)
    root.style.setProperty('--popover', dark ? appearance.surfaceDarkColor : appearance.surfaceLightColor)
    root.style.setProperty('--popover-foreground', dark ? appearance.foregroundDarkColor : appearance.foregroundLightColor)
    root.style.setProperty('--muted', dark ? appearance.mutedDarkColor : appearance.mutedLightColor)
    root.style.setProperty('--muted-foreground', dark ? appearance.mutedTextDarkColor : appearance.mutedTextLightColor)
    root.style.setProperty('--secondary', dark ? appearance.mutedDarkColor : appearance.mutedLightColor)
    root.style.setProperty('--secondary-foreground', dark ? appearance.foregroundDarkColor : appearance.foregroundLightColor)
    root.style.setProperty('--accent', dark ? appearance.mutedDarkColor : appearance.mutedLightColor)
    root.style.setProperty('--accent-foreground', dark ? appearance.foregroundDarkColor : appearance.foregroundLightColor)
    const effectiveSidebarDark = appearance.sidebarDarkColor === '#1a292b' ? '#181b1d' : appearance.sidebarDarkColor
    root.style.setProperty('--sidebar', dark ? effectiveSidebarDark : appearance.sidebarLightColor)
    root.style.setProperty('--sidebar-foreground', dark ? appearance.foregroundDarkColor : appearance.foregroundLightColor)
    root.style.setProperty('--sidebar-accent', dark ? appearance.mutedDarkColor : appearance.mutedLightColor)
    root.style.setProperty('--sidebar-accent-foreground', dark ? appearance.foregroundDarkColor : appearance.foregroundLightColor)
    root.style.setProperty('--sidebar-border', dark ? appearance.borderDarkColor : appearance.borderLightColor)
    root.style.setProperty('--border', dark ? appearance.borderDarkColor : appearance.borderLightColor)
    root.style.setProperty('--input', dark ? appearance.borderDarkColor : appearance.borderLightColor)
    root.style.setProperty('--font-heading', fontValue(appearance.headingFont))
    root.style.setProperty('--font-sans', fontValue(appearance.sansFont))
    document.title = effective.sections.institution.institutionName
  }, [effective.sections.appearance, effective.sections.institution.institutionName, theme])

  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (favicon) favicon.href = assets.markLogoLight ?? defaultFavicon
  }, [assets.markLogoLight])

  return (
    <SettingsContext.Provider value={{
      settings: effective.sections,
      assets,
      isUsingDefaults: query.isError || !query.data,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useInstitutionSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    return { settings: defaultInstitutionSettings, assets: {}, isUsingDefaults: true }
  }
  return context
}
