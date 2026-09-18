import { useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Save, Building2, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { institutionService } from '@/features/institucion/services/institution.service'
import { useQueryClient } from '@tanstack/react-query'

const schema = z.object({
  nombre:              z.string().min(1, 'Requerido').max(200),
  nombreComercial:     z.string().max(200).optional(),
  ruc:                 z.string().max(13).optional(),
  logoUrl:             z.string().optional(),
  direccion:           z.string().max(500).optional(),
  telefono:            z.string().max(50).optional(),
  email:               z.string().email('Correo inválido').optional().or(z.literal('')),
  sitioWeb:            z.string().max(300).optional(),
  ciudad:              z.string().max(100).optional(),
  provincia:           z.string().max(100).optional(),
  descripcion:         z.string().optional(),
  horarios:            z.string().optional(),
  colorPrimario:       z.string().max(20).optional(),
  colorSecundario:     z.string().max(20).optional(),
  infoLegal:           z.string().optional(),
  terminosCondiciones: z.string().optional(),
  politicaPrivacidad:  z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function InstitucionPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['institution'],
    queryFn: institutionService.get,
  })

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {},
  })

  useEffect(() => {
    if (data) reset(data as FormData)
  }, [data, reset])

  const mutation = useMutation({
    mutationFn: institutionService.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution'] })
      toast.success('Configuración guardada correctamente')
    },
    onError: () => toast.error('Error al guardar la configuración'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración Institucional</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona la información de tu institución financiera
          </p>
        </div>
        <Button
          onClick={handleSubmit((dto) => mutation.mutate(dto))}
          disabled={mutation.isPending || !isDirty}
        >
          <Save className="w-4 h-4 mr-2" />
          {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="contacto">Contacto</TabsTrigger>
          <TabsTrigger value="apariencia">Apariencia</TabsTrigger>
          <TabsTrigger value="legal">Legal</TabsTrigger>
        </TabsList>

        {/* ── General ── */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Información general
              </CardTitle>
              <CardDescription>Datos básicos de la institución</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre oficial *" error={errors.nombre?.message}>
                <Input placeholder="Institución Financiera S.A." {...register('nombre')} />
              </Field>
              <Field label="Nombre comercial" error={errors.nombreComercial?.message}>
                <Input placeholder="Banco Ejemplo" {...register('nombreComercial')} />
              </Field>
              <Field label="RUC" error={errors.ruc?.message}>
                <Input placeholder="0123456789001" {...register('ruc')} />
              </Field>
              <Field label="Logo URL" error={errors.logoUrl?.message}>
                <Input placeholder="https://..." {...register('logoUrl')} />
              </Field>
              <Field label="Descripción" error={errors.descripcion?.message} className="md:col-span-2">
                <Textarea rows={3} placeholder="Descripción de la institución…" {...register('descripcion')} />
              </Field>
              <Field label="Horarios de atención" error={errors.horarios?.message} className="md:col-span-2">
                <Textarea rows={2} placeholder="Lunes a Viernes: 8:00 - 17:00…" {...register('horarios')} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contacto ── */}
        <TabsContent value="contacto">
          <Card>
            <CardHeader>
              <CardTitle>Información de contacto</CardTitle>
              <CardDescription>Datos de contacto y ubicación</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Dirección" error={errors.direccion?.message} className="md:col-span-2">
                <Input placeholder="Av. Principal 123 y Secundaria" {...register('direccion')} />
              </Field>
              <Field label="Ciudad" error={errors.ciudad?.message}>
                <Input placeholder="Quito" {...register('ciudad')} />
              </Field>
              <Field label="Provincia" error={errors.provincia?.message}>
                <Input placeholder="Pichincha" {...register('provincia')} />
              </Field>
              <Field label="Teléfono" error={errors.telefono?.message}>
                <Input placeholder="02-2345678" {...register('telefono')} />
              </Field>
              <Field label="Correo electrónico" error={errors.email?.message}>
                <Input type="email" placeholder="info@institucion.ec" {...register('email')} />
              </Field>
              <Field label="Sitio web" error={errors.sitioWeb?.message} className="md:col-span-2">
                <Input placeholder="https://www.institucion.ec" {...register('sitioWeb')} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Apariencia ── */}
        <TabsContent value="apariencia">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Apariencia
              </CardTitle>
              <CardDescription>Personalización visual de la plataforma</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Color primario" error={errors.colorPrimario?.message}>
                <div className="flex gap-2">
                  <Input type="color" className="w-12 h-9 p-1 cursor-pointer" {...register('colorPrimario')} />
                  <Input placeholder="#1e3a5f" {...register('colorPrimario')} />
                </div>
              </Field>
              <Field label="Color secundario" error={errors.colorSecundario?.message}>
                <div className="flex gap-2">
                  <Input type="color" className="w-12 h-9 p-1 cursor-pointer" {...register('colorSecundario')} />
                  <Input placeholder="#2e7d32" {...register('colorSecundario')} />
                </div>
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Legal ── */}
        <TabsContent value="legal">
          <Card>
            <CardHeader>
              <CardTitle>Información legal</CardTitle>
              <CardDescription>Textos legales, términos y privacidad</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Información legal general" error={errors.infoLegal?.message}>
                <Textarea rows={4} placeholder="Información legal de la institución…" {...register('infoLegal')} />
              </Field>
              <Field label="Términos y condiciones" error={errors.terminosCondiciones?.message}>
                <Textarea rows={6} placeholder="Términos y condiciones de uso del servicio…" {...register('terminosCondiciones')} />
              </Field>
              <Field label="Política de privacidad" error={errors.politicaPrivacidad?.message}>
                <Textarea rows={6} placeholder="Política de privacidad y tratamiento de datos…" {...register('politicaPrivacidad')} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Componente auxiliar de campo ─────────────────────────────────────────────

function Field({
  label, error, children, className,
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
