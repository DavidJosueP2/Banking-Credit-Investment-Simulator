import axios from 'axios'
import { CirclePlus, Pencil, Power, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  calculationMethodLabels, createInvestmentProduct, getAdminInvestmentProducts, investmentKeys,
  payoutLabels, setInvestmentProductStatus, updateInvestmentProduct,
  type CalculationMethod, type InvestmentProduct, type InvestmentProductInput,
  type PayoutFrequency,
} from '@/features/investments/investment-api'
import { formatCurrency, formatPercentage } from '@/lib/formatters'

interface RateDraft { minimumAmount: string; maximumAmount: string; minimumTermDays: string; maximumTermDays: string; annualRatePercent: string }
interface TaxRuleDraft { name: string; value: string; exemptFromTermDays: string; active: boolean }
interface ProductDraft {
  name: string; description: string; minimumAmount: string; maximumAmount: string
  calculationMethod: CalculationMethod; capitalizationFrequency: PayoutFrequency | 'NONE'
  dayCountBasis: '360' | '365'; active: boolean; payoutFrequencies: PayoutFrequency[]
  rates: RateDraft[]; taxRules: TaxRuleDraft[]
}

const frequencies = Object.keys(payoutLabels) as PayoutFrequency[]
const rateLabel = (from: string, to: string) => from === to ? `${from} días` : `${from}–${to} días`
const decimalText = (value: number) => Number((value * 100).toFixed(6)).toString()

const emptyDraft: ProductDraft = {
  name: '', description: '', minimumAmount: '500', maximumAmount: '500000',
  calculationMethod: 'SIMPLE', capitalizationFrequency: 'NONE', dayCountBasis: '360', active: true,
  payoutFrequencies: ['AT_MATURITY', 'MONTHLY', 'QUARTERLY'],
  rates: [[31, 31], [32, 60], [61, 90], [91, 180], [181, 360]].map(([from, to], index) => ({
    minimumAmount: '500', maximumAmount: '500000', minimumTermDays: String(from), maximumTermDays: String(to),
    annualRatePercent: String([3.7, 3.85, 4, 4.25, 4.5][index]),
  })), taxRules: [],
}

function draftFrom(product?: InvestmentProduct): ProductDraft {
  if (!product) return structuredClone(emptyDraft)
  return {
    name: product.name, description: product.description, minimumAmount: String(product.minimumAmount), maximumAmount: String(product.maximumAmount),
    calculationMethod: product.calculationMethod, capitalizationFrequency: product.capitalizationFrequency ?? 'NONE',
    dayCountBasis: String(product.dayCountBasis) as '360' | '365', active: product.active,
    payoutFrequencies: product.payoutFrequencies,
    rates: product.rates.map((rate) => ({ minimumAmount: String(rate.minimumAmount), maximumAmount: String(rate.maximumAmount), minimumTermDays: String(rate.minimumTermDays), maximumTermDays: String(rate.maximumTermDays), annualRatePercent: decimalText(rate.annualRate) })),
    taxRules: product.taxRules.slice(0, 1).map((rule) => ({
      name: rule.name, value: String(rule.value), exemptFromTermDays: rule.exemptFromTermDays == null ? '' : String(rule.exemptFromTermDays), active: rule.active,
    })),
  }
}

function toInput(draft: ProductDraft): InvestmentProductInput {
  const minimumTermDays = Math.min(...draft.rates.map((rate) => Number(rate.minimumTermDays)))
  const maximumTermDays = Math.max(...draft.rates.map((rate) => Number(rate.maximumTermDays)))
  const internalTermConfiguration = { unit: 'DAYS' as const, selection: 'RANGE' as const, minimumValue: minimumTermDays, maximumValue: maximumTermDays, increment: 1, options: [] }
  const rateType = draft.calculationMethod === 'COMPOUND' ? 'EFFECTIVE_ANNUAL' : 'NOMINAL_ANNUAL'
  return {
    name: draft.name.trim(), description: draft.description.trim(), minimumAmount: Number(draft.minimumAmount), maximumAmount: Number(draft.maximumAmount),
    minimumTermDays, maximumTermDays, termUnit: 'DAYS', termSelection: 'RANGE',
    minimumTermValue: minimumTermDays, maximumTermValue: maximumTermDays, termIncrement: 1,
    calculationMethod: draft.calculationMethod, rateType, calendarMode: 'FIXED_DAYS',
    capitalizationFrequency: draft.calculationMethod === 'COMPOUND' ? (draft.capitalizationFrequency === 'NONE' ? null : draft.capitalizationFrequency) : null,
    dayCountBasis: Number(draft.dayCountBasis) as 360 | 365, withholdingRate: 0, active: draft.active,
    terms: [], payoutFrequencies: draft.calculationMethod === 'COMPOUND' ? ['AT_MATURITY'] : draft.payoutFrequencies,
    termConfigurations: [internalTermConfiguration],
    rates: draft.rates.map((rate) => ({
      label: rateLabel(rate.minimumTermDays, rate.maximumTermDays), minimumAmount: Number(rate.minimumAmount), maximumAmount: Number(rate.maximumAmount),
      minimumTermDays: Number(rate.minimumTermDays), maximumTermDays: Number(rate.maximumTermDays),
      minimumTermValue: Number(rate.minimumTermDays), maximumTermValue: Number(rate.maximumTermDays), annualRate: Number(rate.annualRatePercent) / 100,
    })),
    taxRules: draft.taxRules.map((rule) => ({
      name: rule.name.trim(), ruleType: 'PERCENTAGE', value: Number(rule.value), base: 'GROSS_INTEREST', active: rule.active,
      exemptFromTermDays: rule.exemptFromTermDays.trim() ? Number(rule.exemptFromTermDays) : null,
    })),
  }
}

function validateDraft(draft: ProductDraft) {
  const errors: Record<string, string> = {}
  const minAmount = Number(draft.minimumAmount); const maxAmount = Number(draft.maximumAmount)
  if (!draft.name.trim()) errors.name = 'El nombre es obligatorio.'
  if (!(minAmount > 0)) errors.minimumAmount = 'Debe ser mayor que cero.'
  if (!(maxAmount >= minAmount)) errors.maximumAmount = 'Debe ser igual o mayor al monto mínimo.'
  if (!draft.payoutFrequencies.length) errors.payoutFrequencies = 'Selecciona al menos una frecuencia.'
  if (draft.calculationMethod === 'COMPOUND' && draft.capitalizationFrequency === 'NONE') errors.capitalizationFrequency = 'Selecciona la capitalización.'
  if (!draft.rates.length) errors.rates = 'Agrega al menos una tasa.'
  draft.rates.forEach((rate, index) => {
    const prefix = `rate.${index}`; const fromAmount = Number(rate.minimumAmount); const toAmount = Number(rate.maximumAmount); const fromDays = Number(rate.minimumTermDays); const toDays = Number(rate.maximumTermDays); const annual = Number(rate.annualRatePercent)
    if (!(fromAmount >= minAmount)) errors[`${prefix}.minimumAmount`] = 'Fuera del mínimo del producto.'
    if (!(toAmount >= fromAmount && toAmount <= maxAmount)) errors[`${prefix}.maximumAmount`] = 'Rango monetario inválido.'
    if (!(fromDays >= 31)) errors[`${prefix}.minimumTermDays`] = 'Un depósito a plazo fijo debe comenzar desde 31 días.'
    if (!(toDays >= fromDays)) errors[`${prefix}.maximumTermDays`] = 'Debe ser igual o mayor al inicio.'
    if (!(annual > 0 && annual <= 100)) errors[`${prefix}.annualRatePercent`] = 'La tasa debe estar entre 0 y 100 %.'
    if (index > 0 && fromDays !== Number(draft.rates[index - 1].maximumTermDays) + 1) errors[`${prefix}.minimumTermDays`] = 'Debe comenzar un día después del rango anterior.'
  })
  draft.rates.forEach((rate, index) => draft.rates.slice(0, index).forEach((previous) => {
    const amountOverlap = Number(rate.minimumAmount) <= Number(previous.maximumAmount) && Number(previous.minimumAmount) <= Number(rate.maximumAmount)
    const termOverlap = Number(rate.minimumTermDays) <= Number(previous.maximumTermDays) && Number(previous.minimumTermDays) <= Number(rate.maximumTermDays)
    if (amountOverlap && termOverlap) errors[`rate.${index}.overlap`] = 'Esta tasa se superpone con otra combinación.'
  }))
  const firstDay = Math.min(...draft.rates.map((rate) => Number(rate.minimumTermDays)))
  const lastDay = Math.max(...draft.rates.map((rate) => Number(rate.maximumTermDays)))
  const durations = Number.isFinite(firstDay) && Number.isFinite(lastDay) && lastDay - firstDay <= 10000
    ? Array.from({ length: lastDay - firstDay + 1 }, (_, index) => firstDay + index)
    : [firstDay, lastDay]
  for (const duration of durations) {
    const applicable = draft.rates.filter((rate) => duration >= Number(rate.minimumTermDays) && duration <= Number(rate.maximumTermDays)).sort((a, b) => Number(a.minimumAmount) - Number(b.minimumAmount))
    let coveredUntil = minAmount - 0.01
    for (const rate of applicable) {
      if (Number(rate.minimumAmount) > coveredUntil + 0.011) break
      coveredUntil = Math.max(coveredUntil, Number(rate.maximumAmount))
    }
    if (coveredUntil + 0.001 < maxAmount) { errors.ratesCoverage = `El plazo de ${duration} días no tiene una tasa para todo el rango de montos.`; break }
  }
  draft.taxRules.forEach((rule, index) => {
    const prefix = `tax.${index}`; const value = Number(rule.value)
    if (!rule.name.trim()) errors[`${prefix}.name`] = 'El nombre es obligatorio.'
    else if (rule.name.trim().length > 120) errors[`${prefix}.name`] = 'Máximo 120 caracteres.'
    if (!Number.isFinite(value) || value <= 0) errors[`${prefix}.value`] = 'El porcentaje debe ser mayor que cero.'
    else if (value > 10) errors[`${prefix}.value`] = 'La retención no puede superar el 10 %.'
    if (rule.exemptFromTermDays.trim()) {
      const exemptionDays = Number(rule.exemptFromTermDays)
      if (!Number.isInteger(exemptionDays) || exemptionDays < 180) errors[`${prefix}.exemptFromTermDays`] = 'Debe ser de al menos 180 días.'
    }
  })
  if (draft.taxRules.length > 1) errors.taxRules = 'Solo puede existir una retención de Impuesto a la Renta por producto.'
  return errors
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data === 'string' && data.trim()) return data
    if (data && typeof data === 'object') {
      const response = data as { message?: string; detail?: string; error?: string }
      return response.message ?? response.detail ?? response.error ?? 'No se pudo guardar el producto.'
    }
  }
  return 'No se pudo guardar el producto.'
}

function ProductEditor({ product, onCancel, onSave, saving }: { product?: InvestmentProduct; onCancel: () => void; onSave: (input: InvestmentProductInput) => Promise<void>; saving: boolean }) {
  const [draft, setDraft] = useState(() => draftFrom(product))
  const errors = useMemo(() => validateDraft(draft), [draft])
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const updateRate = (index: number, key: keyof RateDraft, value: string) => setDraft((current) => {
    const rates = current.rates.map((rate, position) => position === index ? { ...rate, [key]: value } : rate)
    if (key === 'maximumTermDays' && rates[index + 1] && Number.isInteger(Number(value))) rates[index + 1] = { ...rates[index + 1], minimumTermDays: String(Number(value) + 1) }
    return { ...current, rates }
  })
  const updateTaxRule = (index: number, key: keyof TaxRuleDraft, value: string | boolean) => setDraft((current) => ({ ...current, taxRules: current.taxRules.map((rule, position) => position === index ? { ...rule, [key]: value } : rule) }))
  const toggleFrequency = (frequency: PayoutFrequency, checked: boolean) => set('payoutFrequencies', checked ? [...draft.payoutFrequencies, frequency] : draft.payoutFrequencies.filter((item) => item !== frequency))
  const addRate = () => {
    const nextDay = draft.rates.length ? Number(draft.rates.at(-1)?.maximumTermDays) + 1 : 31
    set('rates', [...draft.rates, { minimumAmount: draft.minimumAmount, maximumAmount: draft.maximumAmount, minimumTermDays: String(nextDay), maximumTermDays: String(nextDay), annualRatePercent: '' }])
  }
  const removeRate = (index: number) => setDraft((current) => ({ ...current, rates: current.rates.filter((_, position) => position !== index).map((rate, position, rates) => position === 0 ? rate : { ...rate, minimumTermDays: String(Number(rates[position - 1].maximumTermDays) + 1) }) }))
  const addTaxRule = () => set('taxRules', [{ name: 'Retención de Impuesto a la Renta', value: '3', exemptFromTermDays: '180', active: true }])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (Object.keys(errors).length) return toast.error('Corrige los campos marcados antes de guardar.')
    await onSave(toInput(draft))
  }
  const automaticRateType = draft.calculationMethod === 'COMPOUND' ? 'Efectiva anual' : 'Nominal anual'
  return <div className="space-y-8">
    <PageHeader title={product ? 'Editar producto de inversión' : 'Nuevo producto de inversión'} description="Configura el producto, sus rangos de plazo, tasas y formas de pago." actions={<Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Volver a productos</Button>} />
    <form onSubmit={(event) => void submit(event)} className="space-y-6 rounded-xl border bg-card p-5 shadow-sm sm:p-6" noValidate>
      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" value={draft.name} onChange={(value) => set('name', value)} error={errors.name} required />
        <Field label="Descripción" value={draft.description} onChange={(value) => set('description', value)} />
        <Field label="Monto mínimo" type="number" value={draft.minimumAmount} onChange={(value) => set('minimumAmount', value)} error={errors.minimumAmount} />
        <Field label="Monto máximo" type="number" value={draft.maximumAmount} onChange={(value) => set('maximumAmount', value)} error={errors.maximumAmount} />
        <SelectField label="Método de cálculo" value={draft.calculationMethod} options={calculationMethodLabels} onChange={(value) => { const method = value as CalculationMethod; setDraft((current) => ({ ...current, calculationMethod: method, payoutFrequencies: method === 'COMPOUND' ? ['AT_MATURITY'] : current.payoutFrequencies, capitalizationFrequency: method === 'SIMPLE' ? 'NONE' : current.capitalizationFrequency })) }} />
        <div className="rounded-lg border bg-muted/30 p-3 text-sm"><span className="text-muted-foreground">Tipo de tasa automático</span><strong className="mt-1 block">{automaticRateType}</strong></div>
        <SelectField label="Base de cálculo anual" value={draft.dayCountBasis} options={{ '360': '360 días · comercial', '365': '365 días · calendario' }} onChange={(value) => set('dayCountBasis', value as '360' | '365')} />
        {draft.calculationMethod === 'COMPOUND' && <SelectField label="Capitalización" value={draft.capitalizationFrequency} error={errors.capitalizationFrequency} options={{ NONE: 'Seleccionar', MONTHLY: 'Mensual', BIMONTHLY: 'Bimestral', QUARTERLY: 'Trimestral', SEMIANNUAL: 'Semestral', ANNUAL: 'Anual' }} onChange={(value) => set('capitalizationFrequency', value as ProductDraft['capitalizationFrequency'])} />}
        <div className="flex items-center gap-3 pt-3"><Switch checked={draft.active} onCheckedChange={(value) => set('active', value)} /><Label>Producto activo y visible</Label></div>
      </section>

      <section className="space-y-3 border-t pt-5"><h3 className="font-medium">Frecuencias de pago autorizadas</h3><p className="text-sm text-muted-foreground">El simulador solo mostrará una frecuencia cuando el plazo contenga periodos completos: mensual cada 30 días, trimestral cada 90, etc.</p><div className="grid gap-2 sm:grid-cols-3">{frequencies.map((frequency) => <label key={frequency} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(draft.calculationMethod === 'COMPOUND' ? ['AT_MATURITY'] : draft.payoutFrequencies).includes(frequency)} disabled={draft.calculationMethod === 'COMPOUND'} onChange={(event) => toggleFrequency(frequency, event.target.checked)} />{payoutLabels[frequency]}</label>)}</div>{errors.payoutFrequencies && <ErrorText>{errors.payoutFrequencies}</ErrorText>}</section>

      <section className="space-y-3 border-t pt-5"><div className="flex items-center justify-between gap-2"><div><h3 className="font-medium">Tasas por plazo y monto</h3><p className="text-sm text-muted-foreground">El plazo mínimo es 31 días. Estos rangos definen los valores que el cliente podrá ingresar y cada rango comienza un día después del anterior.</p></div><Button type="button" variant="outline" size="sm" onClick={addRate}><Plus />Agregar tasa</Button></div>{errors.rates && <ErrorText>{errors.rates}</ErrorText>}{errors.ratesCoverage && <ErrorText>{errors.ratesCoverage}</ErrorText>}{draft.rates.map((rate, index) => <div key={index} className={`space-y-3 rounded-lg border p-3 ${errors[`rate.${index}.overlap`] ? 'border-destructive' : ''}`}><div className="flex items-center justify-between"><strong>{rateLabel(rate.minimumTermDays, rate.maximumTermDays)}</strong><Button type="button" variant="ghost" size="icon" aria-label="Quitar tasa" onClick={() => removeRate(index)}><Trash2 /></Button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Field label="Días desde" type="number" value={rate.minimumTermDays} onChange={(value) => updateRate(index, 'minimumTermDays', value)} error={errors[`rate.${index}.minimumTermDays`]} readOnly={index > 0} /><Field label="Días hasta" type="number" value={rate.maximumTermDays} onChange={(value) => updateRate(index, 'maximumTermDays', value)} error={errors[`rate.${index}.maximumTermDays`]} /><Field label="Monto desde" type="number" value={rate.minimumAmount} onChange={(value) => updateRate(index, 'minimumAmount', value)} error={errors[`rate.${index}.minimumAmount`]} /><Field label="Monto hasta" type="number" value={rate.maximumAmount} onChange={(value) => updateRate(index, 'maximumAmount', value)} error={errors[`rate.${index}.maximumAmount`]} /><Field label="Rendimiento anual (%)" type="number" value={rate.annualRatePercent} onChange={(value) => updateRate(index, 'annualRatePercent', value)} error={errors[`rate.${index}.annualRatePercent`]} /></div>{errors[`rate.${index}.overlap`] && <ErrorText>{errors[`rate.${index}.overlap`]}</ErrorText>}</div>)}</section>

      <section className="space-y-3 border-t pt-5"><div className="flex items-center justify-between gap-2"><div><h3 className="font-medium">Retención sobre rendimientos</h3><p className="text-sm text-muted-foreground">Se descuenta únicamente del interés generado, nunca del capital. La tarifa general vigente en Ecuador es 3 %; la exención desde 180 días depende de que se cumplan los requisitos legales.</p></div>{draft.taxRules.length === 0 && <Button type="button" variant="outline" size="sm" onClick={addTaxRule}><Plus />Configurar retención</Button>}</div>{errors.taxRules && <ErrorText>{errors.taxRules}</ErrorText>}{draft.taxRules.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Sin retención configurada. La simulación mostrará el interés bruto como interés neto.</p>}{draft.taxRules.map((rule, index) => <div key={index} className="rounded-lg border p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Nombre visible" value={rule.name} onChange={(value) => updateTaxRule(index, 'name', value)} error={errors[`tax.${index}.name`]} /><Field label="Porcentaje sobre intereses (%)" type="number" value={rule.value} onChange={(value) => updateTaxRule(index, 'value', value)} error={errors[`tax.${index}.value`]} /><Field label="Exenta desde (días)" type="number" value={rule.exemptFromTermDays} onChange={(value) => updateTaxRule(index, 'exemptFromTermDays', value)} error={errors[`tax.${index}.exemptFromTermDays`]} /><label className="flex items-center gap-2 pt-7 text-sm"><Switch checked={rule.active} onCheckedChange={(value) => updateTaxRule(index, 'active', value)} />Aplicar retención</label></div><div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Deja vacío el umbral únicamente si la retención debe aplicarse a todos los plazos.</p><Button type="button" variant="ghost" size="sm" onClick={() => set('taxRules', [])}><Trash2 />Quitar retención</Button></div></div>)}</section>
      <div className="flex items-center justify-between gap-3 border-t pt-5"><p className="text-sm text-destructive">{Object.keys(errors).length ? `${Object.keys(errors).length} campo(s) requieren revisión.` : ''}</p><div className="flex gap-2"><Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving || Object.keys(errors).length > 0}>{saving ? 'Guardando…' : 'Guardar producto'}</Button></div></div>
    </form>
  </div>
}

function ErrorText({ children }: { children: string }) { return <p className="text-xs text-destructive">{children}</p> }
function Field({ label, value, onChange, type = 'text', required = false, error, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; error?: string; readOnly?: boolean }) {
  return <div className="space-y-2"><Label>{label}</Label>{label === 'Descripción' ? <Textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} aria-invalid={Boolean(error)} readOnly={readOnly} /> : <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} aria-invalid={Boolean(error)} readOnly={readOnly} className={error ? 'border-destructive focus-visible:ring-destructive' : undefined} />}{error && <ErrorText>{error}</ErrorText>}</div>
}
function SelectField({ label, value, options, onChange, error }: { label: string; value: string; options: Record<string, string>; onChange: (value: string) => void; error?: string }) {
  return <div className="space-y-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger aria-invalid={Boolean(error)} className={error ? 'border-destructive' : undefined}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(options).map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select>{error && <ErrorText>{error}</ErrorText>}</div>
}

export function InvestmentAdminPage() {
  const client = useQueryClient(); const navigate = useNavigate()
  const products = useQuery({ queryKey: investmentKeys.adminProducts, queryFn: getAdminInvestmentProducts })
  const status = useMutation({ mutationFn: ({ product, active }: { product: InvestmentProduct; active: boolean }) => setInvestmentProductStatus(product.id, active), onSuccess: async () => { await client.invalidateQueries({ queryKey: investmentKeys.adminProducts }); await client.invalidateQueries({ queryKey: investmentKeys.publicProducts }) }, onError: (error) => toast.error(errorMessage(error)) })
  return <div className="space-y-8"><PageHeader title="Productos de inversión" description="Configura productos, rangos de plazo, tasas y modalidades de pago." actions={<Button onClick={() => navigate('/admin/inversiones/nuevo')}><CirclePlus />Nuevo producto</Button>} /><div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-4">Producto</th><th className="p-4">Plazo permitido</th><th className="p-4">Tasas</th><th className="p-4">Estado</th><th className="p-4" /></tr></thead><tbody>{(products.data ?? []).map((product) => <tr key={product.id} className="border-b last:border-0"><td className="p-4"><strong>{product.name}</strong><span className="block text-xs text-muted-foreground">{formatCurrency(product.minimumAmount)} – {formatCurrency(product.maximumAmount)}</span></td><td className="p-4">{product.minimumTermDays}–{product.maximumTermDays} días</td><td className="p-4">{product.rates.length} · {product.rates.length ? `${formatPercentage(Math.min(...product.rates.map((rate) => rate.annualRate)))} – ${formatPercentage(Math.max(...product.rates.map((rate) => rate.annualRate)))}` : 'Sin tasas'}</td><td className="p-4"><StatusBadge tone={product.active ? 'success' : 'neutral'}>{product.active ? 'Activo' : 'Inactivo'}</StatusBadge></td><td className="p-4 text-right"><Button variant="ghost" size="sm" onClick={() => navigate(`/admin/inversiones/${product.id}/editar`)}><Pencil />Editar</Button><Button variant="ghost" size="sm" onClick={() => status.mutate({ product, active: !product.active })}><Power />{product.active ? 'Desactivar' : 'Activar'}</Button></td></tr>)}</tbody></table>{products.isPending && <p className="p-6 text-sm text-muted-foreground">Cargando productos…</p>}{products.data?.length === 0 && <p className="p-6 text-sm text-muted-foreground">Todavía no existen productos.</p>}</div></div>
}

export function InvestmentProductEditorPage() {
  const navigate = useNavigate(); const { productId } = useParams(); const client = useQueryClient()
  const products = useQuery({ queryKey: investmentKeys.adminProducts, queryFn: getAdminInvestmentProducts })
  const product = productId ? products.data?.find((item) => item.id === Number(productId)) : undefined
  const save = useMutation({ mutationFn: (input: InvestmentProductInput) => product ? updateInvestmentProduct(product.id, input) : createInvestmentProduct(input), onSuccess: async () => { await client.invalidateQueries({ queryKey: investmentKeys.adminProducts }); await client.invalidateQueries({ queryKey: investmentKeys.publicProducts }); toast.success(product ? 'Producto actualizado.' : 'Producto creado.'); navigate('/admin/inversiones') }, onError: (error) => toast.error(errorMessage(error)) })
  if (products.isPending) return <p className="text-sm text-muted-foreground">Cargando producto…</p>
  if (productId && !product) return <div className="space-y-4"><PageHeader title="Producto no encontrado" description="No pudimos encontrar el producto solicitado." /><Button onClick={() => navigate('/admin/inversiones')}>Volver a productos</Button></div>
  return <ProductEditor key={product?.id ?? 'new'} product={product} onCancel={() => navigate('/admin/inversiones')} saving={save.isPending} onSave={(input) => save.mutateAsync(input).then(() => undefined)} />
}
