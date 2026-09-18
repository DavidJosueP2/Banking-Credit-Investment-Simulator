import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Calculator, Download, RotateCcw, Info, TrendingUp, DollarSign, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Separator } from '@/components/ui/separator'
import { simuladorService } from '@/features/creditos/simulador/services/simulador.service'
import { type SimulacionResult, type SistemaAmortizacion } from '@/types'

const schema = z.object({
  monto:          z.number({ message: 'Ingrese un monto válido' }).min(100, 'Mínimo $100'),
  plazoMeses:     z.number({ message: 'Ingrese un plazo válido' }).min(1, 'Mínimo 1 mes').max(480),
  tasaEfectiva:   z.number({ message: 'Ingrese una tasa válida' }).min(0.01).max(100),
  sistema:        z.enum(['FRANCES', 'ALEMAN'] as const),
  usarTasaPersonalizada: z.boolean(),
  tasaPersonalizada:     z.number().optional(),
})

type FormData = z.infer<typeof schema>

// Tasas académicas/de referencia para demostración
const TASAS_REF = [
  { label: 'Consumo Prioritario — Referencial (BCE)', valor: 15.74, tipo: 'REFERENTIAL' },
  { label: 'Consumo Prioritario — Máxima (BCE)',      valor: 16.77, tipo: 'MAXIMUM' },
  { label: 'Vivienda Interés Social (BCE)',            valor: 4.99,  tipo: 'REFERENTIAL' },
  { label: 'Productivo PYMES — Referencial (BCE)',     valor: 11.83, tipo: 'REFERENTIAL' },
  { label: 'Microcrédito Minorista — Máxima (BCE)',    valor: 30.50, tipo: 'MAXIMUM' },
]

const fmt = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const fmtNum = (n: number) => fmt.format(n)
const fmtPct = (n: number) => `${n.toFixed(4)}%`

export function SimuladorPage() {
  const [result, setResult] = useState<SimulacionResult | null>(null)
  const [usarPersonalizada, setUsarPersonalizada] = useState(false)

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      monto:        5000,
      plazoMeses:   24,
      tasaEfectiva: 15.74,
      sistema:      'FRANCES',
      usarTasaPersonalizada: false,
    },
  })

  const sistema = watch('sistema')
  const tasaActual = watch('tasaEfectiva')

  const mutation = useMutation({
    mutationFn: simuladorService.simular,
    onSuccess: (data) => setResult(data),
    onError: () => toast.error('Error al calcular la simulación'),
  })

  const onSubmit = (dto: FormData) => {
    mutation.mutate({
      monto:        dto.monto,
      plazoMeses:   dto.plazoMeses,
      tasaEfectiva: dto.tasaEfectiva,
      sistema:      dto.sistema,
    })
  }

  const handleTasaRef = (valor: string) => {
    const num = parseFloat(valor)
    if (!isNaN(num)) setValue('tasaEfectiva', num)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6 text-primary" />
          Simulador de Crédito
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Calcula tu tabla de amortización usando el sistema Francés o Alemán
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Panel de entrada ── */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Parámetros del crédito</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                {/* Monto */}
                <div className="space-y-1.5">
                  <Label htmlFor="monto">Monto solicitado (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="monto"
                      type="number"
                      step="100"
                      min="100"
                      placeholder="5000"
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
                      type="number"
                      min="1"
                      max="480"
                      placeholder="24"
                      className="pl-9"
                      {...register('plazoMeses', { valueAsNumber: true })}
                    />
                  </div>
                  {errors.plazoMeses && <p className="text-xs text-destructive">{errors.plazoMeses.message}</p>}
                </div>

                {/* Tasa de referencia */}
                <div className="space-y-1.5">
                  <Label>Tasa de referencia (BCE)</Label>
                  <Select onValueChange={handleTasaRef}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tasa referencial…" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASAS_REF.map((t) => (
                        <SelectItem key={t.label} value={String(t.valor)}>
                          {t.label} — {t.valor}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Tasa actual: <strong>{tasaActual}%</strong>
                  </p>
                </div>

                {/* Tasa personalizada */}
                <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="custom"
                      checked={usarPersonalizada}
                      onChange={(e) => {
                        setUsarPersonalizada(e.target.checked)
                        if (!e.target.checked) setValue('tasaEfectiva', 15.74)
                      }}
                      className="rounded"
                    />
                    <Label htmlFor="custom" className="cursor-pointer font-normal">
                      ¿Usar tasa personalizada?
                    </Label>
                  </div>
                  {usarPersonalizada && (
                    <div className="space-y-1">
                      <div className="relative">
                        <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="100"
                          placeholder="13.00"
                          className="pl-9"
                          {...register('tasaEfectiva', { valueAsNumber: true })}
                        />
                      </div>
                      {errors.tasaEfectiva && <p className="text-xs text-destructive">{errors.tasaEfectiva.message}</p>}
                    </div>
                  )}
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
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => { reset(); setResult(null) }}
                  >
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
                  Las tasas referenciales y máximas son publicadas por el
                  <strong> Banco Central del Ecuador (BCE)</strong> y la <strong>SEPS</strong>.
                  La tasa personalizada permite simular condiciones específicas.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Panel de resultados ── */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                  label="Cuota mensual"
                  value={fmtNum(result.cuotaMensual)}
                  sub={result.sistema === 'FRANCES' ? 'Fija' : 'Primera cuota'}
                  highlight
                />
                <SummaryCard
                  label="Total intereses"
                  value={fmtNum(result.totalIntereses)}
                  sub="Costo financiero"
                />
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
              </div>

              {/* Tabla de amortización */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      Tabla de amortización
                      <Badge variant="secondary">
                        {result.sistema === 'FRANCES' ? 'Sistema Francés' : 'Sistema Alemán'}
                      </Badge>
                    </CardTitle>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1.5" />
                      PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[500px] rounded-b-lg">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                        <TableRow>
                          <TableHead className="w-12 text-center">N°</TableHead>
                          <TableHead className="text-right">Saldo inicial</TableHead>
                          <TableHead className="text-right">Capital</TableHead>
                          <TableHead className="text-right">Interés</TableHead>
                          <TableHead className="text-right font-semibold">Cuota total</TableHead>
                          <TableHead className="text-right">Saldo final</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.tablaCuotas.map((cuota) => (
                          <TableRow
                            key={cuota.numeroCuota}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <TableCell className="text-center text-muted-foreground text-xs font-mono">
                              {cuota.numeroCuota}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono">
                              {fmtNum(cuota.saldoInicial)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono text-green-600 dark:text-green-400">
                              {fmtNum(cuota.capital)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono text-orange-600 dark:text-orange-400">
                              {fmtNum(cuota.interes)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono font-semibold">
                              {fmtNum(cuota.cuotaTotal)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono text-muted-foreground">
                              {fmtNum(cuota.saldoFinal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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

// ─── Summary card ─────────────────────────────────────────────────────────────

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
