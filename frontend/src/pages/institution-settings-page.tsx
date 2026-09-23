import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ExternalLink, Images, Info, RotateCcw, Save, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import fullDark from '@/assets/bank/Full-dark-mode.png'
import fullLight from '@/assets/bank/Full.png'
import markDark from '@/assets/bank/logo-dark-mode.png'
import markLight from '@/assets/bank/logo.png'
import creditImage from '@/assets/landing/brunexa-creditos.png'
import investmentImage from '@/assets/landing/brunexa-inversiones.png'
import creditPersonFallback from '@/assets/imgs/persona-crédito.png'
import investmentPersonFallback from '@/assets/imgs/investment-person.png'
import girlWithDollarFallback from '@/assets/imgs/girl with dollar.png'
import closingPersonFallback from '@/assets/imgs/young-african-american-woman-holding-piggy-bank-screaming-proud-celebrating-victory-success-very-exc-removebg-preview.png'
import carouselCommunityImage from '@/assets/landing/carrusel/brooke-cagle--uHVRvDr7pg-unsplash.jpg'
import carouselIdentityImage from '@/assets/landing/carrusel/debashis-rc-biswas-dyPFnxxUhYk-unsplash.jpg'
import carouselPerspectiveImage from '@/assets/landing/carrusel/zalfa-imani-1xp5VxvyKL0-unsplash.jpg'
import { settingsQueryKey, useInstitutionSettings } from '@/app/providers/settings-provider'
import {
  defaultInstitutionSettings,
  mergeSettings,
  type AssetKey,
  type InstitutionSettings,
  type LandingSection,
  type SettingsResponse,
  type SettingsSection,
} from '@/app/settings/institution-settings'
import { PageHeader } from '@/components/shared/page-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { api } from '@/lib/api'

type SettingsTab = SettingsSection | 'media'

const fontOptions = ['Axiforma', 'Plus Jakarta Sans', 'Libre Baskerville', 'SF Pro Display', 'Inter', 'Georgia', 'Times New Roman', 'Arial', 'system-ui']
const iconOptions = [
  ['wallet-cards', 'Tarjetas'],
  ['bar-chart', 'Gráfico'],
  ['trending-up', 'Crecimiento'],
  ['upload', 'Carga de archivos'],
  ['landmark', 'Institución'],
  ['file-text', 'Documento'],
  ['shield', 'Seguridad'],
  ['sliders', 'Configuración'],
]

type LandingField = {
  key: keyof LandingSection
  label: string
  multiline?: boolean
  hint?: string
}

const landingGroups: Array<{
  id: string
  label: string
  title: string
  description: string
  enabledKey?: keyof LandingSection
  fields: LandingField[]
}> = [
  {
    id: 'intro', label: 'Portada', title: 'Presentación',
    description: 'Primera impresión del sitio: mensaje central y accesos a los productos.',
    fields: [
      { key: 'heroTitle', label: 'Título principal' },
      { key: 'heroHighlight', label: 'Texto destacado', hint: 'Se muestra con el color principal.' },
      { key: 'heroDescription', label: 'Descripción principal', multiline: true },
      { key: 'heroCreditButton', label: 'Botón de créditos' },
      { key: 'heroInvestmentButton', label: 'Botón de inversiones' },
    ],
  },
  {
    id: 'banner', label: 'Banner', title: 'Banner y carrusel',
    description: 'Tres destacados con imágenes independientes. Si ocultas un producto, su diapositiva desaparece automáticamente.',
    enabledKey: 'bannerEnabled',
    fields: [
      { key: 'bannerGeneralTitle', label: 'Destacado principal · título', hint: 'Puedes usar {shortName} para el nombre corto de la institución.' },
      { key: 'bannerGeneralDescription', label: 'Destacado principal · descripción', multiline: true, hint: 'Puedes usar {description} para reutilizar la descripción institucional.' },
      { key: 'bannerGeneralImageAlt', label: 'Destacado principal · descripción de imagen', hint: 'Describe la fotografía para quienes usan lectores de pantalla.' },
      { key: 'bannerGeneralButton', label: 'Destacado principal · botón de créditos' },
      { key: 'bannerGeneralInvestmentButton', label: 'Destacado principal · botón de inversiones' },
      { key: 'bannerCreditTitle', label: 'Créditos · título' },
      { key: 'bannerCreditDescription', label: 'Créditos · descripción', multiline: true },
      { key: 'bannerCreditImageAlt', label: 'Créditos · descripción de imagen' },
      { key: 'bannerCreditButton', label: 'Créditos · botón' },
      { key: 'bannerInvestmentTitle', label: 'Inversiones · título' },
      { key: 'bannerInvestmentDescription', label: 'Inversiones · descripción', multiline: true },
      { key: 'bannerInvestmentImageAlt', label: 'Inversiones · descripción de imagen' },
      { key: 'bannerInvestmentButton', label: 'Inversiones · botón' },
    ],
  },
  {
    id: 'services', label: 'Servicios', title: 'Servicios destacados',
    description: 'Edita los cuatro servicios, sus textos de enlace y sus iconos.',
    enabledKey: 'servicesEnabled',
    fields: [
      { key: 'servicesTitle', label: 'Título de la sección' },
      { key: 'servicesDescription', label: 'Descripción de la sección', multiline: true },
      { key: 'creditServiceTitle', label: 'Simulador de crédito · título' },
      { key: 'creditServiceDescription', label: 'Simulador de crédito · descripción', multiline: true },
      { key: 'creditServiceButton', label: 'Simulador de crédito · enlace' },
      { key: 'amortizationServiceTitle', label: 'Tabla de amortización · título' },
      { key: 'amortizationServiceDescription', label: 'Tabla de amortización · descripción', multiline: true },
      { key: 'amortizationServiceButton', label: 'Tabla de amortización · enlace' },
      { key: 'investmentServiceTitle', label: 'Proyección de inversión · título' },
      { key: 'investmentServiceDescription', label: 'Proyección de inversión · descripción', multiline: true },
      { key: 'investmentServiceButton', label: 'Proyección de inversión · enlace' },
      { key: 'applicationServiceTitle', label: 'Solicitud digital · título' },
      { key: 'applicationServiceDescription', label: 'Solicitud digital · descripción', multiline: true },
      { key: 'applicationServiceButton', label: 'Solicitud digital · enlace' },
    ],
  },
  {
    id: 'perspective', label: 'Panorama', title: 'Antes de decidir',
    description: 'Nueva sección editorial entre servicios y productos, enfocada en lo que conviene comparar.',
    enabledKey: 'perspectiveEnabled',
    fields: [
      { key: 'perspectiveTitle', label: 'Título de la sección' },
      { key: 'perspectiveDescription', label: 'Descripción general', multiline: true },
      { key: 'perspectiveCreditTitle', label: 'Financiamiento · título' },
      { key: 'perspectiveCreditDescription', label: 'Financiamiento · descripción', multiline: true },
      { key: 'perspectiveInvestmentTitle', label: 'Inversión · título' },
      { key: 'perspectiveInvestmentDescription', label: 'Inversión · descripción', multiline: true },
    ],
  },
  {
    id: 'credit', label: 'Créditos', title: 'Sección de créditos',
    description: 'Contenido editorial, fotografía, tres puntos clave y botón visible del módulo.',
    fields: [
      { key: 'creditTitle', label: 'Título' },
      { key: 'creditDescription', label: 'Descripción', multiline: true },
      { key: 'creditImageAlt', label: 'Descripción de la imagen' },
      { key: 'creditImageCaption', label: 'Pie de fotografía' },
      { key: 'creditBulletOne', label: 'Punto clave 1' },
      { key: 'creditBulletTwo', label: 'Punto clave 2' },
      { key: 'creditBulletThree', label: 'Punto clave 3' },
      { key: 'creditButton', label: 'Texto del botón de crédito' },
    ],
  },
  {
    id: 'investment', label: 'Inversiones', title: 'Sección de inversiones',
    description: 'Contenido editorial, fotografía, características y botón visible del módulo.',
    fields: [
      { key: 'investmentTitle', label: 'Título' },
      { key: 'investmentDescription', label: 'Descripción', multiline: true },
      { key: 'investmentDetail', label: 'Continuación de la descripción', multiline: true },
      { key: 'investmentImageAlt', label: 'Descripción de la imagen' },
      { key: 'investmentImageCaption', label: 'Pie de fotografía' },
      { key: 'investmentFeatureOneTitle', label: 'Característica 1 · título' },
      { key: 'investmentFeatureOneDescription', label: 'Característica 1 · descripción', multiline: true },
      { key: 'investmentFeatureTwoTitle', label: 'Característica 2 · título' },
      { key: 'investmentFeatureTwoDescription', label: 'Característica 2 · descripción', multiline: true },
      { key: 'investmentButton', label: 'Texto del botón de inversión' },
    ],
  },
  {
    id: 'process', label: 'Proceso', title: 'Cómo funciona',
    description: 'Explica las tres etapas desde la consulta hasta la continuidad en la cuenta.',
    enabledKey: 'processEnabled',
    fields: [
      { key: 'processTitle', label: 'Título de la sección' },
      { key: 'processDescription', label: 'Introducción', multiline: true },
      { key: 'processStepOneTitle', label: 'Etapa 1 · título' },
      { key: 'processStepOneDescription', label: 'Etapa 1 · descripción', multiline: true },
      { key: 'processStepTwoTitle', label: 'Etapa 2 · título' },
      { key: 'processStepTwoDescription', label: 'Etapa 2 · descripción', multiline: true },
      { key: 'processStepThreeTitle', label: 'Etapa 3 · título' },
      { key: 'processStepThreeDescription', label: 'Etapa 3 · descripción', multiline: true },
    ],
  },
  {
    id: 'closing', label: 'Cierre', title: 'Invitación final',
    description: 'Mensaje institucional, puntos de valor y acceso a la cuenta.',
    enabledKey: 'closingEnabled',
    fields: [
      { key: 'closingTitle', label: 'Título' },
      { key: 'closingHighlight', label: 'Texto destacado' },
      { key: 'closingDescription', label: 'Descripción', multiline: true, hint: 'Puedes usar {shortName} para el nombre corto de la institución.' },
      { key: 'closingBulletOne', label: 'Punto de valor 1' },
      { key: 'closingBulletTwo', label: 'Punto de valor 2' },
      { key: 'closingBulletThree', label: 'Punto de valor 3' },
      { key: 'closingButton', label: 'Botón de acceso', hint: 'Puedes usar {shortName} para el nombre corto de la institución.' },
    ],
  },
  {
    id: 'navigation', label: 'Navegación', title: 'Cabecera y pie de página',
    description: 'Etiquetas y destinos de redirección de la cabecera, así como encabezados del pie del sitio.',
    fields: [
      { key: 'headerHomeLabel', label: 'Cabecera · Inicio / Home (texto)', hint: 'Deja el texto vacío para no mostrar este ítem en la cabecera.' },
      { key: 'headerHomeHref', label: 'Cabecera · Inicio / Home (redirección)', hint: 'Ejemplo: / para volver a la portada.' },
      { key: 'headerCreditLabel', label: 'Cabecera · Créditos (texto)', hint: 'Deja el texto vacío para no mostrar este ítem en la cabecera.' },
      { key: 'headerCreditHref', label: 'Cabecera · Créditos (redirección)', hint: 'Ejemplo: /creditos/simulador' },
      { key: 'headerInvestmentLabel', label: 'Cabecera · Inversiones (texto)', hint: 'Deja el texto vacío para no mostrar este ítem en la cabecera.' },
      { key: 'headerInvestmentHref', label: 'Cabecera · Inversiones (redirección)', hint: 'Ejemplo: /inversiones/simulador' },
      { key: 'headerProcessLabel', label: 'Cabecera · Proceso (texto)', hint: 'Deja el texto vacío para no mostrar este ítem en la cabecera.' },
      { key: 'headerProcessHref', label: 'Cabecera · Proceso (redirección)', hint: 'Ejemplo: /#proceso o una ruta interna.' },
      { key: 'footerProductsHeading', label: 'Pie · productos' },
      { key: 'footerAccessHeading', label: 'Pie · acceso' },
      { key: 'footerContactHeading', label: 'Pie · contacto' },
      { key: 'footerHomeLabel', label: 'Pie · inicio' },
    ],
  },
]

const landingIconFields: Record<string, Array<[keyof LandingSection, string]>> = {
  services: [
    ['creditServiceIcon', 'Simulador de crédito'],
    ['amortizationServiceIcon', 'Tabla de amortización'],
    ['investmentServiceIcon', 'Proyección de inversión'],
    ['applicationServiceIcon', 'Solicitud digital'],
  ],
  credit: [['creditSectionIcon', 'Encabezado de créditos']],
  investment: [
    ['investmentSectionIcon', 'Encabezado de inversiones'],
    ['investmentFeatureOneIcon', 'Característica 1'],
    ['investmentFeatureTwoIcon', 'Característica 2'],
  ],
}

const assetDefinitions: Array<{
  key: AssetKey
  title: string
  description: string
  fallback: string
  darkPreview?: boolean
  compact?: boolean
}> = [
  { key: 'fullLogoLight', title: 'Logotipo completo · modo claro', description: 'Cabecera y pie de página sobre fondos claros.', fallback: fullLight, compact: true },
  { key: 'fullLogoDark', title: 'Logotipo completo · modo oscuro', description: 'Versión con contraste para fondos oscuros.', fallback: fullDark, darkPreview: true, compact: true },
  { key: 'markLogoLight', title: 'Símbolo · modo claro', description: 'Marca compacta para el panel y espacios reducidos.', fallback: markLight, compact: true },
  { key: 'markLogoDark', title: 'Símbolo · modo oscuro', description: 'Símbolo compacto para superficies oscuras.', fallback: markDark, darkPreview: true, compact: true },
  { key: 'heroImage', title: 'Banner · destacado principal', description: 'Primera fotografía del carrusel público.', fallback: carouselIdentityImage },
  { key: 'carouselCreditImage', title: 'Banner · créditos', description: 'Fotografía del destacado de créditos.', fallback: carouselCommunityImage },
  { key: 'carouselInvestmentImage', title: 'Banner · inversiones', description: 'Fotografía del destacado de inversiones.', fallback: carouselPerspectiveImage },
  { key: 'creditImage', title: 'Imagen de créditos', description: 'Fotografía de la sección pública de créditos.', fallback: creditImage },
  { key: 'investmentImage', title: 'Imagen de inversiones', description: 'Fotografía de la sección pública de inversiones.', fallback: investmentImage },
  { key: 'creditSimulatorImage', title: 'Simulador de créditos · personaje', description: 'Silueta para la franja superior del simulador de créditos.', fallback: creditPersonFallback, compact: true },
  { key: 'investmentSimulatorImage', title: 'Simulador de inversiones · personaje', description: 'Silueta para la franja superior del simulador de inversiones.', fallback: investmentPersonFallback, compact: true },
  { key: 'closingImage', title: 'Landing · espacio financiero', description: 'Personaje de la sección final "Tu espacio financiero".', fallback: closingPersonFallback, compact: true },
  { key: 'perspectiveImage', title: 'Landing · chica del dólar', description: 'Fotografía para la sección "Antes de elegir" en la landing.', fallback: girlWithDollarFallback, compact: true },
]

function requestError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? 'No se pudo guardar la configuración.'
  }
  return 'No se pudo guardar la configuración.'
}

function ConfigField({ label, hint, onReset, children }: {
  label: string
  hint?: string
  onReset: () => void
  children: ReactNode
}) {
  return (
    <div className="space-y-2" role="group" aria-label={label}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button"
                  className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Información sobre ${label}`}>
                  <Info className="size-4" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6} className="max-w-64 leading-5">
                {hint}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <button type="button" onClick={onReset}
          className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Restaurar ${label}`} title="Restaurar valor predeterminado">
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      {children}
    </div>
  )
}

function ColorField({ label, value, onChange, onReset }: {
  label: string
  value: string
  onChange: (value: string) => void
  onReset: () => void
}) {
  return (
    <ConfigField label={label} onReset={onReset}>
      <div className="flex gap-3">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1" aria-label={`Selector para ${label}`} />
        <Input value={value} onChange={(event) => onChange(event.target.value)} maxLength={7}
          pattern="#[0-9a-fA-F]{6}" className="font-mono uppercase" aria-label={`Código hexadecimal para ${label}`} />
      </div>
    </ConfigField>
  )
}

function ToggleRow({ label, description, checked, onCheckedChange, onReset }: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  onReset: () => void
}) {
  return (
    <div className="flex items-center gap-4 border-b py-5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <button type="button" onClick={onReset} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Restaurar ${label}`} title="Restaurar valor predeterminado">
        <RotateCcw className="size-3.5" aria-hidden="true" />
      </button>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  )
}

function ResetConfirm({ label, description, onConfirm, disabled, compact = false }: {
  label: string
  description: string
  onConfirm: () => void
  disabled?: boolean
  compact?: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={compact ? 'ghost' : 'outline'} size={compact ? 'icon' : 'default'}
          disabled={disabled} aria-label={compact ? label : undefined} title={compact ? label : undefined}>
          <RotateCcw aria-hidden="true" />{!compact && label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restaurar valores Brunexa</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-brand-gold text-brand-gold-foreground hover:bg-brand-gold/90">Restaurar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function FormActions({ saving, dirty, onReset }: { saving: boolean; dirty: boolean; onReset: () => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-3 border-t pt-6">
      <ResetConfirm label="Restaurar pestaña" description="Se eliminarán las personalizaciones de esta pestaña y volverán los valores Brunexa predeterminados."
        onConfirm={onReset} disabled={saving} />
      <Button type="submit" variant="brand" disabled={saving || !dirty}><Save aria-hidden="true" />{saving ? 'Guardando…' : 'Guardar cambios'}</Button>
    </div>
  )
}

export function InstitutionSettingsPage() {
  const client = useQueryClient()
  const { assets } = useInstitutionSettings()
  const draftHydrated = useRef(false)
  const query = useQuery({
    queryKey: ['admin', 'institution-settings'],
    queryFn: async () => (await api.get<SettingsResponse>('/admin/settings')).data,
  })
  const [draft, setDraft] = useState<InstitutionSettings>(defaultInstitutionSettings)
  const [activeTab, setActiveTab] = useState<SettingsTab>('institution')
  const [saving, setSaving] = useState<SettingsTab | null>(null)
  const [uploading, setUploading] = useState<AssetKey | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (query.data && !query.isFetching && !draftHydrated.current) {
      setDraft(mergeSettings(query.data).sections)
      draftHydrated.current = true
    }
  }, [query.data, query.isFetching])

  function update(section: SettingsSection, key: string, value: string) {
    setDraft((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }))
    setError('')
  }

  function resetField(section: SettingsSection, key: string) {
    const value = (defaultInstitutionSettings[section] as unknown as Record<string, string>)[key]
    update(section, key, value)
  }

  function applyResponse(response: SettingsResponse, changedSection?: SettingsSection) {
    const merged = mergeSettings(response)
    client.setQueryData(['admin', 'institution-settings'], response)
    client.setQueryData(settingsQueryKey, response)
    if (changedSection) {
      setDraft((current) => ({ ...current, [changedSection]: merged.sections[changedSection] }))
    }
  }

  function reportError(title: string, cause: unknown) {
    const description = requestError(cause)
    setError(description)
    toast.error(title, { description })
  }

  async function saveSection(section: SettingsSection) {
    setSaving(section)
    setError('')
    try {
      const { data } = await api.put<SettingsResponse>(`/admin/settings/sections/${section}`, { values: draft[section] })
      applyResponse(data, section)
      toast.success('Cambios guardados', {
        description: 'La configuración ya está aplicada al sitio público.',
      })
    } catch (saveError) {
      reportError('No se pudo guardar la configuración', saveError)
    } finally {
      setSaving(null)
    }
  }

  async function resetSection(section: SettingsSection) {
    setSaving(section)
    setError('')
    try {
      const { data } = await api.delete<SettingsResponse>(`/admin/settings/sections/${section}`)
      applyResponse(data, section)
      toast.success('Pestaña restaurada', {
        description: 'Se aplicaron los valores Brunexa predeterminados.',
      })
    } catch (resetError) {
      reportError('No se pudo restaurar la pestaña', resetError)
    } finally {
      setSaving(null)
    }
  }

  async function uploadAsset(key: AssetKey, file: File) {
    setUploading(key)
    setError('')
    const body = new FormData()
    body.append('file', file)
    try {
      const { data } = await api.put<SettingsResponse>(`/admin/settings/assets/${key}`, body, {
        headers: { 'Content-Type': null },
      })
      applyResponse(data)
      toast.success('Imagen actualizada', {
        description: 'El nuevo recurso ya está aplicado al sitio público.',
      })
    } catch (uploadError) {
      reportError('No se pudo actualizar la imagen', uploadError)
    } finally {
      setUploading(null)
    }
  }

  async function resetAsset(key: AssetKey) {
    setUploading(key)
    setError('')
    try {
      const { data } = await api.delete<SettingsResponse>(`/admin/settings/assets/${key}`)
      applyResponse(data)
      toast.success('Imagen restaurada', {
        description: 'Se recuperó la versión Brunexa predeterminada.',
      })
    } catch (resetError) {
      reportError('No se pudo restaurar la imagen', resetError)
    } finally {
      setUploading(null)
    }
  }

  async function resetAssets() {
    setSaving('media')
    setError('')
    try {
      const { data } = await api.delete<SettingsResponse>('/admin/settings/assets')
      applyResponse(data)
      toast.success('Recursos restaurados', {
        description: 'Se recuperaron todos los logos e imágenes predeterminados.',
      })
    } catch (resetError) {
      reportError('No se pudieron restaurar los recursos', resetError)
    } finally {
      setSaving(null)
    }
  }

  if (query.isPending || (!query.data && !query.isError)) return <p className="py-10 text-sm text-muted-foreground">Cargando configuración institucional…</p>
  if (query.isError) return (
    <div className="py-10">
      <h1 className="text-2xl">No se pudo cargar la configuración</h1>
      <p className="mt-3 text-muted-foreground">Comprueba el servidor y vuelve a intentarlo.</p>
      <Button className="mt-5" variant="outline" onClick={() => void query.refetch()}>Reintentar</Button>
    </div>
  )

  const submit = (section: SettingsSection) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void saveSection(section)
  }
  const saved = mergeSettings(query.data).sections
  const isDirty = (section: SettingsSection) => JSON.stringify(draft[section]) !== JSON.stringify(saved[section])
  const activeDirty = activeTab !== 'media' && isDirty(activeTab)

  return (
    <div className="space-y-8">
      <PageHeader title="Configuración"
        description="Administra la identidad, apariencia, contenido público y disponibilidad de los módulos de Brunexa. Los campos restaurados se aplican al guardar."
        actions={<Button asChild variant="gold-outline"><Link to="/" target="_blank" rel="noreferrer">Ver sitio público <ExternalLink aria-hidden="true" /></Link></Button>} />

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {activeDirty && <p className="text-sm font-medium text-brand-gold">Hay cambios sin guardar en esta pestaña.</p>}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className="gap-8">
        <div className="overflow-x-auto border-b">
          <TabsList aria-label="Secciones de configuración" className="h-auto w-max min-w-full justify-start gap-6 rounded-none bg-transparent p-0">
            {[
              ['institution', 'Institución'],
              ['appearance', 'Apariencia'],
              ['landing', 'Contenido público'],
              ['media', 'Logos e imágenes'],
              ['credit', 'Créditos'],
              ['investment', 'Inversiones'],
            ].map(([value, label]) => (
              <TabsTrigger key={value} value={value}
                className="h-11 flex-none rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-1 shadow-none data-[state=active]:border-brand-teal data-[state=active]:bg-transparent data-[state=active]:text-brand-teal data-[state=active]:shadow-none">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="institution">
          <form onSubmit={submit('institution')} className="max-w-4xl space-y-8">
            <div><h2 className="text-xl">Datos institucionales</h2><p className="mt-2 text-sm text-muted-foreground">Información que identifica a la institución en la landing y las comunicaciones.</p></div>
            <div className="grid gap-6 sm:grid-cols-2">
              <ConfigField label="Nombre de la institución" onReset={() => resetField('institution', 'institutionName')}><Input value={draft.institution.institutionName} onChange={(event) => update('institution', 'institutionName', event.target.value)} maxLength={120} required /></ConfigField>
              <ConfigField label="Nombre corto" hint="Se usa cuando el espacio es reducido." onReset={() => resetField('institution', 'shortName')}><Input value={draft.institution.shortName} onChange={(event) => update('institution', 'shortName', event.target.value)} maxLength={60} required /></ConfigField>
              <ConfigField label="Correo de atención" onReset={() => resetField('institution', 'supportEmail')}><Input type="email" value={draft.institution.supportEmail} onChange={(event) => update('institution', 'supportEmail', event.target.value)} required /></ConfigField>
              <ConfigField label="Teléfono" onReset={() => resetField('institution', 'supportPhone')}><Input value={draft.institution.supportPhone} onChange={(event) => update('institution', 'supportPhone', event.target.value)} maxLength={40} required /></ConfigField>
              <ConfigField label="Ubicación o dirección" onReset={() => resetField('institution', 'address')}><Input value={draft.institution.address} onChange={(event) => update('institution', 'address', event.target.value)} maxLength={180} required /></ConfigField>
              <ConfigField label="Eslogan" onReset={() => resetField('institution', 'slogan')}><Input value={draft.institution.slogan} onChange={(event) => update('institution', 'slogan', event.target.value)} maxLength={180} required /></ConfigField>
            </div>
            <ConfigField label="Descripción institucional" onReset={() => resetField('institution', 'description')}><Textarea value={draft.institution.description} onChange={(event) => update('institution', 'description', event.target.value)} maxLength={500} required /></ConfigField>
            <ConfigField label="Aviso legal" hint="Aparece en el pie del sitio público." onReset={() => resetField('institution', 'legalNotice')}><Textarea value={draft.institution.legalNotice} onChange={(event) => update('institution', 'legalNotice', event.target.value)} maxLength={800} required /></ConfigField>
            <FormActions saving={saving === 'institution'} dirty={isDirty('institution')} onReset={() => void resetSection('institution')} />
          </form>
        </TabsContent>

        <TabsContent value="appearance">
          <form onSubmit={submit('appearance')} className="space-y-10">
            <div><h2 className="text-xl">Colores y tipografías</h2><p className="mt-2 text-sm text-muted-foreground">Los cambios se aplican globalmente en la landing, el acceso y el panel administrativo.</p></div>
            <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-10">
                <section className="space-y-6" aria-labelledby="light-colors"><h3 id="light-colors" className="text-base">Modo claro</h3><div className="grid gap-6 sm:grid-cols-2">
                  <ColorField label="Turquesa principal" value={draft.appearance.brandPrimaryColor} onChange={(value) => update('appearance', 'brandPrimaryColor', value)} onReset={() => resetField('appearance', 'brandPrimaryColor')} />
                  <ColorField label="Dorado secundario" value={draft.appearance.brandSecondaryColor} onChange={(value) => update('appearance', 'brandSecondaryColor', value)} onReset={() => resetField('appearance', 'brandSecondaryColor')} />
                  <ColorField label="Fondo principal" value={draft.appearance.backgroundLightColor} onChange={(value) => update('appearance', 'backgroundLightColor', value)} onReset={() => resetField('appearance', 'backgroundLightColor')} />
                  <ColorField label="Texto principal" value={draft.appearance.foregroundLightColor} onChange={(value) => update('appearance', 'foregroundLightColor', value)} onReset={() => resetField('appearance', 'foregroundLightColor')} />
                  <ColorField label="Superficies y tarjetas" value={draft.appearance.surfaceLightColor} onChange={(value) => update('appearance', 'surfaceLightColor', value)} onReset={() => resetField('appearance', 'surfaceLightColor')} />
                  <ColorField label="Fondo secundario" value={draft.appearance.mutedLightColor} onChange={(value) => update('appearance', 'mutedLightColor', value)} onReset={() => resetField('appearance', 'mutedLightColor')} />
                  <ColorField label="Texto secundario" value={draft.appearance.mutedTextLightColor} onChange={(value) => update('appearance', 'mutedTextLightColor', value)} onReset={() => resetField('appearance', 'mutedTextLightColor')} />
                  <ColorField label="Barra lateral" value={draft.appearance.sidebarLightColor} onChange={(value) => update('appearance', 'sidebarLightColor', value)} onReset={() => resetField('appearance', 'sidebarLightColor')} />
                  <ColorField label="Bordes y campos" value={draft.appearance.borderLightColor} onChange={(value) => update('appearance', 'borderLightColor', value)} onReset={() => resetField('appearance', 'borderLightColor')} />
                </div></section>
                <section className="space-y-6 border-t pt-8" aria-labelledby="dark-colors"><h3 id="dark-colors" className="text-base">Modo oscuro</h3><div className="grid gap-6 sm:grid-cols-2">
                  <ColorField label="Turquesa principal" value={draft.appearance.brandPrimaryDarkColor} onChange={(value) => update('appearance', 'brandPrimaryDarkColor', value)} onReset={() => resetField('appearance', 'brandPrimaryDarkColor')} />
                  <ColorField label="Dorado secundario" value={draft.appearance.brandSecondaryDarkColor} onChange={(value) => update('appearance', 'brandSecondaryDarkColor', value)} onReset={() => resetField('appearance', 'brandSecondaryDarkColor')} />
                  <ColorField label="Fondo principal" value={draft.appearance.backgroundDarkColor} onChange={(value) => update('appearance', 'backgroundDarkColor', value)} onReset={() => resetField('appearance', 'backgroundDarkColor')} />
                  <ColorField label="Texto principal" value={draft.appearance.foregroundDarkColor} onChange={(value) => update('appearance', 'foregroundDarkColor', value)} onReset={() => resetField('appearance', 'foregroundDarkColor')} />
                  <ColorField label="Superficies y tarjetas" value={draft.appearance.surfaceDarkColor} onChange={(value) => update('appearance', 'surfaceDarkColor', value)} onReset={() => resetField('appearance', 'surfaceDarkColor')} />
                  <ColorField label="Fondo secundario" value={draft.appearance.mutedDarkColor} onChange={(value) => update('appearance', 'mutedDarkColor', value)} onReset={() => resetField('appearance', 'mutedDarkColor')} />
                  <ColorField label="Texto secundario" value={draft.appearance.mutedTextDarkColor} onChange={(value) => update('appearance', 'mutedTextDarkColor', value)} onReset={() => resetField('appearance', 'mutedTextDarkColor')} />
                  <ColorField label="Barra lateral" value={draft.appearance.sidebarDarkColor} onChange={(value) => update('appearance', 'sidebarDarkColor', value)} onReset={() => resetField('appearance', 'sidebarDarkColor')} />
                  <ColorField label="Bordes y campos" value={draft.appearance.borderDarkColor} onChange={(value) => update('appearance', 'borderDarkColor', value)} onReset={() => resetField('appearance', 'borderDarkColor')} />
                </div></section>
                <section className="space-y-6 border-t pt-8" aria-labelledby="fonts"><h3 id="fonts" className="text-base">Tipografía</h3><div className="grid gap-6 sm:grid-cols-2">
                  <ConfigField label="Títulos y encabezados" onReset={() => resetField('appearance', 'headingFont')}><Select value={draft.appearance.headingFont} onValueChange={(value) => update('appearance', 'headingFont', value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{fontOptions.map((font) => <SelectItem key={font} value={font}>{font}</SelectItem>)}</SelectContent></Select></ConfigField>
                  <ConfigField label="Texto general e interfaz" onReset={() => resetField('appearance', 'sansFont')}><Select value={draft.appearance.sansFont} onValueChange={(value) => update('appearance', 'sansFont', value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{fontOptions.map((font) => <SelectItem key={font} value={font}>{font}</SelectItem>)}</SelectContent></Select></ConfigField>
                </div></section>
              </div>
              <aside className="h-fit rounded-xl border bg-card p-6 xl:sticky xl:top-24" aria-label="Vista previa de apariencia">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Vista previa</p>
                <h3 className="mt-5 text-2xl" style={{ fontFamily: draft.appearance.headingFont }}>{draft.institution.shortName}</h3>
                <p className="mt-3 text-sm leading-6" style={{ fontFamily: draft.appearance.sansFont }}>Así se combinarán los títulos, el texto general y los colores de acción.</p>
                <div className="mt-6 flex gap-3"><span className="h-9 flex-1 rounded-md" style={{ backgroundColor: draft.appearance.brandPrimaryColor }} /><span className="h-9 flex-1 rounded-md" style={{ backgroundColor: draft.appearance.brandSecondaryColor }} /></div>
              </aside>
            </div>
            <FormActions saving={saving === 'appearance'} dirty={isDirty('appearance')} onReset={() => void resetSection('appearance')} />
          </form>
        </TabsContent>

        <TabsContent value="landing">
          <form onSubmit={submit('landing')} className="max-w-5xl space-y-8">
            <div>
              <h2 className="text-xl">Contenido público</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Administra el recorrido completo de la landing. Los cambios se aplican al guardar esta pestaña.</p>
            </div>
            <Tabs defaultValue="intro" className="gap-7">
              <div className="overflow-x-auto border-b">
                <TabsList aria-label="Partes de la landing" className="h-auto w-max min-w-full justify-start gap-5 rounded-none bg-transparent p-0">
                  {landingGroups.map((group) => (
                    <TabsTrigger key={group.id} value={group.id}
                      className="h-11 flex-none rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-1 shadow-none data-[state=active]:border-brand-teal data-[state=active]:bg-transparent data-[state=active]:text-brand-teal data-[state=active]:shadow-none">
                      {group.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {landingGroups.map((group) => (
                <TabsContent key={group.id} value={group.id} className="space-y-7">
                  <div>
                    <h3 className="text-lg">{group.title}</h3>
                    <p className="mt-2 max-w-[70ch] text-sm leading-6 text-muted-foreground">{group.description}</p>
                  </div>
                  {group.enabledKey && <div className="rounded-lg border bg-card px-5">
                    <ToggleRow
                      label={`Mostrar ${group.label.toLowerCase()} en el sitio público`}
                      description="Puedes ocultar esta sección sin perder los textos y recursos guardados."
                      checked={draft.landing[group.enabledKey] === 'true'}
                      onCheckedChange={(value) => update('landing', group.enabledKey!, String(value))}
                      onReset={() => resetField('landing', group.enabledKey!)}
                    />
                  </div>}
                  {group.id === 'banner' && <ConfigField label="Cambio automático del banner" hint="Entre 3 y 20 segundos. Se pausa si el visitante prefiere reducir animaciones." onReset={() => resetField('landing', 'bannerIntervalSeconds')}>
                    <div className="flex items-center gap-3">
                      <Input type="number" min={3} max={20} step={1} value={draft.landing.bannerIntervalSeconds}
                        onChange={(event) => update('landing', 'bannerIntervalSeconds', event.target.value)} className="max-w-32" required />
                      <span className="text-sm text-muted-foreground">segundos</span>
                    </div>
                  </ConfigField>}
                  <div className="grid gap-6 sm:grid-cols-2">
                    {group.fields.map((field) => (
                      <div key={field.key} className={field.multiline ? 'sm:col-span-2' : undefined}>
                        <ConfigField label={field.label} hint={field.hint} onReset={() => resetField('landing', field.key)}>
                          {field.multiline ? (
                            <Textarea value={draft.landing[field.key]} onChange={(event) => update('landing', field.key, event.target.value)} maxLength={500} required />
                          ) : (
                            <Input value={draft.landing[field.key]} onChange={(event) => update('landing', field.key, event.target.value)} maxLength={180} required />
                          )}
                        </ConfigField>
                      </div>
                    ))}
                  </div>
                  {group.id === 'intro' && <div className="rounded-lg border bg-card px-5">
                    <ToggleRow
                      label="Mostrar ilustraciones decorativas"
                      description="Muestra u oculta las composiciones SVG del hero y los acentos visuales distribuidos en la landing."
                      checked={draft.landing.decorativeIllustrationsEnabled === 'true'}
                      onCheckedChange={(value) => update('landing', 'decorativeIllustrationsEnabled', String(value))}
                      onReset={() => resetField('landing', 'decorativeIllustrationsEnabled')}
                    />
                  </div>}
                  {(landingIconFields[group.id]?.length ?? 0) > 0 && <section className="space-y-5" aria-labelledby={`${group.id}-icons-title`}>
                    <div>
                      <h4 id={`${group.id}-icons-title`} className="text-base">Iconos de {group.label.toLowerCase()}</h4>
                      <p className="mt-2 text-sm text-muted-foreground">Elige símbolos de una misma biblioteca para mantener la consistencia visual.</p>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      {landingIconFields[group.id].map(([key, label]) => (
                        <ConfigField key={key} label={label} onReset={() => resetField('landing', key)}>
                          <Select value={draft.landing[key]} onValueChange={(value) => update('landing', key, value)}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>{iconOptions.map(([value, optionLabel]) => <SelectItem key={value} value={value}>{optionLabel}</SelectItem>)}</SelectContent>
                          </Select>
                        </ConfigField>
                      ))}
                    </div>
                  </section>}
                  {group.id === 'banner' && <Button type="button" variant="outline" onClick={() => setActiveTab('media')}>
                    <Images aria-hidden="true" /> Editar imágenes del banner
                  </Button>}
                </TabsContent>
              ))}
            </Tabs>
            <FormActions saving={saving === 'landing'} dirty={isDirty('landing')} onReset={() => void resetSection('landing')} />
          </form>
        </TabsContent>

        <TabsContent value="media">
          <div className="space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-5"><div><h2 className="text-xl">Logos e imágenes</h2><p className="mt-2 text-sm text-muted-foreground">PNG, JPG o WebP de hasta 5 MB. Cada recurso conserva una versión Brunexa predeterminada.</p></div><ResetConfirm label="Restaurar todos" description="Se eliminarán todos los recursos personalizados y volverán los logos y fotografías Brunexa predeterminados." onConfirm={() => void resetAssets()} disabled={saving === 'media' || uploading !== null} /></div>
            <div className="divide-y rounded-xl border bg-card">
              {assetDefinitions.map((asset) => {
                const customized = Boolean(assets[asset.key])
                const source = assets[asset.key] ?? asset.fallback
                return <div key={asset.key} className="grid gap-5 p-5 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-center">
                  <div className={`flex h-24 items-center justify-center overflow-hidden rounded-lg ${asset.darkPreview ? 'bg-[#172326]' : 'bg-muted'}`}>
                    <img src={source} alt="" className={asset.compact ? 'h-16 w-32 object-contain' : 'h-full w-full object-cover'} />
                  </div>
                  <div className="min-w-0"><h3 className="text-base">{asset.title}</h3><p className="mt-1 text-sm text-muted-foreground">{asset.description}</p><p className="mt-2 text-xs font-medium text-brand-teal">{customized ? 'Personalizado' : 'Predeterminado'}</p></div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Label htmlFor={`asset-${asset.key}`} className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent">
                      <Upload className="size-4" aria-hidden="true" />{uploading === asset.key ? 'Subiendo…' : 'Cambiar'}
                    </Label>
                    <Input id={`asset-${asset.key}`} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
                      disabled={uploading !== null} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAsset(asset.key, file); event.target.value = '' }} />
                    <ResetConfirm compact label={`Restaurar ${asset.title}`}
                      description={`Se eliminará el recurso personalizado “${asset.title}” y volverá la versión Brunexa predeterminada.`}
                      onConfirm={() => void resetAsset(asset.key)} disabled={!customized || uploading !== null} />
                  </div>
                </div>
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="credit">
          <form onSubmit={submit('credit')} className="max-w-4xl space-y-8">
            <div><h2 className="text-xl">Configuración general de créditos</h2><p className="mt-2 text-sm text-muted-foreground">Controla la disponibilidad del módulo y las funciones que podrán utilizar los productos de crédito.</p></div>
            <ConfigField label="Nombre visible del módulo" onReset={() => resetField('credit', 'displayName')}><Input value={draft.credit.displayName} onChange={(event) => update('credit', 'displayName', event.target.value)} maxLength={80} required /></ConfigField>
            <div className="rounded-xl border bg-card px-5">
              <ToggleRow label="Mostrar créditos en el sitio público" description="Controla la navegación, los servicios y la sección pública de créditos." checked={draft.credit.moduleEnabled === 'true'} onCheckedChange={(value) => update('credit', 'moduleEnabled', String(value))} onReset={() => resetField('credit', 'moduleEnabled')} />
              <ToggleRow label="Habilitar simulador" description="Permite generar escenarios de pago desde la vista pública." checked={draft.credit.simulatorEnabled === 'true'} onCheckedChange={(value) => update('credit', 'simulatorEnabled', String(value))} onReset={() => resetField('credit', 'simulatorEnabled')} />
              <ToggleRow label="Sistema francés" description="Incluye cuotas periódicas constantes entre las opciones de amortización." checked={draft.credit.frenchSystemEnabled === 'true'} onCheckedChange={(value) => update('credit', 'frenchSystemEnabled', String(value))} onReset={() => resetField('credit', 'frenchSystemEnabled')} />
              <ToggleRow label="Sistema alemán" description="Incluye amortización de capital constante entre las opciones." checked={draft.credit.germanSystemEnabled === 'true'} onCheckedChange={(value) => update('credit', 'germanSystemEnabled', String(value))} onReset={() => resetField('credit', 'germanSystemEnabled')} />
              <ToggleRow label="Cobros indirectos" description="Permite incorporar seguros y otros cargos configurados en la tabla." checked={draft.credit.indirectChargesEnabled === 'true'} onCheckedChange={(value) => update('credit', 'indirectChargesEnabled', String(value))} onReset={() => resetField('credit', 'indirectChargesEnabled')} />
              <ToggleRow label="Reporte PDF" description="Permite descargar el detalle de la simulación cuando el generador esté disponible." checked={draft.credit.pdfReportEnabled === 'true'} onCheckedChange={(value) => update('credit', 'pdfReportEnabled', String(value))} onReset={() => resetField('credit', 'pdfReportEnabled')} />
            </div>
            <FormActions saving={saving === 'credit'} dirty={isDirty('credit')} onReset={() => void resetSection('credit')} />
          </form>
        </TabsContent>

        <TabsContent value="investment">
          <form onSubmit={submit('investment')} className="max-w-4xl space-y-8">
            <div><h2 className="text-xl">Configuración general de inversiones</h2><p className="mt-2 text-sm text-muted-foreground">Controla la disponibilidad y las etapas digitales del futuro proceso de inversión.</p></div>
            <ConfigField label="Nombre visible del módulo" onReset={() => resetField('investment', 'displayName')}><Input value={draft.investment.displayName} onChange={(event) => update('investment', 'displayName', event.target.value)} maxLength={80} required /></ConfigField>
            <div className="rounded-xl border bg-card px-5">
              <ToggleRow label="Mostrar inversiones en el sitio público" description="Controla la navegación, los servicios y la sección pública de inversiones." checked={draft.investment.moduleEnabled === 'true'} onCheckedChange={(value) => update('investment', 'moduleEnabled', String(value))} onReset={() => resetField('investment', 'moduleEnabled')} />
              <ToggleRow label="Habilitar simulador" description="Permite generar proyecciones desde la vista pública." checked={draft.investment.simulatorEnabled === 'true'} onCheckedChange={(value) => update('investment', 'simulatorEnabled', String(value))} onReset={() => resetField('investment', 'simulatorEnabled')} />
              <ToggleRow label="Solicitud en línea" description="Permite continuar una proyección desde una cuenta identificada." checked={draft.investment.onlineApplicationEnabled === 'true'} onCheckedChange={(value) => update('investment', 'onlineApplicationEnabled', String(value))} onReset={() => resetField('investment', 'onlineApplicationEnabled')} />
              <ToggleRow label="Carga de documentos" description="Incorpora documentación dentro del proceso de solicitud." checked={draft.investment.documentUploadEnabled === 'true'} onCheckedChange={(value) => update('investment', 'documentUploadEnabled', String(value))} onReset={() => resetField('investment', 'documentUploadEnabled')} />
              <ToggleRow label="Validación de identidad" description="Activa la etapa prevista para controles biométricos y documentales." checked={draft.investment.identityValidationEnabled === 'true'} onCheckedChange={(value) => update('investment', 'identityValidationEnabled', String(value))} onReset={() => resetField('investment', 'identityValidationEnabled')} />
            </div>
            <FormActions saving={saving === 'investment'} dirty={isDirty('investment')} onReset={() => void resetSection('investment')} />
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
