import axios from 'axios'
import { CirclePlus, Pencil, Power, Plus, Trash2, X } from 'lucide-react'
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
  type PayoutFrequency, type RateType, type TermSelection, type TermUnit,
  type TaxBase, type TaxRuleType,
} from '@/features/investments/investment-api'
import { formatCurrency, formatPercentage } from '@/lib/formatters'

interface RateDraft { label: string; minimumAmount: string; maximumAmount: string; minimumTermDays: string; maximumTermDays: string; annualRatePercent: string }
interface ProductDraft {
  name: string; description: string; minimumAmount: string; maximumAmount: string
  terms: string; calculationMethod: CalculationMethod; rateType: RateType
  termUnit: TermUnit; termSelection: TermSelection; minimumTermValue: string; maximumTermValue: string; termIncrement: string
  capitalizationFrequency: PayoutFrequency | 'NONE'; dayCountBasis: '360' | '365'
  withholdingPercent: string; active: boolean; payoutFrequencies: PayoutFrequency[]; rates: RateDraft[]
  taxRules: TaxRuleDraft[]
}
interface TaxRuleDraft { name: string; ruleType: TaxRuleType; value: string; base: TaxBase; active: boolean }

const frequencies = Object.keys(payoutLabels) as PayoutFrequency[]
const unitDays = (unit: TermUnit) => unit === 'DAYS' ? 1 : unit === 'MONTHS' ? 30 : 365
const emptyDraft: ProductDraft = {
  name: '', description: '', minimumAmount: '500', maximumAmount: '500000', terms: '31, 60, 90, 180, 360',
  termUnit: 'DAYS', termSelection: 'PREDEFINED', minimumTermValue: '31', maximumTermValue: '360', termIncrement: '1',
  calculationMethod: 'SIMPLE', rateType: 'NOMINAL_ANNUAL', capitalizationFrequency: 'NONE',
  dayCountBasis: '360', withholdingPercent: '0', active: true,
  payoutFrequencies: ['AT_MATURITY', 'MONTHLY', 'QUARTERLY'],
  rates: [31, 60, 90, 180, 360].map((term, index) => ({
    label: `Plazo de ${term} días`, minimumAmount: '500', maximumAmount: '500000',
    minimumTermDays: String(term), maximumTermDays: String(term), annualRatePercent: String([3.7, 3.85, 4, 4.25, 4.5][index]),
  })), taxRules: [],
}

function draftFrom(product?: InvestmentProduct): ProductDraft {
  if (!product) return structuredClone(emptyDraft)
  return {
    name: product.name, description: product.description, minimumAmount: String(product.minimumAmount),
    maximumAmount: String(product.maximumAmount), terms: product.terms.join(', '),
    termUnit: product.termUnit ?? 'DAYS', termSelection: product.termSelection ?? 'PREDEFINED',
    minimumTermValue: String(product.minimumTermValue ?? product.minimumTermDays),
    maximumTermValue: String(product.maximumTermValue ?? product.maximumTermDays),
    termIncrement: String(product.termIncrement ?? 1),
    calculationMethod: product.calculationMethod, rateType: product.rateType,
    capitalizationFrequency: product.capitalizationFrequency ?? 'NONE',
    dayCountBasis: String(product.dayCountBasis) as '360' | '365',
    withholdingPercent: String(product.withholdingRate * 100), active: product.active,
    payoutFrequencies: product.payoutFrequencies,
    rates: product.rates.map((rate) => ({
      label: rate.label, minimumAmount: String(rate.minimumAmount), maximumAmount: String(rate.maximumAmount),
        minimumTermDays: String(rate.minimumTermDays / unitDays(product.termUnit ?? 'DAYS')), maximumTermDays: String(rate.maximumTermDays / unitDays(product.termUnit ?? 'DAYS')), annualRatePercent: String(rate.annualRate * 100),
    })), taxRules: product.taxRules.map((rule) => ({
      name: rule.name, ruleType: rule.ruleType, value: String(rule.value), base: rule.base, active: rule.active,
    })),
  }
}

function toInput(draft: ProductDraft): InvestmentProductInput {
  const terms = draft.terms.split(',').map((term) => Number(term.trim())).filter(Boolean)
  const minimumTermDays = draft.termSelection === 'RANGE'
    ? Number(draft.minimumTermValue) * unitDays(draft.termUnit)
    : Math.min(...terms)
  const maximumTermDays = draft.termSelection === 'RANGE'
    ? Number(draft.maximumTermValue) * unitDays(draft.termUnit)
    : Math.max(...terms)
  return {
    name: draft.name.trim(), description: draft.description.trim(), minimumAmount: Number(draft.minimumAmount),
    maximumAmount: Number(draft.maximumAmount), minimumTermDays, maximumTermDays,
    termUnit: draft.termUnit, termSelection: draft.termSelection,
    minimumTermValue: Number(draft.minimumTermValue), maximumTermValue: Number(draft.maximumTermValue),
    termIncrement: Number(draft.termIncrement),
    calculationMethod: draft.calculationMethod, rateType: draft.rateType,
    capitalizationFrequency: draft.capitalizationFrequency === 'NONE' ? null : draft.capitalizationFrequency,
    dayCountBasis: Number(draft.dayCountBasis) as 360 | 365, withholdingRate: Number(draft.withholdingPercent) / 100,
    active: draft.active, terms, payoutFrequencies: draft.payoutFrequencies,
    rates: draft.rates.map((rate) => ({
      label: rate.label.trim(), minimumAmount: Number(rate.minimumAmount), maximumAmount: Number(rate.maximumAmount),
      minimumTermDays: Number(rate.minimumTermDays) * unitDays(draft.termUnit), maximumTermDays: Number(rate.maximumTermDays) * unitDays(draft.termUnit),
      annualRate: Number(rate.annualRatePercent) / 100,
    })), taxRules: draft.taxRules.map((rule) => ({
      name: rule.name.trim(), ruleType: rule.ruleType, value: Number(rule.value), base: rule.base, active: rule.active,
    })),
  }
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) return (error.response?.data as { message?: string } | undefined)?.message ?? 'No se pudo guardar el producto.'
  return 'No se pudo guardar el producto.'
}

function ProductEditor({ open, product, onOpenChange, onSave, saving }: { open: boolean; product?: InvestmentProduct; onOpenChange: (open: boolean) => void; onSave: (input: InvestmentProductInput) => Promise<void>; saving: boolean }) {
  const [draft, setDraft] = useState(() => draftFrom(product))
  const [newTerm, setNewTerm] = useState('')
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const updateRate = (index: number, key: keyof RateDraft, value: string) => setDraft((current) => ({ ...current, rates: current.rates.map((rate, position) => position === index ? { ...rate, [key]: value } : rate) }))
  const updateTaxRule = (index: number, key: keyof TaxRuleDraft, value: string | boolean) => setDraft((current) => ({ ...current, taxRules: current.taxRules.map((rule, position) => position === index ? { ...rule, [key]: value } : rule) }))
  const terms = draft.terms.split(',').map((term) => term.trim()).filter(Boolean)
  const addTerm = () => {
    const value = Number(newTerm)
    if (!Number.isFinite(value) || value <= 0 || terms.includes(String(value))) return
    set('terms', [...terms, String(value)].join(', '))
    setNewTerm('')
  }
  const removeTerm = (term: string) => set('terms', terms.filter((item) => item !== term).join(', '))
  const addRate = () => set('rates', [...draft.rates, {
    label: 'Nueva tasa', minimumAmount: draft.minimumAmount, maximumAmount: draft.maximumAmount,
    minimumTermDays: draft.termSelection === 'RANGE' ? String(draft.minimumTermValue) : (terms[0] ?? '1'),
    maximumTermDays: draft.termSelection === 'RANGE' ? String(draft.maximumTermValue) : (terms[0] ?? '1'),
    annualRatePercent: '0',
  }])
  const removeRate = (index: number) => set('rates', draft.rates.filter((_, position) => position !== index))
  const addTaxRule = () => set('taxRules', [...draft.taxRules, { name: 'Nueva regla', ruleType: 'PERCENTAGE', value: '0', base: 'GROSS_INTEREST', active: true }])
  const removeTaxRule = (index: number) => set('taxRules', draft.taxRules.filter((_, position) => position !== index))
  const toggleFrequency = (frequency: PayoutFrequency, checked: boolean) => set('payoutFrequencies', checked ? [...draft.payoutFrequencies, frequency] : draft.payoutFrequencies.filter((item) => item !== frequency))
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.name.trim()) return toast.error('Escribe un nombre para el producto.')
    if (draft.termSelection === 'PREDEFINED' && !terms.length) return toast.error('Agrega al menos un plazo.')
    if (!draft.rates.length) return toast.error('Agrega al menos una tasa.')
    await onSave(toInput(draft))
  }
  return <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}><DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-5xl">
    <DialogHeader><DialogTitle>{product ? 'Editar producto de inversión' : 'Nuevo producto de inversión'}</DialogTitle><DialogDescription>Configura el producto, sus plazos, tasas y formas autorizadas de pago.</DialogDescription></DialogHeader>
    <form onSubmit={(event) => void submit(event)} className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" value={draft.name} onChange={(value) => set('name', value)} required />
        <Field label="Descripción" value={draft.description} onChange={(value) => set('description', value)} />
        <Field label="Monto mínimo" type="number" value={draft.minimumAmount} onChange={(value) => set('minimumAmount', value)} />
        <Field label="Monto máximo" type="number" value={draft.maximumAmount} onChange={(value) => set('maximumAmount', value)} />
        <SelectField label="Unidad visible del plazo" value={draft.termUnit} options={{ DAYS: 'Días', MONTHS: 'Meses', YEARS: 'Años' }} onChange={(value) => set('termUnit', value as TermUnit)} />
        <SelectField label="Tipo de plazo" value={draft.termSelection} options={{ PREDEFINED: 'Opciones concretas', RANGE: 'Rango con incremento' }} onChange={(value) => set('termSelection', value as TermSelection)} />
        {draft.termSelection === 'RANGE' && <><Field label="Plazo mínimo" type="number" value={draft.minimumTermValue} onChange={(value) => set('minimumTermValue', value)} /><Field label="Plazo máximo" type="number" value={draft.maximumTermValue} onChange={(value) => set('maximumTermValue', value)} /><Field label="Incremento entre plazos" type="number" value={draft.termIncrement} onChange={(value) => set('termIncrement', value)} /></>}
        <SelectField label="Método de cálculo" value={draft.calculationMethod} options={calculationMethodLabels} onChange={(value) => set('calculationMethod', value as CalculationMethod)} />
        <SelectField label="Tipo de tasa" value={draft.rateType} options={rateTypeLabels} onChange={(value) => set('rateType', value as RateType)} />
        <SelectField label="Base anual" value={draft.dayCountBasis} options={{ '360': '360 días', '365': '365 días' }} onChange={(value) => set('dayCountBasis', value as '360' | '365')} />
        {draft.calculationMethod === 'COMPOUND' && <SelectField label="Capitalización" value={draft.capitalizationFrequency} options={{ MONTHLY: 'Mensual', BIMONTHLY: 'Bimestral', QUARTERLY: 'Trimestral', SEMIANNUAL: 'Semestral', ANNUAL: 'Anual' }} onChange={(value) => set('capitalizationFrequency', value as ProductDraft['capitalizationFrequency'])} />}
        <Field label="Retención (%)" type="number" value={draft.withholdingPercent} onChange={(value) => set('withholdingPercent', value)} />
        <div className="flex items-center gap-3 pt-7"><Switch checked={draft.active} onCheckedChange={(value) => set('active', value)} /><Label>Producto activo y visible</Label></div>
      </section>
      <section className="space-y-3 border-t pt-5"><h3 className="font-medium">Frecuencias de pago autorizadas</h3><div className="grid gap-2 sm:grid-cols-3">{frequencies.map((frequency) => <label key={frequency} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.payoutFrequencies.includes(frequency)} disabled={draft.calculationMethod === 'COMPOUND' && frequency !== 'AT_MATURITY'} onChange={(event) => toggleFrequency(frequency, event.target.checked)} />{payoutLabels[frequency]}</label>)}</div></section>
      <section className="space-y-3 border-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-medium">Plazos disponibles</h3><p className="text-sm text-muted-foreground">{draft.termSelection === 'RANGE' ? 'El rango define automáticamente las opciones disponibles.' : 'Agrega las opciones que podrá elegir tu cliente.'}</p></div></div>
        {draft.termSelection === 'PREDEFINED' && <div className="flex gap-2"><Input className="max-w-40" type="number" min="1" placeholder={`Nuevo plazo en ${draft.termUnit === 'DAYS' ? 'días' : draft.termUnit === 'MONTHS' ? 'meses' : 'años'}`} value={newTerm} onChange={(event) => setNewTerm(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTerm() } }} /><Button type="button" variant="outline" onClick={addTerm}><Plus />Agregar plazo</Button></div>}
        {draft.termSelection === 'PREDEFINED' && <div className="flex flex-wrap gap-2">{terms.map((term) => <span key={term} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">{term} {draft.termUnit === 'DAYS' ? 'días' : draft.termUnit === 'MONTHS' ? 'meses' : 'años'}<button type="button" aria-label={`Quitar plazo ${term}`} className="rounded-full p-0.5 hover:bg-background" onClick={() => removeTerm(term)}><X className="size-3" /></button></span>)}</div>}
      </section>
      <section className="space-y-3 border-t pt-5"><div className="flex items-center justify-between gap-2"><div><h3 className="font-medium">Tasas por plazo y monto</h3><p className="text-sm text-muted-foreground">Define el rendimiento para cada combinación. Los rangos no pueden cruzarse.</p></div><Button type="button" variant="outline" size="sm" onClick={addRate}><Plus />Agregar tasa</Button></div>{draft.rates.map((rate, index) => <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-6"><Field label="Nombre visible" value={rate.label} onChange={(value) => updateRate(index, 'label', value)} /><Field label="Plazo desde (días)" type="number" value={rate.minimumTermDays} onChange={(value) => updateRate(index, 'minimumTermDays', value)} /><Field label="Plazo hasta (días)" type="number" value={rate.maximumTermDays} onChange={(value) => updateRate(index, 'maximumTermDays', value)} /><Field label="Monto desde" type="number" value={rate.minimumAmount} onChange={(value) => updateRate(index, 'minimumAmount', value)} /><Field label="Monto hasta" type="number" value={rate.maximumAmount} onChange={(value) => updateRate(index, 'maximumAmount', value)} /><div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Field label="Rendimiento anual (%)" type="number" value={rate.annualRatePercent} onChange={(value) => updateRate(index, 'annualRatePercent', value)} /></div><Button type="button" variant="ghost" size="icon" aria-label="Quitar tasa" onClick={() => removeRate(index)}><Trash2 /></Button></div></div>)}</section>
      <section className="space-y-3 border-t pt-5"><div className="flex items-center justify-between gap-2"><div><h3 className="font-medium">Impuestos y retenciones</h3><p className="text-sm text-muted-foreground">Estas reglas se aplican al calcular el resultado para el cliente.</p></div><Button type="button" variant="outline" size="sm" onClick={addTaxRule}><Plus />Agregar regla</Button></div>{draft.taxRules.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No hay reglas adicionales. El producto no aplicará una retención adicional.</p>}{draft.taxRules.map((rule, index) => <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-6"><Field label="Nombre" value={rule.name} onChange={(value) => updateTaxRule(index, 'name', value)} /><SelectField label="Tipo" value={rule.ruleType} options={{ PERCENTAGE: 'Porcentaje', FIXED: 'Valor fijo' }} onChange={(value) => updateTaxRule(index, 'ruleType', value)} /><Field label={rule.ruleType === 'PERCENTAGE' ? 'Porcentaje (%)' : 'Valor fijo'} type="number" value={rule.value} onChange={(value) => updateTaxRule(index, 'value', value)} /><SelectField label="Aplicar sobre" value={rule.base} options={{ GROSS_INTEREST: 'Interés generado', CAPITAL: 'Capital', TOTAL: 'Total recibido' }} onChange={(value) => updateTaxRule(index, 'base', value)} /><label className="flex items-center gap-2 pt-7 text-sm"><Switch checked={rule.active} onCheckedChange={(value) => updateTaxRule(index, 'active', value)} />Activa</label><div className="flex items-end justify-end"><Button type="button" variant="ghost" size="icon" aria-label="Quitar regla fiscal" onClick={() => removeTaxRule(index)}><Trash2 /></Button></div></div>)}</section>
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
