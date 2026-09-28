import { TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'

import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/formatters'

import type { SimulationResult } from './investment-api'

/** Misma paleta validada de los gráficos de créditos: verde para lo que gana el cliente. */
const SERIES = {
  ganancia: { label: 'Lo que ganas', theme: { light: '#1baf7a', dark: '#199e70' } },
  retencion: { label: 'Retención IR', theme: { light: '#eb6834', dark: '#d95926' } },
  costos: { label: 'Costos adicionales', theme: { light: '#eda100', dark: '#c98500' } },
} satisfies ChartConfig

type SerieKey = keyof typeof SERIES

const round = (value: number) => Math.round(value * 100) / 100

/**
 * Reparto del interés bruto: cuánto se queda el cliente, cuánto retiene el Estado y cuánto cobra la
 * institución. Explica por qué el rendimiento real es menor que la tasa ofrecida.
 */
export function InvestmentInterestChart({ result }: { result: SimulationResult }) {
  const data = ([
    ['ganancia', round(result.netInterest - result.charges)],
    ['retencion', result.withholding],
    ['costos', result.charges],
  ] as Array<[SerieKey, number]>).filter(([, value]) => value > 0)
    .map(([key, value]) => ({ key, label: SERIES[key].label, value, fill: `var(--color-${key})` }))
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    // data-chart comparte las variables de color del gráfico con la leyenda de al lado.
    <figure className="rounded-xl border bg-card p-5" data-chart="chart-investment-interest">
      <figcaption className="text-sm font-medium text-foreground">¿Qué pasa con tus intereses?</figcaption>
      <p className="mt-1 text-xs text-muted-foreground">Interés bruto generado: {formatCurrency(result.grossInterest)}</p>
      <div className="mt-3 grid items-center gap-4 sm:grid-cols-[180px_1fr]">
        <ChartContainer id="investment-interest" config={SERIES} className="mx-auto aspect-square h-44" initialDimension={{ width: 176, height: 176 }}>
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" formatter={(value, name) => (
              <span className="flex w-full justify-between gap-3"><span>{SERIES[name as SerieKey]?.label}</span>
                <span className="font-medium tabular-nums">{formatCurrency(Number(value))}</span></span>
            )} />} />
            <Pie data={data} dataKey="value" nameKey="key" innerRadius="58%" outerRadius="100%"
              stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
              {data.map((item) => <Cell key={item.key} fill={item.fill} />)}
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="space-y-2 text-sm">
          {data.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: item.fill }} aria-hidden="true" />
              <span className="flex-1 text-muted-foreground">{item.label}</span>
              <span className="font-medium tabular-nums text-foreground">{formatCurrency(item.value)}</span>
              <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                {total > 0 ? `${Math.round((item.value / total) * 100)} %` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  )
}

/**
 * Interés de cada pago repartido entre lo que recibe el cliente, la retención y los costos. El capital
 * queda fuera de las barras: al vencimiento las dejaría ilegibles, así que se indica en el pie.
 */
export function InvestmentPaymentsChart({ result }: { result: SimulationResult }) {
  const data = result.payments.map((payment) => ({
    etiqueta: String(payment.number),
    ganancia: round(payment.netInterest - payment.charges),
    retencion: payment.withholding,
    costos: payment.charges,
  }))
  const series: SerieKey[] = ['ganancia', ...(result.withholding > 0 ? ['retencion' as const] : []), ...(result.charges > 0 ? ['costos' as const] : [])]

  return (
    <figure className="rounded-xl border bg-card p-5" data-chart="chart-investment-payments">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <figcaption className="text-sm font-medium text-foreground">Intereses de cada pago</figcaption>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Leyenda">
          {series.map((key) => (
            <li key={key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: `var(--color-${key})` }} aria-hidden="true" />
              {SERIES[key].label}
            </li>
          ))}
        </ul>
      </div>
      <ChartContainer id="investment-payments" config={SERIES} className="mt-4 aspect-auto h-56 w-full" initialDimension={{ width: 600, height: 224 }}>
        <BarChart data={data} margin={{ left: 4, right: 4, top: 4 }} barCategoryGap={data.length > 30 ? 1 : '20%'}>
          <CartesianGrid vertical={false} strokeDasharray="0" stroke="var(--border)" />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} minTickGap={16} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} width={64} fontSize={11}
            tickFormatter={(value: number) => value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value}`} />
          <ChartTooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltipContent
            labelFormatter={(label) => `Pago ${label}`}
            formatter={(value, name) => (
              <span className="flex w-full justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm" style={{ background: `var(--color-${String(name)})` }} />
                  {SERIES[name as SerieKey]?.label}
                </span>
                <span className="font-medium tabular-nums">{formatCurrency(Number(value))}</span>
              </span>
            )} />} />
          {series.map((key, index) => (
            <Bar key={key} dataKey={key} stackId="pago" fill={`var(--color-${key})`} isAnimationActive={false}
              stroke="var(--card)" strokeWidth={data.length > 30 ? 0 : 1}
              radius={index === series.length - 1 ? [4, 4, 0, 0] : 0} />
          ))}
        </BarChart>
      </ChartContainer>
      <p className="mt-2 text-xs text-muted-foreground">
        Además, en el último pago recibes tu capital de {formatCurrency(result.amount)}.
      </p>
    </figure>
  )
}

const CAPITALIZATION_DAYS: Record<string, number> = { MONTHLY: 30, BIMONTHLY: 60, QUARTERLY: 90, SEMIANNUAL: 180 }
const CAPITALIZATION_LABELS: Record<string, [string, string]> = {
  MONTHLY: ['Mes', 'mensual'], BIMONTHLY: ['Bimestre', 'bimestral'], QUARTERLY: ['Trimestre', 'trimestral'],
  SEMIANNUAL: ['Semestre', 'semestral'], ANNUAL: ['Año', 'anual'],
}

interface GrowthRow { number: number; day: number; opening: number; interest: number; closing: number; partial: boolean }

/**
 * Saldo al final de cada capitalización, con la misma fórmula del servidor: C·(1 + i)^(días/B) con tasa
 * efectiva anual. El último saldo se toma del resultado para que cuadre al centavo con el interés mostrado.
 */
function compoundGrowth(result: SimulationResult) {
  const frequency = result.capitalizationFrequency ?? 'ANNUAL'
  const periodDays = CAPITALIZATION_DAYS[frequency] ?? result.dayCountBasis
  const periodicRate = Math.pow(1 + result.annualRate, periodDays / result.dayCountBasis) - 1
  const balanceAt = (days: number) => result.amount * Math.pow(1 + result.annualRate, days / result.dayCountBasis)
  const rows: GrowthRow[] = []
  let opening = result.amount
  for (let day = periodDays, number = 1; ; day += periodDays, number++) {
    const end = Math.min(day, result.termDays)
    const last = end === result.termDays
    const closing = last ? round(result.amount + result.grossInterest) : round(balanceAt(end))
    rows.push({ number, day: end, opening, interest: round(closing - opening), closing, partial: last && end - (day - periodDays) < periodDays })
    opening = closing
    if (last) break
  }
  return { frequency, periodDays, periodicRate, rows }
}

export function CompoundGrowthDialog({ result }: { result: SimulationResult }) {
  const { frequency, periodDays, periodicRate, rows } = compoundGrowth(result)
  const [unit, adjective] = CAPITALIZATION_LABELS[frequency] ?? CAPITALIZATION_LABELS.ANNUAL
  const percent = (value: number) => `${(value * 100).toLocaleString('es-EC', { maximumFractionDigits: 4 })} %`
  return (
    <Dialog>
      <DialogTrigger asChild><Button type="button" variant="outline"><TrendingUp />¿Cómo crece tu dinero?</Button></DialogTrigger>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>¿Cómo crece tu dinero?</DialogTitle>
          <DialogDescription>
            En este plan el interés se capitaliza de forma {adjective}: cada {periodDays} días se suma a tu capital y desde
            ese momento también genera interés. Todo se te paga junto al vencimiento.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm leading-6">
          <p>Tasa efectiva anual: <strong>{percent(result.annualRate)}</strong> → tasa de cada {unit.toLowerCase()}: <strong>{percent(periodicRate)}</strong></p>
          <p className="text-xs text-muted-foreground">(1 + {percent(result.annualRate)})<sup>{periodDays}/{result.dayCountBasis}</sup> − 1. Así, en un año completo ganas exactamente la tasa efectiva anunciada.</p>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr><th className="p-2">{unit}</th><th className="p-2">Día</th><th className="p-2 text-right">Saldo inicial</th><th className="p-2 text-right">Interés</th><th className="p-2 text-right">Saldo final</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.number} className="border-t">
                  <td className="p-2">{row.number}{row.partial ? ' (parcial)' : ''}</td>
                  <td className="p-2 tabular-nums">{row.day}</td>
                  <td className="p-2 text-right tabular-nums">{formatCurrency(row.opening)}</td>
                  <td className="p-2 text-right tabular-nums">{formatCurrency(row.interest)}</td>
                  <td className="p-2 text-right font-medium tabular-nums">{formatCurrency(row.closing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          El interés de cada {unit.toLowerCase()} es mayor que el anterior porque se calcula sobre un saldo que ya incluye los
          intereses previos (interés sobre interés).
        </p>
        <dl className="grid gap-1 rounded-lg border p-3 text-sm">
          <div className="flex justify-between"><dt>Interés generado</dt><dd className="tabular-nums">{formatCurrency(result.grossInterest)}</dd></div>
          {result.withholding > 0 && <div className="flex justify-between"><dt>Retención IR</dt><dd className="tabular-nums">− {formatCurrency(result.withholding)}</dd></div>}
          {result.charges > 0 && <div className="flex justify-between"><dt>Costos adicionales</dt><dd className="tabular-nums">− {formatCurrency(result.charges)}</dd></div>}
          <div className="flex justify-between border-t pt-1 font-semibold"><dt>Recibes al vencimiento</dt><dd className="tabular-nums text-brand-teal">{formatCurrency(result.maturityValue)}</dd></div>
        </dl>
      </DialogContent>
    </Dialog>
  )
}

const GROWTH_SERIES = {
  interes: { label: 'Interés acumulado', theme: { light: '#1baf7a', dark: '#199e70' } },
} satisfies ChartConfig

/**
 * Interés compuesto: interés acumulado al final de cada capitalización, con el eje desde cero. Cada barra
 * crece más que la anterior porque el interés también genera interés. El capital no se grafica: al lado del
 * interés las barras quedarían planas, y recortar el eje exageraría el crecimiento.
 */
export function InvestmentGrowthChart({ result }: { result: SimulationResult }) {
  const { frequency, rows } = compoundGrowth(result)
  const [unit] = CAPITALIZATION_LABELS[frequency] ?? CAPITALIZATION_LABELS.ANNUAL
  const data = rows.map((row) => ({
    etiqueta: `${unit.slice(0, 3)} ${row.number}`,
    interes: round(row.closing - result.amount),
    saldo: row.closing,
    delPeriodo: row.interest,
  }))

  return (
    <figure className="rounded-xl border bg-card p-5" data-chart="chart-investment-growth">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <figcaption className="text-sm font-medium text-foreground">Cómo crece tu dinero</figcaption>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-sm" style={{ background: 'var(--color-interes)' }} aria-hidden="true" />
          {GROWTH_SERIES.interes.label}
        </span>
      </div>
      <ChartContainer id="investment-growth" config={GROWTH_SERIES} className="mt-4 aspect-auto h-56 w-full" initialDimension={{ width: 600, height: 224 }}>
        <BarChart data={data} margin={{ left: 4, right: 4, top: 4 }} barCategoryGap={data.length > 30 ? 1 : '20%'}>
          <CartesianGrid vertical={false} strokeDasharray="0" stroke="var(--border)" />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} minTickGap={16} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} width={64} fontSize={11}
            tickFormatter={(value: number) => value >= 1000 ? `$${(value / 1000).toLocaleString('es-EC', { maximumFractionDigits: 1 })}k` : `$${value}`} />
          <ChartTooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltipContent hideIndicator
            formatter={(_value, _name, item) => {
              const point = item.payload as (typeof data)[number]
              return (
                <span className="grid w-full gap-0.5">
                  <span className="flex justify-between gap-3"><span>Interés acumulado</span><span className="font-medium tabular-nums">{formatCurrency(point.interes)}</span></span>
                  <span className="flex justify-between gap-3 text-muted-foreground"><span>Ganado en este período</span><span className="tabular-nums">{formatCurrency(point.delPeriodo)}</span></span>
                  <span className="flex justify-between gap-3 text-muted-foreground"><span>Saldo total</span><span className="tabular-nums">{formatCurrency(point.saldo)}</span></span>
                </span>
              )
            }} />} />
          <Bar dataKey="interes" fill="var(--color-interes)" isAnimationActive={false} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
      <p className="mt-2 text-xs text-muted-foreground">
        Tu capital de {formatCurrency(result.amount)} se mantiene; las barras muestran el interés que se va sumando en
        cada capitalización hasta llegar a {formatCurrency(result.grossInterest)} al vencimiento.
      </p>
    </figure>
  )
}
