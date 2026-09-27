import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Bookmark, CalendarClock, ChartNoAxesCombined, Eye, Landmark, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/app/providers/auth-provider'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ApplicationStatusBadge, ReadinessChecklist } from '@/features/applications/application-parts'
import {
  applicationKeys,
  deleteSimulation,
  formatRate,
  formatTerm,
  getMyApplications,
  getReadiness,
  getSavedSimulations,
  OPEN_STATUSES,
  productTypeLabels,
  saveSimulation,
  systemLabels,
  type ApplicationSummary,
  type SavedSimulation,
} from '@/features/applications/applications-api'
import { forgetScenario, NEW_APPLICATION_PATH, pendingScenario, rememberScenario } from '@/features/applications/pending-scenario'
import { messageFrom } from '@/features/identity-check/utils'
import { exportCreditExcel, exportCreditPdf } from '@/features/creditos/credit-export'
import { downloadBlob, fileSlug, useExportBranding } from '@/features/export/branding'
import { DownloadMenu } from '@/features/export/download-menu'
import { exportInvestmentExcel } from '@/features/investments/investment-export'
import { simuladorService } from '@/features/creditos/simulador/services/simulador.service'
import { downloadInvestmentPdf, payoutLabels, simulateInvestment, type SimulationRequest } from '@/features/investments/investment-api'
import { formatCurrency, formatDate } from '@/lib/formatters'

export function ClientHomePage() {
  const { account, hasPermission } = useAuth()
  const client = useQueryClient()
  const canSave = hasPermission('simulation.save')
  const readiness = useQuery({ queryKey: applicationKeys.readiness, queryFn: getReadiness })
  const applications = useQuery({ queryKey: applicationKeys.mine, queryFn: getMyApplications })
  const simulations = useQuery({ queryKey: applicationKeys.simulations, queryFn: getSavedSimulations, enabled: canSave })

  // Retoma una simulación que la persona quiso guardar antes de iniciar sesión.
  const pendingSave = useRef(pendingScenario('save'))
  const { mutate: savePending } = useMutation({
    mutationFn: saveSimulation,
    onSuccess: async () => {
      toast.success('Guardamos la simulación que hiciste antes de ingresar.')
      await client.invalidateQueries({ queryKey: applicationKeys.simulations })
    },
    onError: (error) => toast.error(messageFrom(error, 'No pudimos guardar tu simulación.')),
  })
  useEffect(() => {
    const scenario = pendingSave.current
    if (!scenario || !canSave) return
    pendingSave.current = null
    forgetScenario()
    savePending(scenario)
  }, [canSave, savePending])

  const all = applications.data ?? []
  const products = all.filter((item) => item.status === 'APPROVED')
  const credits = products.filter((item) => item.productType === 'CREDIT')
  const investments = products.filter((item) => item.productType === 'INVESTMENT')
  const requests = all.filter((item) => item.status !== 'APPROVED')
  const openCount = all.filter((item) => OPEN_STATUSES.includes(item.status)).length
  const firstName = (readiness.data?.fullName ?? account?.fullName ?? '').split(' ')[0]

  return (
    <main id="contenido" className="mx-auto min-h-[65svh] max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
      <header className="flex flex-col gap-5 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-gold">Mi espacio Brunexa</p>
          <h1 className="mt-2 text-3xl text-brand-teal sm:text-4xl">Hola{firstName ? `, ${firstName}` : ''}</h1>
          <p className="mt-3 max-w-[60ch] leading-7 text-muted-foreground">
            Consulta tus créditos e inversiones, sigue tus solicitudes y retoma las simulaciones que guardaste.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="brand"><Link to="/creditos/simulador"><Landmark />Simular crédito</Link></Button>
          <Button asChild variant="outline"><Link to="/inversiones/simulador"><ChartNoAxesCombined />Simular inversión</Link></Button>
        </div>
      </header>

      {readiness.data && !readiness.data.ready && (
        <section aria-labelledby="readiness-title" className="mt-8 rounded-xl border border-brand-gold/40 bg-brand-gold/5 p-5">
          <h2 id="readiness-title" className="text-lg">Antes de solicitar un crédito o una inversión</h2>
          <p className="mt-1 text-sm text-muted-foreground">Verifica tu identidad una sola vez. Mientras tanto puedes simular y guardar.</p>
          <div className="mt-4"><ReadinessChecklist readiness={readiness.data} /></div>
        </section>
      )}

      <section aria-labelledby="products-title" className="mt-10">
        <SectionTitle id="products-title" title="Mis créditos e inversiones" hint="Aprobados" />
        {applications.isPending ? <CardsSkeleton /> : products.length === 0 ? (
          <EmptyBox>
            Aún no tienes créditos ni inversiones aprobados. Simula uno y envía tu solicitud en línea.
          </EmptyBox>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {credits.map((item) => <CreditCard key={item.id} item={item} />)}
            {investments.map((item) => <InvestmentCard key={item.id} item={item} />)}
          </div>
        )}
      </section>

      <section aria-labelledby="requests-title" className="mt-12">
        <SectionTitle id="requests-title" title="Solicitudes" hint={openCount > 0 ? `${openCount} en curso` : undefined} />
        {applications.isError && <p className="text-sm text-destructive">{messageFrom(applications.error, 'No pudimos cargar tus solicitudes.')}</p>}
        {applications.isPending ? <CardsSkeleton /> : requests.length === 0 ? (
          <EmptyBox>No tienes solicitudes pendientes.</EmptyBox>
        ) : (
          <ul className="divide-y rounded-xl border">
            {requests.map((item) => (
              <li key={item.id}>
                <Link to={`/cliente/solicitudes/${item.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.productName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.code} · {productTypeLabels[item.productType]} · {formatCurrency(item.amount)} · {formatTerm(item.term, item.termUnit)}
                    </p>
                  </div>
                  <ApplicationStatusBadge status={item.status} />
                  {item.status === 'DRAFT' && <span className="text-xs font-medium text-brand-gold">Falta confirmar tu identidad</span>}
                  {item.status === 'OBSERVED' && <span className="text-xs font-medium text-brand-gold">El asesor necesita algo de ti</span>}
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canSave && (
        <section aria-labelledby="simulations-title" className="mt-12">
          <SectionTitle id="simulations-title" title="Simulaciones guardadas" hint="Recalculadas con las condiciones del día en que las guardaste" />
          {simulations.isPending ? <CardsSkeleton /> : (simulations.data ?? []).length === 0 ? (
            <EmptyBox>
              <Bookmark className="mx-auto mb-2 size-5 text-brand-gold" aria-hidden="true" />
              Usa “Guardar simulación” en los simuladores para comparar escenarios después.
            </EmptyBox>
          ) : (
            <SavedSimulations items={simulations.data ?? []} />
          )}
        </section>
      )}

      <div className="mt-12 flex flex-wrap gap-4 border-t pt-6 text-sm">
        <Link to="/perfil" className="text-brand-gold underline underline-offset-4 hover:text-foreground">Mi perfil y verificación de identidad</Link>
        <Link to="/cuenta" className="text-brand-gold underline underline-offset-4 hover:text-foreground">Datos de mi cuenta</Link>
      </div>
    </main>
  )
}

function SectionTitle({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={id} className="text-xl">{title}</h2>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">{children}</div>
}

function CardsSkeleton() {
  return <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-36 rounded-xl" /></div>
}

function CreditCard({ item }: { item: ApplicationSummary }) {
  const progress = item.totalInstallments ? Math.round((item.elapsedInstallments / item.totalInstallments) * 100) : 0
  return (
    <Link to={`/cliente/solicitudes/${item.id}`} className="group rounded-xl border bg-card p-5 transition-colors hover:border-brand-teal/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">Crédito · {item.code}</p>
          <p className="mt-1 font-medium">{item.productName}</p>
        </div>
        <Landmark className="size-5 text-brand-teal" aria-hidden="true" />
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3">
        <Figure label="Monto" value={formatCurrency(item.amount)} />
        <Figure label="Próxima cuota" value={item.nextPayment ? formatCurrency(item.nextPayment) : '—'} />
        <Figure label="Saldo proyectado" value={formatCurrency(item.projectedBalance)} />
      </dl>
      <div className="mt-5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" aria-hidden="true" />
            {item.nextDueDate ? `Vence el ${formatDate(item.nextDueDate)}` : 'Cronograma concluido'}
          </span>
          <span>{item.elapsedInstallments} de {item.totalInstallments} cuotas</span>
        </div>
        <Progress value={progress} className="mt-2 h-1.5" aria-label="Cuotas transcurridas según el cronograma" />
      </div>
    </Link>
  )
}

function InvestmentCard({ item }: { item: ApplicationSummary }) {
  return (
    <Link to={`/cliente/solicitudes/${item.id}`} className="rounded-xl border bg-card p-5 transition-colors hover:border-brand-teal/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-gold">Inversión · {item.code}</p>
          <p className="mt-1 font-medium">{item.productName}</p>
        </div>
        <ChartNoAxesCombined className="size-5 text-brand-gold" aria-hidden="true" />
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3">
        <Figure label="Capital" value={formatCurrency(item.amount)} />
        <Figure label="Tasa anual" value={formatRate(item.annualRate)} />
        <Figure label="Al vencimiento" value={formatCurrency(item.totalAmount)} />
      </dl>
      <p className="mt-5 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5" aria-hidden="true" />
        {item.nextDueDate ? `Próximo pago: ${formatDate(item.nextDueDate)} · ${formatCurrency(item.nextPayment)}` : 'Inversión vencida'}
      </p>
    </Link>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd></div>
}

function SimulationCard({ item }: { item: SavedSimulation }) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const credit = item.productType === 'CREDIT'
  const canApply = hasPermission(credit ? 'credit.request.create' : 'investment.request.create')
  const { account } = useAuth()
  const brandingFor = useExportBranding()
  const file = useMutation({
    // El archivo se genera de nuevo con las condiciones vigentes; si cambiaron, se avisa.
    mutationFn: async (format: 'pdf' | 'excel') => {
      if (credit) {
        const resultado = await simuladorService.calcularCliente({
          productoId: item.productId,
          creditTypeId: item.productId,
          monto: item.amount,
          plazo: item.term,
          sistema: item.amortizationSystem ?? 'FRANCES',
          costoTotal: item.assetCost ?? undefined,
          cargosOpcionales: item.optionalCharges,
        })
        const branding = await brandingFor()
        if (format === 'pdf') exportCreditPdf(resultado, branding, account?.fullName)
        else await exportCreditExcel(resultado, branding, account?.fullName)
        return Math.abs(resultado.totalPagar - item.totalAmount) >= 0.01
      }
      const request: SimulationRequest = {
        productId: item.productId,
        amount: item.amount,
        termDays: item.term,
        payoutFrequency: item.payoutFrequency as SimulationRequest['payoutFrequency'],
      }
      if (format === 'pdf') {
        downloadBlob(await downloadInvestmentPdf(request), `simulacion-${fileSlug(item.productName)}.pdf`)
        return false
      }
      const result = await simulateInvestment(request)
      await exportInvestmentExcel(result, await brandingFor())
      return Math.abs(result.maturityValue - item.totalAmount) >= 0.01
    },
    onSuccess: (cambio) => {
      if (cambio) toast.info('Las condiciones cambiaron desde que guardaste esta simulación; el archivo usa las vigentes.')
    },
    onError: (error) => toast.error(messageFrom(error, 'No se pudo generar el archivo. Es posible que ese crédito o plan ya no esté disponible.')),
  })
  const remove = useMutation({
    mutationFn: () => deleteSimulation(item.id),
    onSuccess: () => client.invalidateQueries({ queryKey: applicationKeys.simulations }),
    onError: (error) => toast.error(messageFrom(error, 'No se pudo eliminar la simulación.')),
  })

  function apply() {
    rememberScenario({
      productType: item.productType,
      productId: item.productId,
      productName: item.productName,
      amount: item.amount,
      term: item.term,
      termUnit: item.termUnit,
      amortizationSystem: item.amortizationSystem ?? undefined,
      payoutFrequency: item.payoutFrequency ?? undefined,
      assetCost: item.assetCost ?? undefined,
    })
    navigate(NEW_APPLICATION_PATH)
  }

  const viewPath = simulatorPath(item)

  return (
    <article className="flex flex-col rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-medium uppercase tracking-wider ${credit ? 'text-brand-teal' : 'text-brand-gold'}`}>{productTypeLabels[item.productType]}</p>
          <h3 className="mt-1 truncate font-medium" title={item.label ?? item.productName}>
            <Link to={viewPath} className="hover:text-brand-teal hover:underline underline-offset-4">{item.label ?? item.productName}</Link>
          </h3>
          {item.label && <p className="truncate text-xs text-muted-foreground">{item.productName}</p>}
        </div>
        <ConfirmDialog
          trigger={<Button variant="ghost" size="icon" aria-label="Eliminar simulación" className="size-8 shrink-0"><Trash2 className="size-4" /></Button>}
          title="¿Eliminar esta simulación?"
          description="Podrás volver a crearla desde el simulador."
          confirmLabel="Eliminar"
          confirmVariant="destructive"
          isPending={remove.isPending}
          onConfirm={() => remove.mutate()}
        />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Figure label={credit ? 'Monto' : 'Capital'} value={formatCurrency(item.amount)} />
        <Figure label="Plazo" value={formatTerm(item.term, item.termUnit)} />
        <Figure label="Tasa anual" value={formatRate(item.annualRate)} />
        {credit
          ? <Figure label={item.amortizationSystem === 'ALEMAN' ? 'Primera cuota' : 'Cuota'} value={formatCurrency(item.periodicPayment)} />
          : <Figure label="Al vencimiento" value={formatCurrency(item.totalAmount)} />}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        {credit ? item.amortizationSystem && systemLabels[item.amortizationSystem] : item.payoutFrequency && `Intereses: ${payoutLabels[item.payoutFrequency as keyof typeof payoutLabels]}`}
        {' · '}Guardada el {formatDate(item.createdAt)}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={viewPath}><Eye className="size-3.5" />Ver simulación</Link>
        </Button>
        {canApply && (
          <Button type="button" variant="outline" size="sm" onClick={apply}>
            Solicitar con estos datos <ArrowRight className="size-3.5" />
          </Button>
        )}
        <DownloadMenu variant="ghost" onSelect={(format) => file.mutate(format)} pending={file.isPending ? file.variables : null} />
      </div>
    </article>
  )
}

/** Enlace al simulador con los datos de la simulación guardada: el simulador los rellena y la vuelve a calcular. */
function simulatorPath(item: SavedSimulation) {
  const params = new URLSearchParams({ producto: String(item.productId), monto: String(item.amount), plazo: String(item.term) })
  if (item.productType === 'CREDIT') {
    if (item.amortizationSystem) params.set('sistema', item.amortizationSystem)
    if (item.assetCost) params.set('costo', String(item.assetCost))
    if (item.optionalCharges.length) params.set('opcionales', item.optionalCharges.join(','))
    return `/creditos/simulador?${params}`
  }
  if (item.payoutFrequency) params.set('pago', item.payoutFrequency)
  return `/inversiones/simulador?${params}`
}

const PAGE_SIZE = 20
type SortKey = 'recent' | 'oldest' | 'amount-desc' | 'amount-asc'

/** Lista de simulaciones guardadas con filtros, orden y paginación (20 por página). */
function SavedSimulations({ items }: { items: SavedSimulation[] }) {
  const [type, setType] = useState<'ALL' | SavedSimulation['productType']>('ALL')
  const [product, setProduct] = useState('ALL')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [page, setPage] = useState(1)

  const products = useMemo(() => {
    const names = items.filter((item) => type === 'ALL' || item.productType === type).map((item) => item.productName)
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'es'))
  }, [items, type])

  const visible = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('es')
    const filtered = items.filter((item) =>
      (type === 'ALL' || item.productType === type)
      && (product === 'ALL' || item.productName === product)
      && (!text || `${item.label ?? ''} ${item.productName}`.toLocaleLowerCase('es').includes(text)))
    const byDate = (item: SavedSimulation) => new Date(item.createdAt).getTime()
    const compare: Record<SortKey, (a: SavedSimulation, b: SavedSimulation) => number> = {
      recent: (a, b) => byDate(b) - byDate(a),
      oldest: (a, b) => byDate(a) - byDate(b),
      'amount-desc': (a, b) => b.amount - a.amount,
      'amount-asc': (a, b) => a.amount - b.amount,
    }
    return filtered.sort(compare[sort])
  }, [items, type, product, query, sort])

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const shown = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const reset = () => setPage(1)
  const hasCredit = items.some((item) => item.productType === 'CREDIT')
  const hasInvestment = items.some((item) => item.productType === 'INVESTMENT')

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(event) => { setQuery(event.target.value); reset() }} placeholder="Buscar por nombre" aria-label="Buscar simulaciones" className="pl-9" />
        </div>
        <Select value={type} onValueChange={(value) => { setType(value as typeof type); setProduct('ALL'); reset() }}>
          <SelectTrigger aria-label="Tipo de simulación" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Créditos e inversiones</SelectItem>
            {hasCredit && <SelectItem value="CREDIT">Solo créditos</SelectItem>}
            {hasInvestment && <SelectItem value="INVESTMENT">Solo inversiones</SelectItem>}
          </SelectContent>
        </Select>
        <Select value={product} onValueChange={(value) => { setProduct(value); reset() }}>
          <SelectTrigger aria-label="Tipo de crédito o plan" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los tipos y planes</SelectItem>
            {products.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => { setSort(value as SortKey); reset() }}>
          <SelectTrigger aria-label="Ordenar" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Más recientes primero</SelectItem>
            <SelectItem value="oldest">Más antiguas primero</SelectItem>
            <SelectItem value="amount-desc">Monto mayor a menor</SelectItem>
            <SelectItem value="amount-asc">Monto menor a mayor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        {visible.length === items.length ? `${items.length} ${items.length === 1 ? 'simulación' : 'simulaciones'}` : `${visible.length} de ${items.length} simulaciones`}
      </p>
      {shown.length === 0 ? (
        <EmptyBox>Ninguna simulación coincide con los filtros.</EmptyBox>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((item) => <SimulationCard key={item.id} item={item} />)}
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Páginas de simulaciones" className="mt-5 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>Anterior</Button>
          <span className="text-sm tabular-nums text-muted-foreground">Página {current} de {pages}</span>
          <Button variant="outline" size="sm" disabled={current === pages} onClick={() => setPage(current + 1)}>Siguiente</Button>
        </nav>
      )}
    </div>
  )
}
