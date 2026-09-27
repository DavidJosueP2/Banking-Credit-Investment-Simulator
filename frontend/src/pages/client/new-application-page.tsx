import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChartNoAxesCombined, Landmark } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ReadinessChecklist } from '@/features/applications/application-parts'
import {
  applicationKeys,
  createApplication,
  formatTerm,
  getReadiness,
  productTypeLabels,
  systemLabels,
  type Scenario,
} from '@/features/applications/applications-api'
import { forgetScenario, NEW_APPLICATION_PATH, pendingScenario } from '@/features/applications/pending-scenario'
import { messageFrom } from '@/features/identity-check/utils'
import { payoutLabels } from '@/features/investments/investment-api'
import { formatCurrency } from '@/lib/formatters'

export function NewApplicationPage() {
  const [scenario] = useState<Scenario | null>(() => pendingScenario('apply'))
  const readiness = useQuery({ queryKey: applicationKeys.readiness, queryFn: getReadiness })

  if (!scenario) {
    return (
      <main id="contenido" className="mx-auto min-h-[65svh] max-w-3xl px-5 py-16 sm:px-8">
        <h1 className="text-3xl text-brand-teal">Empieza con una simulación</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Las solicitudes se crean desde un simulador para que conozcas la cuota o el rendimiento antes de enviar.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="brand"><Link to="/creditos/simulador"><Landmark />Simular un crédito</Link></Button>
          <Button asChild variant="outline"><Link to="/inversiones/simulador"><ChartNoAxesCombined />Simular una inversión</Link></Button>
        </div>
      </main>
    )
  }

  return (
    <main id="contenido" className="mx-auto min-h-[65svh] max-w-5xl px-5 py-12 sm:px-8 lg:py-16">
      <Link to="/cliente" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />Mi espacio
      </Link>
      <p className="mt-6 text-sm font-medium text-brand-gold">Nueva solicitud · {productTypeLabels[scenario.productType]}</p>
      <h1 className="mt-2 text-3xl text-brand-teal sm:text-4xl">
        {scenario.productType === 'CREDIT' ? 'Solicita tu crédito' : 'Abre tu inversión'}
      </h1>
      <p className="mt-3 max-w-[65ch] leading-7 text-muted-foreground">
        Revisa lo que simulaste y completa unos datos. Después adjuntarás documentos si los tienes y confirmarás tu identidad con tu rostro.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <ScenarioSummary scenario={scenario} />
        {readiness.isPending ? (
          <p className="text-sm text-muted-foreground">Comprobando tu cuenta…</p>
        ) : readiness.data && !readiness.data.ready ? (
          <section className="rounded-xl border p-6">
            <h2 className="text-lg">Antes de enviar tu solicitud, verifica tu identidad</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Por seguridad, Brunexa confirma que eres tú (documento y rostro) antes de recibir una solicitud. Se hace
              una sola vez; quien crea su cuenta desde “Crear cuenta” ya lo hizo. Tu simulación te espera aquí.
            </p>
            <div className="mt-5"><ReadinessChecklist readiness={readiness.data} returnTo={NEW_APPLICATION_PATH} /></div>
            <Button asChild variant="brand" className="mt-5">
              <Link to={`/perfil?volver=${encodeURIComponent(NEW_APPLICATION_PATH)}`}>Verificar mi identidad</Link>
            </Button>
          </section>
        ) : (
          <ApplicationForm scenario={scenario} />
        )}
      </div>
    </main>
  )
}

function ScenarioSummary({ scenario }: { scenario: Scenario }) {
  const credit = scenario.productType === 'CREDIT'
  return (
    <section className="rounded-xl border bg-muted/30 p-6" aria-labelledby="scenario-title">
      <h2 id="scenario-title" className="text-lg">Tu simulación</h2>
      <dl className="mt-5 space-y-3 text-sm">
        <Row label={credit ? 'Tipo de crédito' : 'Plan de inversión'} value={scenario.productName ?? `N.º ${scenario.productId}`} />
        <Row label={credit ? 'Monto' : 'Capital'} value={formatCurrency(scenario.amount)} />
        {credit && scenario.assetCost ? <Row label="Costo del bien" value={formatCurrency(scenario.assetCost)} /> : null}
        <Row label="Plazo" value={scenario.termUnit ? formatTerm(scenario.term, scenario.termUnit) : String(scenario.term)} />
        {credit && scenario.amortizationSystem && <Row label="Sistema" value={systemLabels[scenario.amortizationSystem]} />}
        {!credit && scenario.payoutFrequency && <Row label="Pago de intereses" value={payoutLabels[scenario.payoutFrequency as keyof typeof payoutLabels] ?? scenario.payoutFrequency} />}
      </dl>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">
        Al crear la solicitud, Brunexa vuelve a calcular las cifras con las condiciones vigentes. Verás la tabla completa en el siguiente paso.
      </p>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div>
}

function ApplicationForm({ scenario }: { scenario: Scenario }) {
  const credit = scenario.productType === 'CREDIT'
  const { account } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [income, setIncome] = useState('')
  const [purpose, setPurpose] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')

  const create = useMutation({
    mutationFn: createApplication,
    onSuccess: async (application) => {
      forgetScenario()
      await client.invalidateQueries({ queryKey: applicationKeys.mine })
      navigate(`/cliente/solicitudes/${application.id}`, { replace: true })
    },
    onError: (cause) => setError(messageFrom(cause, 'No pudimos crear la solicitud.')),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!consent) {
      setError('Necesitamos tu autorización para continuar.')
      return
    }
    create.mutate({
      ...scenario,
      monthlyIncome: credit ? Number(income) : undefined,
      purpose: purpose.trim(),
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border p-6">
      <div>
        <h2 className="text-lg">Datos de la solicitud</h2>
        <p className="mt-1 text-sm text-muted-foreground">Solicitante: {account?.fullName}</p>
      </div>
      {credit && (
        <div className="space-y-2">
          <Label htmlFor="application-income">Ingreso mensual neto</Label>
          <Input id="application-income" type="number" inputMode="decimal" min="1" step="0.01" required
            value={income} onChange={(event) => setIncome(event.target.value)} aria-describedby="application-income-hint" />
          <p id="application-income-hint" className="text-xs text-muted-foreground">
            Con este valor el asesor evalúa cuánto de tu ingreso ocuparía la cuota.
          </p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="application-purpose">{credit ? '¿En qué usarás el crédito?' : '¿De dónde provienen los fondos?'}</Label>
        <Textarea id="application-purpose" required minLength={5} maxLength={300} rows={3} value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
          placeholder={credit ? 'Ej. compra de un vehículo para trabajo' : 'Ej. ahorros de mi sueldo, venta de un bien'} />
        <p className="text-right text-xs text-muted-foreground">{purpose.length}/300</p>
      </div>
      <label className="flex items-start gap-3 text-sm leading-6">
        <Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} className="mt-1" />
        <span>
          Declaro que la información es verdadera y autorizo a Brunexa a revisarla junto con mi documento de identidad
          y mi verificación biométrica para evaluar esta solicitud.
        </span>
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="brand" className="w-full" disabled={create.isPending}>
        {create.isPending ? 'Creando solicitud…' : 'Continuar'}
      </Button>
    </form>
  )
}
