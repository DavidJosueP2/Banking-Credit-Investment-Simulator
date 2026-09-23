import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Building2,
  ShieldAlert,
  Save,
  RefreshCw,
  DollarSign,
  Calendar,
  Shield,
  AlertTriangle,
  Info,
  BadgeCheck,
  Percent,
  Sliders,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { creditosService } from '@/features/creditos/services/creditos.service'
import { type SistemaAmortizacion, type ConfigurarCreditoRequest } from '@/types'
import { useAuth } from '@/app/providers/auth-provider'

// ─── Segmentos Oficiales del Banco Central del Ecuador (BCE) ─────────────────

interface SegmentoBceInfo {
  id: string
  nombre: string
  tasaMaxima: number
  tasaSugerida: number
  montoMinSugerido: number
  montoMaximoLegal?: number
  plazoMinSugerido: number
  plazoMaximoMeses: number
  desgravamenSugerido: number
  categoria: 'PRODUCTIVO' | 'CONSUMO' | 'VIVIENDA' | 'MICROCREDITO' | 'EDUCATIVO'
  entidadesPermitidas: ('Banco' | 'Cooperativa')[]
}

const SEGMENTOS_BCE: SegmentoBceInfo[] = [
  // Productivo
  { id: 'PRODUCTIVO_CORPORATIVO', nombre: 'Productivo Corporativo', tasaMaxima: 9.33, tasaSugerida: 8.50, montoMinSugerido: 100000, montoMaximoLegal: 2000000, plazoMinSugerido: 12, plazoMaximoMeses: 60, desgravamenSugerido: 0.0200, categoria: 'PRODUCTIVO', entidadesPermitidas: ['Banco'] },
  { id: 'PRODUCTIVO_EMPRESARIAL', nombre: 'Productivo Empresarial', tasaMaxima: 10.21, tasaSugerida: 9.50, montoMinSugerido: 50000, montoMaximoLegal: 1000000, plazoMinSugerido: 12, plazoMaximoMeses: 60, desgravamenSugerido: 0.0250, categoria: 'PRODUCTIVO', entidadesPermitidas: ['Banco'] },
  { id: 'PRODUCTIVO_PYMES',       nombre: 'Productivo PYMES',       tasaMaxima: 11.83, tasaSugerida: 11.00, montoMinSugerido: 10000, montoMaximoLegal: 500000, plazoMinSugerido: 6, plazoMaximoMeses: 60, desgravamenSugerido: 0.0300, categoria: 'PRODUCTIVO', entidadesPermitidas: ['Banco', 'Cooperativa'] },
  // Consumo
  { id: 'CONSUMO_PRIORITARIO',    nombre: 'Consumo Prioritario',    tasaMaxima: 16.77, tasaSugerida: 14.00, montoMinSugerido: 500, montoMaximoLegal: 30000, plazoMinSugerido: 12, plazoMaximoMeses: 60, desgravamenSugerido: 0.0600, categoria: 'CONSUMO', entidadesPermitidas: ['Banco', 'Cooperativa'] },
  { id: 'CONSUMO_ORDINARIO',      nombre: 'Consumo Ordinario',      tasaMaxima: 17.30, tasaSugerida: 15.50, montoMinSugerido: 500, montoMaximoLegal: 30000, plazoMinSugerido: 12, plazoMaximoMeses: 60, desgravamenSugerido: 0.0700, categoria: 'CONSUMO', entidadesPermitidas: ['Banco', 'Cooperativa'] },
  // Vivienda / Inmobiliario
  { id: 'INMOBILIARIO',           nombre: 'Vivienda (Inmobiliario)',tasaMaxima: 10.40, tasaSugerida: 9.00, montoMinSugerido: 40000, montoMaximoLegal: 500000, plazoMinSugerido: 120, plazoMaximoMeses: 240, desgravamenSugerido: 0.0300, categoria: 'VIVIENDA', entidadesPermitidas: ['Banco', 'Cooperativa'] },
  { id: 'VIVIENDA_VIP',           nombre: 'Vivienda Interés Público (VIP)', tasaMaxima: 4.99, tasaSugerida: 4.99, montoMinSugerido: 40000, montoMaximoLegal: 105000, plazoMinSugerido: 120, plazoMaximoMeses: 240, desgravamenSugerido: 0.0200, categoria: 'VIVIENDA', entidadesPermitidas: ['Banco', 'Cooperativa'] },
  { id: 'VIVIENDA_VIS',           nombre: 'Vivienda Interés Social (VIS)',  tasaMaxima: 4.99, tasaSugerida: 4.99, montoMinSugerido: 40000, montoMaximoLegal: 80000, plazoMinSugerido: 120, plazoMaximoMeses: 240, desgravamenSugerido: 0.0200, categoria: 'VIVIENDA', entidadesPermitidas: ['Banco', 'Cooperativa'] },
  // Microcrédito
  { id: 'MICROCREDITO_MINORISTA', nombre: 'Microcrédito Minorista', tasaMaxima: 28.23, tasaSugerida: 20.00, montoMinSugerido: 500, montoMaximoLegal: 3000, plazoMinSugerido: 3, plazoMaximoMeses: 36, desgravamenSugerido: 0.0800, categoria: 'MICROCREDITO', entidadesPermitidas: ['Cooperativa'] },
  { id: 'MICROCREDITO_SIMPLE',    nombre: 'Microcrédito Acumulación Simple', tasaMaxima: 25.50, tasaSugerida: 18.00, montoMinSugerido: 3000, montoMaximoLegal: 10000, plazoMinSugerido: 6, plazoMaximoMeses: 48, desgravamenSugerido: 0.0750, categoria: 'MICROCREDITO', entidadesPermitidas: ['Cooperativa'] },
  { id: 'MICROCREDITO_AMPLIADA',  nombre: 'Microcrédito Acumulación Ampliada', tasaMaxima: 25.50, tasaSugerida: 22.00, montoMinSugerido: 10000, montoMaximoLegal: 30000, plazoMinSugerido: 12, plazoMaximoMeses: 60, desgravamenSugerido: 0.0700, categoria: 'MICROCREDITO', entidadesPermitidas: ['Cooperativa'] },
  // Educativo
  { id: 'EDUCATIVO',              nombre: 'Educativo',              tasaMaxima: 9.50, tasaSugerida: 8.00, montoMinSugerido: 1000, montoMaximoLegal: 20000, plazoMinSugerido: 12, plazoMaximoMeses: 84, desgravamenSugerido: 0.0300, categoria: 'EDUCATIVO', entidadesPermitidas: ['Banco', 'Cooperativa'] },
]

// ─── Normativa Oficial Diferenciada por Tipo de Entidad (BCE / SB / SEPS) ───

export const NORMATIVA_ENTIDAD = {
  Banco: {
    nombre: 'Banco Comercial / Privado',
    regulador: 'Superintendencia de Bancos & BCE',
    desgravamenMin: 0.0100,
    desgravamenMax: 0.0650,
    desgravamenSugerido: 0.0600,
    tasaAbsolutaMaxima: 17.30,
    descripcion: 'Regulado por la Superintendencia de Bancos. Desgravamen legal: 0.0100% - 0.0650% mensual. Topes BCE vigentes.',
  },
  Cooperativa: {
    nombre: 'Cooperativa de Ahorro y Crédito',
    regulador: 'SEPS & BCE',
    desgravamenMin: 0.0400,
    desgravamenMax: 0.1200,
    desgravamenSugerido: 0.0700,
    tasaAbsolutaMaxima: 28.23,
    descripcion: 'Regulado por la SEPS. Desgravamen legal: 0.0400% - 0.1200% mensual. Permite microcréditos hasta 28.23% según BCE.',
  },
} as const

// ─── Esquema Zod para Validación del Formulario de Asesor / Administrador ───

const formSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  entidad: z.enum(['Banco', 'Cooperativa'], { message: 'Seleccione la entidad (Banco o Cooperativa)' }),
  segmentoBce: z.string().min(1, 'Seleccione un segmento regulatorio del BCE'),
  montoMin: z.number({ message: 'Monto mínimo inválido' }).min(50, 'El monto mínimo no puede ser menor a $50'),
  montoMax: z.number({ message: 'Monto máximo inválido' }).min(50, 'El monto máximo no puede ser menor a $50'),
  plazoMinMeses: z.number().min(1, 'Plazo mínimo al menos 1 mes'),
  plazoMaxMeses: z.number().min(1, 'Plazo máximo al menos 1 mes'),
  tasaInteres: z.number().min(0.01, 'La tasa debe ser mayor a 0%'),
  tasaDesgravamenMensual: z.number({ message: 'Desgravamen inválido' }).min(0.0001, 'El desgravamen debe ser mayor a 0%'),
  permiteFrances: z.boolean(),
  permiteAleman: z.boolean(),
  descripcion: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.montoMax < data.montoMin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El monto máximo no puede ser menor al monto mínimo',
      path: ['montoMax'],
    })
  }
  if (data.plazoMaxMeses < data.plazoMinMeses) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El plazo máximo no puede ser menor al plazo mínimo',
      path: ['plazoMaxMeses'],
    })
  }
  if (!data.permiteFrances && !data.permiteAleman) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debe habilitar al menos un sistema de amortización',
      path: ['permiteFrances'],
    })
  }

  // Validación de Tasa contra Techo Legal del Segmento BCE
  const seg = SEGMENTOS_BCE.find((s) => s.id === data.segmentoBce)
  if (seg && data.tasaInteres > seg.tasaMaxima) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `La tasa (${data.tasaInteres}%) supera el tope legal del BCE (${seg.tasaMaxima}%) para ${seg.nombre}`,
      path: ['tasaInteres'],
    })
  }

  // Validación dinámica de Seguro de Desgravamen según Entidad (Banco vs Cooperativa)
  const norm = NORMATIVA_ENTIDAD[data.entidad]
  if (norm) {
    if (data.tasaDesgravamenMensual < norm.desgravamenMin || data.tasaDesgravamenMensual > norm.desgravamenMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Para ${data.entidad}, el desgravamen mensual debe ubicarse entre ${norm.desgravamenMin}% y ${norm.desgravamenMax}% (${norm.regulador})`,
        path: ['tasaDesgravamenMensual'],
      })
    }
  }
})

type FormValues = z.infer<typeof formSchema>

export function ConfiguradorCreditoPage() {
  const [filtroEntidadTabla, setFiltroEntidadTabla] = useState<'TODOS' | 'BANCO' | 'COOPERATIVA'>('TODOS')
  const queryClient = useQueryClient()
  const { account, hasPermission } = useAuth()

  // ─── Control de Acceso Basado en Roles (RBAC) ──────────────────────────
  // Solo Administrador o Asesor de crédito tienen autorización para parametrizar
  const roles = account?.roles?.map((r) => r.toLowerCase()) ?? []
  const esAdministrador = roles.includes('administrator') || roles.includes('admin') || roles.includes('role_administrator')
  const esAsesorCredito = roles.includes('credit_advisor') || roles.includes('asesor') || roles.includes('role_asesor') || roles.includes('role_credit_advisor')
  const esRolAutorizado = esAdministrador || esAsesorCredito || hasPermission('credit.products.manage')

  const usuario = account ? {
    nombre: account.fullName || account.username,
    apellido: '',
    email: account.email,
  } : null

  const { data: creditosConfigurados = [], isLoading: cargandoLista } = useQuery({
    queryKey: ['creditosConfigurados'],
    queryFn: creditosService.getConfigurados,
    enabled: esRolAutorizado,
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: 'Crédito Consumo Preferencial',
      entidad: 'Banco',
      segmentoBce: 'CONSUMO_PRIORITARIO',
      montoMin: 500,
      montoMax: 20000,
      plazoMinMeses: 6,
      plazoMaxMeses: 60,
      tasaInteres: 14.00,
      tasaDesgravamenMensual: 0.0600,
      permiteFrances: true,
      permiteAleman: true,
      descripcion: 'Crédito regulado según normativa vigente del BCE con desgravamen mensual sobre saldo deudor.',
    },
  })

  const entidadActual = watch('entidad') as 'Banco' | 'Cooperativa'
  const segmentoActualId = watch('segmentoBce')
  const tasaActual = watch('tasaInteres')
  const permiteFrances = watch('permiteFrances')
  const permiteAleman = watch('permiteAleman')

  // Normativa dinámica según tipo de entidad (Banco vs Cooperativa)
  const normativaActual = NORMATIVA_ENTIDAD[entidadActual] || NORMATIVA_ENTIDAD.Banco
  const desgravamenActual = watch('tasaDesgravamenMensual')
  const desgravamenFueraDeRango =
    desgravamenActual < normativaActual.desgravamenMin || desgravamenActual > normativaActual.desgravamenMax

  // Catálogo dinámico de segmentos filtrado y priorizado por tipo de entidad
  const segmentosDisponibles = useMemo(() => {
    if (entidadActual === 'Cooperativa') {
      return SEGMENTOS_BCE.filter((s) => s.entidadesPermitidas.includes('Cooperativa'))
        .sort((a, b) => {
          if (a.categoria === 'MICROCREDITO' && b.categoria !== 'MICROCREDITO') return -1
          if (a.categoria !== 'MICROCREDITO' && b.categoria === 'MICROCREDITO') return 1
          return 0
        })
    }
    return SEGMENTOS_BCE.filter((s) => s.entidadesPermitidas.includes('Banco'))
  }, [entidadActual])

  const infoSegmento = SEGMENTOS_BCE.find((s) => s.id === segmentoActualId) || segmentosDisponibles[0] || SEGMENTOS_BCE[3]
  const tasaSuperaTope = tasaActual > infoSegmento.tasaMaxima

  const listaFiltrada = useMemo(() => {
    return creditosConfigurados.filter((c) => {
      if (filtroEntidadTabla === 'BANCO') return c.entidad?.toLowerCase().includes('banco')
      if (filtroEntidadTabla === 'COOPERATIVA') return c.entidad?.toLowerCase().includes('cooperativa')
      return true
    })
  }, [creditosConfigurados, filtroEntidadTabla])

  const mutation = useMutation({
    mutationFn: (data: ConfigurarCreditoRequest) => creditosService.configurarCredito(data),
    onSuccess: (resp) => {
      toast.success('Producto de crédito guardado exitosamente', {
        description: `${resp.nombre} (${resp.entidad}) configurado y disponible en el motor de simulación.`,
      })
      queryClient.invalidateQueries({ queryKey: ['creditosConfigurados'] })
      queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Error al guardar la configuración'
      toast.error('Error al guardar el producto', { description: msg })
    },
  })

  const onSubmit = (values: FormValues) => {
    const sistemas: SistemaAmortizacion[] = []
    if (values.permiteFrances) sistemas.push('FRANCES')
    if (values.permiteAleman) sistemas.push('ALEMAN')

    mutation.mutate({
      nombre: values.nombre,
      entidad: values.entidad,
      segmentoBce: values.segmentoBce,
      montoMin: values.montoMin,
      montoMax: values.montoMax,
      plazoMinMeses: values.plazoMinMeses,
      plazoMaxMeses: values.plazoMaxMeses,
      tasaInteres: values.tasaInteres,
      tasaDesgravamenMensual: values.tasaDesgravamenMensual,
      sistemasPermitidos: sistemas,
      descripcion: values.descripcion,
    })
  }

  // ─── Renderizado de Bloqueo para Roles No Autorizados ────────────────────
  if (!esRolAutorizado) {
    return (
      <div className="mx-auto max-w-xl py-20 px-4 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Acceso Restringido</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Esta vista y la configuración de tasas de crédito y seguro de desgravamen están reservadas exclusivamente para usuarios con rol de <strong>Administrador</strong> o <strong>Asesor de crédito</strong>.
        </p>
        <div className="pt-2">
          <Button asChild variant="outline">
            <Link to="/simulador">Ir al Simulador Público</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8 sm:px-6 lg:px-8">
      {/* ── Header Ejecutivo Asesor ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Configuración de Productos de Crédito
            </h1>
            <Badge className="bg-brand-teal/15 text-brand-teal border-brand-teal/30 font-medium text-xs">
              <BadgeCheck className="w-3.5 h-3.5 mr-1" />
              Rol: {esAdministrador ? 'Administrador' : 'Asesor de crédito'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Parametriza entidades, segmentos BCE, rangos de monto, plazos, tasas y seguro de desgravamen.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col text-right text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{usuario?.nombre} {usuario?.apellido}</span>
            <span>{usuario?.email}</span>
          </div>
          <Badge variant="outline" className="border-brand-gold/40 text-brand-gold dark:text-brand-gold bg-brand-gold/5 font-mono text-xs">
            Normativa BCE 2026
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Formulario Avanzado de Configuración (Exclusivo Asesor) ──────── */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-brand-teal/10 text-brand-teal">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold font-sans text-foreground">
                    Parametrizar Nuevo Crédito
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Define las reglas financieras aplicables a la simulación
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-5">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* 1. Nombre del Producto */}
                <div className="space-y-1.5">
                  <Label htmlFor="nombre" className="text-xs font-semibold text-foreground">
                    Nombre Comercial del Producto *
                  </Label>
                  <Input
                    id="nombre"
                    placeholder="Ej. Crédito de Consumo Preferencial"
                    className="text-xs"
                    {...register('nombre')}
                  />
                  {errors.nombre && (
                    <p className="text-[11px] text-destructive">{errors.nombre.message}</p>
                  )}
                </div>

                {/* 2. Entidad Financiera */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Entidad Financiera *
                  </Label>
                  <Controller
                    name="entidad"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val)
                          if (val === 'Cooperativa') {
                            const segAct = SEGMENTOS_BCE.find((s) => s.id === watch('segmentoBce'))
                            if (!segAct?.entidadesPermitidas.includes('Cooperativa')) {
                              setValue('segmentoBce', 'MICROCREDITO_MINORISTA')
                              setValue('nombre', 'Microcrédito Minorista Solidario')
                              setValue('tasaInteres', 20.00)
                              setValue('montoMin', 500)
                              setValue('montoMax', 3000)
                              setValue('plazoMinMeses', 3)
                              setValue('plazoMaxMeses', 36)
                              setValue('tasaDesgravamenMensual', 0.0800)
                            }
                          } else if (val === 'Banco') {
                            const segAct = SEGMENTOS_BCE.find((s) => s.id === watch('segmentoBce'))
                            if (!segAct?.entidadesPermitidas.includes('Banco')) {
                              setValue('segmentoBce', 'CONSUMO_PRIORITARIO')
                              setValue('nombre', 'Crédito Consumo Preferencial')
                              setValue('tasaInteres', 14.00)
                              setValue('montoMin', 500)
                              setValue('montoMax', 30000)
                              setValue('plazoMinMeses', 12)
                              setValue('plazoMaxMeses', 60)
                              setValue('tasaDesgravamenMensual', 0.0600)
                            }
                          }
                        }}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Seleccione el tipo de entidad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Banco">Banco Comercial / Privado</SelectItem>
                          <SelectItem value="Cooperativa">Cooperativa de Ahorro y Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.entidad && (
                    <p className="text-[11px] text-destructive">{errors.entidad.message}</p>
                  )}

                  {/* Ficha Dinámica de Normativa Legal por Tipo de Entidad */}
                  <div className="p-2.5 rounded-lg border border-border bg-muted/30 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-foreground font-medium">
                      <span>Normativa: {normativaActual.regulador}</span>
                      <span className="font-mono text-brand-teal font-semibold">
                        Desgravamen: {normativaActual.desgravamenMin}% - {normativaActual.desgravamenMax}%/mes
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[10.5px] leading-relaxed">
                      {normativaActual.descripcion}
                    </p>
                  </div>
                </div>

                {/* 3. Segmento Regulatorio BCE */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Segmento Regulatorio BCE *
                    </Label>
                    <span className="text-[11px] font-mono text-brand-teal font-medium">
                      Tope legal: {infoSegmento.tasaMaxima}%
                    </span>
                  </div>
                  <Controller
                    name="segmentoBce"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val)
                          const seg = SEGMENTOS_BCE.find((s) => s.id === val)
                          if (seg) {
                            setValue('tasaInteres', seg.tasaSugerida)
                            setValue('montoMin', seg.montoMinSugerido)
                            if (seg.montoMaximoLegal) {
                              setValue('montoMax', seg.montoMaximoLegal)
                            }
                            setValue('plazoMinMeses', seg.plazoMinSugerido)
                            setValue('plazoMaxMeses', seg.plazoMaximoMeses)
                            setValue('tasaDesgravamenMensual', seg.desgravamenSugerido)
                            setValue('nombre', `Crédito ${seg.nombre}`)
                          }
                        }}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Seleccione el segmento BCE" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {segmentosDisponibles.map((seg) => (
                            <SelectItem key={seg.id} value={seg.id} className="text-xs">
                              {seg.nombre} (Máx {seg.tasaMaxima}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.segmentoBce && (
                    <p className="text-[11px] text-destructive">{errors.segmentoBce.message}</p>
                  )}
                </div>

                {/* 4. Rangos de Monto (Mínimo / Máximo) */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="montoMin" className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      Monto Mínimo ($)
                    </Label>
                    <Input
                      id="montoMin"
                      type="number"
                      step="50"
                      className="text-xs font-mono"
                      {...register('montoMin', { valueAsNumber: true })}
                    />
                    {errors.montoMin && (
                      <p className="text-[11px] text-destructive">{errors.montoMin.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="montoMax" className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      Monto Máximo ($)
                    </Label>
                    <Input
                      id="montoMax"
                      type="number"
                      step="50"
                      className="text-xs font-mono"
                      {...register('montoMax', { valueAsNumber: true })}
                    />
                    {errors.montoMax && (
                      <p className="text-[11px] text-destructive">{errors.montoMax.message}</p>
                    )}
                  </div>
                </div>

                {/* 5. Rangos de Plazo (Meses) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="plazoMinMeses" className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      Plazo Mín (meses)
                    </Label>
                    <Input
                      id="plazoMinMeses"
                      type="number"
                      min="1"
                      className="text-xs font-mono"
                      {...register('plazoMinMeses', { valueAsNumber: true })}
                    />
                    {errors.plazoMinMeses && (
                      <p className="text-[11px] text-destructive">{errors.plazoMinMeses.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="plazoMaxMeses" className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      Plazo Máx (meses)
                    </Label>
                    <Input
                      id="plazoMaxMeses"
                      type="number"
                      min="1"
                      className="text-xs font-mono"
                      {...register('plazoMaxMeses', { valueAsNumber: true })}
                    />
                    {errors.plazoMaxMeses && (
                      <p className="text-[11px] text-destructive">{errors.plazoMaxMeses.message}</p>
                    )}
                  </div>
                </div>

                {/* 6. Tasa Nominal Anual y Desgravamen Mensual */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="tasaInteres" className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-brand-teal" />
                      Tasa Nominal Anual (%)
                    </Label>
                    <Input
                      id="tasaInteres"
                      type="number"
                      step="0.01"
                      className={`text-xs font-mono ${
                        tasaSuperaTope
                          ? 'border-destructive focus-visible:ring-destructive bg-destructive/5'
                          : 'focus-visible:ring-brand-teal'
                      }`}
                      {...register('tasaInteres', { valueAsNumber: true })}
                    />
                    {errors.tasaInteres && (
                      <p className="text-[11px] text-destructive">{errors.tasaInteres.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="desgravamen" className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-brand-gold" />
                        Desgravamen Mensual (%)
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {normativaActual.desgravamenMin}% - {normativaActual.desgravamenMax}%
                      </span>
                    </Label>
                    <Input
                      id="desgravamen"
                      type="number"
                      step="0.001"
                      className={`text-xs font-mono ${
                        desgravamenFueraDeRango
                          ? 'border-destructive focus-visible:ring-destructive bg-destructive/5'
                          : 'focus-visible:ring-brand-teal'
                      }`}
                      {...register('tasaDesgravamenMensual', { valueAsNumber: true })}
                    />
                    {errors.tasaDesgravamenMensual && (
                      <p className="text-[11px] text-destructive">{errors.tasaDesgravamenMensual.message}</p>
                    )}
                  </div>
                </div>

                {/* Alerta si supera tope regulatorio BCE */}
                {tasaSuperaTope && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Violación de Tasa Máxima Legal (BCE)</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">
                        La tasa de {tasaActual}% supera el techo regulatorio de {infoSegmento.tasaMaxima}% para el segmento {infoSegmento.nombre}. No se permite guardar créditos con usura.
                      </p>
                    </div>
                  </div>
                )}

                {/* Alerta si desgravamen está fuera del rango legal para la entidad */}
                {desgravamenFueraDeRango && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Desgravamen fuera de rango normativo ({entidadActual})</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">
                        Para {entidadActual === 'Banco' ? 'Bancos (Superintendencia de Bancos)' : 'Cooperativas (SEPS)'}, el seguro de desgravamen debe ubicarse entre {normativaActual.desgravamenMin}% y {normativaActual.desgravamenMax}% mensual.
                      </p>
                    </div>
                  </div>
                )}

                {/* 7. Sistemas de Amortización Permitidos */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Sistemas de Amortización Autorizados *
                  </Label>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                      permiteFrances
                        ? 'border-brand-teal bg-brand-teal/5 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted/30'
                    }`}>
                      <input
                        type="checkbox"
                        className="rounded border-input text-brand-teal focus:ring-brand-teal"
                        {...register('permiteFrances')}
                      />
                      <span className="font-medium">Francés (Cuota Fija)</span>
                    </label>

                    <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                      permiteAleman
                        ? 'border-brand-teal bg-brand-teal/5 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted/30'
                    }`}>
                      <input
                        type="checkbox"
                        className="rounded border-input text-brand-teal focus:ring-brand-teal"
                        {...register('permiteAleman')}
                      />
                      <span className="font-medium">Alemán (Capital Fijo)</span>
                    </label>
                  </div>
                  {errors.permiteFrances && (
                    <p className="text-[11px] text-destructive">{errors.permiteFrances.message}</p>
                  )}
                </div>

                {/* 8. Descripción / Observaciones */}
                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-xs text-muted-foreground">
                    Observaciones / Políticas de Otorgamiento (Opcional)
                  </Label>
                  <Textarea
                    id="desc"
                    rows={2}
                    placeholder="Condiciones específicas, garantías requeridas o políticas institucionales..."
                    className="text-xs"
                    {...register('descripcion')}
                  />
                </div>

                {/* Botón Guardar */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full gap-2 bg-brand-teal text-brand-teal-foreground hover:bg-brand-teal/90 shadow-sm font-semibold text-sm transition-all"
                    disabled={mutation.isPending || tasaSuperaTope || desgravamenFueraDeRango}
                  >
                    {mutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Validando normativa y guardando…</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Guardar Configuración de Crédito</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ── Catálogo de Productos Parametrizados en la Base de Datos ──────── */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-brand-gold/10 text-brand-gold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold font-sans text-foreground">
                      Catálogo de Productos Configurados
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Productos activos disponibles para el simulador de clientes
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setFiltroEntidadTabla('TODOS')}
                      className={`px-2 py-1 rounded-md transition-all font-sans font-medium text-[11px] ${
                        filtroEntidadTabla === 'TODOS'
                          ? 'bg-background shadow-xs text-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroEntidadTabla('BANCO')}
                      className={`px-2 py-1 rounded-md transition-all font-sans font-medium text-[11px] ${
                        filtroEntidadTabla === 'BANCO'
                          ? 'bg-background shadow-xs text-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Bancos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroEntidadTabla('COOPERATIVA')}
                      className={`px-2 py-1 rounded-md transition-all font-sans font-medium text-[11px] ${
                        filtroEntidadTabla === 'COOPERATIVA'
                          ? 'bg-background shadow-xs text-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Cooperativas
                    </button>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {listaFiltrada.length} activos
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {cargandoLista ? (
                <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-teal" />
                  <span>Cargando productos configurados desde el servidor…</span>
                </div>
              ) : listaFiltrada.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground space-y-3">
                  <ShieldAlert className="w-10 h-10 mx-auto opacity-40 text-brand-gold" />
                  <p className="text-sm font-semibold text-foreground">No hay productos disponibles para este filtro</p>
                  <p className="text-xs max-w-sm mx-auto">
                    {filtroEntidadTabla === 'TODOS'
                      ? 'Utiliza el formulario de la izquierda para registrar el primer producto de crédito conforme al marco regulatorio del BCE.'
                      : `No se encontraron productos registrados para ${filtroEntidadTabla === 'BANCO' ? 'Bancos' : 'Cooperativas'}.`}
                  </p>
                </div>
              ) : (
                <div className="overflow-auto max-h-[560px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
                      <TableRow className="text-xs">
                        <TableHead className="font-bold">Producto / Entidad</TableHead>
                        <TableHead className="font-bold">Segmento BCE</TableHead>
                        <TableHead className="text-right font-bold">Rango Monto</TableHead>
                        <TableHead className="text-center font-bold">Plazos</TableHead>
                        <TableHead className="text-right font-bold text-brand-teal">Tasa Anual</TableHead>
                        <TableHead className="text-right font-bold text-brand-gold">Desgravamen</TableHead>
                        <TableHead className="font-bold text-center">Sistemas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listaFiltrada.map((c) => (
                        <TableRow key={`conf-${c.id}`} className="hover:bg-muted/40 transition-colors text-xs font-mono">
                          <TableCell className="font-sans">
                            <p className="font-semibold text-foreground">{c.nombre}</p>
                            <Badge variant="outline" className="text-[10px] mt-0.5 font-normal">
                              {c.entidad}
                            </Badge>
                          </TableCell>

                          <TableCell className="font-sans text-xs">
                            <span className="font-medium text-muted-foreground">
                              {c.segmentoBce}
                            </span>
                          </TableCell>

                          <TableCell className="text-right font-mono">
                            ${c.montoMin.toLocaleString()} - ${c.montoMax.toLocaleString()}
                          </TableCell>

                          <TableCell className="text-center text-muted-foreground font-mono">
                            {c.plazoMinMeses} - {c.plazoMaxMeses}m
                          </TableCell>

                          <TableCell className="text-right font-bold text-brand-teal font-mono">
                            {c.tasaInteres}%
                          </TableCell>

                          <TableCell className="text-right text-brand-gold font-mono">
                            {c.tasaDesgravamenMensual}%
                          </TableCell>

                          <TableCell className="text-center font-sans">
                            <div className="flex items-center justify-center gap-1">
                              {c.sistemasPermitidos?.map((s) => (
                                <Badge key={s} variant="secondary" className="text-[9px] px-1.5 py-0">
                                  {s === 'FRANCES' ? 'FR' : 'AL'}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tarjeta Informativa de Normativa del BCE */}
          <Card className="border-border/80 bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-wide text-muted-foreground font-sans">
                <Info className="w-4 h-4 text-brand-teal" />
                Normativa del Banco Central del Ecuador (BCE) y SEPS
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p className="leading-relaxed">
                Las tasas activas efectivas máximas son fijadas mensualmente por el Banco Central del Ecuador en cumplimiento de las resoluciones de la Junta de Política y Regulación Financiera. Ningún producto bancario o cooperativo puede superar dichos techos legales.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-card border border-border">
                  <span className="text-muted-foreground block text-[10px]">CONSUMO</span>
                  <span className="font-semibold text-foreground">≤ 16.77%</span>
                </div>
                <div className="p-2 rounded-lg bg-card border border-border">
                  <span className="text-muted-foreground block text-[10px]">MICROCRÉDITO</span>
                  <span className="font-semibold text-foreground">≤ 30.50%</span>
                </div>
                <div className="p-2 rounded-lg bg-card border border-border">
                  <span className="text-muted-foreground block text-[10px]">VIVIENDA VIP</span>
                  <span className="font-semibold text-foreground">≤ 4.99%</span>
                </div>
                <div className="p-2 rounded-lg bg-card border border-border">
                  <span className="text-muted-foreground block text-[10px]">PRODUCTIVO</span>
                  <span className="font-semibold text-foreground">≤ 11.83%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
