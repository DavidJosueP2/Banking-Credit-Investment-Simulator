import type { Borders, Cell, Fill, Worksheet } from 'exceljs'

import { tint, toArgb, type ExportBranding } from './branding'

export type ColumnKind = 'integer' | 'money' | 'date' | 'text'

export interface ExcelColumn {
  header: string
  width: number
  kind: ColumnKind
  /** Suma la columna en la fila de totales (con fórmula SUM). */
  total?: boolean
  /** Resalta la columna con el color principal, como en el PDF. */
  emphasis?: boolean
}

export interface ExcelKpi {
  label: string
  /** Valor fijo o fórmula construida con las celdas de totales (`totals[i]`) y la celda del primer indicador. */
  value?: number
  formula?: (totals: string[], firstKpiCell: string) => string
  emphasis?: boolean
}

export interface ExcelLayout {
  sheetName: string
  title: string
  subtitle: string
  sections: Array<{ title: string; left: Array<[string, string]>; right: Array<[string, string]> }>
  columns: ExcelColumn[]
  rows: Array<Array<number | string | Date>>
  kpis: ExcelKpi[]
  footnote: string
}

const FORMATS: Record<ColumnKind, string> = {
  integer: '0',
  money: '"$"#,##0.00',
  date: 'dd/mm/yyyy',
  text: '@',
}
const DARK = 'FF202527'
const MUTED = 'FF586064'
const SURFACE = 'FFF8FAFA'
const ZEBRA = 'FFF8FBFB'
const LINE = 'FFE1E6E6'

/**
 * Libro de Excel con la misma estructura que el PDF: franja con logo, condiciones, indicadores, tabla
 * completa y pie. Los números se guardan como números (no como texto) y los totales e indicadores son
 * fórmulas, así el archivo se puede seguir usando para cálculos propios.
 */
export async function excelWorkbook(layout: ExcelLayout, branding: ExportBranding): Promise<Blob> {
  const module = await import('exceljs')
  const ExcelJS = (module as unknown as { default?: typeof module }).default ?? module
  const workbook = new ExcelJS.Workbook()
  workbook.creator = branding.institutionName
  workbook.created = new Date()
  workbook.calcProperties.fullCalcOnLoad = true

  const sheet = workbook.addWorksheet(layout.sheetName, {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ showGridLines: false }],
  })
  const count = layout.columns.length
  sheet.columns = layout.columns.map((column) => ({ width: column.width }))
  const primary = toArgb(branding.primary)
  const secondary = toArgb(branding.secondary)
  const soft = toArgb(tint(branding.primary, 0.9))

  // 1. Franja de marca con logo.
  for (let row = 1; row <= 3; row++) {
    sheet.getRow(row).height = 22
    for (let column = 1; column <= count; column++) sheet.getCell(row, column).fill = solid(primary)
  }
  let textColumn = 1
  if (branding.logo) {
    const imageId = workbook.addImage({ base64: branding.logo.base64, extension: 'png' })
    const height = 52
    const width = Math.min(190, (branding.logo.width / branding.logo.height) * height)
    sheet.addImage(imageId, { tl: { col: 0.2, row: 0.35 }, ext: { width, height } })
    textColumn = 4
  }
  writeMerged(sheet, 1, textColumn, count, layout.title, { bold: true, size: 16, color: { argb: 'FFFFFFFF' } })
  writeMerged(sheet, 2, textColumn, count, layout.subtitle, { size: 10, color: { argb: 'FFFFFFFF' } })
  const issued = new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })
  writeMerged(sheet, 3, textColumn, count, `${branding.institutionName} · Emitido el ${issued}`, { size: 9, color: { argb: 'FFFFFFFF' } })
  sheet.getRow(4).height = 4
  for (let column = 1; column <= count; column++) sheet.getCell(4, column).fill = solid(secondary)

  // 2. Condiciones (dos bloques de etiqueta y valor).
  let row = 6
  const quarter = Math.max(1, Math.floor(count / 4))
  for (const section of layout.sections) {
    writeMerged(sheet, row, 1, count, section.title.toUpperCase(), { bold: true, size: 10, color: { argb: secondary } })
    row++
    const lines = Math.max(section.left.length, section.right.length)
    for (let index = 0; index < lines; index++) {
      const [leftLabel, leftValue] = section.left[index] ?? ['', '']
      const [rightLabel, rightValue] = section.right[index] ?? ['', '']
      writeMerged(sheet, row, 1, quarter, leftLabel, { size: 10, color: { argb: MUTED } })
      writeMerged(sheet, row, quarter + 1, quarter * 2, leftValue, { bold: true, size: 10, color: { argb: DARK } })
      writeMerged(sheet, row, quarter * 2 + 1, quarter * 3, rightLabel, { size: 10, color: { argb: MUTED } })
      writeMerged(sheet, row, quarter * 3 + 1, count, rightValue, { bold: true, size: 10, color: { argb: DARK } })
      for (let column = 1; column <= count; column++) sheet.getCell(row, column).fill = solid(SURFACE)
      row++
    }
    row++
  }

  // 3. Posiciones de la tabla: los indicadores apuntan a su fila de totales.
  const kpiLabelRow = row + 1
  const kpiValueRow = row + 2
  const headerRow = kpiValueRow + 2
  const firstData = headerRow + 1
  const lastData = firstData + layout.rows.length - 1
  const totalRow = lastData + 1
  const totals = layout.columns.map((column, index) => column.total ? `${letter(index + 1)}${totalRow}` : '')

  // 4. Indicadores.
  writeMerged(sheet, row, 1, count, 'RESUMEN', { bold: true, size: 10, color: { argb: secondary } })
  const span = Math.max(1, Math.floor(count / layout.kpis.length))
  const firstKpiCell = `${letter(1)}${kpiValueRow}`
  layout.kpis.forEach((kpi, index) => {
    const from = index * span + 1
    const to = index === layout.kpis.length - 1 ? count : from + span - 1
    writeMerged(sheet, kpiLabelRow, from, to, kpi.label.toUpperCase(), { bold: true, size: 8, color: { argb: MUTED } }, 'center')
    const cell = writeMerged(sheet, kpiValueRow, from, to, '', { bold: true, size: 13, color: { argb: kpi.emphasis ? primary : DARK } }, 'center')
    cell.value = kpi.formula ? { formula: kpi.formula(totals, firstKpiCell) } : kpi.value ?? 0
    cell.numFmt = FORMATS.money
    for (let column = from; column <= to; column++) {
      sheet.getCell(kpiLabelRow, column).fill = solid(kpi.emphasis ? soft : SURFACE)
      sheet.getCell(kpiValueRow, column).fill = solid(kpi.emphasis ? soft : SURFACE)
    }
  })
  sheet.getRow(kpiValueRow).height = 24

  // 5. Tabla completa.
  const header = sheet.getRow(headerRow)
  layout.columns.forEach((column, index) => {
    const cell = header.getCell(index + 1)
    cell.value = column.header
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = solid(primary)
    cell.alignment = { horizontal: column.kind === 'money' ? 'right' : 'center', vertical: 'middle', wrapText: true }
    cell.border = borders(primary)
  })
  header.height = 20

  layout.rows.forEach((values, rowIndex) => {
    const excelRow = sheet.getRow(firstData + rowIndex)
    values.forEach((value, index) => {
      const column = layout.columns[index]
      const cell = excelRow.getCell(index + 1)
      cell.value = value
      cell.numFmt = FORMATS[column.kind]
      cell.alignment = { horizontal: column.kind === 'money' ? 'right' : 'center' }
      cell.border = borders(LINE)
      if (rowIndex % 2 === 1) cell.fill = solid(ZEBRA)
      if (column.emphasis) cell.font = { bold: true, color: { argb: primary } }
    })
  })

  const total = sheet.getRow(totalRow)
  layout.columns.forEach((column, index) => {
    const cell = total.getCell(index + 1)
    if (index === 0) cell.value = 'Total'
    if (column.total) {
      const range = `${letter(index + 1)}${firstData}:${letter(index + 1)}${lastData}`
      const result = layout.rows.reduce((sum, values) => sum + Number(values[index] ?? 0), 0)
      cell.value = { formula: `SUM(${range})`, result: Math.round(result * 100) / 100 }
      cell.numFmt = FORMATS.money
    }
    cell.font = { bold: true, color: { argb: column.emphasis ? primary : DARK } }
    cell.fill = solid(soft)
    cell.alignment = { horizontal: index === 0 ? 'center' : 'right' }
    cell.border = { ...borders(LINE), top: { style: 'medium', color: { argb: primary } } }
  })

  sheet.views = [{ state: 'frozen', ySplit: headerRow, showGridLines: false }]
  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastData, column: count } }

  // 6. Pie.
  writeMerged(sheet, totalRow + 2, 1, count, layout.footnote, { italic: true, size: 9, color: { argb: MUTED } })
  if (branding.legalNotice) {
    const notice = writeMerged(sheet, totalRow + 3, 1, count, branding.legalNotice, { italic: true, size: 9, color: { argb: MUTED } })
    notice.alignment = { wrapText: true, vertical: 'top' }
    sheet.getRow(totalRow + 3).height = 30
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

function writeMerged(sheet: Worksheet, row: number, from: number, to: number, value: string,
  font: Partial<Cell['font']>, horizontal: 'left' | 'center' | 'right' = 'left') {
  if (to > from) sheet.mergeCells(row, from, row, to)
  const cell = sheet.getCell(row, from)
  cell.value = value
  cell.font = font
  cell.alignment = { horizontal, vertical: 'middle' }
  return cell
}

function solid(argb: string): Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function borders(argb: string): Partial<Borders> {
  const side = { style: 'thin' as const, color: { argb } }
  return { top: side, left: side, bottom: side, right: side }
}

function letter(column: number): string {
  let value = ''
  let current = column
  while (current > 0) {
    const remainder = (current - 1) % 26
    value = String.fromCharCode(65 + remainder) + value
    current = Math.floor((current - 1) / 26)
  }
  return value
}
