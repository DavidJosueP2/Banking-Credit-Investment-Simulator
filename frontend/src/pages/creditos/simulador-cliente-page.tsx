import { useState, useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import {
  Calculator,
  Download,
  Calendar,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Building2,
  Landmark,
  Percent,
  ShieldCheck,
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
import { Badge } from '@/components/ui/badge'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { simuladorService } from '@/features/creditos/simulador/services/simulador.service'
import {
  type SimulacionClienteResponse,
  type SimulacionClienteRequest,
  type EntidadCredito,
} from '@/types'
import { useAuth } from '@/app/providers/auth-provider'

// ─── Entidades por Defecto (Fallback institucional) ──────────────────────────

const DEFAULT_ENTIDADES: EntidadCredito[] = [
  {
    id: 3,
    nombre: 'Banco Pichincha - Crédito Personal',
    tipo: 'Banco',
    tasaNominal: 15.20,
    desgravamen: 0.0550,
  },
  {
    id: 4,
    nombre: 'Banco Guayaquil - Multicrédito',
    tipo: 'Banco',
    tasaNominal: 15.80,
    desgravamen: 0.0600,
  },
  {
    id: 1,
    nombre: 'Crédito Consumo Ágil Banco',
    tipo: 'Banco',
    tasaNominal: 15.50,
    desgravamen: 0.0600,
  },
  {
    id: 5,
    nombre: 'Cooperativa JEP - Microcrédito Crece',
    tipo: 'Cooperativa',
    tasaNominal: 21.50,
    desgravamen: 0.0700,
  },
  {
    id: 6,
    nombre: 'Cooperativa Policía Nacional - Préstamo Solidario',
    tipo: 'Cooperativa',
    tasaNominal: 17.90,
    desgravamen: 0.0600,
  },
  {
    id: 2,
    nombre: 'Microcrédito Crece Cooperativa',
    tipo: 'Cooperativa',
    tasaNominal: 22.00,
    desgravamen: 0.0700,
  },
]

// ─── Validación Zod (Formulario con Cascada de Entidades) ────────────────────

const clienteSchema = z.object({
  tipoInstitucion: z.enum(['Banco', 'Cooperativa'], {
    message: 'Seleccione el tipo de institución (Banco o Cooperativa)',
  }),
  entidadId: z
    .number({ message: 'Seleccione una entidad financiera específica' })
    .min(1, 'Seleccione una entidad financiera específica en el Paso 2'),
  monto: z
    .number({ message: 'Ingrese un monto válido' })
    .min(50, 'El monto mínimo a simular es de $50 USD'),
  frecuencia: z.enum(['MENSUAL', 'ANUAL'] as const),
  plazo: z
    .number({ message: 'Ingrese un plazo válido' })
    .min(1, 'El plazo mínimo es 1')
    .max(360, 'El plazo no puede superar los 360 períodos'),
  sistema: z.enum(['FRANCES', 'ALEMAN'] as const),
})

type ClienteFormData = z.infer<typeof clienteSchema>

// Formateador de moneda USD
const fmtCurrency = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})
const fmt = (n: number | undefined) => fmtCurrency.format(n || 0)

// ─── Función de Generación de PDF con Paleta Institucional ───────────────────

function exportarSimulacionPdf(data: SimulacionClienteResponse, clienteNombre?: string | null) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Color primario corporativo: Brand Teal [8, 116, 123] (#08747b)
  doc.setFillColor(8, 116, 123)
  doc.rect(0, 0, 297, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('TABLA OFICIAL DE AMORTIZACIÓN — SIMULADOR DE CRÉDITO', 14, 11)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema Financiero Ecuatoriano • Normativa del Banco Central del Ecuador (BCE)', 14, 17)
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-EC')} ${new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`, 220, 17)

  // Resumen Operativo
  doc.setTextColor(32, 37, 39)
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'bold')
  doc.text('CONDICIONES GENERALES DEL CRÉDITO' + (clienteNombre ? ` — Solicitante: ${clienteNombre}` : ''), 14, 32)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')

  const col1X = 14
  const col2X = 85
  const col3X = 158
  const col4X = 230

  doc.text(`Producto: ${data.nombreProducto}`, col1X, 38)
  doc.text(`Entidad: ${data.entidad}`, col1X, 44)
  doc.text(`Segmento BCE: ${data.segmentoBce}`, col1X, 50)

  doc.text(`Monto Financiado: ${fmt(data.monto)}`, col2X, 38)
  doc.text(`Frecuencia de Pago: ${data.frecuencia}`, col2X, 44)
  doc.text(`Plazo: ${data.totalCuotas} ${data.frecuencia === 'ANUAL' ? 'años' : 'meses'}`, col2X, 50)

  doc.text(`Tasa Nominal Anual: ${data.tasaInteresAnual}%`, col3X, 38)
  doc.text(`Seguro Desgravamen: ${data.tasaDesgravamenMensual}% mensual`, col3X, 44)
  doc.text(`Sistema: ${data.sistema === 'FRANCES' ? 'Francés (Cuota Fija)' : 'Alemán (Capital Fijo)'}`, col3X, 50)

  doc.setFont('helvetica', 'bold')
  doc.text(`Cuota Periódica: ${fmt(data.cuotaPeriodica)}`, col4X, 38)
  doc.text(`Total Intereses: ${fmt(data.totalIntereses)}`, col4X, 44)
  doc.text(`Total a Pagar: ${fmt(data.totalPagar)}`, col4X, 50)

  // 7 Columnas Exactas solicitadas
  const head = [[
    'No. Cuota',
    'Saldo Inicial',
    'Capital',
    'Interés',
    'Desgravamen',
    'Cuota Total',
    'Saldo Final',
  ]]

  const body = data.tablaCuotas.map((c) => [
    c.numeroCuota.toString(),
    fmt(c.saldoInicial),
    fmt(c.capital),
    fmt(c.interes),
    fmt(c.desgravamen),
    fmt(c.cuotaTotal),
    fmt(c.saldoFinal),
  ])

  autoTable(doc, {
    head,
    body,
    startY: 55,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      halign: 'right',
      font: 'helvetica',
      textColor: [32, 37, 39],
    },
    headStyles: {
      fillColor: [8, 116, 123], // Brand Teal
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'right',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 250],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      5: { fontStyle: 'bold', fillColor: [240, 248, 248] },
    },
  })

  // Pie de página legal
  const finalY = (doc as any).lastAutoTable?.finalY || 180
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(120, 130, 133)
  doc.text(
    '* Esta simulación es referencial y está sujeta a aprobación crediticia. El seguro de desgravamen se calcula mensualmente sobre el saldo deudor según normativa de la Junta de Política y Regulación Financiera.',
    14,
    Math.min(finalY + 8, 200)
  )

  const nombreArchivo = `Amortizacion_${data.sistema}_${data.monto}USD.pdf`
  doc.save(nombreArchivo)
}

// ─── Componente Principal de la Vista Usuario ────────────────────────────────

export function SimuladorClientePage() {
  const { account, hasPermission } = useAuth()
  const isAsesor = hasPermission('credit.products.manage') || (account?.roles?.includes('credit_advisor') ?? false)
  const usuario = account ? { nombre: account.fullName || account.username } : null

  const [resultado, setResultado] = useState<SimulacionClienteResponse | null>(null)

  // Catálogo de entidades desde el backend
  const entidadesQuery = useQuery({
    queryKey: ['simulador', 'entidades'],
    queryFn: () => simuladorService.obtenerEntidades(),
    staleTime: 60_000,
  })

  // Entidades activas disponibles (usa API si disponible, o fallback institucional)
  const entidadesDisponibles = useMemo(() => {
    if (entidadesQuery.data && entidadesQuery.data.length > 0) {
      return entidadesQuery.data
    }
    return DEFAULT_ENTIDADES
  }, [entidadesQuery.data])

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      tipoInstitucion: 'Banco',
      entidadId: 3,
      monto: 5000,
      frecuencia: 'MENSUAL',
      plazo: 24,
      sistema: 'FRANCES',
    },
  })

  const tipoInstitucionActual = watch('tipoInstitucion')
  const entidadIdActual = watch('entidadId')
  const frecuenciaActual = watch('frecuencia')
  const sistemaActual = watch('sistema')
  const montoActual = watch('monto')

  // Entidades filtradas según Combo Box 1 (Tipo de Institución)
  const entidadesFiltradas = useMemo(() => {
    if (!tipoInstitucionActual) return []
    return entidadesDisponibles.filter(
      (e) => e.tipo.toLowerCase() === tipoInstitucionActual.toLowerCase()
    )
  }, [entidadesDisponibles, tipoInstitucionActual])

  // Entidad actualmente seleccionada en Combo Box 2
  const entidadSeleccionada = useMemo(() => {
    if (!entidadIdActual) return null
    return entidadesDisponibles.find((e) => e.id === Number(entidadIdActual)) || null
  }, [entidadesDisponibles, entidadIdActual])

  const mutation = useMutation({
    mutationFn: (data: ClienteFormData) => {
      const payload: SimulacionClienteRequest = {
        entidadId: data.entidadId,
        productoId: data.entidadId,
        monto: data.monto,
        frecuencia: data.frecuencia,
        plazo: data.plazo,
        sistema: data.sistema,
        entidad: data.tipoInstitucion,
        usuario: usuario?.nombre,
      }
      return simuladorService.calcularCliente(payload)
    },
    onSuccess: (data) => {
      setResultado(data)
      toast.success('Amortización calculada correctamente', {
        description: `Entidad: ${data.nombreProducto} (${data.entidad}) — Tasa: ${data.tasaInteresAnual}% — Desgravamen: ${data.tasaDesgravamenMensual}%`,
      })
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Error al realizar la simulación'
      toast.error('No se pudo calcular el crédito', { description: msg })
    },
  })

  const onSubmit = (data: ClienteFormData, e?: React.BaseSyntheticEvent) => {
    e?.preventDefault()
    if (!data.entidadId || data.entidadId <= 0) {
      toast.error('Seleccione una entidad financiera específica en el Paso 2')
      return
    }
    mutation.mutate(data)
  }

  return (
    <main id="contenido" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14 space-y-8">
      {/* ── Banner condicional para Asesor ─────────────────────────────── */}
      {isAsesor && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-brand-teal/5 border border-brand-teal/20 text-xs">
          <div className="flex items-center gap-2.5 text-foreground">
            <span className="flex size-2 rounded-full bg-brand-teal animate-pulse" />
            <span>
              Sesión activa como <strong className="font-semibold text-foreground">Asesor Financiero</strong> ({usuario?.nombre}). Puedes gestionar la parametrización institucional.
            </span>
          </div>
          <Button asChild size="sm" variant="outline" className="border-brand-teal/30 text-brand-teal hover:bg-brand-teal/10 gap-1.5 shrink-0">
            <Link to="/admin/creditos">
              Ir a Configuración de Créditos
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* ── Encabezado Estándar del Sistema de Diseño ──────────────────── */}
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <h1 className="font-heading text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          Simulador de Crédito
        </h1>
        <p className="text-sm text-muted-foreground">
          Calcula tu cronograma de pagos oficial con amortización francesa o alemana y seguro de desgravamen sobre saldo deudor.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Formulario de Parámetros (Sticky Desktop) ─────────────────── */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <Card className="rounded-xl border bg-card shadow-xs">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-brand-teal/10 text-brand-teal">
                  <Calculator className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground font-sans font-medium">
                    Datos del Préstamo
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Selecciona tu entidad y las condiciones del financiamiento
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                
                {/* Combo Box 1: Tipo de Institución */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Landmark className="size-3.5 text-brand-teal" />
                      1. Tipo de Institución
                    </Label>
                    <span className="text-[10px] text-brand-teal font-medium">Obligatorio</span>
                  </div>
                  <Controller
                    name="tipoInstitucion"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(val: 'Banco' | 'Cooperativa') => {
                          field.onChange(val)
                          const primera = entidadesDisponibles.find(
                            (e) => e.tipo.toLowerCase() === val.toLowerCase()
                          )
                          setValue('entidadId', primera ? primera.id : 0)
                        }}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Seleccione Tipo (Banco o Cooperativa)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Banco">Banco Comercial</SelectItem>
                          <SelectItem value="Cooperativa">Cooperativa de Ahorro y Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.tipoInstitucion && (
                    <p className="text-[11px] text-destructive">{errors.tipoInstitucion.message}</p>
                  )}
                </div>

                {/* Combo Box 2: Entidad Específica */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-brand-teal" />
                      2. Entidad Financiera Específica
                    </Label>
                    <span className="text-[10px] text-brand-teal font-medium">Obligatorio</span>
                  </div>
                  <Controller
                    name="entidadId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        disabled={!tipoInstitucionActual || entidadesFiltradas.length === 0}
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={field.value ? String(field.value) : ''}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue
                            placeholder={
                              !tipoInstitucionActual
                                ? 'Primero seleccione el tipo de institución'
                                : 'Seleccione una institución disponible'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {entidadesFiltradas.map((ent) => (
                            <SelectItem key={ent.id} value={String(ent.id)}>
                              {ent.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.entidadId && (
                    <p className="text-[11px] text-destructive">{errors.entidadId.message}</p>
                  )}
                </div>

                {/* Tarjeta de Tasas Oficiales Extraídas */}
                {entidadSeleccionada && (
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Percent className="size-3 text-brand-teal" />
                        <span>Tasa Nominal</span>
                      </div>
                      <div className="font-sans font-semibold text-sm text-foreground">
                        {entidadSeleccionada.tasaNominal.toFixed(2)}%{' '}
                        <span className="text-[10px] font-normal text-muted-foreground">anual</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Regulación BCE</p>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <ShieldCheck className="size-3 text-brand-teal" />
                        <span>Desgravamen</span>
                      </div>
                      <div className="font-sans font-semibold text-sm text-foreground">
                        {entidadSeleccionada.desgravamen.toFixed(4)}%{' '}
                        <span className="text-[10px] font-normal text-muted-foreground">mensual</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Sobre saldo deudor</p>
                    </div>
                  </div>
                )}

                {/* Monto Solicitado */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="monto" className="text-xs font-medium text-foreground">
                      Monto Solicitado ($ USD)
                    </Label>
                    <span className="font-sans text-brand-teal font-medium text-xs">{fmt(montoActual)}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-muted-foreground text-xs font-medium">$</span>
                    <Input
                      id="monto"
                      type="number"
                      step="50"
                      className="pl-7 text-xs"
                      {...register('monto', { valueAsNumber: true })}
                    />
                  </div>
                  {errors.monto && (
                    <p className="text-[11px] text-destructive">{errors.monto.message}</p>
                  )}

                  {/* Chips de montos sugeridos */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[1000, 3000, 5000, 10000, 20000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setValue('monto', val)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                          montoActual === val
                            ? 'bg-brand-teal text-brand-teal-foreground border-brand-teal font-medium shadow-2xs'
                            : 'bg-background hover:bg-muted/60 text-muted-foreground border-border'
                        }`}
                      >
                        ${val.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frecuencia de Pago */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">
                    Frecuencia de Pago
                  </Label>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setValue('frecuencia', 'MENSUAL')
                        setValue('plazo', 24)
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs transition-colors ${
                        frecuenciaActual === 'MENSUAL'
                          ? 'border-brand-teal bg-brand-teal/10 text-brand-teal font-medium shadow-2xs'
                          : 'border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      Mensual (12/año)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('frecuencia', 'ANUAL')
                        setValue('plazo', 3)
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs transition-colors ${
                        frecuenciaActual === 'ANUAL'
                          ? 'border-brand-teal bg-brand-teal/10 text-brand-teal font-medium shadow-2xs'
                          : 'border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      Anual (1/año)
                    </button>
                  </div>
                </div>

                {/* Plazo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="plazo" className="text-xs font-medium text-foreground">
                      Plazo en {frecuenciaActual === 'ANUAL' ? 'Años' : 'Meses'}
                    </Label>
                    <span className="text-muted-foreground text-xs">
                      {watch('plazo')} {frecuenciaActual === 'ANUAL' ? 'años' : 'meses'}
                    </span>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      id="plazo"
                      type="number"
                      min="1"
                      className="pl-8 text-xs"
                      {...register('plazo', { valueAsNumber: true })}
                    />
                  </div>
                  {errors.plazo && (
                    <p className="text-[11px] text-destructive">{errors.plazo.message}</p>
                  )}

                  {/* Chips de plazos sugeridos */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {frecuenciaActual === 'MENSUAL'
                      ? [6, 12, 24, 36, 48, 60].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setValue('plazo', p)}
                            className={`text-[11px] px-2.5 py-0.5 rounded-md border transition-all ${
                              watch('plazo') === p
                                ? 'bg-brand-teal text-brand-teal-foreground border-brand-teal font-medium shadow-2xs'
                                : 'bg-background hover:bg-muted/60 text-muted-foreground border-border'
                            }`}
                          >
                            {p}m
                          </button>
                        ))
                      : [1, 2, 3, 5, 10].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setValue('plazo', p)}
                            className={`text-[11px] px-2.5 py-0.5 rounded-md border transition-all ${
                              watch('plazo') === p
                                ? 'bg-brand-teal text-brand-teal-foreground border-brand-teal font-medium shadow-2xs'
                                : 'bg-background hover:bg-muted/60 text-muted-foreground border-border'
                            }`}
                          >
                            {p} {p === 1 ? 'año' : 'años'}
                          </button>
                        ))}
                  </div>
                </div>

                {/* Sistema de Amortización */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">
                    Sistema de Amortización
                  </Label>
                  <div className="space-y-2 pt-0.5">
                    <div
                      onClick={() => setValue('sistema', 'FRANCES')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        sistemaActual === 'FRANCES'
                          ? 'border-brand-teal bg-brand-teal/5 shadow-2xs'
                          : 'border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs text-foreground">
                          Sistema Francés (Cuota Fija)
                        </span>
                        {sistemaActual === 'FRANCES' && (
                          <CheckCircle2 className="size-4 text-brand-teal" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        Cuota constante en cada periodo. El interés decrece progresivamente mientras que el abono al capital aumenta.
                      </p>
                    </div>

                    <div
                      onClick={() => setValue('sistema', 'ALEMAN')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        sistemaActual === 'ALEMAN'
                          ? 'border-brand-teal bg-brand-teal/5 shadow-2xs'
                          : 'border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs text-foreground">
                          Sistema Alemán (Capital Constante)
                        </span>
                        {sistemaActual === 'ALEMAN' && (
                          <CheckCircle2 className="size-4 text-brand-teal" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        Abono de capital idéntico en cada mes. Las cuotas iniciales son mayores y descienden con el tiempo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botón Principal */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="brand"
                    className="w-full gap-2 font-medium text-sm"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        <span>Calculando tabla oficial…</span>
                      </>
                    ) : (
                      <>
                        <Calculator className="size-4" />
                        <span>Calcular Amortización</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ── Panel de Resultados ──────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          {resultado ? (
            <div className="space-y-6">
              {/* Barra de Producto + Botón Descarga */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl border bg-card">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-heading text-lg font-normal text-foreground">
                      {resultado.nombreProducto}
                    </h2>
                    <Badge variant="outline" className="text-xs">
                      {resultado.entidad}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Segmento BCE: <strong className="text-foreground font-medium">{resultado.segmentoBce}</strong> · Tasa Nominal: <strong className="text-foreground font-medium">{resultado.tasaInteresAnual}%</strong> · Desgravamen: <strong className="text-foreground font-medium">{resultado.tasaDesgravamenMensual}%</strong> mensual
                  </p>
                </div>

                <Button
                  onClick={() => exportarSimulacionPdf(resultado, usuario?.nombre)}
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0 border-brand-teal/30 text-brand-teal hover:bg-brand-teal/10"
                >
                  <Download className="size-4" />
                  <span>Descargar PDF</span>
                </Button>
              </div>

              {/* 4 Métricas Clave */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border bg-card p-4 space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-brand-teal">
                    Cuota {resultado.frecuencia === 'ANUAL' ? 'Anual' : 'Mensual'}
                  </span>
                  <p className="text-2xl font-normal text-foreground font-sans tracking-tight">
                    {fmt(resultado.cuotaPeriodica)}
                  </p>
                  <span className="text-[10px] text-muted-foreground block">
                    {resultado.sistema === 'FRANCES' ? 'Cuota constante' : 'Primera cuota estimada'}
                  </span>
                </div>

                <div className="rounded-xl border bg-card p-4 space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Total Interés
                  </span>
                  <p className="text-2xl font-normal text-foreground font-sans tracking-tight">
                    {fmt(resultado.totalIntereses)}
                  </p>
                  <span className="text-[10px] text-muted-foreground block">
                    Costo financiero
                  </span>
                </div>

                <div className="rounded-xl border bg-card p-4 space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-brand-gold">
                    Total Desgravamen
                  </span>
                  <p className="text-2xl font-normal text-foreground font-sans tracking-tight">
                    {fmt(resultado.totalDesgravamen)}
                  </p>
                  <span className="text-[10px] text-muted-foreground block">
                    Sobre saldo deudor
                  </span>
                </div>

                <div className="rounded-xl border bg-muted/40 p-4 space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Total a Pagar
                  </span>
                  <p className="text-2xl font-normal text-foreground font-sans tracking-tight">
                    {fmt(resultado.totalPagar)}
                  </p>
                  <span className="text-[10px] text-muted-foreground block">
                    {resultado.totalCuotas} cuotas totales
                  </span>
                </div>
              </div>

              {/* ── Tabla Oficial de Amortización (7 Columnas) ──────────── */}
              <div className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      Tabla Oficial de Amortización
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cronograma detallado con desglose de capital, interés y seguro de desgravamen
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {resultado.totalCuotas} cuotas
                  </Badge>
                </div>

                <div className="overflow-x-auto max-h-[520px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs bg-muted/50 text-muted-foreground">
                        <th className="p-3.5 text-center font-medium">No.</th>
                        <th className="p-3.5 text-right font-medium">Saldo Inicial</th>
                        <th className="p-3.5 text-right font-medium text-foreground">Capital</th>
                        <th className="p-3.5 text-right font-medium">Interés</th>
                        <th className="p-3.5 text-right font-medium text-brand-gold">Desgravamen</th>
                        <th className="p-3.5 text-right font-medium text-brand-teal">Cuota Total</th>
                        <th className="p-3.5 text-right font-medium">Saldo Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.tablaCuotas.map((c) => (
                        <tr
                          key={`cuota-row-${c.numeroCuota}`}
                          className="border-b last:border-0 hover:bg-muted/40 transition-colors text-xs"
                        >
                          <td className="p-3.5 text-center text-muted-foreground font-medium">
                            {c.numeroCuota}
                          </td>
                          <td className="p-3.5 text-right text-muted-foreground">
                            {fmt(c.saldoInicial)}
                          </td>
                          <td className="p-3.5 text-right font-medium text-foreground">
                            {fmt(c.capital)}
                          </td>
                          <td className="p-3.5 text-right text-muted-foreground">
                            {fmt(c.interes)}
                          </td>
                          <td className="p-3.5 text-right text-brand-gold">
                            {fmt(c.desgravamen)}
                          </td>
                          <td className="p-3.5 text-right font-semibold text-foreground bg-brand-teal/5">
                            {fmt(c.cuotaTotal)}
                          </td>
                          <td className="p-3.5 text-right text-muted-foreground">
                            {fmt(c.saldoFinal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Estado Inicial / Vacío */
            <div className="flex flex-col items-center justify-center min-h-[460px] rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center space-y-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
                <Calculator className="size-7 opacity-80" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="font-heading text-xl font-normal text-foreground">
                  Tu simulación aparecerá aquí
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Selecciona la institución financiera, ingresa el monto y plazo deseado, y presiona <strong className="text-foreground font-medium">"Calcular Amortización"</strong> para ver tu tabla oficial con seguro de desgravamen y descargar el reporte en PDF.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Badge variant="outline" className="text-xs">Normativa BCE 2026</Badge>
                <Badge variant="outline" className="text-xs">Desgravamen sobre saldo</Badge>
                <Badge variant="outline" className="text-xs">Exportación PDF Oficial</Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
