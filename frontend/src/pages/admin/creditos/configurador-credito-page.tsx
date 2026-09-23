import { useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  CirclePlus,
  Pencil,
  Power,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Shield,
  Percent,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { creditosService } from '@/features/creditos/services/creditos.service'
import { formatCurrency } from '@/lib/formatters'
import { useAuth } from '@/app/providers/auth-provider'
import {
  type SistemaAmortizacion,
  type ConfigurarCreditoRequest,
  type ConfigurarCreditoResponse,
  type CargoConfiguracionDto,
} from '@/types'

// ─── Segmentos Oficiales del Banco Central del Ecuador (BCE) ─────────────────

export interface SegmentoBceInfo {
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

export const SEGMENTOS_BCE: SegmentoBceInfo[] = [
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

// ─── Seguros Regulatorios Sugeridos según Categoría BCE ───────────────────────

export interface SeguroBceSugerido {
  nombre: string
  tipoCargo: 'PORCENTAJE' | 'FIJO'
  valor: number
  periodicidad: 'MENSUAL' | 'UNICO'
  baseCalculo: 'SALDO_DEUDOR' | 'MONTO_SOLICITADO' | 'FIJO'
  normaAplicable: string
  obligatorio: boolean
}

export const SEGUROS_SUGERIDOS_BCE: Record<string, SeguroBceSugerido[]> = {
  VIVIENDA: [
    {
      nombre: 'Seguro de Incendio y Terremoto (Todo Riesgo Inmueble)',
      tipoCargo: 'PORCENTAJE',
      valor: 0.0250,
      periodicidad: 'MENSUAL',
      baseCalculo: 'SALDO_DEUDOR',
      normaAplicable: 'Resolución SB-2024 / BCE - Ley General de Seguros Art. 12',
      obligatorio: true,
    },
  ],
  PRODUCTIVO: [
    {
      nombre: 'Seguro Multirriesgo Maquinaria y Garantías Mobiliarias',
      tipoCargo: 'PORCENTAJE',
      valor: 0.0300,
      periodicidad: 'MENSUAL',
      baseCalculo: 'SALDO_DEUDOR',
      normaAplicable: 'Normativa SB / SEPS Garantías Crediticias en Prenda',
      obligatorio: false,
    },
  ],
  CONSUMO: [
    {
      nombre: 'Seguro de Desempleo y Cesantía Laboral',
      tipoCargo: 'FIJO',
      valor: 3.50,
      periodicidad: 'MENSUAL',
      baseCalculo: 'FIJO',
      normaAplicable: 'Resolución JPRFM - Pólizas de Asistencia Financiera',
      obligatorio: false,
    },
  ],
  MICROCREDITO: [
    {
      nombre: 'Microseguro Agrícola / Protección de Capital Productivo',
      tipoCargo: 'PORCENTAJE',
      valor: 0.0350,
      periodicidad: 'MENSUAL',
      baseCalculo: 'SALDO_DEUDOR',
      normaAplicable: 'Resolución SEPS Marco de Finanzas Populares y Solidarias',
      obligatorio: false,
    },
  ],
  EDUCATIVO: [
    {
      nombre: 'Seguro de Continuidad de Estudios y Renta Educativa',
      tipoCargo: 'FIJO',
      valor: 2.00,
      periodicidad: 'MENSUAL',
      baseCalculo: 'FIJO',
      normaAplicable: 'Norma de Crédito Educativo y Formación Superior',
      obligatorio: false,
    },
  ],
}

// ─── Esquema Zod ─────────────────────────────────────────────────────────────

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
  activo: z.boolean(),
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

  const seg = SEGMENTOS_BCE.find((s) => s.id === data.segmentoBce)
  if (seg && data.tasaInteres > seg.tasaMaxima) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `La tasa (${data.tasaInteres}%) supera el tope legal del BCE (${seg.tasaMaxima}%) para ${seg.nombre}`,
      path: ['tasaInteres'],
    })
  }

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

// ═════════════════════════════════════════════════════════════════════════════
// 1. PANTALLA DE LISTADO (TABLA PRINCIPAL FULL-WIDTH)
// ═════════════════════════════════════════════════════════════════════════════

export function CreditosAdminPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { account, hasPermission } = useAuth()

  const roles = account?.roles?.map((r) => r.toLowerCase()) ?? []
  const esAdministrador = roles.includes('administrator') || roles.includes('admin') || roles.includes('role_administrator')
  const esAsesorCredito = roles.includes('credit_advisor') || roles.includes('asesor') || roles.includes('role_asesor') || roles.includes('role_credit_advisor')
  const esRolAutorizado = esAdministrador || esAsesorCredito || hasPermission('credit.products.manage')

  const { data: creditos = [], isLoading } = useQuery({
    queryKey: ['creditosConfigurados'],
    queryFn: creditosService.getConfigurados,
    enabled: esRolAutorizado,
  })

  const toggleStatus = useMutation({
    mutationFn: (id: number) => creditosService.toggleProducto(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['creditosConfigurados'] })
      await queryClient.invalidateQueries({ queryKey: ['simulador', 'productos'] })
      await queryClient.invalidateQueries({ queryKey: ['productos'] })
      toast.success('Estado del producto actualizado.')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'No se pudo actualizar el estado del producto.'
      toast.error(msg)
    },
  })

  if (!esRolAutorizado) {
    return (
      <div className="mx-auto max-w-xl py-20 px-4 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Acceso Restringido</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Esta vista está reservada exclusivamente para usuarios con rol de <strong>Administrador</strong> o <strong>Asesor de crédito</strong>.
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
    <div className="space-y-8">
      <PageHeader
        title="Productos de crédito"
        description="Configura productos, plazos en meses, tasas de interés, seguros y condiciones según normativa BCE."
        actions={
          <Button onClick={() => navigate('/admin/creditos/nuevo')}>
            <CirclePlus />
            Nuevo producto
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-4">Producto</th>
              <th className="p-4">Plazos</th>
              <th className="p-4">Tasas</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-right" />
            </tr>
          </thead>
          <tbody>
            {creditos.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <strong>{c.nombre}</strong>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-normal">
                      {c.entidad}
                    </span>
                  </div>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {formatCurrency(c.montoMin)} – {formatCurrency(c.montoMax)} · {c.segmentoBce}
                  </span>
                </td>
                <td className="p-4">
                  {c.plazoMinMeses} – {c.plazoMaxMeses} meses
                </td>
                <td className="p-4">
                  <div>
                    <span className="font-medium text-foreground">{c.tasaInteres}%</span>
                    <span className="text-xs text-muted-foreground"> · Desgravamen {c.tasaDesgravamenMensual}%</span>
                  </div>
                  {c.cargosIndirectos && c.cargosIndirectos.length > 0 && (
                    <span className="text-[11px] text-muted-foreground block">
                      +{c.cargosIndirectos.length} seguro(s) adicional(es)
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <StatusBadge tone={c.activo ? 'success' : 'neutral'}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </StatusBadge>
                </td>
                <td className="p-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/admin/creditos/${c.id}/editar`)}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={toggleStatus.isPending}
                    onClick={() => toggleStatus.mutate(c.id)}
                  >
                    <Power className="size-4" />
                    {c.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && (
          <p className="p-6 text-sm text-muted-foreground">Cargando productos de crédito…</p>
        )}
        {!isLoading && creditos.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">Todavía no existen productos de crédito configurados.</p>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. PANTALLA DE CREACIÓN / EDICIÓN (FORMULARIO FULL-WIDTH)
// ═════════════════════════════════════════════════════════════════════════════

interface CreditoEditorProps {
  producto?: ConfigurarCreditoResponse
  onCancel: () => void
  onSave: (data: ConfigurarCreditoRequest, activoDeseado: boolean) => Promise<void>
  saving: boolean
}

function CreditoEditor({ producto, onCancel, onSave, saving }: CreditoEditorProps) {
  const [seguros, setSeguros] = useState<CargoConfiguracionDto[]>(() => {
    if (producto?.cargosIndirectos && producto.cargosIndirectos.length > 0) {
      return structuredClone(producto.cargosIndirectos)
    }
    return []
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
      nombre: producto?.nombre ?? 'Crédito Consumo Preferencial',
      entidad: (producto?.entidad as 'Banco' | 'Cooperativa') ?? 'Banco',
      segmentoBce: producto?.segmentoBce ?? 'CONSUMO_PRIORITARIO',
      montoMin: producto?.montoMin ?? 500,
      montoMax: producto?.montoMax ?? 20000,
      plazoMinMeses: producto?.plazoMinMeses ?? 6,
      plazoMaxMeses: producto?.plazoMaxMeses ?? 60,
      tasaInteres: producto?.tasaInteres ?? 14.00,
      tasaDesgravamenMensual: producto?.tasaDesgravamenMensual ?? 0.0600,
      permiteFrances: producto?.sistemasPermitidos ? producto.sistemasPermitidos.includes('FRANCES') : true,
      permiteAleman: producto?.sistemasPermitidos ? producto.sistemasPermitidos.includes('ALEMAN') : true,
      descripcion: producto?.descripcion ?? 'Crédito regulado según normativa vigente del BCE con seguro de desgravamen.',
      activo: producto?.activo ?? true,
    },
  })

  const entidadActual = watch('entidad') as 'Banco' | 'Cooperativa'
  const segmentoActualId = watch('segmentoBce')
  const tasaActual = watch('tasaInteres')
  const desgravamenActual = watch('tasaDesgravamenMensual')
  const permiteFrances = watch('permiteFrances')
  const permiteAleman = watch('permiteAleman')
  const activo = watch('activo')

  const normativaActual = NORMATIVA_ENTIDAD[entidadActual] || NORMATIVA_ENTIDAD.Banco
  const desgravamenFueraDeRango =
    desgravamenActual < normativaActual.desgravamenMin || desgravamenActual > normativaActual.desgravamenMax

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

  // Seguros sugeridos por el BCE para la categoría actual
  const segurosSugeridosActuales = useMemo(() => {
    return SEGUROS_SUGERIDOS_BCE[infoSegmento.categoria] || []
  }, [infoSegmento.categoria])

  const agregarSeguroSugerido = (seguro: SeguroBceSugerido) => {
    if (seguros.some((s) => s.nombre.toLowerCase() === seguro.nombre.toLowerCase())) {
      toast.info('Este seguro ya ha sido agregado.')
      return
    }
    setSeguros((prev) => [
      ...prev,
      {
        nombre: seguro.nombre,
        tipoCargo: seguro.tipoCargo,
        valor: seguro.valor,
        periodicidad: seguro.periodicidad,
        baseCalculo: seguro.baseCalculo,
        normaAplicable: seguro.normaAplicable,
        obligatorio: seguro.obligatorio,
      },
    ])
  }

  const agregarNuevoSeguro = () => {
    setSeguros((prev) => [
      ...prev,
      {
        nombre: 'Nuevo seguro',
        tipoCargo: 'PORCENTAJE',
        valor: 0.02,
        periodicidad: 'MENSUAL',
        baseCalculo: 'SALDO_DEUDOR',
        normaAplicable: 'Normativa Superintendencia de Bancos / SEPS',
        obligatorio: true,
      },
    ])
  }

  const actualizarSeguro = <K extends keyof CargoConfiguracionDto>(index: number, key: K, value: CargoConfiguracionDto[K]) => {
    setSeguros((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, [key]: value } : s))
    )
  }

  const quitarSeguro = (index: number) => {
    setSeguros((prev) => prev.filter((_, idx) => idx !== index))
  }

  const onSubmit = async (values: FormValues) => {
    const sistemas: SistemaAmortizacion[] = []
    if (values.permiteFrances) sistemas.push('FRANCES')
    if (values.permiteAleman) sistemas.push('ALEMAN')

    const requestPayload: ConfigurarCreditoRequest = {
      nombre: values.nombre.trim(),
      entidad: values.entidad,
      segmentoBce: values.segmentoBce,
      montoMin: values.montoMin,
      montoMax: values.montoMax,
      plazoMinMeses: values.plazoMinMeses,
      plazoMaxMeses: values.plazoMaxMeses,
      tasaInteres: values.tasaInteres,
      tasaDesgravamenMensual: values.tasaDesgravamenMensual,
      sistemasPermitidos: sistemas,
      descripcion: values.descripcion?.trim(),
      unidadPlazo: 'MESES',
      cargosIndirectos: seguros,
    }

    await onSave(requestPayload, values.activo)
  }

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <PageHeader
        title={producto ? 'Editar producto de crédito' : 'Nuevo producto'}
        description="Configura los datos generales, plazos, tasas y seguros obligatorios según el marco regulatorio del BCE."
        actions={
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Volver a productos
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ─── Tarjeta 1 (Datos Generales) ─────────────────────────────────── */}
        <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6 space-y-4">
          <div className="border-b pb-3">
            <h3 className="font-semibold text-base text-foreground">Datos generales</h3>
            <p className="text-xs text-muted-foreground">
              Información comercial, institución financiera, segmento regulatorio y montos autorizados.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Comercial del Producto *</Label>
              <Input
                id="nombre"
                placeholder="Ej. Crédito Consumo Preferencial"
                {...register('nombre')}
              />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
            </div>

            {/* Entidad */}
            <div className="space-y-2">
              <Label htmlFor="entidad">Entidad Financiera *</Label>
              <Controller
                name="entidad"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val: 'Banco' | 'Cooperativa') => {
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
                  >
                    <SelectTrigger id="entidad">
                      <SelectValue placeholder="Seleccione el tipo de entidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Banco">Banco Comercial / Privado</SelectItem>
                      <SelectItem value="Cooperativa">Cooperativa de Ahorro y Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.entidad && <p className="text-xs text-destructive">{errors.entidad.message}</p>}
            </div>

            {/* Segmento BCE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="segmentoBce">Segmento Regulatorio BCE *</Label>
                <span className="text-xs font-mono text-muted-foreground">
                  Tope legal: {infoSegmento.tasaMaxima}%
                </span>
              </div>
              <Controller
                name="segmentoBce"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
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
                  >
                    <SelectTrigger id="segmentoBce">
                      <SelectValue placeholder="Seleccione el segmento BCE" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {segmentosDisponibles.map((seg) => (
                        <SelectItem key={seg.id} value={seg.id}>
                          {seg.nombre} (Máx {seg.tasaMaxima}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.segmentoBce && <p className="text-xs text-destructive">{errors.segmentoBce.message}</p>}
            </div>

            {/* Monto Mínimo */}
            <div className="space-y-2">
              <Label htmlFor="montoMin">Monto Mínimo ($) *</Label>
              <Input
                id="montoMin"
                type="number"
                step="50"
                {...register('montoMin', { valueAsNumber: true })}
              />
              {errors.montoMin && <p className="text-xs text-destructive">{errors.montoMin.message}</p>}
            </div>

            {/* Monto Máximo */}
            <div className="space-y-2">
              <Label htmlFor="montoMax">Monto Máximo ($) *</Label>
              <Input
                id="montoMax"
                type="number"
                step="50"
                {...register('montoMax', { valueAsNumber: true })}
              />
              {errors.montoMax && <p className="text-xs text-destructive">{errors.montoMax.message}</p>}
            </div>

            {/* Switch / Toggle: Producto activo y visible */}
            <div className="flex items-center gap-3 pt-6 sm:col-span-2">
              <Switch
                checked={activo}
                onCheckedChange={(val) => setValue('activo', val)}
              />
              <Label className="cursor-pointer">Producto activo y visible</Label>
            </div>
          </div>
        </div>

        {/* ─── Tarjeta 2 (Plazos y Tasas) ──────────────────────────────────── */}
        <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6 space-y-5">
          <div className="border-b pb-3">
            <h3 className="font-semibold text-base text-foreground">Plazos y tasas</h3>
            <p className="text-xs text-muted-foreground">
              Configura los plazos en meses, tasa nominal regulada por el BCE y seguro de desgravamen legal.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="plazoMinMeses">Plazo Mínimo (meses) *</Label>
              <Input
                id="plazoMinMeses"
                type="number"
                min="1"
                {...register('plazoMinMeses', { valueAsNumber: true })}
              />
              {errors.plazoMinMeses && <p className="text-xs text-destructive">{errors.plazoMinMeses.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plazoMaxMeses">Plazo Máximo (meses) *</Label>
              <Input
                id="plazoMaxMeses"
                type="number"
                min="1"
                {...register('plazoMaxMeses', { valueAsNumber: true })}
              />
              {errors.plazoMaxMeses && <p className="text-xs text-destructive">{errors.plazoMaxMeses.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tasaInteres" className="flex items-center gap-1">
                  <Percent className="size-3.5 text-muted-foreground" />
                  Tasa Nominal Anual (%) *
                </Label>
              </div>
              <Input
                id="tasaInteres"
                type="number"
                step="0.01"
                className={tasaSuperaTope ? 'border-destructive focus-visible:ring-destructive bg-destructive/5' : ''}
                {...register('tasaInteres', { valueAsNumber: true })}
              />
              {errors.tasaInteres && <p className="text-xs text-destructive">{errors.tasaInteres.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="desgravamen" className="flex items-center gap-1">
                  <Shield className="size-3.5 text-muted-foreground" />
                  Desgravamen Mensual (%) *
                </Label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {normativaActual.desgravamenMin}% – {normativaActual.desgravamenMax}%
                </span>
              </div>
              <Input
                id="desgravamen"
                type="number"
                step="0.001"
                className={desgravamenFueraDeRango ? 'border-destructive focus-visible:ring-destructive bg-destructive/5' : ''}
                {...register('tasaDesgravamenMensual', { valueAsNumber: true })}
              />
              {errors.tasaDesgravamenMensual && <p className="text-xs text-destructive">{errors.tasaDesgravamenMensual.message}</p>}
            </div>
          </div>

          {/* Alertas BCE si aplican */}
          {tasaSuperaTope && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Violación de Tasa Máxima Legal (BCE)</p>
                <p className="mt-0.5 leading-relaxed">
                  La tasa de {tasaActual}% supera el techo regulatorio de {infoSegmento.tasaMaxima}% para el segmento {infoSegmento.nombre}. No se permite guardar créditos con usura.
                </p>
              </div>
            </div>
          )}

          {desgravamenFueraDeRango && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Desgravamen fuera de rango normativo ({entidadActual})</p>
                <p className="mt-0.5 leading-relaxed">
                  Para {entidadActual === 'Banco' ? 'Bancos (Superintendencia de Bancos)' : 'Cooperativas (SEPS)'}, el seguro de desgravamen debe ubicarse entre {normativaActual.desgravamenMin}% y {normativaActual.desgravamenMax}% mensual.
                </p>
              </div>
            </div>
          )}

          {/* Sistemas de amortización */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-semibold">Sistemas de Amortización Autorizados *</Label>
            <div className="grid gap-3 sm:grid-cols-2 max-w-md">
              <label className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer text-sm transition-colors ${permiteFrances ? 'border-primary bg-accent/40 font-medium' : 'border-border text-muted-foreground'}`}>
                <input
                  type="checkbox"
                  className="rounded border-input text-primary focus:ring-primary"
                  {...register('permiteFrances')}
                />
                <span>Francés (Cuota Fija)</span>
              </label>

              <label className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer text-sm transition-colors ${permiteAleman ? 'border-primary bg-accent/40 font-medium' : 'border-border text-muted-foreground'}`}>
                <input
                  type="checkbox"
                  className="rounded border-input text-primary focus:ring-primary"
                  {...register('permiteAleman')}
                />
                <span>Alemán (Capital Fijo)</span>
              </label>
            </div>
            {errors.permiteFrances && <p className="text-xs text-destructive">{errors.permiteFrances.message}</p>}
          </div>

          {/* Observaciones */}
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="descripcion" className="text-xs text-muted-foreground">
              Observaciones / Políticas de Otorgamiento (Opcional)
            </Label>
            <Textarea
              id="descripcion"
              rows={2}
              placeholder="Condiciones específicas, garantías requeridas o políticas institucionales..."
              {...register('descripcion')}
            />
          </div>
        </div>

        {/* ─── Tarjeta 3 (Seguros del Crédito según Normativa BCE) ─────────── */}
        <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
              <h3 className="font-semibold text-base text-foreground">
                Seguros correspondientes del crédito (Normativa BCE)
              </h3>
              <p className="text-xs text-muted-foreground">
                Configura seguros obligatorios o complementarios según el segmento {infoSegmento.nombre} ({infoSegmento.categoria}).
              </p>
            </div>
            <div className="flex items-center gap-2">
              {segurosSugeridosActuales.map((sug, i) => (
                <Button
                  key={`sug-${i}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => agregarSeguroSugerido(sug)}
                >
                  <Plus className="size-3.5 mr-1" />
                  {sug.nombre.split(' ')[0]} {sug.nombre.split(' ')[1]} (BCE)
                </Button>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={agregarNuevoSeguro}>
                <Plus className="size-3.5 mr-1" />
                Agregar seguro
              </Button>
            </div>
          </div>

          {seguros.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Sin seguros adicionales configurados</p>
              <p>
                Este producto solo aplicará el seguro de desgravamen base ({desgravamenActual}% mensual). Puedes agregar seguros complementarios como incendio/terremoto o desempleo según la categoría.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {seguros.map((seg, index) => (
                <div
                  key={`seguro-${index}`}
                  className="grid gap-3 rounded-lg border p-3.5 sm:grid-cols-2 lg:grid-cols-6 items-end bg-muted/20"
                >
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs">Nombre del Seguro / Cargo</Label>
                    <Input
                      value={seg.nombre}
                      onChange={(e) => actualizarSeguro(index, 'nombre', e.target.value)}
                      placeholder="Ej. Seguro de Incendio y Terremoto"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Cargo</Label>
                    <Select
                      value={seg.tipoCargo}
                      onValueChange={(val) => actualizarSeguro(index, 'tipoCargo', val as 'PORCENTAJE' | 'FIJO')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PORCENTAJE">Porcentaje (%)</SelectItem>
                        <SelectItem value="FIJO">Valor Fijo ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">
                      {seg.tipoCargo === 'PORCENTAJE' ? 'Tasa Mensual (%)' : 'Valor Fijo ($)'}
                    </Label>
                    <Input
                      type="number"
                      step={seg.tipoCargo === 'PORCENTAJE' ? '0.001' : '0.50'}
                      value={seg.valor}
                      onChange={(e) => actualizarSeguro(index, 'valor', Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Base de Cálculo</Label>
                    <Select
                      value={seg.baseCalculo ?? 'SALDO_DEUDOR'}
                      onValueChange={(val) => actualizarSeguro(index, 'baseCalculo', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SALDO_DEUDOR">Saldo Deudor</SelectItem>
                        <SelectItem value="MONTO_SOLICITADO">Monto Original</SelectItem>
                        <SelectItem value="FIJO">Fijo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <Switch
                        checked={seg.obligatorio ?? true}
                        onCheckedChange={(val) => actualizarSeguro(index, 'obligatorio', val)}
                      />
                      <span>Obligatorio</span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar seguro"
                      onClick={() => quitarSeguro(index)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Pie de Página (Acciones) ────────────────────────────────────── */}
        <div className="flex justify-end items-center gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving || tasaSuperaTope || desgravamenFueraDeRango}
          >
            {saving ? 'Guardando producto…' : 'Guardar producto'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. ENRUTADOR DE EDICIÓN / CREACIÓN
// ═════════════════════════════════════════════════════════════════════════════

export function CreditoProductEditorPage() {
  const navigate = useNavigate()
  const { productId } = useParams()
  const queryClient = useQueryClient()

  const { data: creditos = [], isLoading } = useQuery({
    queryKey: ['creditosConfigurados'],
    queryFn: creditosService.getConfigurados,
  })

  const producto = productId ? creditos.find((item) => item.id === Number(productId)) : undefined

  const saveMutation = useMutation({
    mutationFn: async ({ data, activoDeseado }: { data: ConfigurarCreditoRequest; activoDeseado: boolean }) => {
      const resp = await creditosService.configurarCredito(data)
      if (producto && producto.activo !== activoDeseado) {
        await creditosService.toggleProducto(producto.id)
      }
      return resp
    },
    onSuccess: async (resp) => {
      await queryClient.invalidateQueries({ queryKey: ['creditosConfigurados'] })
      await queryClient.invalidateQueries({ queryKey: ['simulador', 'productos'] })
      await queryClient.invalidateQueries({ queryKey: ['productos'] })
      toast.success(producto ? 'Producto actualizado exitosamente.' : 'Producto creado exitosamente.', {
        description: `${resp.nombre} (${resp.entidad}) registrado según normativa del BCE.`,
      })
      navigate('/admin/creditos')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Error al guardar el producto de crédito.'
      toast.error('Error al guardar el producto', { description: msg })
    },
  })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground p-6">Cargando producto de crédito…</p>
  }

  if (productId && !producto) {
    return (
      <div className="space-y-4 p-6">
        <PageHeader
          title="Producto no encontrado"
          description="No pudimos encontrar el producto de crédito solicitado."
        />
        <Button onClick={() => navigate('/admin/creditos')}>Volver a productos</Button>
      </div>
    )
  }

  return (
    <CreditoEditor
      key={producto?.id ?? 'nuevo'}
      producto={producto}
      onCancel={() => navigate('/admin/creditos')}
      saving={saveMutation.isPending}
      onSave={async (data, activoDeseado) => {
        await saveMutation.mutateAsync({ data, activoDeseado })
      }}
    />
  )
}

// Alias de retrocompatibilidad
export const ConfiguradorCreditoPage = CreditosAdminPage
