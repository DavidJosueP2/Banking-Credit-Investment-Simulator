import { CreditCompositionChart, CreditCostHighlight, CreditInstallmentsChart } from '@/features/creditos/credit-insights'

import type { ApplicationDetail } from './applications-api'

/** Costo destacado y gráficos de un crédito guardado en una solicitud (usa la foto aceptada por el cliente). */
export function CreditVisuals({ application }: { application: ApplicationDetail }) {
  const totals = {
    tea: application.annualRate,
    monto: application.amount,
    totalIntereses: application.totalInterest,
    totalDesgravamen: application.totalInsurance,
    totalCargos: application.totalCharges,
    totalPagar: application.totalAmount,
  }
  return (
    <section className="space-y-4" aria-label="Costo del crédito">
      <CreditCostHighlight totals={totals} />
      <div className="grid gap-4 xl:grid-cols-2">
        <CreditCompositionChart totals={totals} />
        <CreditInstallmentsChart
          yearly={application.termUnit === 'YEARS'}
          rows={application.schedule.map((row) => ({
            numero: row.number,
            capital: row.principal,
            interes: row.interest,
            desgravamen: row.insurance,
            cargos: row.charges,
          }))}
        />
      </div>
    </section>
  )
}
