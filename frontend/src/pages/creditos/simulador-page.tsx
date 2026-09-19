import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Calculator, Download, RotateCcw, Info, TrendingUp,
  DollarSign, Calendar, Shield, ChevronDown, BarChart3, TableIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { simuladorService } from '@/features/creditos/simulador/services/simulador.service'
import { type SimulacionResult, type SistemaAmortizacion } from '@/types'

// ─── Segmentos y tasas BCE ────────────────────────────────────────────────────

const SEGMENTOS = [
  { value: 'CONSUMO',     label: 'Consumo Prioritario' },
  { value: 'VIVIENDA',    label: 'Vivienda / Interés Social' },
  { value: 'MICROCREDITO',label: 'Microcrédito Minorista' },
  { value: 'PYMES',       label: 'Productivo PYMES' },
] as const

type SegmentoBce = typeof SEGMENTOS[number]['value']

interface TasaRef {
  label: string
  valor: number
  tipo: 'REFERENTIAL' | 'MAXIMUM'
  segmento: SegmentoBce
}

const TASAS_REF: TasaRef[] = [
  { label: 'Referencial (BCE)',    valor: 15.74, tipo: 'REFERENTIAL', segmento: 'CONSUMO'      },
  { label: 'Máxima (BCE)',         valor: 16.77, tipo: 'MAXIMUM',      segmento: 'CONSUMO'      },
  { label: 'Referencial (BCE)',    valor:  4.82, tipo: 'REFERENTIAL', segmento: 'VIVIENDA'     },
  { label: 'Máxima (BCE)',         valor:  4.99, tipo: 'MAXIMUM',      segmento: 'VIVIENDA'     },
  { label: 'Referencial (BCE)',    valor: 28.24, tipo: 'REFERENTIAL', segmento: 'MICROCREDITO' },
  { label: 'Máxima (BCE)',         valor: 30.50, tipo: 'MAXIMUM',      segmento: 'MICROCREDITO' },
  { label: 'Referencial (BCE)',    valor: 11.32, tipo: 'REFERENTIAL', segmento: 'PYMES'        },
  { label: 'Máxima (BCE)',         valor: 11.83, tipo: 'MAXIMUM',      segmento: 'PYMES'        },
]

const TASA_MAX: Record<SegmentoBce, number> = {
  CONSUMO:      16.77,
  VIVIENDA:      4.99,
  MICROCREDITO: 30.50,
  PYMES:        11.83,
}

// ─── Zod schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  monto:              z.number({ message: 'Ingrese un monto válido' }).min(100, 'Mínimo $100'),
  plazoMeses:         z.number({ message: 'Ingrese un plazo válido' }).min(1).max(480),
  tasaEfectiva:       z.number({ message: 'Ingrese una tasa válida' }).min(0.01).max(100),
  sistema:            z.enum(['FRANCES', 'ALEMAN'] as const),
  segmentoBce:        z.enum(['CONSUMO', 'VIVIENDA', 'MICROCREDITO', 'PYMES'] as const),
  incluirDesgravamen: z.boolean(),
  seguroDesgravamenPct: z.number().min(0).max(5).optional(),
  fechaDesembolso:    z.string().min(1, 'Selecciona la fecha de desembolso'),
})

type FormData = z.infer<typeof schema>

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const fmtNum  = (n: number) => fmt.format(n)
const fmtPct  = (n: number) => `${n.toFixed(4)}%`
const fmtDate = (iso: string | undefined) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
const todayIso = () => new Date().toISOString().split('T')[0]

// ─── PDF export ───────────────────────────────────────────────────────────────

function exportPdf(result: SimulacionResult, formData: FormData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Tabla de Amortización', 14, 18)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const segLabel = SEGMENTOS.find(s => s.value === formData.segmentoBce)?.label ?? formData.segmentoBce
  const infoLines = [
    [`Sistema:`, result.sistema === 'FRANCES' ? 'Francés (cuota fija)' : 'Alemán (amortización constante)'],
    [`Segmento:`, segLabel],
    [`Monto:`, fmtNum(result.monto)],
    [`Plazo:`, `${result.plazoMeses} meses`],
    [`Tasa E.A.:`, `${result.tasaEfectivaAnual}%`],
    [`Fecha de Desembolso:`, fmtDate(result.fechaDesembolso)],
    [`Total intereses:`, fmtNum(result.totalIntereses)],
    [`Total seguros:`, fmtNum(result.totalSeguros)],
    [`Total a pagar:`, fmtNum(result.totalPagar)],
  ]

  let yPos = 26
  infoLines.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(k, 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(v, 55, yPos)
    yPos += 5
  })

  const hasSeguro = result.totalSeguros > 0
  const hasDate   = !!result.tablaCuotas[0]?.fechaVencimiento

  const head: string[][] = [[
    'N°',
    ...(hasDate ? ['Fecha Vcto.'] : []),
    'Saldo Inicial',
    'Capital',
    'Interés',
    ...(hasSeguro ? ['Seguro'] : []),
    'Cuota Total',
    'Saldo Final',
  ]]

  const body = result.tablaCuotas.map(c => [
    String(c.numeroCuota),
    ...(hasDate ? [fmtDate(c.fechaVencimiento)] : []),
    fmtNum(c.saldoInicial),
    fmtNum(c.capital),
    fmtNum(c.interes),
    ...(hasSeguro ? [fmtNum(c.seguro)] : []),
    fmtNum(c.cuotaTotal),
    fmtNum(c.saldoFinal),
  ])

  autoTable(doc, {
    head,
    body,
    startY: yPos + 4,
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 245, 255] },
    columnStyles: { 0: { halign: 'center' } },
  })

  doc.save(`amortizacion_${result.sistema}_${result.plazoMeses}m.pdf`)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SimuladorPage() {
  const [result, setResult] = useState<SimulacionResult | null>(null)
  const [vistaTabla, setVistaTabla] = useState<'tabla' | 'grafico'>('tabla')

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        monto:                5000,
        plazoMeses:           24,
        tasaEfectiva:         15.74,
        sistema:              'FRANCES',
        segmentoBce:          'CONSUMO',
        incluirDesgravamen:   false,
        seguroDesgravamenPct: 0.0699,
        fechaDesembolso:      todayIso(),
      },
    })

  const sistema            = watch('sistema')
  const tasaActual         = watch('tasaEfectiva')
  const segmentoBce        = watch('segmentoBce')
  const incluirDesgravamen = watch('incluirDesgravamen')

  const tasasDelSegmento = TASAS_REF.filter(t => t.segmento === segmentoBce)
  const tasaMaxPermitida  = TASA_MAX[segmentoBce]
  const superaTasaMax     = tasaActual > tasaMaxPermitida

  const mutation = useMutation({
    mutationFn: simuladorService.simular,
    onSuccess: (data) => { setResult(data); setVistaTabla('tabla') },
    onError:   () => toast.error('Error al calcular la simulación'),
  })

  const onSubmit = useCallback((dto: FormData) => {
    mutation.mutate({
      monto:               dto.monto,
      plazoMeses:          dto.plazoMeses,
      tasaEfectiva:        dto.tasaEfectiva,
      sistema:             dto.sistema,
      segmentoBce:         dto.segmentoBce,
      fechaDesembolso:     dto.fechaDesembolso,
      incluirSeguros:      dto.incluirDesgravamen,
      seguroDesgravamenPct: dto.incluirDesgravamen ? (dto.seguroDesgravamenPct ?? 0.0699) : undefined,
    })
  }, [mutation])

  const handleReset = () => { reset(); setResult(null) }

  // Datos para el gráfico
  const chartData = result
    ? result.tablaCuotas.map(c => ({
        n:       c.numeroCuota,
        Capital: +c.capital.toFixed(2),
        Interés: +c.interes.toFixed(2),
        Seguro:  +c.seguro.toFixed(2),
      }))
    : []

  const hasSeguro = !!result && result.totalSeguros > 0
  const hasDate   = !!result?.tablaCuotas[0]?.fechaVencimiento

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6 text-primary" />
          Simulador de Crédito
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Precisión bancaria — Sistema Francés · Alemán · Seguro de Desgravamen · Fechas de vencimiento
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Panel de entrada ─────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Parámetros del crédito</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                {/* Segmento BCE */}
                <div className="space-y-1.5">
                  <Label>Segmento de Crédito (BCE)</Label>
                  <Controller
                    control={control}
                    name="segmentoBce"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => {
                        field.onChange(v as SegmentoBce)
                        // Autocompletar con la tasa referencial del segmento
                        const ref = TASAS_REF.find(t => t.segmento === v && t.tipo === 'REFERENTIAL')
                        if (ref) setValue('tasaEfectiva', ref.valor)
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SEGMENTOS.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Monto */}
                <div className="space-y-1.5">
                  <Label htmlFor="monto">Monto solicitado (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="monto"
                      type="number" step="100" min="100" placeholder="5000"
                      className="pl-9"
                      {...register('monto', { valueAsNumber: true })}
                    />
                  </div>
                  {errors.monto && <p className="text-xs text-destructive">{errors.monto.message}</p>}
                </div>

                {/* Plazo */}
                <div className="space-y-1.5">
                  <Label htmlFor="plazo">Plazo (meses)</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="plazo"
                      type="number" min="1" max="480" placeholder="24"
                      className="pl-9"
                      {...register('plazoMeses', { valueAsNumber: true })}
                    />
                  </div>
                  {errors.plazoMeses && <p className="text-xs text-destructive">{errors.plazoMeses.message}</p>}
                </div>

                {/* Fecha de desembolso */}
                <div className="space-y-1.5">
                  <Label htmlFor="fechaDesembolso">Fecha de Desembolso</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="fechaDesembolso"
                      type="date"
                      className="pl-9"
                      {...register('fechaDesembolso')}
                    />
                  </div>
                  {errors.fechaDesembolso && (
                    <p className="text-xs text-destructive">{errors.fechaDesembolso.message}</p>
                  )}
                </div>

                {/* Tasa de referencia */}
                <div className="space-y-1.5">
                  <Label>Tasa de referencia (BCE)</Label>
                  <Select onValueChange={(v) => setValue('tasaEfectiva', parseFloat(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tasa…" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasasDelSegmento.map(t => (
                        <SelectItem key={t.label + t.valor} value={String(t.valor)}>
                          {/* div evita span>div (Badge) que rompe el DOM */}
                          <div className="flex items-center gap-2">
                            <Badge variant={t.tipo === 'MAXIMUM' ? 'destructive' : 'secondary'} className="text-[10px] px-1 py-0">
                              {t.tipo === 'MAXIMUM' ? 'MÁX' : 'REF'}
                            </Badge>
                            <span>{t.label} — {t.valor}%</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tasa efectiva anual */}
                <div className="space-y-1.5">
                  <Label htmlFor="tasa">Tasa Efectiva Anual (%)</Label>
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="tasa"
                      type="number" step="0.01" min="0.01" max="100"
                      className={`pl-9 ${superaTasaMax ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      {...register('tasaEfectiva', { valueAsNumber: true })}
                    />
                  </div>
                  {superaTasaMax && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <ChevronDown className="w-3 h-3" />
                      Supera la tasa máxima BCE ({tasaMaxPermitida}%) para este segmento
                    </p>
                  )}
                  {errors.tasaEfectiva && <p className="text-xs text-destructive">{errors.tasaEfectiva.message}</p>}
                </div>

                {/* Sistema de amortización */}
                <div className="space-y-1.5">
                  <Label>Sistema de amortización</Label>
                  <Controller
                    control={control}
                    name="sistema"
                    render={({ field }) => (
                      <Tabs value={field.value} onValueChange={(v) => field.onChange(v as SistemaAmortizacion)}>
                        <TabsList className="grid grid-cols-2 w-full">
                          <TabsTrigger value="FRANCES">Francés</TabsTrigger>
                          <TabsTrigger value="ALEMAN">Alemán</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    {sistema === 'FRANCES'
                      ? 'Cuota fija mensual — interés decreciente'
                      : 'Amortización constante — cuota decreciente'}
                  </p>
                </div>

                {/* Seguro de desgravamen */}
                <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Controller
                      control={control}
                      name="incluirDesgravamen"
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          id="desgravamen"
                          checked={field.value}
                          onChange={field.onChange}
                          className="rounded w-4 h-4 accent-primary"
                        />
                      )}
                    />
                    <Label htmlFor="desgravamen" className="cursor-pointer font-medium flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      Seguro de Desgravamen
                    </Label>
                  </div>
                  {incluirDesgravamen && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Tasa anual del seguro (% sobre saldo deudor)
                      </p>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          max="5"
                          className="pr-8"
                          {...register('seguroDesgravamenPct', { valueAsNumber: true })}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Valor de referencia mercado: <strong>0.0699% anual</strong>
                      </p>
                      {errors.seguroDesgravamenPct && (
                        <p className="text-xs text-destructive">{errors.seguroDesgravamenPct.message}</p>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                    {mutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-primary-foreground/50 border-t-primary-foreground rounded-full animate-spin" />
                        Calculando…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        Calcular
                      </span>
                    )}
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Nota informativa */}
          <Card className="bg-accent/30 border-accent">
            <CardContent className="pt-4">
              <div className="flex gap-2 text-xs text-accent-foreground">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Tasas referenciales y máximas publicadas por el{' '}
                  <strong>Banco Central del Ecuador (BCE)</strong>. El seguro de desgravamen
                  se calcula mensualmente sobre el saldo deudor vigente.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Panel de resultados ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              {/* Tarjetas resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                  label="Cuota mensual"
                  value={fmtNum(result.cuotaMensual)}
                  sub={result.sistema === 'FRANCES' ? 'Primera cuota' : 'Primera cuota'}
                  highlight
                />
                <SummaryCard
                  label="Total intereses"
                  value={fmtNum(result.totalIntereses)}
                  sub="Costo financiero"
                />
                {hasSeguro && (
                  <SummaryCard
                    label="Total seguros"
                    value={fmtNum(result.totalSeguros)}
                    sub="Desgravamen acum."
                  />
                )}
                <SummaryCard
                  label="Total a pagar"
                  value={fmtNum(result.totalPagar)}
                  sub={`${result.plazoMeses} cuotas`}
                />
                <SummaryCard
                  label="Tasa efectiva"
                  value={`${result.tasaEfectivaAnual}%`}
                  sub={`Tasa mensual: ${fmtPct(result.tasaMensual)}`}
                />
                {result.fechaDesembolso && (
                  <SummaryCard
                    label="Desembolso"
                    value={fmtDate(result.fechaDesembolso)}
                    sub={`Última cuota: ${fmtDate(result.tablaCuotas.at(-1)?.fechaVencimiento)}`}
                  />
                )}
              </div>

              {/* Tabla / Gráfico tabs */}
              <Card>
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        Tabla de amortización
                      </CardTitle>
                      {/* Badge fuera del CardTitle para evitar div dentro de h-element */}
                      <Badge variant="secondary">
                        {result.sistema === 'FRANCES' ? 'Sistema Francés' : 'Sistema Alemán'}
                      </Badge>
                    </div>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => exportPdf(result, watch())}
                    >
                      <Download className="w-4 h-4 mr-1.5" />
                      PDF
                    </Button>
                  </div>

                  {/* Sub-tabs tabla vs gráfico */}
                  <div className="flex gap-1 mt-3 border-b pb-0">
                    <button
                      onClick={() => setVistaTabla('tabla')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                        vistaTabla === 'tabla'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <TableIcon className="w-3.5 h-3.5" /> Tabla
                    </button>
                    <button
                      onClick={() => setVistaTabla('grafico')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                        vistaTabla === 'grafico'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" /> Gráfico
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {vistaTabla === 'tabla' ? (
                    <div className="overflow-auto max-h-[500px] rounded-b-lg">
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                          <TableRow>
                            <TableHead className="w-10 text-center">N°</TableHead>
                            {hasDate && <TableHead>Fecha Vcto.</TableHead>}
                            <TableHead className="text-right">Saldo Inicial</TableHead>
                            <TableHead className="text-right">Capital</TableHead>
                            <TableHead className="text-right">Interés</TableHead>
                            {hasSeguro && <TableHead className="text-right">Seguro</TableHead>}
                            <TableHead className="text-right font-semibold">Cuota Total</TableHead>
                            <TableHead className="text-right">Saldo Final</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.tablaCuotas.map((c) => (
                            <TableRow key={c.numeroCuota} className="hover:bg-muted/50 transition-colors">
                              <TableCell className="text-center text-muted-foreground text-xs font-mono">
                                {c.numeroCuota}
                              </TableCell>
                              {hasDate && (
                                <TableCell className="text-xs font-mono">
                                  {fmtDate(c.fechaVencimiento)}
                                </TableCell>
                              )}
                              <TableCell className="text-right text-xs font-mono">
                                {fmtNum(c.saldoInicial)}
                              </TableCell>
                              <TableCell className="text-right text-xs font-mono text-green-600 dark:text-green-400">
                                {fmtNum(c.capital)}
                              </TableCell>
                              <TableCell className="text-right text-xs font-mono text-orange-600 dark:text-orange-400">
                                {fmtNum(c.interes)}
                              </TableCell>
                              {hasSeguro && (
                                <TableCell className="text-right text-xs font-mono text-blue-600 dark:text-blue-400">
                                  {fmtNum(c.seguro)}
                                </TableCell>
                              )}
                              <TableCell className="text-right text-xs font-mono font-semibold">
                                {fmtNum(c.cuotaTotal)}
                              </TableCell>
                              <TableCell className="text-right text-xs font-mono text-muted-foreground">
                                {fmtNum(c.saldoFinal)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="p-4 h-[500px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="n"
                            label={{ value: 'Cuota N°', position: 'insideBottom', offset: -2, fontSize: 11 }}
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis
                            tickFormatter={(v) => `$${v}`}
                            tick={{ fontSize: 10 }}
                            width={70}
                          />
                          <Tooltip
                            formatter={(value: number, name: string) => [fmtNum(value), name]}
                            labelFormatter={(label) => `Cuota N° ${label}`}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="Capital" stackId="a" fill="hsl(142 76% 36%)"  radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Interés" stackId="a" fill="hsl(24 95% 53%)"   radius={[0, 0, 0, 0]} />
                          {hasSeguro && (
                            <Bar dataKey="Seguro"  stackId="a" fill="hsl(220 90% 56%)" radius={[2, 2, 0, 0]} />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-72 border-2 border-dashed border-border rounded-xl text-muted-foreground">
              <Calculator className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">Ingresa los parámetros y presiona Calcular</p>
              <p className="text-xs mt-1 opacity-70">La tabla de amortización aparecerá aquí</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SummaryCard ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? 'border-primary/50 bg-primary/5' : ''}>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-lg font-bold font-mono ${highlight ? 'text-primary' : ''}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}
