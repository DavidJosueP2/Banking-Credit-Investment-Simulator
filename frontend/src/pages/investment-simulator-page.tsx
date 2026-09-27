import axios from 'axios'
import { ArrowLeft, Goal, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useInstitutionSettings } from '@/app/providers/settings-provider'
import investmentPersonImage from '@/assets/imgs/investment-person.png'
import { PageHeader } from '@/components/shared/page-header'
import { SimulationActions } from '@/features/applications/simulation-actions'
import { useExportBranding } from '@/features/export/branding'
import { DownloadMenu, type ExportFormat } from '@/features/export/download-menu'
import { exportInvestmentExcel } from '@/features/investments/investment-export'
import { SimulatorHeroBanner } from '@/components/shared/simulator-hero-banner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  downloadInvestmentPdf,
  getPublicInvestmentProducts,
  investmentKeys,
  payoutLabels,
  reachInvestmentGoal,
  type GoalResult,
  termUnitLabels,
  simulateInvestment,
  type SimulationRequest,
  type SimulationResult,
} from '@/features/investments/investment-api'
import { formatCurrency, formatDate, formatPercentage } from '@/lib/formatters'

function requestError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? 'No se pudo realizar la simulación.'
  }
  return 'No se pudo realizar la simulación.'
}

export function InvestmentSimulatorPage() {
  const { settings, assets } = useInstitutionSettings()
  const products = useQuery({ queryKey: investmentKeys.publicProducts, queryFn: getPublicInvestmentProducts })
  const [searchParams] = useSearchParams()
  const [initial] = useState(() => {
    const productId = searchParams.get('producto') ?? ''
    const amount = searchParams.get('monto') ?? ''
    const term = searchParams.get('plazo') ?? ''
    return productId && Number(amount) > 0 && Number(term) > 0 ? { productId, amount, term, payout: searchParams.get('pago') ?? '' } : null
  })
  const [productId, setProductId] = useState(initial?.productId ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [termDays, setTermDays] = useState(initial?.term ?? '')
  const [payoutFrequency, setPayoutFrequency] = useState(initial?.payout ?? '')
  const [result, setResult] = useState<SimulationResult>()
  const [mode, setMode] = useState<'amount' | 'goal'>('amount')
  const [target, setTarget] = useState('')
  const [goal, setGoal] = useState<GoalResult>()

  const effectiveProductId = productId || String(products.data?.[0]?.id ?? '')
  const selected = useMemo(() => products.data?.find((product) => String(product.id) === effectiveProductId), [products.data, effectiveProductId])
  const effectiveAmount = amount || String(selected?.minimumAmount ?? '')
  const effectiveTermDays = termDays || String(selected?.terms[0] ?? '')
  const effectivePayoutFrequency = payoutFrequency || selected?.payoutFrequencies[0] || ''

  const simulation = useMutation({
    mutationFn: simulateInvestment,
    onSuccess: (data) => { setGoal(undefined); setResult(data) },
    onError: (error) => toast.error(requestError(error)),
  })
  const goalSearch = useMutation({
    mutationFn: reachInvestmentGoal,
    onSuccess: (data) => {
      setAmount(String(data.requiredAmount))
      setGoal(data)
      setResult(data.simulation)
    },
    onError: (error) => toast.error(requestError(error)),
  })
  const brandingFor = useExportBranding()
  const excel = useMutation({
    mutationFn: async (data: SimulationResult) => exportInvestmentExcel(data, await brandingFor()),
    onError: () => toast.error('No se pudo generar el Excel.'),
  })

  // Abrir una simulación guardada: /inversiones/simulador?producto=&monto=&plazo=&pago= la rellena (estado
  // inicial) y la calcula en cuanto cargan los planes.
  const restored = useRef(false)
  const { mutate: simulate } = simulation
  useEffect(() => {
    if (restored.current || !products.data || !initial) return
    restored.current = true
    const product = products.data.find((item) => String(item.id) === initial.productId)
    if (!product) return
    const frequency = product.payoutFrequencies.includes(initial.payout as SimulationRequest['payoutFrequency'])
      ? initial.payout as SimulationRequest['payoutFrequency'] : product.payoutFrequencies[0]
    simulate({ productId: product.id, amount: Number(initial.amount), termDays: Number(initial.term), payoutFrequency: frequency })
  }, [products.data, initial, simulate])

  const pdf = useMutation({
    mutationFn: downloadInvestmentPdf,
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `simulacion-${result?.reference ?? 'inversion'}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    },
    onError: (error) => toast.error(requestError(error)),
  })

  const currentRequest = (): SimulationRequest => ({
    productId: Number(effectiveProductId), amount: Number(effectiveAmount),
    termDays: Number(effectiveTermDays), payoutFrequency: effectivePayoutFrequency as SimulationRequest['payoutFrequency'],
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    setResult(undefined)
    setGoal(undefined)
    if (mode === 'goal') {
      goalSearch.mutate({ productId: Number(effectiveProductId), targetAmount: Number(target), termDays: Number(effectiveTermDays),
        payoutFrequency: effectivePayoutFrequency as SimulationRequest['payoutFrequency'] })
      return
    }
    simulation.mutate(currentRequest())
  }

  if (settings.investment.moduleEnabled !== 'true' || settings.investment.simulatorEnabled !== 'true') {
    return <main id="contenido" className="mx-auto min-h-[65svh] max-w-4xl px-5 py-16 sm:px-8"><PageHeader title="Simulador no disponible" description="La institución todavía no ha habilitado las proyecciones de inversión." /><Button asChild variant="outline" className="mt-8"><Link to="/"><ArrowLeft />Volver al inicio</Link></Button></main>
  }

  return (
    <main id="contenido" className="w-full">
      <SimulatorHeroBanner
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Inversiones', href: '/inversiones/simulador' },
          { label: 'Simulador de Inversiones' },
        ]}
        title="Simulador de Inversiones"
        description="Proyecta el rendimiento de un plan de inversión con las tasas y condiciones vigentes de la institución."
        imageSrc={assets.investmentSimulatorImage ?? investmentPersonImage}
        imageAlt="Persona simulando una inversión financiera"
      />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
          <form onSubmit={submit} className="space-y-6 rounded-xl border bg-card p-6 lg:sticky lg:top-24">
            {products.data && products.data.length > 1 && <div className="space-y-2"><Label>Plan de inversión</Label><Select value={effectiveProductId} onValueChange={(value) => { setProductId(value); setAmount(''); setTermDays(''); setPayoutFrequency(''); setResult(undefined) }} disabled={products.isPending}><SelectTrigger><SelectValue placeholder="Selecciona un plan" /></SelectTrigger><SelectContent>{products.data.map((product) => <SelectItem key={product.id} value={String(product.id)}>{product.name}</SelectItem>)}</SelectContent></Select></div>}
            {selected && <div className="rounded-lg bg-muted/40 p-4"><p className="font-medium text-foreground">{selected.name}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{selected.description}</p></div>}
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1" role="radiogroup" aria-label="Qué quieres calcular">
              {([['amount', 'Sé cuánto invertir'], ['goal', 'Tengo una meta']] as const).map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={mode === value}
                  onClick={() => { setMode(value); setResult(undefined); setGoal(undefined) }}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${mode === value ? 'bg-card font-medium text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}>
                  {label}
                </button>
              ))}
            </div>
            {mode === 'amount' ? (
            <div className="space-y-2"><div className="flex flex-wrap items-baseline justify-between gap-2"><Label htmlFor="simulation-amount">Monto a invertir</Label>{selected && <span id="amount-conditions" className="text-xs text-muted-foreground">Permitido: {formatCurrency(selected.minimumAmount)} a {formatCurrency(selected.maximumAmount)}</span>}</div><Input id="simulation-amount" aria-describedby="amount-conditions" type="number" step="0.01" min={selected?.minimumAmount} max={selected?.maximumAmount} value={effectiveAmount} onChange={(event) => { setAmount(event.target.value); setResult(undefined) }} onBlur={() => { if (selected && Number(effectiveAmount) < selected.minimumAmount) toast.error(`El monto mínimo es ${formatCurrency(selected.minimumAmount)}.`); if (selected && Number(effectiveAmount) > selected.maximumAmount) toast.error(`El monto máximo es ${formatCurrency(selected.maximumAmount)}.`) }} required /></div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="simulation-target">¿Cuánto quieres reunir?</Label>
                <Input id="simulation-target" type="number" min="1" step="0.01" required value={target}
                  onChange={(event) => { setTarget(event.target.value); setResult(undefined); setGoal(undefined) }} aria-describedby="target-hint" />
                <p id="target-hint" className="text-xs text-muted-foreground">Te diremos cuánto invertir hoy para llegar a ese valor al vencimiento, con el plazo y la forma de pago que elijas.</p>
              </div>
            )}
            <div className="space-y-2"><div className="flex flex-wrap items-baseline justify-between gap-2"><Label htmlFor="simulation-term">Plazo</Label>{selected && <span id="term-conditions" className="text-xs text-muted-foreground">{selected.termSelection === 'RANGE' ? `Entre ${selected.minimumTermValue} y ${selected.maximumTermValue} ${termUnitLabels[selected.termUnit].toLowerCase()}` : `${selected.terms.length} ${selected.terms.length === 1 ? 'opción disponible' : 'opciones disponibles'}`}</span>}</div>{selected?.termSelection === 'RANGE' ? <Input id="simulation-term" aria-describedby="term-conditions" type="number" min={selected.minimumTermValue} max={selected.maximumTermValue} step={selected.termIncrement} value={effectiveTermDays} onChange={(event) => { setTermDays(event.target.value); setResult(undefined) }} required /> : <Select value={effectiveTermDays} onValueChange={(value) => { setTermDays(value); setResult(undefined) }}><SelectTrigger id="simulation-term" aria-describedby="term-conditions"><SelectValue /></SelectTrigger><SelectContent>{selected?.terms.map((term) => <SelectItem key={term} value={String(term)}>{term} {termUnitLabels[selected.termUnit]}</SelectItem>)}</SelectContent></Select>}</div>
            <div className="space-y-2"><div className="flex flex-wrap items-baseline justify-between gap-2"><Label>Pago de intereses</Label>{selected && <span className="text-xs text-muted-foreground">Elige cómo recibir el rendimiento</span>}</div><Select value={effectivePayoutFrequency} onValueChange={(value) => { setPayoutFrequency(value); setResult(undefined) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{selected?.payoutFrequencies.map((frequency) => <SelectItem key={frequency} value={frequency}>{payoutLabels[frequency]}</SelectItem>)}</SelectContent></Select></div>
            {products.isError && <p className="text-sm text-destructive">No se pudieron cargar los planes de inversión.</p>}
            {!products.isPending && products.data?.length === 0 && <p className="text-sm text-muted-foreground">No hay planes de inversión disponibles por ahora.</p>}
            <Button type="submit" className="w-full" size="lg" disabled={!selected || simulation.isPending || goalSearch.isPending}>{simulation.isPending || goalSearch.isPending ? 'Calculando…' : mode === 'goal' ? 'Calcular cuánto invertir' : 'Simular inversión'}</Button>
            <p className="text-xs leading-5 text-muted-foreground">La simulación es referencial y no constituye una oferta ni una contratación.</p>
          </form>

          <section aria-live="polite">
            {!result && <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed px-8 text-center"><TrendingUp className="size-10 text-brand-gold" /><h2 className="mt-5 text-xl">Completa los parámetros</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Aquí aparecerán la tasa aplicable, el rendimiento y el cronograma estimado.</p></div>}
            {result && <SimulationResults result={result} goal={goal} pending={pdf.isPending ? 'pdf' : excel.isPending ? 'excel' : null} onDownload={(format) => format === 'pdf' ? pdf.mutate(currentRequest()) : excel.mutate(result)} />}
          </section>
        </div>
        <Button asChild variant="ghost" className="mt-10"><Link to="/"><ArrowLeft />Volver al inicio</Link></Button>
      </div>
    </main>
  )
}

function SimulationResults({ result, goal, pending, onDownload }: { result: SimulationResult; goal?: GoalResult; pending: ExportFormat | null; onDownload: (format: ExportFormat) => void }) {
  return <div className="space-y-7">
    {goal && (
      <div className="flex gap-3 rounded-xl border border-brand-teal/30 bg-brand-teal/5 p-5">
        <Goal className="mt-1 size-5 shrink-0 text-brand-teal" aria-hidden="true" />
        <div>
          <p className="text-sm text-muted-foreground">Para reunir {formatCurrency(goal.targetAmount)} necesitas invertir hoy</p>
          <p className="text-3xl font-semibold tabular-nums text-foreground">{formatCurrency(goal.requiredAmount)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {goal.coveredByMinimum
              ? `Es el monto mínimo del plan; con él reunirías ${formatCurrency(result.maturityValue)}.`
              : `Recibirías ${formatCurrency(result.maturityValue)} el ${formatDate(result.maturityDate)}: ${formatCurrency(result.netInterest)} de rendimiento neto.`}
          </p>
        </div>
      </div>
    )}
    <div className="rounded-xl border bg-card p-6 sm:p-8">
      <p className="text-sm font-medium text-brand-gold">Resultado de la simulación</p><h2 className="mt-2 text-2xl">{result.productName}</h2><p className="mt-1 text-sm text-muted-foreground">Referencia {result.reference}</p>
      <dl className="mt-7 grid gap-5 border-y py-6 sm:grid-cols-2 xl:grid-cols-3">
        <ResultItem label="Capital invertido" value={formatCurrency(result.amount)} />
        <ResultItem label="Tasa anual aplicable" value={formatPercentage(result.annualRate)} />
        <ResultItem label="Interés bruto" value={formatCurrency(result.grossInterest)} />
        <ResultItem label="Retención" value={formatCurrency(result.withholding)} />
        <ResultItem label="Interés neto" value={formatCurrency(result.netInterest)} />
        <ResultItem label="Valor total estimado" value={formatCurrency(result.maturityValue)} featured />
      </dl>
      <div className="mt-6 flex flex-wrap items-start gap-2"><DownloadMenu size="default" onSelect={onDownload} pending={pending} /><SimulationActions scenario={{ productType: 'INVESTMENT', productId: result.productId, productName: result.productName, amount: result.amount, term: result.termValue, termUnit: result.termUnit, payoutFrequency: result.payoutFrequency }} /></div>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">Vencimiento estimado: {formatDate(result.maturityDate)}. Cálculo con base de {result.dayCountBasis} días y tasa correspondiente a “{result.rateLabel}”.</p>
    </div>
    <div><h2 className="text-xl">Cronograma estimado</h2><div className="mt-4 overflow-hidden rounded-xl border"><Table><TableHeader><TableRow><TableHead>Pago</TableHead><TableHead>Fecha</TableHead><TableHead>Días</TableHead><TableHead className="text-right">Interés bruto</TableHead><TableHead className="text-right">Retención</TableHead><TableHead className="text-right">Capital</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{result.payments.map((payment) => <TableRow key={payment.number}><TableCell>{payment.number}</TableCell><TableCell>{formatDate(payment.paymentDate)}</TableCell><TableCell>{payment.periodDays}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(payment.grossInterest)}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(payment.withholding)}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(payment.capital)}</TableCell><TableCell className="text-right font-medium tabular-nums">{formatCurrency(payment.totalPayment)}</TableCell></TableRow>)}</TableBody></Table></div></div>
  </div>
}

function ResultItem({ label, value, featured = false }: { label: string; value: string; featured?: boolean }) {
  return <div><dt className="text-sm text-muted-foreground">{label}</dt><dd className={`mt-1 font-semibold tabular-nums ${featured ? 'text-xl text-brand-teal' : 'text-lg'}`}>{value}</dd></div>
}
