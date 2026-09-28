import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { formatCurrency } from '@/lib/formatters'

/**
 * Serie categórica validada (orden fijo: azul, naranja, aqua, amarillo) con sus pasos para modo
 * oscuro. En claro, aqua y amarillo quedan bajo 3:1 contra la tarjeta: por eso cada gráfico lleva
 * leyenda con valores visibles y la tabla de amortización es su vista tabular.
 */
const SERIES = {
  capital: { label: 'Capital', theme: { light: '#2a78d6', dark: '#3987e5' } },
  interes: { label: 'Interés', theme: { light: '#eb6834', dark: '#d95926' } },
  desgravamen: { label: 'Desgravamen', theme: { light: '#1baf7a', dark: '#199e70' } },
  cargos: { label: 'Cobros indirectos', theme: { light: '#eda100', dark: '#c98500' } },
} satisfies ChartConfig

type SerieKey = keyof typeof SERIES

export interface CreditTotals {
  /** Tasa efectiva anual en porcentaje (15.5 = 15,5 %). */
  tea: number
  monto: number
  totalIntereses: number
  totalDesgravamen: number
  totalCargos: number
  totalPagar: number
}

export interface CreditRow {
  numero: number
  capital: number
  interes: number
  desgravamen: number
  cargos: number
}

/**
 * La normativa pide que el cliente vea la tasa efectiva anual y el costo total del crédito antes de
 * decidir: se muestran como cifras principales, no entre el resto de datos.
 */
export function CreditCostHighlight({ totals }: { totals: CreditTotals }) {
  const cargaFinanciera = totals.totalPagar - totals.monto
  const porcentaje = totals.monto > 0 ? cargaFinanciera / totals.monto : 0
  return (
    <div className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Tasa efectiva anual (TEA)</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-foreground">
          {totals.tea.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Incluye la capitalización del interés en el año.</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Costo total del crédito</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-foreground">{formatCurrency(totals.totalPagar)}</p>
        <p className="mt-1 text-xs text-muted-foreground">Todo lo que pagarás, con seguros, cobros y contribución SOLCA.</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Carga financiera</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-foreground">{formatCurrency(cargaFinanciera)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {(porcentaje * 100).toLocaleString('es-EC', { maximumFractionDigits: 1 })} % sobre lo que recibes ({formatCurrency(totals.monto)}).
        </p>
      </div>
    </div>
  )
}

/** Composición del total: parte-a-todo con 4 segmentos como máximo, siempre con su valor visible. */
export function CreditCompositionChart({ totals }: { totals: CreditTotals }) {
  const data = ([
    ['capital', totals.monto],
    ['interes', totals.totalIntereses],
    ['desgravamen', totals.totalDesgravamen],
    ['cargos', totals.totalCargos],
  ] as Array<[SerieKey, number]>).filter(([, value]) => value > 0)
    .map(([key, value]) => ({ key, label: SERIES[key].label, value, fill: `var(--color-${key})` }))
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    // data-chart comparte las variables de color del gráfico con la leyenda de al lado.
    <figure className="rounded-xl border bg-card p-5" data-chart="chart-credit-composition">
      <figcaption className="text-sm font-medium text-foreground">¿A dónde va tu dinero?</figcaption>
      <div className="mt-3 grid items-center gap-4 sm:grid-cols-[180px_1fr]">
        <ChartContainer id="credit-composition" config={SERIES} className="mx-auto aspect-square h-44" initialDimension={{ width: 176, height: 176 }}>
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
 * Capital frente a interés por cuota (barras apiladas). Con más de 60 cuotas se agrupan por año
 * para que cada barra siga siendo legible.
 */
/** {@code paidThrough}: cuotas ya pagadas; las siguientes se muestran atenuadas para ver el avance. */
export function CreditInstallmentsChart({ rows, yearly = false, paidThrough }: { rows: CreditRow[]; yearly?: boolean; paidThrough?: number }) {
  const { data, porAnio } = useMemo(() => {
    if (yearly || rows.length <= 60) {
      return { data: rows.map((row) => ({ ...row, etiqueta: String(row.numero) })), porAnio: false }
    }
    const grupos = new Map<number, CreditRow & { etiqueta: string }>()
    for (const row of rows) {
      const anio = Math.ceil(row.numero / 12)
      const actual = grupos.get(anio) ?? { numero: anio, etiqueta: `Año ${anio}`, capital: 0, interes: 0, desgravamen: 0, cargos: 0 }
      actual.capital += row.capital
      actual.interes += row.interes
      actual.desgravamen += row.desgravamen
      actual.cargos += row.cargos
      grupos.set(anio, actual)
    }
    return { data: [...grupos.values()], porAnio: true }
  }, [rows, yearly])
  const tieneSeguros = rows.some((row) => row.desgravamen > 0)
  const tieneCargos = rows.some((row) => row.cargos > 0)
  const series: SerieKey[] = ['capital', 'interes', ...(tieneSeguros ? ['desgravamen' as const] : []), ...(tieneCargos ? ['cargos' as const] : [])]
  const pagada = (numero: number) => paidThrough === undefined || (porAnio ? numero * 12 <= paidThrough : numero <= paidThrough)

  return (
    <figure className="rounded-xl border bg-card p-5" data-chart="chart-credit-installments">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <figcaption className="text-sm font-medium text-foreground">
          Capital e interés {porAnio ? 'por año' : yearly ? 'por cuota anual' : 'por cuota'}
        </figcaption>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Leyenda">
          {series.map((key) => (
            <li key={key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: `var(--color-${key})` }} aria-hidden="true" />
              {SERIES[key].label}
            </li>
          ))}
          {paidThrough !== undefined && (
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-muted-foreground/30" aria-hidden="true" />
              Claras: por pagar
            </li>
          )}
        </ul>
      </div>
      <ChartContainer id="credit-installments" config={SERIES} className="mt-4 aspect-auto h-56 w-full" initialDimension={{ width: 600, height: 224 }}>
        <BarChart data={data} margin={{ left: 4, right: 4, top: 4 }} barCategoryGap={data.length > 30 ? 1 : '20%'}>
          <CartesianGrid vertical={false} strokeDasharray="0" stroke="var(--border)" />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} minTickGap={16} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} width={64} fontSize={11}
            tickFormatter={(value: number) => value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value}`} />
          <ChartTooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltipContent
            labelFormatter={(label) => {
              const base = porAnio ? String(label) : `Cuota ${label}`
              if (paidThrough === undefined) return base
              const fila = data.find((item) => item.etiqueta === String(label))
              return fila ? `${base} · ${pagada(fila.numero) ? 'pagada' : 'por pagar'}` : base
            }}
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
            <Bar key={key} dataKey={key} stackId="cuota" fill={`var(--color-${key})`} isAnimationActive={false}
              stroke="var(--card)" strokeWidth={data.length > 30 ? 0 : 1}
              radius={index === series.length - 1 ? [4, 4, 0, 0] : 0}>
              {paidThrough !== undefined && data.map((item) => (
                <Cell key={item.etiqueta} fillOpacity={pagada(item.numero) ? 1 : 0.3} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ChartContainer>
    </figure>
  )
}
