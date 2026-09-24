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
import creditPersonImage from '@/assets/imgs/persona-crédito.png'
import { SimulatorHeroBanner } from '@/components/shared/simulator-hero-banner'
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
import { useInstitutionSettings } from '@/app/providers/settings-provider'

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

// ─── Exportación Oficial a PDF con Paleta Corporativa Moderna ────────────────
function exportarSimulacionPdf(data: SimulacionClienteResponse, clienteNombre?: string | null) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Paleta Corporativa Oficial
  const primaryTeal = [8, 116, 123] // #08747b
  const secondaryGold = [148, 105, 40] // #946928
  const textDark = [32, 37, 39] // #202527
  const textMuted = [88, 96, 100] // #586064
  const bgSurface = [248, 250, 250] // #f8fafa
  const borderLight = [218, 221, 221] // #dadddd

  // 1. Barra de Cabecera Corporativa Brand Teal
  doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2])
  doc.rect(0, 0, 297, 22, 'F')

  // Línea dorada de acento
  doc.setFillColor(secondaryGold[0], secondaryGold[1], secondaryGold[2])
  doc.rect(0, 22, 297, 1.5, 'F')

  // Título en cabecera
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('TABLA OFICIAL DE AMORTIZACIÓN — SISTEMA FINANCIERO', 14, 11)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Normativa Oficial de Regulación BCE / SB • Simulación Oficial de Crédito y Desgravamen', 14, 17)

  const fechaEmision = `${new Date().toLocaleDateString('es-EC')} ${new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`
  doc.text(`Emisión: ${fechaEmision}`, 283, 15, { align: 'right' })

  // 2. Título de Sección y Solicitante
  doc.setTextColor(textDark[0], textDark[1], textDark[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  const tituloCondiciones = 'CONDICIONES GENERALES DE LA OPERACIÓN' + (clienteNombre ? ` — Solicitante: ${clienteNombre}` : '')
  doc.text(tituloCondiciones, 14, 30)

  // 3. Grid de Parámetros (2 columnas de datos estructurados en caja)
  doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2])
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2])
  doc.setLineWidth(0.3)
  doc.roundedRect(14, 33, 145, 25, 2, 2, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
  doc.text('Producto:', 18, 38)
  doc.text('Entidad:', 18, 43)
  doc.text('Segmento BCE:', 18, 48)
  doc.text('Sistema:', 18, 53)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(textDark[0], textDark[1], textDark[2])
  doc.text(`${data.nombreProducto}`, 46, 38)
  doc.text(`${data.entidad || 'Banco Comercial'}`, 46, 43)
  doc.text(`${data.segmentoBce || 'General'}`, 46, 48)
  doc.text(`${data.sistema === 'FRANCES' ? 'Francés (Cuota Fija)' : 'Alemán (Capital Fijo)'}`, 46, 53)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
  doc.text('Plazo:', 92, 38)
  doc.text('Frecuencia:', 92, 43)
  doc.text('Tasa Nominal:', 92, 48)
  doc.text('Desgravamen:', 92, 53)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(textDark[0], textDark[1], textDark[2])
  doc.text(`${data.totalCuotas} ${data.frecuencia === 'ANUAL' ? 'años' : 'meses'}`, 120, 38)
  doc.text(`${data.frecuencia}`, 120, 43)
  doc.text(`${data.tasaInteresAnual}% anual`, 120, 48)
  doc.text(`${data.tasaDesgravamenMensual}% mensual`, 120, 53)

  // 4. Tarjetas KPI de Resumen Financiero a la derecha (4 bloques)
  const kpiX = 165
  const kpiW = 28
  const kpiH = 25
  const kpiGap = 3

  const kpis = [
    { label: 'MONTO FINANCIADO', value: fmt(data.monto), color: textDark, isTotal: false },
    { label: 'TOTAL INTERESES', value: fmt(data.totalIntereses), color: primaryTeal, isTotal: false },
    { label: 'DESGRAVAMEN', value: fmt(data.totalDesgravamen), color: secondaryGold, isTotal: false },
    { label: 'TOTAL A PAGAR', value: fmt(data.totalPagar), color: textDark, isTotal: true },
  ]

  kpis.forEach((kpi, idx) => {
    const x = kpiX + idx * (kpiW + kpiGap)
    doc.setFillColor(kpi.isTotal ? 232 : 248, kpi.isTotal ? 244 : 250, kpi.isTotal ? 244 : 250)
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2])
    doc.roundedRect(x, 33, kpiW, kpiH, 1.5, 1.5, 'FD')

    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
    doc.text(kpi.label, x + kpiW / 2, 40, { align: 'center' })

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2])
    doc.text(kpi.value, x + kpiW / 2, 49, { align: 'center' })
  })

  // 5. Tabla Oficial de Amortización con desglose completo
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
    startY: 62,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      halign: 'right',
      font: 'helvetica',
      textColor: [32, 37, 39],
      lineColor: [225, 230, 230],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [8, 116, 123],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'right',
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 251, 251],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      6: { fontStyle: 'bold', fillColor: [235, 246, 246], textColor: [8, 116, 123] },
    },
    didDrawPage: (pageData) => {
      // Pie de página en cada hoja
      doc.setFontSize(7)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
      doc.text(
        '* Simulación referencial calculada con tasas vigentes de la Junta de Política y Regulación Financiera y Banco Central del Ecuador (BCE).',
        14,
        202
      )
      const pageStr = `Página ${pageData.pageNumber} de ${doc.getNumberOfPages()}`
      doc.setFont('helvetica', 'normal')
      doc.text(pageStr, 283, 202, { align: 'right' })
    },
  })

  const nombreArchivo = `Amortizacion_${(data.nombreProducto || 'Credito').replace(/\s+/g, '_')}_${data.monto}USD.pdf`
  doc.save(nombreArchivo)
}

// ─── Componente Principal del Simulador ─────────────────────────────────────
export function SimuladorClientePage() {
  const { account, hasPermission } = useAuth()
  const { assets } = useInstitutionSettings()
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

  // Sincronizar el primer producto disponible cuando se cargan los datos reales de la BD
  useEffect(() => {
    if (productosDisponibles.length > 0) {
      const existe = productosDisponibles.some((p) => p.id === Number(productoIdActual))
      if (!existe) {
        setValue('productoId', productosDisponibles[0].id)
      }
    }
  }, [productosDisponibles, productoIdActual, setValue])

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
    <main id="contenido" className="space-y-0">
      {/* ── Hero Banner de develop con Persona e Información Institucional ── */}
      <SimulatorHeroBanner
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Servicios', href: '/#servicios' },
          { label: 'Simulador de crédito' },
        ]}
        accentBadge="Simulador Oficial BCE"
        title="Simulador de Crédito"
        description="Calcula tu cronograma de pagos oficial conforme a la normativa vigente del Banco Central del Ecuador (BCE), con seguro de desgravamen y cargos transparentes."
        imageSrc={creditPersonImage}
        imageAlt="Persona simulando su crédito"
      />

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-10 space-y-8">
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

        {/* ── Layout de Dos Columnas (Formulario vs Resumen y Tabla) ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Columna Izquierda: Formulario de Parámetros (5 Cols) ─────── */}
          <div className="lg:col-span-5 space-y-6">
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
                        min={productoSeleccionado.montoMin}
                        max={productoSeleccionado.montoMax}
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

                    {/* Chips de montos sugeridos (Estilo de develop) */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[1000, 3000, 5000, 10000, 20000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setValue('monto', val)}
                          className={`text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
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
                  <div className="pt-2 relative z-10">
                    <Button
                      type="submit"
                      variant="brand"
                      className="w-full gap-2 font-medium text-sm cursor-pointer transition-all hover:bg-brand-teal/90 active:scale-[0.99] relative z-10"
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

          {/* ── Columna Derecha: Tarjeta de Resumen y Tabla Oficial (7 Cols - Sticky Desktop) ── */}
          <div className="lg:col-span-7 space-y-6 lg:sticky lg:top-24">
            {resultado ? (
              <div className="space-y-6">
                {/* Encabezado de Resultados y Acciones (Línea gráfica develop) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h2 className="text-xl font-heading font-medium text-foreground">
                      Resultado de la Simulación
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {resultado.nombreProducto} · {resultado.totalCuotas} {resultado.frecuencia === 'ANUAL' ? 'años' : 'meses'} · Tasa: {resultado.tasaInteresAnual}% anual · {resultado.sistema === 'FRANCES' ? 'Sistema Francés (Cuota Fija)' : 'Sistema Alemán (Capital Fijo)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => setModalTablaAbierto(true)}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 shrink-0 border-border text-foreground hover:bg-muted cursor-pointer"
                    >
                      <TableProperties className="size-4" />
                      <span>Ver Pantalla Completa</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => exportarSimulacionPdf(resultado, usuario?.nombre)}
                      variant="outline"
                      size="sm"
                      className="gap-2 shrink-0 border-brand-teal/30 text-brand-teal hover:bg-brand-teal/10 cursor-pointer"
                    >
                      <Download className="size-4" />
                      <span>Descargar PDF</span>
                    </Button>
                  </div>
                </div>

                {/* 4 Métricas Clave (Nueva UI de develop) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border bg-card p-4 space-y-1 shadow-2xs">
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

                  <div className="rounded-xl border bg-card p-4 space-y-1 shadow-2xs">
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

                  <div className="rounded-xl border bg-card p-4 space-y-1 shadow-2xs">
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

                  <div className="rounded-xl border bg-muted/40 p-4 space-y-1 shadow-2xs">
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

                {/* ── Tabla Oficial de Amortización (Directamente embebida como en develop) ──────────── */}
                <div className="overflow-hidden rounded-xl border bg-card shadow-2xs">
                  <div className="flex items-center justify-between border-b px-5 py-4">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
                        Tabla Oficial de Amortización
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Cronograma detallado con desglose de capital, interés, seguro de desgravamen y cuota
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
                          <th className="p-3 text-center font-medium">No.</th>
                          <th className="p-3 text-right font-medium">Saldo Inicial</th>
                          <th className="p-3 text-right font-medium text-foreground">Capital</th>
                          <th className="p-3 text-right font-medium">Interés</th>
                          <th className="p-3 text-right font-medium text-brand-gold">Desgravamen</th>
                          {Boolean(resultado.totalCargosIndirectos) && (
                            <th className="p-3 text-right font-medium text-muted-foreground">Cargos</th>
                          )}
                          <th className="p-3 text-right font-medium text-brand-teal">Cuota Total</th>
                          <th className="p-3 text-right font-medium">Saldo Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.tablaCuotas.map((c) => (
                          <tr
                            key={`cuota-row-${c.numeroCuota}`}
                            className="border-b last:border-0 hover:bg-muted/40 transition-colors text-xs"
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
                            {Boolean(resultado.totalCargosIndirectos) && (
                              <td className="p-3 text-right text-muted-foreground">
                                {fmt(c.cargosIndirectos || 0)}
                              </td>
                            )}
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
                    Selecciona el tipo de crédito, ingresa el monto y plazo deseado, y presiona <strong className="text-foreground font-medium">"Simular crédito"</strong> para ver tu tabla oficial con seguro de desgravamen y descargar el reporte en PDF.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Badge variant="outline" className="text-xs">Normativa BCE Vigente</Badge>
                  <Badge variant="outline" className="text-xs">Desgravamen sobre saldo</Badge>
                  <Badge variant="outline" className="text-xs">Exportación PDF Oficial</Badge>
                </div>
              </div>
            )}
          </div>
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
