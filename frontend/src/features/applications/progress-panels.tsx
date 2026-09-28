import { CalendarCheck, CalendarClock, PartyPopper } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Progress } from '@/components/ui/progress'
import { InvestmentInterestChart, InvestmentPaymentsChart, type InvestmentChartData } from '@/features/investments/investment-insights'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

import { isSettled, type ApplicationDetail, type Installment } from './applications-api'

const DAY = 86_400_000
const sum = (rows: Installment[], pick: (row: Installment) => number) => rows.reduce((total, row) => total + (pick(row) ?? 0), 0)

function daysFromToday(date: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${date.slice(0, 10)}T00:00:00`).getTime() - today.getTime()) / DAY)
}

function dueText(date: string) {
  const days = daysFromToday(date)
  if (days === 0) return { text: 'vence hoy', late: false }
  if (days > 0) return { text: `en ${days} ${days === 1 ? 'día' : 'días'}`, late: false }
  return { text: `vencida hace ${-days} ${days === -1 ? 'día' : 'días'}`, late: true }
}

/** Anillo de avance: se lee de un vistazo y el número exacto queda en el centro. */
function ProgressRing({ value, label, tone = 'teal' }: { value: number; label: string; tone?: 'teal' | 'gold' }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <div className="relative size-36 shrink-0" role="img" aria-label={`${label}: ${Math.round(clamped * 100)} %`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" strokeLinecap="round"
          stroke={tone === 'teal' ? 'var(--brand-teal, #08747b)' : 'var(--brand-gold, #946928)'}
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - clamped)}
          className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums">{Math.round(clamped * 100)} %</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

function Stat({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: ReactNode; accent?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border bg-background/60 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('mt-1 font-semibold tabular-nums', accent ? 'text-lg text-brand-teal' : 'text-foreground')}>{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>}
    </div>
  )
}

function SettledBanner({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-brand-teal/30 bg-brand-teal/10 p-3 text-sm font-medium text-brand-teal">
      <PartyPopper className="size-4 shrink-0" aria-hidden="true" />{children}
    </p>
  )
}

/** Avance real de un crédito aprobado, calculado con los pagos registrados (no por fecha). */
export function CreditProgress({ application, audience = 'customer' }: { application: ApplicationDetail; audience?: 'customer' | 'staff' }) {
  const { schedule } = application
  const paid = Math.min(application.paidThroughInstallment, schedule.length)
  const paidRows = schedule.slice(0, paid)
  const pendingRows = schedule.slice(paid)
  const capitalPaid = sum(paidRows, (row) => row.principal)
  const balance = paid > 0 ? schedule[paid - 1].closingBalance ?? 0 : application.amount
  const paidAmount = application.payments.filter((payment) => payment.installmentNumber <= paid)
    .reduce((total, payment) => total + payment.amount, 0)
  const pendingAmount = sum(pendingRows, (row) => row.payment)
  const next = pendingRows[0]
  const settled = isSettled(application)
  const due = next ? dueText(next.dueDate) : null

  return (
    <section aria-labelledby="progress-title" className="rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="progress-title" className="text-xl">{audience === 'staff' ? 'Avance' : 'Tu avance'}</h2>
        <span className="text-sm text-muted-foreground">{paid} de {schedule.length} cuotas pagadas</span>
      </div>
      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <ProgressRing value={application.amount ? capitalPaid / application.amount : 0} label="del capital" />
        <div className="w-full min-w-0 flex-1 space-y-4">
          {settled && <SettledBanner>{audience === 'staff' ? 'Crédito pagado por completo. Sin saldo pendiente.' : '¡Crédito pagado por completo! Ya no tienes saldo pendiente.'}</SettledBanner>}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Capital pagado {formatCurrency(capitalPaid)}</span>
              <span>Saldo {formatCurrency(balance)}</span>
            </div>
            <Progress value={application.amount ? (capitalPaid / application.amount) * 100 : 0} className="mt-1.5 h-2.5 [&_[data-slot=progress-indicator]]:bg-brand-teal"
              aria-label="Capital pagado del crédito" />
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={audience === 'staff' ? 'Pagado por el cliente' : 'Has pagado'} value={formatCurrency(paidAmount)} hint={`${paid} ${paid === 1 ? 'cuota' : 'cuotas'}`} />
            <Stat label={audience === 'staff' ? 'Pendiente por pagar' : 'Te falta pagar'} value={formatCurrency(pendingAmount)} accent={!settled}
              hint={`${pendingRows.length} ${pendingRows.length === 1 ? 'cuota' : 'cuotas'} con interés y seguros`} />
            {next && due ? (
              <Stat label="Próxima cuota" value={formatCurrency(next.payment)}
                hint={<span className={cn('inline-flex items-center gap-1', due.late && 'font-medium text-destructive')}>
                  <CalendarClock className="size-3" aria-hidden="true" />{formatDate(next.dueDate)} · {due.text}
                </span>} />
            ) : (
              <Stat label="Próxima cuota" value="—" hint="No quedan cuotas" />
            )}
            <Stat label={audience === 'staff' ? (settled ? 'Último pago' : 'Fin previsto') : settled ? 'Terminaste de pagar' : 'Terminas de pagar'}
              value={formatDate((settled ? application.payments.at(-1)?.paidAt : schedule.at(-1)?.dueDate) ?? '')}
              hint={<span className="inline-flex items-center gap-1"><CalendarCheck className="size-3" aria-hidden="true" />{settled ? 'Último pago registrado' : 'Según el cronograma'}</span>} />
          </dl>
        </div>
      </div>
    </section>
  )
}

/** Datos de una inversión guardada en el formato que usan los gráficos del simulador. */
function investmentChartData(application: ApplicationDetail): InvestmentChartData {
  return {
    amount: application.amount,
    grossInterest: sum(application.schedule, (row) => row.interest),
    netInterest: application.totalInterest,
    withholding: application.totalWithholding,
    charges: application.totalCharges,
    payments: application.schedule.map((row) => ({
      number: row.number,
      paymentDate: row.dueDate,
      periodDays: 0,
      grossInterest: row.interest,
      withholding: row.withholding,
      netInterest: row.interest - row.withholding,
      capital: row.principal,
      charges: row.charges,
      totalPayment: row.payment,
    })),
  }
}

/** Gráficos de una inversión (también antes de aprobarse, igual que en el simulador). */
export function InvestmentVisuals({ application, paidThrough }: { application: ApplicationDetail; paidThrough?: number }) {
  const data = investmentChartData(application)
  return (
    <section className="grid gap-4 xl:grid-cols-2" aria-label="Rendimiento de la inversión">
      <InvestmentInterestChart result={data} />
      <InvestmentPaymentsChart result={data} paidThrough={paidThrough} />
    </section>
  )
}

/** Avance de una inversión aprobada: tiempo transcurrido y pagos recibidos (registrados por el asesor). */
export function InvestmentProgress({ application, audience = 'customer' }: { application: ApplicationDetail; audience?: 'customer' | 'staff' }) {
  const { schedule } = application
  const paid = Math.min(application.paidThroughInstallment, schedule.length)
  const paidRows = schedule.slice(0, paid)
  const pendingRows = schedule.slice(paid)
  const interestOf = (row: Installment) => row.payment - row.principal
  const interestReceived = sum(paidRows, interestOf)
  const interestPending = sum(pendingRows, interestOf)
  const capitalReturned = sum(paidRows, (row) => row.principal) > 0
  const maturity = schedule.at(-1)?.dueDate ?? application.scheduleBaseDate
  const start = new Date(`${application.scheduleBaseDate.slice(0, 10)}T00:00:00`).getTime()
  const end = new Date(`${maturity.slice(0, 10)}T00:00:00`).getTime()
  const [now] = useState(() => Date.now())
  const timeShare = end > start ? (now - start) / (end - start) : 1
  const daysLeft = Math.max(0, daysFromToday(maturity))
  const next = pendingRows[0]
  const due = next ? dueText(next.dueDate) : null
  const settled = isSettled(application)

  return (
    <section aria-labelledby="progress-title" className="rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="progress-title" className="text-xl">{audience === 'staff' ? 'Avance' : 'Tu avance'}</h2>
        <span className="text-sm text-muted-foreground">{paid} de {schedule.length} {schedule.length === 1 ? 'pago recibido' : 'pagos recibidos'}</span>
      </div>
      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <ProgressRing value={settled ? 1 : timeShare} label="del plazo" tone="gold" />
        <div className="w-full min-w-0 flex-1 space-y-4">
          {settled && <SettledBanner>{audience === 'staff' ? 'Inversión liquidada: intereses y capital entregados.' : 'Inversión liquidada: recibiste tus intereses y tu capital.'}</SettledBanner>}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Desde {formatDate(application.scheduleBaseDate)}</span>
              <span>{settled ? 'Vencida' : `Vence el ${formatDate(maturity)} · faltan ${daysLeft} días`}</span>
            </div>
            <Progress value={Math.min(100, Math.max(0, (settled ? 1 : timeShare) * 100))} className="mt-1.5 h-2.5 [&_[data-slot=progress-indicator]]:bg-brand-gold"
              aria-label="Tiempo transcurrido del plazo" />
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Intereses recibidos" value={formatCurrency(interestReceived)} accent
              hint={`${paid} ${paid === 1 ? 'pago' : 'pagos'} registrados`} />
            <Stat label="Intereses por recibir" value={formatCurrency(interestPending)}
              hint={`${pendingRows.length} ${pendingRows.length === 1 ? 'pago' : 'pagos'} restantes`} />
            {next && due ? (
              <Stat label="Próximo pago" value={formatCurrency(next.payment)}
                hint={<span className={cn('inline-flex items-center gap-1', due.late && 'font-medium text-destructive')}>
                  <CalendarClock className="size-3" aria-hidden="true" />{formatDate(next.dueDate)} · {due.text}
                </span>} />
            ) : (
              <Stat label="Próximo pago" value="—" hint="No quedan pagos" />
            )}
            <Stat label={audience === 'staff' ? 'Capital del cliente' : 'Tu capital'} value={formatCurrency(application.amount)}
              hint={capitalReturned ? (audience === 'staff' ? 'Ya devuelto' : 'Ya se te devolvió') : `Vuelve el ${formatDate(maturity)}`} />
          </dl>
        </div>
      </div>
    </section>
  )
}
