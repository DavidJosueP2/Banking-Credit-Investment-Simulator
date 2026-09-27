import { downloadBlob, fileSlug, type ExportBranding } from '@/features/export/branding'
import { excelWorkbook, type ExcelLayout } from '@/features/export/excel'
import { formatPercentage } from '@/lib/formatters'

import { calculationMethodLabels, payoutLabels, rateTypeLabels, type SimulationResult, type TermUnit } from './investment-api'

const UNITS: Record<TermUnit, [string, string]> = { DAYS: ['día', 'días'], MONTHS: ['mes', 'meses'], YEARS: ['año', 'años'] }

function money(value: number, currency: string) {
  return `${currency || 'USD'} ${value.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** "2026-09-27" → fecha de Excel sin corrimiento por zona horaria. */
function excelDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function shortDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

/** Excel de la simulación de inversión con la misma información que el PDF del backend. */
export async function exportInvestmentExcel(result: SimulationResult, branding: ExportBranding) {
  const [one, many] = UNITS[result.termUnit] ?? UNITS.DAYS
  const layout: ExcelLayout = {
    sheetName: 'Inversión',
    title: 'Simulación de inversión',
    subtitle: 'Documento informativo',
    sections: [{
      title: 'Detalles de la inversión',
      left: [
        ['Plan de inversión', result.productName],
        ['Referencia', result.reference],
        ['Fecha de simulación', shortDate(result.simulationDate)],
        ['Fecha de vencimiento', shortDate(result.maturityDate)],
        ['Capital invertido', money(result.amount, result.currency)],
      ],
      right: [
        ['Plazo', `${result.termValue} ${result.termValue === 1 ? one : many}${result.termUnit === 'DAYS' ? '' : ` (${result.termDays} días)`}`],
        ['Tasa anual', `${formatPercentage(result.annualRate)} ${rateTypeLabels[result.rateType]?.toLowerCase() ?? ''}`.trim()],
        ['Pago de intereses', payoutLabels[result.payoutFrequency]],
        ['Cálculo', `${calculationMethodLabels[result.calculationMethod]} · base ${result.dayCountBasis} días`],
        ['Retención', formatPercentage(result.withholdingRate)],
      ],
    }],
    columns: [
      { header: 'Pago', width: 8, kind: 'integer' },
      { header: 'Fecha', width: 13, kind: 'date' },
      { header: 'Días', width: 8, kind: 'integer' },
      { header: 'Interés bruto', width: 16, kind: 'money', total: true },
      { header: 'Retención', width: 15, kind: 'money', total: true },
      { header: 'Interés neto', width: 16, kind: 'money', total: true, emphasis: true },
      { header: 'Capital', width: 16, kind: 'money', total: true },
      { header: 'Total', width: 17, kind: 'money', total: true },
    ],
    rows: result.payments.map((p) => [
      p.number, excelDate(p.paymentDate), p.periodDays, p.grossInterest, p.withholding, p.netInterest, p.capital, p.totalPayment,
    ]),
    // Totales e indicadores con fórmulas: el valor estimado es la suma de todo lo que recibe el cliente.
    kpis: [
      { label: 'Capital invertido', value: result.amount },
      { label: 'Retención', formula: (t) => t[4] },
      { label: 'Interés neto', formula: (t) => t[5], emphasis: true },
      { label: 'Valor estimado', formula: (t) => t[7], emphasis: true },
    ],
    footnote: 'Los intereses corresponden a cada período y el capital se devuelve al vencimiento. Valores referenciales.',
  }
  const blob = await excelWorkbook(layout, branding)
  downloadBlob(blob, `inversion-${fileSlug(result.productName || 'plan')}-${Math.round(result.amount)}usd.xlsx`)
}
