import axios from 'axios'
import { CirclePlus, Pencil, Power } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  calculationMethodLabels, createInvestmentProduct, getAdminInvestmentProducts, investmentKeys,
  payoutLabels, rateTypeLabels, setInvestmentProductStatus, updateInvestmentProduct,
  type CalculationMethod, type InvestmentProduct, type InvestmentProductInput,
  type PayoutFrequency, type RateType,
} from '@/features/investments/investment-api'
import { formatCurrency, formatPercentage } from '@/lib/formatters'

interface RateDraft { label: string; minimumAmount: string; maximumAmount: string; termDays: string; annualRatePercent: string }
interface ProductDraft {
  name: string; description: string; minimumAmount: string; maximumAmount: string
  terms: string; calculationMethod: CalculationMethod; rateType: RateType
  capitalizationFrequency: PayoutFrequency | 'NONE'; dayCountBasis: '360' | '365'
  withholdingPercent: string; active: boolean; payoutFrequencies: PayoutFrequency[]; rates: RateDraft[]
}

const frequencies = Object.keys(payoutLabels) as PayoutFrequency[]
const emptyDraft: ProductDraft = {
  name: '', description: '', minimumAmount: '500', maximumAmount: '500000', terms: '31, 60, 90, 180, 360',
  calculationMethod: 'SIMPLE', rateType: 'NOMINAL_ANNUAL', capitalizationFrequency: 'NONE',
  dayCountBasis: '360', withholdingPercent: '0', active: true,
  payoutFrequencies: ['AT_MATURITY', 'MONTHLY', 'QUARTERLY'],
  rates: [31, 60, 90, 180, 360].map((term, index) => ({
    label: `Plazo de ${term} días`, minimumAmount: '500', maximumAmount: '500000',
    termDays: String(term), annualRatePercent: String([3.7, 3.85, 4, 4.25, 4.5][index]),
  })),
}

function draftFrom(product?: InvestmentProduct): ProductDraft {
  if (!product) return structuredClone(emptyDraft)
  return {
    name: product.name, description: product.description, minimumAmount: String(product.minimumAmount),
    maximumAmount: String(product.maximumAmount), terms: product.terms.join(', '),
    calculationMethod: product.calculationMethod, rateType: product.rateType,
    capitalizationFrequency: product.capitalizationFrequency ?? 'NONE',
    dayCountBasis: String(product.dayCountBasis) as '360' | '365',
    withholdingPercent: String(product.withholdingRate * 100), active: product.active,
    payoutFrequencies: product.payoutFrequencies,
    rates: product.rates.map((rate) => ({
      label: rate.label, minimumAmount: String(rate.minimumAmount), maximumAmount: String(rate.maximumAmount),
      termDays: String(rate.minimumTermDays), annualRatePercent: String(rate.annualRate * 100),
    })),
  }
}

function toInput(draft: ProductDraft): InvestmentProductInput {
  const terms = draft.terms.split(',').map((term) => Number(term.trim())).filter(Boolean)
  return {
    name: draft.name.trim(), description: draft.description.trim(), minimumAmount: Number(draft.minimumAmount),
    maximumAmount: Number(draft.maximumAmount), minimumTermDays: Math.min(...terms), maximumTermDays: Math.max(...terms),
    calculationMethod: draft.calculationMethod, rateType: draft.rateType,
    capitalizationFrequency: draft.capitalizationFrequency === 'NONE' ? null : draft.capitalizationFrequency,
    dayCountBasis: Number(draft.dayCountBasis) as 360 | 365, withholdingRate: Number(draft.withholdingPercent) / 100,
    active: draft.active, terms, payoutFrequencies: draft.payoutFrequencies,
    rates: draft.rates.map((rate) => ({
      label: rate.label.trim(), minimumAmount: Number(rate.minimumAmount), maximumAmount: Number(rate.maximumAmount),
      minimumTermDays: Number(rate.termDays), maximumTermDays: Number(rate.termDays),
      annualRate: Number(rate.annualRatePercent) / 100,
    })),
  }
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) return (error.response?.data as { message?: string } | undefined)?.message ?? 'No se pudo guardar el producto.'
  return 'No se pudo guardar el producto.'
}

function ProductEditor({ open, product, onOpenChange, onSave, saving }: { open: boolean; product?: InvestmentProduct; onOpenChange: (open: boolean) => void; onSave: (input: InvestmentProductInput) => Promise<void>; saving: boolean }) {
  const [draft, setDraft] = useState(() => draftFrom(product))
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const updateRate = (index: number, key: keyof RateDraft, value: string) => setDraft((current) => ({ ...current, rates: current.rates.map((rate, position) => position === index ? { ...rate, [key]: value } : rate) }))
  const toggleFrequency = (frequency: PayoutFrequency, checked: boolean) => set('payoutFrequencies', checked ? [...draft.payoutFrequencies, frequency] : draft.payoutFrequencies.filter((item) => item !== frequency))
  async function submit(event: FormEvent) { event.preventDefault(); if (!draft.rates.length) { toast.error('Agrega al menos una tasa.'); return }; await onSave(toInput(draft)) }
  return <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}><DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-5xl">
    <DialogHeader><DialogTitle>{product ? 'Editar producto de inversión' : 'Nuevo producto de inversión'}</DialogTitle><DialogDescription>Configura el producto, sus plazos, tasas y formas autorizadas de pago.</DialogDescription></DialogHeader>
    <form onSubmit={(event) => void submit(event)} className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" value={draft.name} onChange={(value) => set('name', value)} required />
        <Field label="Descripción" value={draft.description} onChange={(value) => set('description', value)} />
        <Field label="Monto mínimo" type="number" value={draft.minimumAmount} onChange={(value) => set('minimumAmount', value)} />
        <Field label="Monto máximo" type="number" value={draft.maximumAmount} onChange={(value) => set('maximumAmount', value)} />
        <Field label="Plazos concretos (días, separados por coma)" value={draft.terms} onChange={(value) => set('terms', value)} />
        <SelectField label="Método de cálculo" value={draft.calculationMethod} options={calculationMethodLabels} onChange={(value) => set('calculationMethod', value as CalculationMethod)} />
        <SelectField label="Tipo de tasa" value={draft.rateType} options={rateTypeLabels} onChange={(value) => set('rateType', value as RateType)} />
        <SelectField label="Base anual" value={draft.dayCountBasis} options={{ '360': '360 días', '365': '365 días' }} onChange={(value) => set('dayCountBasis', value as '360' | '365')} />
        {draft.calculationMethod === 'COMPOUND' && <SelectField label="Capitalización" value={draft.capitalizationFrequency} options={{ MONTHLY: 'Mensual', BIMONTHLY: 'Bimestral', QUARTERLY: 'Trimestral', SEMIANNUAL: 'Semestral', ANNUAL: 'Anual' }} onChange={(value) => set('capitalizationFrequency', value as ProductDraft['capitalizationFrequency'])} />}
        <Field label="Retención (%)" type="number" value={draft.withholdingPercent} onChange={(value) => set('withholdingPercent', value)} />
        <div className="flex items-center gap-3 pt-7"><Switch checked={draft.active} onCheckedChange={(value) => set('active', value)} /><Label>Producto activo y visible</Label></div>
      </section>
      <section className="space-y-3 border-t pt-5"><h3 className="font-medium">Frecuencias de pago autorizadas</h3><div className="grid gap-2 sm:grid-cols-3">{frequencies.map((frequency) => <label key={frequency} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.payoutFrequencies.includes(frequency)} disabled={draft.calculationMethod === 'COMPOUND' && frequency !== 'AT_MATURITY'} onChange={(event) => toggleFrequency(frequency, event.target.checked)} />{payoutLabels[frequency]}</label>)}</div></section>
      <section className="space-y-3 border-t pt-5"><h3 className="font-medium">Tasa por plazo y rango de monto</h3>{draft.rates.map((rate, index) => <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-5"><Field label="Etiqueta" value={rate.label} onChange={(value) => updateRate(index, 'label', value)} /><Field label="Plazo" type="number" value={rate.termDays} onChange={(value) => updateRate(index, 'termDays', value)} /><Field label="Monto desde" type="number" value={rate.minimumAmount} onChange={(value) => updateRate(index, 'minimumAmount', value)} /><Field label="Monto hasta" type="number" value={rate.maximumAmount} onChange={(value) => updateRate(index, 'maximumAmount', value)} /><Field label="Tasa anual (%)" type="number" value={rate.annualRatePercent} onChange={(value) => updateRate(index, 'annualRatePercent', value)} /></div>)}</section>
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar producto'}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <div className="space-y-2"><Label>{label}</Label>{label === 'Descripción' ? <Textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} /> : <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />}</div>
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Record<string, string>; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(options).map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select></div>
}

export function InvestmentAdminPage() {
  const client = useQueryClient()
  const [editing, setEditing] = useState<InvestmentProduct>()
  const [open, setOpen] = useState(false)
  const products = useQuery({ queryKey: investmentKeys.adminProducts, queryFn: getAdminInvestmentProducts })
  const save = useMutation({ mutationFn: ({ product, input }: { product?: InvestmentProduct; input: InvestmentProductInput }) => product ? updateInvestmentProduct(product.id, input) : createInvestmentProduct(input), onSuccess: async (_, variables) => { await client.invalidateQueries({ queryKey: investmentKeys.adminProducts }); await client.invalidateQueries({ queryKey: investmentKeys.publicProducts }); toast.success(variables.product ? 'Producto actualizado.' : 'Producto creado.'); setOpen(false) }, onError: (error) => toast.error(errorMessage(error)) })
  const status = useMutation({ mutationFn: ({ product, active }: { product: InvestmentProduct; active: boolean }) => setInvestmentProductStatus(product.id, active), onSuccess: async () => { await client.invalidateQueries({ queryKey: investmentKeys.adminProducts }); await client.invalidateQueries({ queryKey: investmentKeys.publicProducts }) }, onError: (error) => toast.error(errorMessage(error)) })
  return <div className="space-y-8"><PageHeader title="Productos de inversión" description="Configura productos, plazos concretos, tasas y modalidades de pago." actions={<Button onClick={() => { setEditing(undefined); setOpen(true) }}><CirclePlus />Nuevo producto</Button>} />
    <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-4">Producto</th><th className="p-4">Plazos</th><th className="p-4">Tasas</th><th className="p-4">Estado</th><th className="p-4" /></tr></thead><tbody>{(products.data ?? []).map((product) => <tr key={product.id} className="border-b last:border-0"><td className="p-4"><strong>{product.name}</strong><span className="block text-xs text-muted-foreground">{formatCurrency(product.minimumAmount)} – {formatCurrency(product.maximumAmount)}</span></td><td className="p-4">{product.terms.join(', ')} días</td><td className="p-4">{product.rates.length} · {product.rates.length ? `${formatPercentage(Math.min(...product.rates.map((rate) => rate.annualRate)))} – ${formatPercentage(Math.max(...product.rates.map((rate) => rate.annualRate)))}` : 'Sin tasas'}</td><td className="p-4"><StatusBadge tone={product.active ? 'success' : 'neutral'}>{product.active ? 'Activo' : 'Inactivo'}</StatusBadge></td><td className="p-4 text-right"><Button variant="ghost" size="sm" onClick={() => { setEditing(product); setOpen(true) }}><Pencil />Editar</Button><Button variant="ghost" size="sm" onClick={() => status.mutate({ product, active: !product.active })}><Power />{product.active ? 'Desactivar' : 'Activar'}</Button></td></tr>)}</tbody></table>{products.isPending && <p className="p-6 text-sm text-muted-foreground">Cargando productos…</p>}{products.data?.length === 0 && <p className="p-6 text-sm text-muted-foreground">Todavía no existen productos.</p>}</div>
    {open && <ProductEditor open product={editing} onOpenChange={setOpen} saving={save.isPending} onSave={(input) => save.mutateAsync({ product: editing, input }).then(() => undefined)} />}
  </div>
}
