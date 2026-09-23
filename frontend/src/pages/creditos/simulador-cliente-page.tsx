import { useState, useMemo, useEffect } from 'react'
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
  Percent,
  ShieldCheck,
  ShoppingBag,
  Coins,
  Receipt,
  FileCheck2,
  Info,
  TableProperties,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { simuladorService, PRODUCTOS_FALLBACK } from '@/features/creditos/simulador/services/simulador.service'
import {
  type SimulacionClienteResponse,
  type SimulacionClienteRequest,
  type ProductoSimulador,
} from '@/types'
import { useAuth } from '@/app/providers/auth-provider'

// ─── Formateador de moneda USD ───────────────────────────────────────────────
const fmtCurrency = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})
const fmt = (n: number | undefined) => fmtCurrency.format(n || 0)

// ─── Validación Zod Dinámica ────────────────────────────────────────────────
const simuladorSchema = z.object({
  productoId: z.number({ message: 'Seleccione un tipo de crédito' }).min(1, 'Seleccione un tipo de crédito'),
  costoTotal: z
    .number({ message: 'Ingrese el costo del bien o servicio' })
    .min(10, 'El valor mínimo del bien o servicio es de $10 USD'),
  monto: z
    .number({ message: 'Ingrese el monto que desea prestar' })
    .min(10, 'El monto mínimo a simular es de $10 USD'),
  plazo: z
    .number({ message: 'Ingrese el plazo deseado' })
    .min(1, 'El plazo mínimo es de 1 período'),
  sistema: z.enum(['FRANCES', 'ALEMAN'] as const, {
    message: 'Seleccione un sistema de amortización',
  }),
})

type SimuladorFormData = z.infer<typeof simuladorSchema>

// ─── Exportación Oficial a PDF (8 Columnas y Resumen Normativo) ──────────────
function exportarSimulacionPdf(data: SimulacionClienteResponse, clienteNombre?: string | null) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Cabecera Corporativa Brand Teal
  doc.setFillColor(8, 116, 123)
  doc.rect(0, 0, 297, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('TABLA OFICIAL DE AMORTIZACIÓN — SIMULADOR DE CRÉDITO', 14, 11)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema Financiero Ecuatoriano • Normativa del Banco Central del Ecuador (BCE)', 14, 17)
  doc.text(
    `Emisión: ${new Date().toLocaleDateString('es-EC')} ${new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`,
    220,
    17
  )

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

  doc.text(`Tipo de Crédito: ${data.nombreProducto}`, col1X, 38)
  if (data.costoTotal) {
    doc.text(`Costo del Bien / Servicio: ${fmt(data.costoTotal)}`, col1X, 44)
  }
  doc.text(`Segmento BCE: ${data.segmentoBce || 'Oficial'}`, col1X, 50)

  doc.text(`Monto Solicitado: ${fmt(data.monto)}`, col2X, 38)
  doc.text(`Frecuencia: ${data.frecuencia}`, col2X, 44)
  doc.text(`Plazo: ${data.totalCuotas} ${data.frecuencia === 'ANUAL' ? 'años' : 'meses'}`, col2X, 50)

  doc.text(`Tasa Nominal Anual: ${data.tasaInteresAnual}%`, col3X, 38)
  doc.text(`Seguro Desgravamen: ${data.tasaDesgravamenMensual}% mensual`, col3X, 44)
  doc.text(`Sistema: ${data.sistema === 'FRANCES' ? 'Francés (Cuota Fija)' : 'Alemán (Capital Fijo)'}`, col3X, 50)

  doc.setFont('helvetica', 'bold')
  doc.text(`Cuota Inicial: ${fmt(data.cuotaPeriodica)}`, col4X, 38)
  doc.text(`Cargos Indirectos: ${fmt(data.totalCargosIndirectos || 0)}`, col4X, 44)
  doc.text(`Total a Pagar: ${fmt(data.totalPagar)}`, col4X, 50)

  // 8 Columnas Exactas Oficiales
  const head = [[
    'No.',
    'Saldo Inicial',
    'Capital',
    'Interés',
    'Desgravamen',
    'Cargos Ind.',
    'Cuota Total',
    'Saldo Final',
  ]]

  const body = data.tablaCuotas.map((c) => [
    c.numeroCuota.toString(),
    fmt(c.saldoInicial),
    fmt(c.capital),
    fmt(c.interes),
    fmt(c.desgravamen),
    fmt(c.cargosIndirectos || 0),
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
      fillColor: [8, 116, 123],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'right',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 250],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      6: { fontStyle: 'bold', fillColor: [240, 248, 248] },
    },
  })

  const finalY = (doc as any).lastAutoTable?.finalY || 180
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(120, 130, 133)
  doc.text(
    '* Simulación referencial calculada con tasas y cargos vigentes según resolución del Banco Central del Ecuador (BCE) y Junta de Política y Regulación Financiera.',
    14,
    Math.min(finalY + 8, 200)
  )

  const nombreArchivo = `Amortizacion_${data.nombreProducto.replace(/\s+/g, '_')}_${data.monto}USD.pdf`
  doc.save(nombreArchivo)
}

// ─── Componente Principal del Simulador ─────────────────────────────────────
export function SimuladorClientePage() {
  const { account, hasPermission } = useAuth()
  const isAsesor = hasPermission('credit.products.manage') || (account?.roles?.includes('credit_advisor') ?? false)
  const usuario = account ? { nombre: account.fullName || account.username } : null

  const [resultado, setResultado] = useState<SimulacionClienteResponse | null>(null)
  const [modalTablaAbierto, setModalTablaAbierto] = useState(false)

  // Consulta de Tipos de Crédito desde la Base de Datos
  const productosQuery = useQuery({
    queryKey: ['simulador', 'productos'],
    queryFn: () => simuladorService.obtenerProductos(),
    staleTime: 60_000,
  })

  const productosDisponibles: ProductoSimulador[] = useMemo(() => {
    if (productosQuery.data && productosQuery.data.length > 0) {
      return productosQuery.data
    }
    return PRODUCTOS_FALLBACK
  }, [productosQuery.data])

  const defaultProd: ProductoSimulador = productosDisponibles[0] || PRODUCTOS_FALLBACK[0]

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SimuladorFormData>({
    resolver: zodResolver(simuladorSchema),
    defaultValues: {
      productoId: defaultProd.id,
      costoTotal: 8000,
      monto: 5000,
      plazo: defaultProd.plazoMin >= 12 ? defaultProd.plazoMin : 24,
      sistema: (defaultProd.sistemasPermitidos[0] as 'FRANCES' | 'ALEMAN') || 'FRANCES',
    },
  })

  const productoIdActual = watch('productoId')
  const costoTotalActual = watch('costoTotal')
  const montoActual = watch('monto')
  const plazoActual = watch('plazo')
  const sistemaActual = watch('sistema')

  // Producto seleccionado dinámicamente
  const productoSeleccionado = useMemo(() => {
    return productosDisponibles.find((p) => p.id === Number(productoIdActual)) || defaultProd
  }, [productosDisponibles, productoIdActual, defaultProd])

  const esAnios = productoSeleccionado.unidadPlazo === 'ANIOS'
  const etiquetaPlazo = esAnios ? 'años' : 'meses'

  // Cambio dinámico de producto: ajustar límites y valores incompatibles
  useEffect(() => {
    if (!productoSeleccionado) return

    // 1. Ajustar plazo si está fuera del rango del nuevo producto
    if (plazoActual < productoSeleccionado.plazoMin) {
      setValue('plazo', productoSeleccionado.plazoMin)
    } else if (plazoActual > productoSeleccionado.plazoMax) {
      setValue('plazo', productoSeleccionado.plazoMax)
    }

    // 2. Ajustar monto si excede el máximo del nuevo producto
    if (montoActual > productoSeleccionado.montoMax) {
      setValue('monto', productoSeleccionado.montoMax)
    } else if (montoActual < productoSeleccionado.montoMin) {
      setValue('monto', productoSeleccionado.montoMin)
    }

    // 3. Ajustar sistema de amortización si el producto no permite el actual
    if (!productoSeleccionado.sistemasPermitidos.includes(sistemaActual)) {
      const nuevoSistema = (productoSeleccionado.sistemasPermitidos[0] as 'FRANCES' | 'ALEMAN') || 'FRANCES'
      setValue('sistema', nuevoSistema)
    }
  }, [productoSeleccionado, setValue, plazoActual, montoActual, sistemaActual])

  // Validación de la relación lógica entre monto solicitado y costo total
  useEffect(() => {
    if (costoTotalActual && montoActual && montoActual > costoTotalActual) {
      setError('monto', {
        type: 'manual',
        message: `El monto a prestar ($${montoActual}) no puede ser mayor que el costo total del bien ($${costoTotalActual})`,
      })
    } else {
      clearErrors('monto')
    }
  }, [costoTotalActual, montoActual, setError, clearErrors])

  const mutation = useMutation({
    mutationFn: (data: SimuladorFormData) => {
      const payload: SimulacionClienteRequest = {
        productoId: data.productoId,
        creditTypeId: data.productoId,
        costoTotal: data.costoTotal,
        monto: data.monto,
        frecuencia: esAnios ? 'ANUAL' : 'MENSUAL',
        plazo: data.plazo,
        sistema: data.sistema,
        usuario: usuario?.nombre,
      }
      return simuladorService.calcularCliente(payload)
    },
    onSuccess: (data) => {
      setResultado(data)
      toast.success('Amortización calculada exitosamente', {
        description: `${data.nombreProducto} — Tasa: ${data.tasaInteresAnual}% · Desgravamen: ${data.tasaDesgravamenMensual}%`,
      })
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Error al realizar la simulación'
      toast.error('No se pudo simular el crédito', { description: msg })
    },
  })

  const onSubmit = (data: SimuladorFormData, e?: React.BaseSyntheticEvent) => {
    e?.preventDefault()

    // Validaciones frontend adicionales
    if (data.monto > data.costoTotal) {
      toast.error('El monto a financiar no puede superar el costo del bien o servicio')
      return
    }

    if (data.monto < productoSeleccionado.montoMin) {
      toast.error(`El monto mínimo permitido para ${productoSeleccionado.nombre} es de $${productoSeleccionado.montoMin}`)
      return
    }

    if (data.monto > productoSeleccionado.montoMax) {
      toast.error(`El monto máximo permitido para ${productoSeleccionado.nombre} es de $${productoSeleccionado.montoMax}`)
      return
    }

    if (data.plazo < productoSeleccionado.plazoMin || data.plazo > productoSeleccionado.plazoMax) {
      toast.error(`El plazo debe estar entre ${productoSeleccionado.plazoMin} y ${productoSeleccionado.plazoMax} ${etiquetaPlazo}`)
      return
    }

    mutation.mutate(data)
  }

  return (
    <main id="contenido" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14 space-y-8">
      {/* ── Banner condicional para Asesor / Administrador ─────────────── */}
      {isAsesor && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-brand-teal/5 border border-brand-teal/20 text-xs">
          <div className="flex items-center gap-2.5 text-foreground">
            <span className="flex size-2 rounded-full bg-brand-teal animate-pulse" />
            <span>
              Sesión activa como <strong className="font-semibold text-foreground">Asesor Financiero</strong> ({usuario?.nombre}). La configuración y cargos de cada crédito provienen de la parametrización interna.
            </span>
          </div>
          <Button asChild size="sm" variant="outline" className="border-brand-teal/30 text-brand-teal hover:bg-brand-teal/10 gap-1.5 shrink-0">
            <Link to="/admin/creditos">
              Administrar Productos
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* ── Encabezado Principal ────────────────────────────────────────── */}
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <h1 className="font-heading text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          Simulador de Crédito
        </h1>
        <p className="text-sm text-muted-foreground">
          Calcula tu cronograma de pagos oficial conforme a la normativa vigente del Banco Central del Ecuador (BCE), con seguro de desgravamen y cargos indirectos transparentes.
        </p>
      </div>

      {/* ── Layout de Dos Columnas (Formulario vs Resumen) ─────────────── */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* ── Columna Izquierda: Formulario de Parámetros ──────────────── */}
        <div className="space-y-6">
          <Card className="rounded-xl border bg-card shadow-xs">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-brand-teal/10 text-brand-teal">
                  <Calculator className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground font-sans font-medium">
                    Parámetros del Crédito
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Ingresa las condiciones deseadas para tu financiamiento
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                
                {/* 1. ComboBox Único: Tipo de Crédito (Cargado dinámicamente desde BD) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Receipt className="size-3.5 text-brand-teal" />
                      Tipo de crédito
                    </Label>
                    <span className="text-[10px] text-brand-teal font-medium">Configuración oficial</span>
                  </div>
                  <Controller
                    name="productoId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={field.value ? String(field.value) : ''}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Seleccione un tipo de crédito" />
                        </SelectTrigger>
                        <SelectContent>
                          {productosDisponibles.map((prod) => (
                            <SelectItem key={prod.id} value={String(prod.id)}>
                              {prod.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.productoId && (
                    <p className="text-[11px] text-destructive">{errors.productoId.message}</p>
                  )}
                  {productoSeleccionado.descripcion && (
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {productoSeleccionado.descripcion}
                    </p>
                  )}
                </div>

                {/* Tarjeta de Solo Lectura: Tasa Nominal, Desgravamen y Cargos */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Percent className="size-3 text-brand-teal" />
                        <span>Tasa Nominal</span>
                      </div>
                      <div className="font-sans font-semibold text-sm text-foreground">
                        {productoSeleccionado.tasaNominal.toFixed(2)}%{' '}
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
                        {productoSeleccionado.desgravamen.toFixed(4)}%{' '}
                        <span className="text-[10px] font-normal text-muted-foreground">mensual</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Sobre saldo deudor</p>
                    </div>
                  </div>

                  {/* Cargos Indirectos Asociados (si existen) */}
                  {productoSeleccionado.cargosIndirectos && productoSeleccionado.cargosIndirectos.length > 0 && (
                    <div className="pt-2 border-t border-border/60">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
                        <FileCheck2 className="size-3 text-brand-gold" />
                        <span className="font-medium text-foreground">Cargos Indirectos aplicables:</span>
                      </div>
                      <div className="space-y-1">
                        {productoSeleccionado.cargosIndirectos.map((c, i) => (
                          <div key={i} className="flex justify-between text-[11px] text-muted-foreground">
                            <span>• {c.nombre}:</span>
                            <span className="font-medium text-foreground">
                              {c.tipoCargo === 'PORCENTAJE' ? `${c.valor}% (${c.baseCalculo.toLowerCase()})` : `$${c.valor} (${c.periodicidad.toLowerCase()})`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Campo: ¿Cuánto cuesta el bien/servicio? */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="costoTotal" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <ShoppingBag className="size-3.5 text-brand-teal" />
                      ¿Cuánto cuesta el bien/servicio?
                    </Label>
                    <span className="font-sans text-muted-foreground text-xs">{fmt(costoTotalActual)}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-muted-foreground text-xs font-medium">$</span>
                    <Input
                      id="costoTotal"
                      type="number"
                      step="50"
                      className="pl-7 text-xs"
                      {...register('costoTotal', { valueAsNumber: true })}
                    />
                  </div>
                  {errors.costoTotal && (
                    <p className="text-[11px] text-destructive">{errors.costoTotal.message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Valor total del bien, vehículo, inmueble o servicio a adquirir.
                  </p>
                </div>

                {/* 3. Campo: ¿Cuánto desea prestar? */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="monto" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Coins className="size-3.5 text-brand-teal" />
                      ¿Cuánto desea prestar?
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
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-0.5">
                    <span>Mín: {fmt(productoSeleccionado.montoMin)}</span>
                    <span>Máx: {fmt(productoSeleccionado.montoMax)}</span>
                  </div>
                </div>

                {/* 4. Campo: Plazo (¿En cuánto tiempo desea pagar?) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="plazo" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-brand-teal" />
                      ¿En cuánto tiempo desea pagar?
                    </Label>
                    <span className="text-muted-foreground text-xs">
                      {plazoActual} {etiquetaPlazo}
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="plazo"
                      type="number"
                      min={productoSeleccionado.plazoMin}
                      max={productoSeleccionado.plazoMax}
                      className="text-xs pr-16"
                      {...register('plazo', { valueAsNumber: true })}
                    />
                    <span className="absolute right-3 top-2 text-xs text-muted-foreground font-medium uppercase">
                      {etiquetaPlazo}
                    </span>
                  </div>
                  {errors.plazo && (
                    <p className="text-[11px] text-destructive">{errors.plazo.message}</p>
                  )}
                  <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span>Mín: {productoSeleccionado.plazoMin} {etiquetaPlazo}</span>
                    <span>Máx: {productoSeleccionado.plazoMax} {etiquetaPlazo}</span>
                  </div>
                </div>

                {/* 5. Campo: Sistema de Amortización (Filtrado según producto) */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">
                    Sistema de Amortización
                  </Label>
                  <div className="space-y-2 pt-0.5">
                    {/* Opción Francés */}
                    {productoSeleccionado.sistemasPermitidos.includes('FRANCES') && (
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
                          Cuota constante en cada período. El interés decrece progresivamente mientras que el abono al capital aumenta.
                        </p>
                      </div>
                    )}

                    {/* Opción Alemán */}
                    {productoSeleccionado.sistemasPermitidos.includes('ALEMAN') && (
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
                          Abono de capital idéntico en cada período. Las cuotas iniciales son mayores y descienden progresivamente.
                        </p>
                      </div>
                    )}

                    {/* Mensaje si el producto permite solo uno */}
                    {productoSeleccionado.sistemasPermitidos.length === 1 && (
                      <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                        <Info className="size-3 text-brand-teal" />
                        Este tipo de crédito está configurado exclusivamente para operar bajo el sistema seleccionado.
                      </p>
                    )}
                  </div>
                </div>

                {/* Botón Principal de Simulación */}
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
                        <span>Calculando amortización oficial…</span>
                      </>
                    ) : (
                      <>
                        <Calculator className="size-4" />
                        <span>Simular crédito</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ── Columna Derecha: Tarjeta de Resumen o Estado Inicial (Sticky Desktop) ── */}
        <div className="space-y-6 lg:sticky lg:top-24">
          {resultado ? (
            <Card className="rounded-xl border bg-card shadow-xs overflow-hidden">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base text-foreground font-sans font-medium">
                      Resumen del Crédito
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      {resultado.nombreProducto} · {resultado.totalCuotas} {resultado.frecuencia === 'ANUAL' ? 'años' : 'meses'} · Tasa: {resultado.tasaInteresAnual}%
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {resultado.sistema === 'FRANCES' ? 'Francés (Cuota Fija)' : 'Alemán (Capital Fijo)'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                {/* 1. Cuota Mensual Destacada */}
                <div className="rounded-xl bg-brand-teal/5 border border-brand-teal/20 p-5 text-center sm:text-left space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-teal">
                      Cuota {resultado.frecuencia === 'ANUAL' ? 'Anual' : 'Mensual'} Estimada
                    </span>
                    <Badge variant="outline" className="text-[11px] border-brand-teal/40 text-brand-teal bg-brand-teal/10">
                      {resultado.sistema === 'FRANCES' ? 'Cuota Fija' : 'Primera Cuota'}
                    </Badge>
                  </div>
                  <div className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground font-sans">
                    {fmt(resultado.cuotaPeriodica)}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {resultado.sistema === 'FRANCES'
                      ? 'Cuota regular constante calculada bajo el sistema francés.'
                      : 'Monto de la primera cuota estimada. El valor decrece periódicamente.'}
                  </p>
                </div>

                {/* 2. Desglose de la Cuota (Capital + Interés + Seguro de Desgravamen) */}
                <div className="rounded-xl bg-muted/40 border border-border/70 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      Desglose de la cuota {resultado.sistema === 'ALEMAN' && '(Cuota 1)'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Capital + Interés + Seguro
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-background/80 p-2 border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">
                        Capital
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-foreground font-sans">
                        {fmt(resultado.tablaCuotas[0]?.capital)}
                      </span>
                    </div>

                    <div className="rounded-lg bg-background/80 p-2 border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">
                        Interés
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-foreground font-sans">
                        {fmt(resultado.tablaCuotas[0]?.interes)}
                      </span>
                    </div>

                    <div className="rounded-lg bg-background/80 p-2 border border-border/60">
                      <span className="text-[10px] text-brand-gold uppercase tracking-wide block">
                        Seguro
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-brand-gold font-sans">
                        {fmt(resultado.tablaCuotas[0]?.desgravamen)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                    <span className="font-medium text-foreground">{fmt(resultado.tablaCuotas[0]?.capital)}</span>
                    <span>+</span>
                    <span className="font-medium text-foreground">{fmt(resultado.tablaCuotas[0]?.interes)}</span>
                    <span>+</span>
                    <span className="font-medium text-brand-gold">{fmt(resultado.tablaCuotas[0]?.desgravamen)}</span>
                    <span>=</span>
                    <span className="font-semibold text-brand-teal">{fmt(resultado.cuotaPeriodica)}</span>
                  </div>
                </div>

                {/* 3. Detalle General del Crédito */}
                <div className="space-y-2.5 pt-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Detalle General
                  </h4>
                  <div className="rounded-xl border border-border/70 divide-y divide-border/60 overflow-hidden bg-card/60">
                    <div className="flex justify-between items-center px-4 py-2.5 text-xs">
                      <span className="text-muted-foreground">Capital total prestado</span>
                      <span className="font-medium text-foreground">{fmt(resultado.monto)}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5 text-xs">
                      <span className="text-muted-foreground">Total de intereses</span>
                      <span className="font-medium text-foreground">{fmt(resultado.totalIntereses)}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5 text-xs">
                      <span className="text-muted-foreground">Total de seguro (Desgravamen)</span>
                      <span className="font-medium text-brand-gold">{fmt(resultado.totalDesgravamen)}</span>
                    </div>
                    {Boolean(resultado.totalCargosIndirectos) && (
                      <div className="flex justify-between items-center px-4 py-2.5 text-xs">
                        <span className="text-muted-foreground">Total cargos indirectos</span>
                        <span className="font-medium text-foreground">{fmt(resultado.totalCargosIndirectos)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center px-4 py-3 text-xs bg-muted/30">
                      <span className="font-semibold text-foreground text-sm">Gran Total a Pagar</span>
                      <span className="font-bold text-brand-teal text-base">{fmt(resultado.totalPagar)}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Botón de Acción: Ver tabla de amortización */}
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalTablaAbierto(true)}
                    className="w-full gap-2 border-brand-teal/40 text-brand-teal hover:bg-brand-teal/10 hover:text-brand-teal font-medium text-xs sm:text-sm h-11"
                  >
                    <TableProperties className="size-4" />
                    <span>Ver tabla de amortización</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                  Selecciona el tipo de crédito, ingresa el costo del bien, el monto a financiar y el plazo, y presiona <strong className="text-foreground font-medium">"Simular crédito"</strong> para ver tu cronograma oficial con tasas de regulación BCE y seguro de desgravamen.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Badge variant="outline" className="text-xs">Normativa BCE Vigente</Badge>
                <Badge variant="outline" className="text-xs">Cargos Transparentes</Badge>
                <Badge variant="outline" className="text-xs">Exportación PDF Oficial</Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal / Dialog: Tabla Completa de Amortización ────────────────── */}
      <Dialog open={modalTablaAbierto} onOpenChange={setModalTablaAbierto}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border-border">
          <DialogHeader className="p-5 border-b border-border pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="text-lg font-heading font-normal text-foreground">
                  Tabla Oficial de Amortización
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {resultado?.nombreProducto} — {resultado?.totalCuotas} cuotas ({resultado?.sistema === 'FRANCES' ? 'Sistema Francés' : 'Sistema Alemán'})
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="brand"
                size="sm"
                onClick={() => resultado && exportarSimulacionPdf(resultado, usuario?.nombre)}
                className="gap-2 font-medium shrink-0"
              >
                <Download className="size-4" />
                <span>Descargar (PDF/Excel)</span>
              </Button>
            </div>
          </DialogHeader>

          {/* Contenido del Modal: Tabla completa con todas las cuotas */}
          <div className="overflow-auto flex-1 p-5">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/60 text-muted-foreground">
                    <th className="p-3 text-center font-medium">Mes</th>
                    <th className="p-3 text-right font-medium">Saldo Inicial</th>
                    <th className="p-3 text-right font-medium text-foreground">Capital</th>
                    <th className="p-3 text-right font-medium">Interés</th>
                    <th className="p-3 text-right font-medium text-brand-gold">Seguro</th>
                    <th className="p-3 text-right font-medium text-brand-gold">Cargos Ind.</th>
                    <th className="p-3 text-right font-medium text-brand-teal">Cuota</th>
                    <th className="p-3 text-right font-medium">Saldo Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {resultado?.tablaCuotas.map((c) => (
                    <tr
                      key={`cuota-modal-${c.numeroCuota}`}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="p-3 text-center text-muted-foreground font-medium">
                        {c.numeroCuota}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {fmt(c.saldoInicial)}
                      </td>
                      <td className="p-3 text-right font-medium text-foreground">
                        {fmt(c.capital)}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {fmt(c.interes)}
                      </td>
                      <td className="p-3 text-right text-brand-gold">
                        {fmt(c.desgravamen)}
                      </td>
                      <td className="p-3 text-right text-brand-gold">
                        {fmt(c.cargosIndirectos || 0)}
                      </td>
                      <td className="p-3 text-right font-semibold text-foreground bg-brand-teal/5">
                        {fmt(c.cuotaTotal)}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {fmt(c.saldoFinal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/20">
            <span className="text-[11px] text-muted-foreground">
              * Cronograma referencial bajo normativa del Banco Central del Ecuador (BCE).
            </span>
            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalTablaAbierto(false)}
              >
                Cerrar
              </Button>
              <Button
                type="button"
                variant="brand"
                size="sm"
                onClick={() => resultado && exportarSimulacionPdf(resultado, usuario?.nombre)}
                className="gap-2 font-medium"
              >
                <Download className="size-4" />
                <span>Descargar (PDF/Excel)</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
