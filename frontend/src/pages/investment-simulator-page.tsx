import axios from 'axios'
import { ArrowLeft, Download, TrendingUp } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useAuth } from '@/app/providers/auth-provider'
import { useInstitutionSettings } from '@/app/providers/settings-provider'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  downloadInvestmentPdf,
  getPublicInvestmentProducts,
  investmentKeys,
  payoutLabels,
  termUnitLabels,
  simulateInvestment,
  type SimulationRequest,
  type SimulationResult,
  type InvestmentProduct,
} from '@/features/investments/investment-api'
import { formatCurrency, formatDate, formatPercentage } from '@/lib/formatters'

function requestError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? 'No se pudo realizar la simulación.'
  }
  return 'No se pudo realizar la simulación.'
}

export function InvestmentSimulatorPage() {
  const { account } = useAuth()
  const { settings } = useInstitutionSettings()
  const products = useQuery({ queryKey: investmentKeys.publicProducts, queryFn: getPublicInvestmentProducts })
  const [productId, setProductId] = useState('')
  const [amount, setAmount] = useState('')
  const [termDays, setTermDays] = useState('')
  const [payoutFrequency, setPayoutFrequency] = useState('')
  const [result, setResult] = useState<SimulationResult>()

  const effectiveProductId = productId || String(products.data?.[0]?.id ?? '')
  const selected = useMemo(() => products.data?.find((product) => String(product.id) === effectiveProductId), [products.data, effectiveProductId])
  const effectiveAmount = amount || String(selected?.minimumAmount ?? '')
  const effectiveTermDays = termDays || String(selected?.terms[0] ?? '')
  const effectivePayoutFrequency = payoutFrequency || selected?.payoutFrequencies[0] || ''

  const simulation = useMutation({
    mutationFn: simulateInvestment,
    onSuccess: setResult,
    onError: (error) => toast.error(requestError(error)),
  })
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
    simulation.mutate(currentRequest())
  }

  if (settings.investment.moduleEnabled !== 'true' || settings.investment.simulatorEnabled !== 'true') {
    return <main id="contenido" className="mx-auto min-h-[65svh] max-w-4xl px-5 py-16 sm:px-8"><PageHeader title="Simulador no disponible" description="La institución todavía no ha habilitado las proyecciones de inversión." /><Button asChild variant="outline" className="mt-8"><Link to="/"><ArrowLeft />Volver al inicio</Link></Button></main>
  }

  return (
    <main id="contenido" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
      <PageHeader title="Simulador de inversiones" description="Proyecta el rendimiento de un producto con las tasas y condiciones configuradas por la institución." />
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
        <form onSubmit={submit} className="space-y-6 rounded-xl border bg-card p-6 lg:sticky lg:top-24">
          {products.data && products.data.length > 1 && <div className="space-y-2"><Label>Producto</Label><Select value={effectiveProductId} onValueChange={(value) => { setProductId(value); setAmount(''); setTermDays(''); setPayoutFrequency(''); setResult(undefined) }} disabled={products.isPending}><SelectTrigger><SelectValue placeholder="Selecciona un producto" /></SelectTrigger><SelectContent>{products.data.map((product) => <SelectItem key={product.id} value={String(product.id)}>{product.name}</SelectItem>)}</SelectContent></Select></div>}
          <div className="space-y-2"><Label htmlFor="simulation-amount">Monto a invertir</Label><Input id="simulation-amount" type="number" step="0.01" min={selected?.minimumAmount} max={selected?.maximumAmount} value={effectiveAmount} onChange={(event) => { setAmount(event.target.value); setResult(undefined) }} onBlur={() => { if (selected && Number(effectiveAmount) < selected.minimumAmount) toast.error(`El monto mínimo es ${formatCurrency(selected.minimumAmount)}.`); if (selected && Number(effectiveAmount) > selected.maximumAmount) toast.error(`El monto máximo es ${formatCurrency(selected.maximumAmount)}.`) }} required /></div>
          <div className="space-y-2"><Label htmlFor="simulation-term">Plazo</Label>{selected?.termSelection === 'RANGE' ? <Input id="simulation-term" type="number" min={selected.minimumTermValue} max={selected.maximumTermValue} step={selected.termIncrement} value={effectiveTermDays} onChange={(event) => { setTermDays(event.target.value); setResult(undefined) }} required /> : <Select value={effectiveTermDays} onValueChange={(value) => { setTermDays(value); setResult(undefined) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{selected?.terms.map((term) => <SelectItem key={term} value={String(term)}>{term} {termUnitLabels[selected.termUnit]}</SelectItem>)}</SelectContent></Select>}</div>
          <div className="space-y-2"><Label>Pago de intereses</Label><Select value={effectivePayoutFrequency} onValueChange={(value) => { setPayoutFrequency(value); setResult(undefined) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{selected?.payoutFrequencies.map((frequency) => <SelectItem key={frequency} value={frequency}>{payoutLabels[frequency]}</SelectItem>)}</SelectContent></Select></div>
          {products.isError && <p className="text-sm text-destructive">No se pudieron cargar los productos disponibles.</p>}
          {!products.isPending && products.data?.length === 0 && <p className="text-sm text-muted-foreground">No existen productos activos para simular.</p>}
          <Button type="submit" className="w-full" size="lg" disabled={!selected || simulation.isPending}>{simulation.isPending ? 'Calculando…' : 'Simular inversión'}</Button>
          <p className="text-xs leading-5 text-muted-foreground">La simulación es referencial y no constituye una oferta ni una contratación.</p>
        </form>

        <section aria-live="polite">
          {!result && <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed px-8 text-center"><TrendingUp className="size-10 text-brand-gold" /><h2 className="mt-5 text-xl">Completa los parámetros</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Aquí aparecerán la tasa aplicable, el rendimiento y el cronograma estimado.</p></div>}
          {result && <SimulationResults result={result} downloading={pdf.isPending} onDownload={() => pdf.mutate(currentRequest())} continueTo={account ? '/cuenta' : '/login?next=%2Fcuenta'} />}
        </section>
      </div>
      {selected && <PlanInformation product={selected} />}
      <Button asChild variant="ghost" className="mt-10"><Link to="/"><ArrowLeft />Volver al inicio</Link></Button>
    </main>
  )
}

function PlanInformation({ product }: { product: InvestmentProduct }) {
  const unit = termUnitLabels[product.termUnit]
  return <section className="mt-10 rounded-xl border bg-card p-6 sm:p-8">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-medium text-brand-gold">Conoce el plan</p><h2 className="mt-1 text-2xl">{product.name}</h2></div>
      <p className="max-w-xl text-sm text-muted-foreground">Una alternativa diseñada para ayudarte a organizar tus metas financieras con condiciones claras antes de invertir.</p>
    </div>
    <Accordion type="single" collapsible className="mt-5">
      <AccordionItem value="details">
        <AccordionTrigger>Ver características y condiciones</AccordionTrigger>
        <AccordionContent>
          <div className="grid gap-4 pt-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Monto disponible" value={`${formatCurrency(product.minimumAmount)} – ${formatCurrency(product.maximumAmount)}`} />
            <Detail label="Plazos disponibles" value={`${product.terms.join(', ')} ${unit}`} />
            <Detail label="Pago de intereses" value={product.payoutFrequencies.map((frequency) => payoutLabels[frequency]).join(', ')} />
            <Detail label="Tasa aplicable" value="Se determina según el monto y el plazo elegidos." />
          </div>
          <p className="mt-5 leading-6 text-muted-foreground">{product.description}</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </section>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-muted/40 p-4"><p className="text-muted-foreground">{label}</p><p className="mt-1 font-medium text-foreground">{value}</p></div>
}

function SimulationResults({ result, downloading, onDownload, continueTo }: { result: SimulationResult; downloading: boolean; onDownload: () => void; continueTo: string }) {
  return <div className="space-y-7">
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
      <div className="mt-6 flex flex-wrap gap-3"><Button onClick={onDownload} disabled={downloading}><Download />{downloading ? 'Generando…' : 'Descargar PDF'}</Button><Button asChild variant="outline"><Link to={continueTo}>Continuar con la inversión</Link></Button></div>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">Vencimiento estimado: {formatDate(result.maturityDate)}. Cálculo con base de {result.dayCountBasis} días y tasa correspondiente a “{result.rateLabel}”.</p>
    </div>
    <div><h2 className="text-xl">Cronograma estimado</h2><div className="mt-4 overflow-hidden rounded-xl border"><Table><TableHeader><TableRow><TableHead>Pago</TableHead><TableHead>Fecha</TableHead><TableHead>Días</TableHead><TableHead className="text-right">Interés bruto</TableHead><TableHead className="text-right">Retención</TableHead><TableHead className="text-right">Capital</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{result.payments.map((payment) => <TableRow key={payment.number}><TableCell>{payment.number}</TableCell><TableCell>{formatDate(payment.paymentDate)}</TableCell><TableCell>{payment.periodDays}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(payment.grossInterest)}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(payment.withholding)}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(payment.capital)}</TableCell><TableCell className="text-right font-medium tabular-nums">{formatCurrency(payment.totalPayment)}</TableCell></TableRow>)}</TableBody></Table></div></div>
  </div>
}

function ResultItem({ label, value, featured = false }: { label: string; value: string; featured?: boolean }) {
  return <div><dt className="text-sm text-muted-foreground">{label}</dt><dd className={`mt-1 font-semibold tabular-nums ${featured ? 'text-xl text-brand-teal' : 'text-lg'}`}>{value}</dd></div>
}
