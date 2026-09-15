import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ExternalLink, Info, RotateCcw, Save, Upload } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import fullDark from '@/assets/bank/Full-dark-mode.png'
import fullLight from '@/assets/bank/Full.png'
import markDark from '@/assets/bank/logo-dark-mode.png'
import markLight from '@/assets/bank/logo.png'
import creditImage from '@/assets/landing/brunexa-creditos.png'
import heroImage from '@/assets/landing/brunexa-hero.png'
import investmentImage from '@/assets/landing/brunexa-inversiones.png'
import { settingsQueryKey, useInstitutionSettings } from '@/app/providers/settings-provider'
import {
  defaultInstitutionSettings,
  mergeSettings,
  type AssetKey,
  type InstitutionSettings,
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

const fontOptions = ['Libre Baskerville', 'Inter', 'Georgia', 'Times New Roman', 'Arial', 'system-ui']
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
  { key: 'heroImage', title: 'Imagen principal', description: 'Fotografía de apertura de la landing.', fallback: heroImage },
  { key: 'creditImage', title: 'Imagen de créditos', description: 'Fotografía de la sección pública de créditos.', fallback: creditImage },
  { key: 'investmentImage', title: 'Imagen de inversiones', description: 'Fotografía de la sección pública de inversiones.', fallback: investmentImage },
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
  const query = useQuery({
    queryKey: ['admin', 'institution-settings'],
    queryFn: async () => (await api.get<SettingsResponse>('/admin/settings')).data,
  })
  const [draft, setDraft] = useState<InstitutionSettings>(defaultInstitutionSettings)
  const [activeTab, setActiveTab] = useState<SettingsTab>('institution')
  const [saving, setSaving] = useState<SettingsTab | null>(null)
  const [uploading, setUploading] = useState<AssetKey | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (query.data) setDraft(mergeSettings(query.data).sections)
  }, [query.data])

  function update(section: SettingsSection, key: string, value: string) {
    setDraft((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }))
    setMessage('')
    setError('')
  }

  function resetField(section: SettingsSection, key: string) {
    const value = (defaultInstitutionSettings[section] as unknown as Record<string, string>)[key]
    update(section, key, value)
  }

  function applyResponse(response: SettingsResponse) {
    const merged = mergeSettings(response)
    client.setQueryData(['admin', 'institution-settings'], response)
    client.setQueryData(settingsQueryKey, response)
    setDraft(merged.sections)
  }

  async function saveSection(section: SettingsSection) {
    setSaving(section)
    setMessage('')
    setError('')
    try {
      const { data } = await api.put<SettingsResponse>(`/admin/settings/sections/${section}`, { values: draft[section] })
      applyResponse(data)
    } catch (saveError) {
      setError(requestError(saveError))
    } finally {
      setSaving(null)
    }
  }

  async function resetSection(section: SettingsSection) {
    setSaving(section)
    setMessage('')
    setError('')
    try {
      const { data } = await api.delete<SettingsResponse>(`/admin/settings/sections/${section}`)
      applyResponse(data)
      setMessage('La pestaña volvió a los valores Brunexa predeterminados.')
    } catch (resetError) {
      setError(requestError(resetError))
    } finally {
      setSaving(null)
    }
  }

  async function uploadAsset(key: AssetKey, file: File) {
    setUploading(key)
    setMessage('')
    setError('')
    const body = new FormData()
    body.append('file', file)
    try {
      const { data } = await api.put<SettingsResponse>(`/admin/settings/assets/${key}`, body, {
        headers: { 'Content-Type': null },
      })
      applyResponse(data)
      setMessage('Recurso gráfico actualizado y aplicado al sitio público.')
    } catch (uploadError) {
      setError(requestError(uploadError))
    } finally {
      setUploading(null)
    }
  }

  async function resetAsset(key: AssetKey) {
    setUploading(key)
    setMessage('')
    setError('')
    try {
      const { data } = await api.delete<SettingsResponse>(`/admin/settings/assets/${key}`)
      applyResponse(data)
      setMessage('El recurso volvió a la imagen Brunexa predeterminada.')
    } catch (resetError) {
      setError(requestError(resetError))
    } finally {
      setUploading(null)
    }
  }

  async function resetAssets() {
    setSaving('media')
    setMessage('')
    setError('')
    try {
      const { data } = await api.delete<SettingsResponse>('/admin/settings/assets')
      applyResponse(data)
      setMessage('Todos los recursos gráficos volvieron a sus versiones predeterminadas.')
    } catch (resetError) {
      setError(requestError(resetError))
    } finally {
      setSaving(null)
    }
  }

  if (query.isPending) return <p className="py-10 text-sm text-muted-foreground">Cargando configuración institucional…</p>
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

      {message && <p role="status" className="text-sm text-foreground">{message}</p>}
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
          <form onSubmit={submit('landing')} className="max-w-4xl space-y-10">
            <div><h2 className="text-xl">Contenido de la landing</h2><p className="mt-2 text-sm text-muted-foreground">Edita los mensajes principales sin cambiar la estructura de la página.</p></div>
            <section className="space-y-6"><h3 className="text-base">Portada</h3><div className="grid gap-6 sm:grid-cols-2">
              <ConfigField label="Título principal" onReset={() => resetField('landing', 'heroTitle')}><Input value={draft.landing.heroTitle} onChange={(event) => update('landing', 'heroTitle', event.target.value)} maxLength={120} required /></ConfigField>
              <ConfigField label="Texto destacado" hint="Se muestra con el color principal." onReset={() => resetField('landing', 'heroHighlight')}><Input value={draft.landing.heroHighlight} onChange={(event) => update('landing', 'heroHighlight', event.target.value)} maxLength={80} required /></ConfigField>
            </div><ConfigField label="Descripción principal" onReset={() => resetField('landing', 'heroDescription')}><Textarea value={draft.landing.heroDescription} onChange={(event) => update('landing', 'heroDescription', event.target.value)} maxLength={500} required /></ConfigField></section>
            <section className="space-y-6 border-t pt-8"><h3 className="text-base">Servicios</h3><ConfigField label="Título de servicios" onReset={() => resetField('landing', 'servicesTitle')}><Input value={draft.landing.servicesTitle} onChange={(event) => update('landing', 'servicesTitle', event.target.value)} maxLength={140} required /></ConfigField><ConfigField label="Descripción de servicios" onReset={() => resetField('landing', 'servicesDescription')}><Textarea value={draft.landing.servicesDescription} onChange={(event) => update('landing', 'servicesDescription', event.target.value)} maxLength={500} required /></ConfigField></section>
            <section className="space-y-6 border-t pt-8"><div><h3 className="text-base">Iconos de servicios</h3><p className="mt-2 text-sm text-muted-foreground">Selecciona símbolos de una misma biblioteca para mantener consistencia visual.</p></div><div className="grid gap-6 sm:grid-cols-2">
              {[
                ['creditServiceIcon', 'Simulador de crédito'],
                ['amortizationServiceIcon', 'Tabla de amortización'],
                ['investmentServiceIcon', 'Proyección de inversión'],
                ['applicationServiceIcon', 'Solicitud digital'],
              ].map(([key, label]) => <ConfigField key={key} label={label} onReset={() => resetField('landing', key)}><Select value={(draft.landing as unknown as Record<string, string>)[key]} onValueChange={(value) => update('landing', key, value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{iconOptions.map(([value, optionLabel]) => <SelectItem key={value} value={value}>{optionLabel}</SelectItem>)}</SelectContent></Select></ConfigField>)}
            </div></section>
            <section className="space-y-6 border-t pt-8"><h3 className="text-base">Créditos e inversiones</h3><div className="grid gap-6 sm:grid-cols-2"><ConfigField label="Título de créditos" onReset={() => resetField('landing', 'creditTitle')}><Input value={draft.landing.creditTitle} onChange={(event) => update('landing', 'creditTitle', event.target.value)} maxLength={160} required /></ConfigField><ConfigField label="Título de inversiones" onReset={() => resetField('landing', 'investmentTitle')}><Input value={draft.landing.investmentTitle} onChange={(event) => update('landing', 'investmentTitle', event.target.value)} maxLength={160} required /></ConfigField><ConfigField label="Descripción de créditos" onReset={() => resetField('landing', 'creditDescription')}><Textarea value={draft.landing.creditDescription} onChange={(event) => update('landing', 'creditDescription', event.target.value)} maxLength={500} required /></ConfigField><ConfigField label="Descripción de inversiones" onReset={() => resetField('landing', 'investmentDescription')}><Textarea value={draft.landing.investmentDescription} onChange={(event) => update('landing', 'investmentDescription', event.target.value)} maxLength={500} required /></ConfigField></div></section>
            <ConfigField label="Título del proceso" onReset={() => resetField('landing', 'processTitle')}><Input value={draft.landing.processTitle} onChange={(event) => update('landing', 'processTitle', event.target.value)} maxLength={160} required /></ConfigField>
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
