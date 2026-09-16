import axios from 'axios'
import { Archive, CirclePlus, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { toast } from 'sonner'

import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  DataTableToolbar,
  dataTableFeatures,
} from '@/components/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  createInvestmentProduct,
  getAdminInvestmentProducts,
  investmentKeys,
  payoutLabels,
  setInvestmentProductStatus,
  updateInvestmentProduct,
  type InvestmentProduct,
  type InvestmentProductInput,
  type PayoutFrequency,
} from '@/features/investments/investment-api'
import { formatCurrency, formatPercentage } from '@/lib/formatters'

interface RateDraft {
  label: string
  minimumAmount: string
  maximumAmount: string
  minimumTermDays: string
  maximumTermDays: string
  annualRatePercent: string
}

interface ProductDraft {
  name: string
  description: string
  minimumAmount: string
  maximumAmount: string
  minimumTermDays: string
  maximumTermDays: string
  payoutFrequency: PayoutFrequency
  dayCountBasis: '360' | '365'
  withholdingPercent: string
  active: boolean
  rates: RateDraft[]
}

const emptyDraft: ProductDraft = {
  name: '',
  description: '',
  minimumAmount: '500',
  maximumAmount: '500000',
  minimumTermDays: '31',
  maximumTermDays: '360',
  payoutFrequency: 'AT_MATURITY',
  dayCountBasis: '365',
  withholdingPercent: '0',
  active: true,
  rates: [{
    label: 'Tasa general', minimumAmount: '500', maximumAmount: '500000',
    minimumTermDays: '31', maximumTermDays: '360', annualRatePercent: '4.5',
  }],
}

function draftFrom(product?: InvestmentProduct): ProductDraft {
  if (!product) return structuredClone(emptyDraft)
  return {
    name: product.name,
    description: product.description,
    minimumAmount: String(product.minimumAmount),
    maximumAmount: String(product.maximumAmount),
    minimumTermDays: String(product.minimumTermDays),
    maximumTermDays: String(product.maximumTermDays),
    payoutFrequency: product.payoutFrequency,
    dayCountBasis: String(product.dayCountBasis) as '360' | '365',
    withholdingPercent: String(product.withholdingRate * 100),
    active: product.active,
    rates: product.rates.map((rate) => ({
      label: rate.label,
      minimumAmount: String(rate.minimumAmount),
      maximumAmount: String(rate.maximumAmount),
      minimumTermDays: String(rate.minimumTermDays),
      maximumTermDays: String(rate.maximumTermDays),
      annualRatePercent: String(rate.annualRate * 100),
    })),
  }
}

function toInput(draft: ProductDraft): InvestmentProductInput {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    minimumAmount: Number(draft.minimumAmount),
    maximumAmount: Number(draft.maximumAmount),
    minimumTermDays: Number(draft.minimumTermDays),
    maximumTermDays: Number(draft.maximumTermDays),
    payoutFrequency: draft.payoutFrequency,
    dayCountBasis: Number(draft.dayCountBasis) as 360 | 365,
    withholdingRate: Number(draft.withholdingPercent) / 100,
    active: draft.active,
    rates: draft.rates.map((rate) => ({
      label: rate.label.trim(),
      minimumAmount: Number(rate.minimumAmount),
      maximumAmount: Number(rate.maximumAmount),
      minimumTermDays: Number(rate.minimumTermDays),
      maximumTermDays: Number(rate.maximumTermDays),
      annualRate: Number(rate.annualRatePercent) / 100,
    })),
  }
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? 'No se pudo guardar el producto.'
  }
  return 'No se pudo guardar el producto.'
}

interface ProductEditorProps {
  open: boolean
  product?: InvestmentProduct
  onOpenChange: (open: boolean) => void
  onSave: (input: InvestmentProductInput) => Promise<void>
  saving: boolean
}

function ProductEditor({ open, product, onOpenChange, onSave, saving }: ProductEditorProps) {
  const [draft, setDraft] = useState<ProductDraft>(() => draftFrom(product))

  function field<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function rateField(index: number, key: keyof RateDraft, value: string) {
    setDraft((current) => ({
      ...current,
      rates: current.rates.map((rate, position) => position === index ? { ...rate, [key]: value } : rate),
    }))
  }

  function addRate() {
    setDraft((current) => ({ ...current, rates: [...current.rates, {
      label: `Tasa ${current.rates.length + 1}`,
      minimumAmount: current.minimumAmount,
      maximumAmount: current.maximumAmount,
      minimumTermDays: current.minimumTermDays,
      maximumTermDays: current.maximumTermDays,
      annualRatePercent: '',
    }] }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (draft.rates.length === 0) {
      toast.error('Agrega al menos un rango de tasa.')
      return
    }
    await onSave(toInput(draft))
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar producto de inversión' : 'Nuevo producto de inversión'}</DialogTitle>
          <DialogDescription>Define las alternativas que la institución permitirá utilizar en el simulador.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="space-y-7">
          <section className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="investment-name">Nombre</Label><Input id="investment-name" value={draft.name} onChange={(event) => field('name', event.target.value)} maxLength={120} required /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="investment-description">Descripción</Label><Textarea id="investment-description" value={draft.description} onChange={(event) => field('description', event.target.value)} maxLength={600} rows={3} /></div>
            <NumberField label="Monto mínimo" value={draft.minimumAmount} onChange={(value) => field('minimumAmount', value)} step="0.01" />
            <NumberField label="Monto máximo" value={draft.maximumAmount} onChange={(value) => field('maximumAmount', value)} step="0.01" />
            <NumberField label="Plazo mínimo (días)" value={draft.minimumTermDays} onChange={(value) => field('minimumTermDays', value)} />
            <NumberField label="Plazo máximo (días)" value={draft.maximumTermDays} onChange={(value) => field('maximumTermDays', value)} />
            <div className="space-y-2"><Label>Pago de intereses</Label><Select value={draft.payoutFrequency} onValueChange={(value) => field('payoutFrequency', value as PayoutFrequency)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(payoutLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Base anual</Label><Select value={draft.dayCountBasis} onValueChange={(value) => field('dayCountBasis', value as '360' | '365')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="360">360 días</SelectItem><SelectItem value="365">365 días</SelectItem></SelectContent></Select></div>
            <NumberField label="Retención configurada (%)" value={draft.withholdingPercent} onChange={(value) => field('withholdingPercent', value)} step="0.0001" min="0" max="100" />
            <div className="flex items-end gap-3 pb-2"><Switch id="investment-active" checked={draft.active} onCheckedChange={(value) => field('active', value)} /><Label htmlFor="investment-active">Producto activo y visible</Label></div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium">Rangos de tasa</h3><p className="text-sm text-muted-foreground">Los rangos no pueden superponerse en monto y plazo al mismo tiempo.</p></div><Button type="button" variant="outline" size="sm" onClick={addRate}><CirclePlus />Agregar tasa</Button></div>
            {draft.rates.map((rate, index) => (
              <div key={index} className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-6">
                <div className="space-y-2 sm:col-span-2 lg:col-span-2"><Label>Nombre del rango</Label><Input value={rate.label} onChange={(event) => rateField(index, 'label', event.target.value)} required /></div>
                <NumberField label="Monto desde" value={rate.minimumAmount} onChange={(value) => rateField(index, 'minimumAmount', value)} step="0.01" />
                <NumberField label="Monto hasta" value={rate.maximumAmount} onChange={(value) => rateField(index, 'maximumAmount', value)} step="0.01" />
                <NumberField label="Días desde" value={rate.minimumTermDays} onChange={(value) => rateField(index, 'minimumTermDays', value)} />
                <NumberField label="Días hasta" value={rate.maximumTermDays} onChange={(value) => rateField(index, 'maximumTermDays', value)} />
                <NumberField label="Tasa anual (%)" value={rate.annualRatePercent} onChange={(value) => rateField(index, 'annualRatePercent', value)} step="0.0001" />
                <div className="flex items-end"><Button type="button" variant="ghost" className="text-destructive" disabled={draft.rates.length === 1} onClick={() => field('rates', draft.rates.filter((_, position) => position !== index))}><Trash2 />Quitar</Button></div>
              </div>
            ))}
          </section>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar producto'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NumberField({ label, value, onChange, step = '1', min = '0', max }: { label: string; value: string; onChange: (value: string) => void; step?: string; min?: string; max?: string }) {
  return <div className="space-y-2"><Label>{label}</Label><Input type="number" value={value} onChange={(event) => onChange(event.target.value)} step={step} min={min} max={max} required /></div>
}

const columnHelper = createColumnHelper<typeof dataTableFeatures, InvestmentProduct>()

export function InvestmentAdminPage() {
  const client = useQueryClient()
  const [editing, setEditing] = useState<InvestmentProduct | undefined>()
  const [editorOpen, setEditorOpen] = useState(false)
  const products = useQuery({ queryKey: investmentKeys.adminProducts, queryFn: getAdminInvestmentProducts })

  const save = useMutation({
    mutationFn: ({ product, input }: { product?: InvestmentProduct; input: InvestmentProductInput }) => product ? updateInvestmentProduct(product.id, input) : createInvestmentProduct(input),
    onSuccess: async (_, variables) => {
      await client.invalidateQueries({ queryKey: investmentKeys.adminProducts })
      await client.invalidateQueries({ queryKey: investmentKeys.publicProducts })
      toast.success(variables.product ? 'Producto actualizado.' : 'Producto creado.')
      setEditorOpen(false)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const status = useMutation({
    mutationFn: ({ product, active }: { product: InvestmentProduct; active: boolean }) => setInvestmentProductStatus(product.id, active),
    onSuccess: async (_, variables) => {
      await client.invalidateQueries({ queryKey: investmentKeys.adminProducts })
      await client.invalidateQueries({ queryKey: investmentKeys.publicProducts })
      toast.success(variables.active ? 'Producto activado.' : 'Producto desactivado.')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const columns = useMemo(() => columnHelper.columns([
    columnHelper.accessor('name', { header: ({ column }) => <DataTableColumnHeader column={column} title="Producto" />, cell: ({ row }) => <div><span className="font-medium">{row.original.name}</span><span className="block max-w-md truncate text-xs text-muted-foreground">{row.original.description}</span></div>, meta: { label: 'Producto' } }),
    columnHelper.accessor('minimumAmount', { header: ({ column }) => <DataTableColumnHeader column={column} title="Montos" />, cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.minimumAmount)} – {formatCurrency(row.original.maximumAmount)}</span>, meta: { label: 'Montos' } }),
    columnHelper.accessor('minimumTermDays', { header: ({ column }) => <DataTableColumnHeader column={column} title="Plazos" />, cell: ({ row }) => `${row.original.minimumTermDays} – ${row.original.maximumTermDays} días`, meta: { label: 'Plazos' } }),
    columnHelper.accessor('rates', { header: 'Tasas', cell: ({ row }) => <span>{row.original.rates.length} rango{row.original.rates.length === 1 ? '' : 's'} · {row.original.rates.length ? `${formatPercentage(Math.min(...row.original.rates.map((rate) => rate.annualRate)))} – ${formatPercentage(Math.max(...row.original.rates.map((rate) => rate.annualRate)))}` : 'Sin tasas'}</span>, enableSorting: false, meta: { label: 'Tasas' } }),
    columnHelper.accessor('active', { header: 'Estado', cell: ({ getValue }) => <StatusBadge tone={getValue() ? 'success' : 'neutral'}>{getValue() ? 'Activo' : 'Inactivo'}</StatusBadge>, meta: { label: 'Estado' } }),
    columnHelper.display({ id: 'actions', header: () => <span className="sr-only">Acciones</span>, cell: ({ row }) => <div className="flex justify-end"><DataTableRowActions row={row} actions={[{ label: 'Editar', icon: Pencil, onSelect: (product) => { setEditing(product); setEditorOpen(true) } }, { label: row.original.active ? 'Desactivar' : 'Activar', icon: row.original.active ? Archive : RotateCcw, destructive: row.original.active, separatorBefore: true, onSelect: (product) => status.mutate({ product, active: !product.active }) }]} /></div>, enableHiding: false, enableSorting: false, meta: { label: 'Acciones' } }),
  ]), [status])

  return (
    <div className="space-y-8">
      <PageHeader title="Productos de inversión" description="Configura los productos, límites, plazos, forma de pago y tasas que estarán disponibles en el simulador público." actions={<Button onClick={() => { setEditing(undefined); setEditorOpen(true) }}><CirclePlus />Nuevo producto</Button>} />
      {products.isError && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">No se pudieron cargar los productos de inversión.</div>}
      <DataTable columns={columns} data={products.data ?? []} getRowId={(product) => String(product.id)} isLoading={products.isPending} search={{ columnId: 'name', placeholder: 'Buscar producto...' }} toolbar={(table) => <DataTableToolbar table={table} search={{ columnId: 'name', placeholder: 'Buscar producto...' }} />} emptyMessage="Todavía no existen productos de inversión." aria-label="Productos de inversión" />
      {editorOpen && <ProductEditor open product={editing} onOpenChange={setEditorOpen} saving={save.isPending} onSave={async (input) => { await save.mutateAsync({ product: editing, input }) }} />}
    </div>
  )
}
