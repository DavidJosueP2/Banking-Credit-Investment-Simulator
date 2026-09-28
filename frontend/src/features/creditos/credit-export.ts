import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { downloadBlob, fileSlug, hexToRgb, tint, type ExportBranding } from '@/features/export/branding'
import { excelWorkbook, type ExcelLayout } from '@/features/export/excel'
import type { SimulacionClienteResponse } from '@/types'

const money = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const fmt = (value: number | undefined) => money.format(value || 0)

const SEGMENTOS: Record<string, string> = {
  CONSUMO_PRIORITARIO: 'Consumo',
  CONSUMO_ORDINARIO: 'Consumo ordinario',
  EDUCATIVO: 'Educativo',
  EDUCATIVO_SOCIAL: 'Educativo social',
  INMOBILIARIO: 'Inmobiliario',
  VIVIENDA_VIP: 'Vivienda de interés público',
  VIVIENDA_VIS: 'Vivienda de interés social',
  MICROCREDITO_MINORISTA: 'Microcrédito minorista',
  MICROCREDITO_SIMPLE: 'Microcrédito de acumulación simple',
  MICROCREDITO_AMPLIADA: 'Microcrédito de acumulación ampliada',
  PRODUCTIVO_PYMES: 'Productivo PYMES',
  PRODUCTIVO_EMPRESARIAL: 'Productivo empresarial',
  PRODUCTIVO_CORPORATIVO: 'Productivo corporativo',
}

/** Datos que comparten el PDF y el Excel: los dos muestran exactamente lo mismo. */
function creditReport(data: SimulacionClienteResponse, cliente?: string | null) {
  const anual = data.frecuencia === 'ANUAL'
  const cargos = data.totalCargosIndirectos ?? 0
  const solca = data.totalSolca ?? 0
  const conditions: Array<[string, string]> = [
    ['Tipo de crédito', data.nombreProducto],
    ['Entidad', data.entidad || '—'],
    ['Segmento (BCE)', SEGMENTOS[data.segmentoBce] ?? data.segmentoBce ?? '—'],
    ['Sistema', data.sistema === 'FRANCES' ? 'Francés (cuota fija)' : 'Alemán (capital fijo)'],
  ]
  const terms: Array<[string, string]> = [
    ['Monto financiado', fmt(data.monto)],
    ['Plazo', `${data.totalCuotas} ${anual ? (data.totalCuotas === 1 ? 'año' : 'años') : (data.totalCuotas === 1 ? 'mes' : 'meses')} · cuota ${anual ? 'anual' : 'mensual'}`],
    ['Tasa efectiva anual (TEA)', `${data.tasaInteresAnual.toLocaleString('es-EC', { minimumFractionDigits: 2 })} %`],
    ['Desgravamen mensual', `${data.tasaDesgravamenMensual.toLocaleString('es-EC', { minimumFractionDigits: 4 })} % sobre saldo`],
    ['Contribución SOLCA (0,5 % única)', fmt(solca)],
  ]
  if (data.costoTotal) {
    terms.push(['Valor del bien', fmt(data.costoTotal)])
    conditions.push(['Entrada', fmt(data.costoTotal - data.monto)])
  }
  if (cliente) conditions.push(['Solicitante', cliente])
  return {
    anual,
    conditions,
    terms,
    kpis: [
      ['Monto financiado', data.monto],
      ['Total intereses', data.totalIntereses],
      ['Costo total', data.totalPagar],
      ['Carga financiera', data.totalPagar - data.monto],
    ] as Array<[string, number]>,
    cargos,
    fileBase: `amortizacion-${fileSlug(data.nombreProducto || 'credito')}-${Math.round(data.monto)}usd`,
  }
}

// ─── PDF ────────────────────────────────────────────────────────────────────

export function exportCreditPdf(data: SimulacionClienteResponse, branding: ExportBranding, cliente?: string | null) {
  const report = creditReport(data, cliente)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const primary = hexToRgb(branding.primary)
  const secondary = hexToRgb(branding.secondary)
  const soft = hexToRgb(tint(branding.primary, 0.9))
  const dark: [number, number, number] = [32, 37, 39]
  const muted: [number, number, number] = [88, 96, 100]
  const border: [number, number, number] = [218, 221, 221]
  const pageWidth = 297

  // Franja de marca con el logo de la institución (igual que el PDF de inversiones).
  doc.setFillColor(...primary)
  doc.rect(0, 0, pageWidth, 24, 'F')
  doc.setFillColor(...secondary)
  doc.rect(0, 24, pageWidth, 1.2, 'F')
  let titleX: number
  if (branding.logo) {
    const height = 13
    const width = Math.min(58, (branding.logo.width / branding.logo.height) * height)
    doc.addImage(branding.logo.dataUrl, 'PNG', 14, 5.5, width, height)
    titleX = 14 + width + 7
  } else {
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(branding.institutionName, 14, 14)
    titleX = 14 + doc.getTextWidth(branding.institutionName) + 7
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Tabla de amortización', titleX, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Simulación de crédito · documento referencial', titleX, 17.5)
  const issued = `${new Date().toLocaleDateString('es-EC')} ${new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`
  doc.text(`Emisión: ${issued}`, pageWidth - 14, 14.5, { align: 'right' })

  // Condiciones de la operación
  doc.setTextColor(...secondary)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('CONDICIONES DE LA OPERACIÓN', 14, 33)

  const rows = Math.max(report.conditions.length, report.terms.length)
  const boxHeight = 6 + rows * 5
  doc.setFillColor(248, 250, 250)
  doc.setDrawColor(...border)
  doc.setLineWidth(0.3)
  doc.roundedRect(14, 36, 150, boxHeight, 2, 2, 'FD')
  const pair = (items: Array<[string, string]>, labelX: number, valueX: number) => items.forEach(([label, value], index) => {
    const y = 41 + index * 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...muted)
    doc.text(label, labelX, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...dark)
    doc.text(doc.splitTextToSize(value, 42)[0], valueX, y)
  })
  pair(report.conditions, 18, 44)
  pair(report.terms, 90, 124)

  // Indicadores: el costo total y la carga financiera se muestran en grande (requisito de transparencia).
  const kpiX = 170
  const kpiWidth = (pageWidth - 14 - kpiX - 3 * 3) / 4
  report.kpis.forEach(([label, value], index) => {
    const x = kpiX + index * (kpiWidth + 3)
    const highlighted = index >= 2
    doc.setFillColor(...(highlighted ? soft : [248, 250, 250] as [number, number, number]))
    doc.setDrawColor(...border)
    doc.roundedRect(x, 36, kpiWidth, boxHeight, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.3)
    doc.setTextColor(...muted)
    doc.text(label.toUpperCase(), x + kpiWidth / 2, 36 + boxHeight / 2 - 2.5, { align: 'center' })
    doc.setFontSize(9)
    doc.setTextColor(...(highlighted ? primary : dark))
    doc.text(fmt(value), x + kpiWidth / 2, 36 + boxHeight / 2 + 3.5, { align: 'center' })
  })

  // Tabla completa con totales
  const totals = data.tablaCuotas.reduce((sum, c) => ({
    capital: sum.capital + c.capital,
    interes: sum.interes + c.interes,
    desgravamen: sum.desgravamen + c.desgravamen,
    cargos: sum.cargos + (c.cargosIndirectos ?? 0),
    cuota: sum.cuota + c.cuotaTotal,
  }), { capital: 0, interes: 0, desgravamen: 0, cargos: 0, cuota: 0 })

  autoTable(doc, {
    head: [['N.º', 'Saldo inicial', 'Capital', 'Interés', 'Desgravamen', 'Cobros indirectos', 'Cuota total', 'Saldo final']],
    body: data.tablaCuotas.map((c) => [
      String(c.numeroCuota), fmt(c.saldoInicial), fmt(c.capital), fmt(c.interes), fmt(c.desgravamen),
      fmt(c.cargosIndirectos ?? 0), fmt(c.cuotaTotal), fmt(c.saldoFinal),
    ]),
    foot: [['Total', '', fmt(totals.capital), fmt(totals.interes), fmt(totals.desgravamen), fmt(totals.cargos), fmt(totals.cuota), '']],
    showFoot: 'lastPage',
    startY: 36 + boxHeight + 6,
    margin: { left: 14, right: 14, bottom: 16 },
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, halign: 'right', font: 'helvetica', textColor: dark, lineColor: [225, 230, 230], lineWidth: 0.15 },
    headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' },
    footStyles: { fillColor: soft, textColor: dark, fontStyle: 'bold', halign: 'right' },
    alternateRowStyles: { fillColor: [248, 251, 251] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14 },
      6: { fontStyle: 'bold', textColor: primary },
    },
    didDrawPage: (page) => {
      doc.setFontSize(6.8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(...muted)
      const notice = `${branding.institutionName} · Simulación referencial con la tasa vigente, dentro del tope del Banco Central del Ecuador. Incluye la contribución SOLCA (0,5 % única) en la primera cuota. ${branding.legalNotice ?? ''}`
      doc.text(doc.splitTextToSize(notice, 230), 14, 203)
      doc.setFont('helvetica', 'normal')
      doc.text(`Página ${page.pageNumber} de {total}`, pageWidth - 14, 203, { align: 'right' })
    },
  })
  doc.putTotalPages('{total}')
  doc.save(`${report.fileBase}.pdf`)
}

// ─── Excel ──────────────────────────────────────────────────────────────────

export async function exportCreditExcel(data: SimulacionClienteResponse, branding: ExportBranding, cliente?: string | null) {
  const report = creditReport(data, cliente)
  const layout: ExcelLayout = {
    sheetName: 'Amortización',
    title: 'Tabla de amortización',
    subtitle: 'Simulación de crédito · documento referencial',
    sections: [{ title: 'Condiciones de la operación', left: report.conditions, right: report.terms }],
    columns: [
      { header: 'N.º', width: 7, kind: 'integer' },
      { header: 'Saldo inicial', width: 16, kind: 'money' },
      { header: 'Capital', width: 15, kind: 'money', total: true },
      { header: 'Interés', width: 15, kind: 'money', total: true },
      { header: 'Desgravamen', width: 15, kind: 'money', total: true },
      { header: 'Cobros indirectos', width: 17, kind: 'money', total: true },
      { header: 'Cuota total', width: 16, kind: 'money', total: true, emphasis: true },
      { header: 'Saldo final', width: 16, kind: 'money' },
    ],
    rows: data.tablaCuotas.map((c) => [
      c.numeroCuota, c.saldoInicial, c.capital, c.interes, c.desgravamen, c.cargosIndirectos ?? 0, c.cuotaTotal, c.saldoFinal,
    ]),
    // Indicadores con fórmulas sobre la fila de totales: si alguien edita la tabla, se recalculan.
    kpis: [
      { label: 'Monto financiado', value: data.monto },
      { label: 'Total intereses', formula: (t) => t[3] },
      { label: 'Costo total', formula: (t) => t[6], emphasis: true },
      { label: 'Carga financiera', formula: (t, amount) => `${t[6]}-${amount}`, emphasis: true },
    ],
    footnote: 'Simulación referencial con la tasa vigente, dentro del tope del Banco Central del Ecuador. Incluye la contribución SOLCA (0,5 % única) en la primera cuota.',
  }
  const blob = await excelWorkbook(layout, branding)
  downloadBlob(blob, `${report.fileBase}.xlsx`)
}
