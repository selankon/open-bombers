import { COL, FET, GROUP_LABELS, SUBGROUP_LABELS } from './columns'
import { temaRowId } from './structure'
import { Cells, Column, PlanDerived, Structure } from './types'

const quote = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
const toCsv = (rows: string[][]) => '﻿' + rows.map((r) => r.map(quote).join(';')).join('\r\n')

const valueOf = (
  column: Column,
  rowId: string,
  temaId: string,
  temaRow: string,
  cells: Cells,
  derived: PlanDerived
) => {
  if (column.tipus === 'auto_nivell_tema') return derived.temaLevels[temaId]?.level ?? '—'
  if (column.col_id === COL.NIVELL_APARTAT) return derived.apartatLevels[rowId]?.level ?? ''
  const cell = cells[column.ambit === 'tema' ? temaRow : rowId]?.[column.col_id]
  if (column.tipus === 'check') return cell?.v === FET ? FET : ''
  return cell?.v ?? ''
}

/**
 * Same format as the original export: every <tr> of the table including the 3 header rows,
 * tema-scope values only on the first row of each tema (rowspan)
 */
export const buildOriginalCsv = (structure: Structure, cells: Cells, derived: PlanDerived) => {
  const { columns, temes } = structure
  const rows: string[][] = []
  const groups: string[] = []
  const subgroups: string[] = []
  columns.forEach((c, i) => {
    if (i === 0 || columns[i - 1].grup !== c.grup) groups.push(GROUP_LABELS[c.grup])
    if (i === 0 || columns[i - 1].grup !== c.grup || columns[i - 1].subgrup !== c.subgrup)
      subgroups.push(SUBGROUP_LABELS[c.subgrup])
  })
  rows.push(['Tema', 'Nom', 'Nº', 'Apartat / Contingut', ...groups])
  rows.push(subgroups)
  rows.push(columns.map((c) => `${c.titol}${c.tipus === 'check' ? ' ✔' : c.tipus === 'score' ? ' Nota' : ''}`))
  for (const tema of temes) {
    const temaRow = temaRowId(tema)
    tema.apartats.forEach((a, i) => {
      const fixed = i === 0 ? [tema.codi, tema.nom, a.num, a.titol] : [a.num, a.titol]
      const values = columns
        .filter((c) => c.ambit === 'apartat' || i === 0)
        .map((c) => valueOf(c, a.row_id, tema.id, temaRow, cells, derived))
      rows.push([...fixed, ...values])
    })
  }
  return toCsv(rows)
}

/**
 * Flat CSV: one row per apartat with every column, tema values repeated
 */
export const buildFlatCsv = (structure: Structure, cells: Cells, derived: PlanDerived) => {
  const { columns, temes } = structure
  const rows: string[][] = [['tema_id', 'tema', 'nom', 'row_id', 'num', 'apartat', ...columns.map((c) => c.col_id)]]
  for (const tema of temes) {
    const temaRow = temaRowId(tema)
    for (const a of tema.apartats) {
      rows.push([
        tema.id,
        tema.codi,
        tema.nom,
        a.row_id,
        a.num,
        a.titol,
        ...columns.map((c) => valueOf(c, a.row_id, tema.id, temaRow, cells, derived)),
      ])
    }
  }
  return toCsv(rows)
}
