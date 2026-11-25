import { APARTAT_LEVEL_THRESHOLDS, LEVEL_LAST_SCORES, SCORE, TEMA_LEVEL_THRESHOLDS } from '~utils/constants'
import { COL, FET, SUBGROUP_WEIGHTS } from './columns'
import { temaRowId } from './structure'
import { ApartatLevelInfo, Cell, Cells, Column, Level, PlanDerived, Structure, TemaLevelInfo } from './types'

export const LEVEL_VALUE: Record<Level, number> = { NB: 1, NM: 2, NA: 3 }

export const isLevel = (v: string): v is Level => v === 'NA' || v === 'NM' || v === 'NB'

/** Parses a stored score, returns null if empty or invalid */
export const parseScore = (v: string | undefined): number | null => {
  if (v === undefined || v === null || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Clamps a typed score to 0-10 with one decimal. Empty → '' */
export const normalizeScore = (raw: string): string => {
  const n = parseScore(raw)
  if (n === null) return ''
  const clamped = Math.min(SCORE.MAX, Math.max(SCORE.MIN, n))
  return String(Math.round(clamped * 10) / 10)
}

export const levelFromAverage = (avg: number): Level =>
  avg < APARTAT_LEVEL_THRESHOLDS.NM ? 'NB' : avg < APARTAT_LEVEL_THRESHOLDS.NA ? 'NM' : 'NA'

export const temaLevelFromAverage = (avg: number): Level =>
  avg < TEMA_LEVEL_THRESHOLDS.NM ? 'NB' : avg < TEMA_LEVEL_THRESHOLDS.NA ? 'NM' : 'NA'

/** Cell of a column for a row, taking the scope into account */
export const cellFor = (cells: Cells, column: Column, rowId: string, temaRow: string): Cell | undefined =>
  cells[column.ambit === 'tema' ? temaRow : rowId]?.[column.col_id]

/**
 * Level of an apartat (improved version of the original `recalculateRowApartatLevel`):
 * - uses the scores of the apartat plus the scores of its tema (same for every apartat of the tema);
 * - averages the LEVEL_LAST_SCORES most recent scores (by change time, column order breaks ties);
 * - a manual choice (persisted with `m: true`) always wins over the computed level.
 */
export const computeApartatLevel = (
  scoreColumns: Column[],
  cells: Cells,
  rowId: string,
  temaRow: string
): ApartatLevelInfo => {
  const scores: { value: number; t: string; order: number }[] = []
  scoreColumns.forEach((column, order) => {
    const cell = cellFor(cells, column, rowId, temaRow)
    const value = parseScore(cell?.v)
    if (value !== null) scores.push({ value, t: cell.t || '', order })
  })
  scores.sort((a, b) => (a.t === b.t ? a.order - b.order : a.t < b.t ? -1 : 1))
  const last = scores.slice(-LEVEL_LAST_SCORES)
  const average = last.length ? last.reduce((acc, s) => acc + s.value, 0) / last.length : null
  const auto = average === null ? null : levelFromAverage(average)

  const manualCell = cells[rowId]?.[COL.NIVELL_APARTAT]
  const isManual = !!manualCell?.m && isLevel(manualCell.v)
  return {
    auto,
    average,
    count: last.length,
    level: isManual ? (manualCell.v as Level) : auto,
    isManual,
  }
}

/**
 * Computes levels and global metrics from the stored cells
 */
export const derivePlan = (structure: Structure, cells: Cells): PlanDerived => {
  const { columns, temes } = structure
  const scoreColumns = columns.filter((c) => c.tipus === 'score')
  const checkColumns = columns.filter((c) => c.tipus === 'check')

  const apartatLevels: Record<string, ApartatLevelInfo> = {}
  const temaLevels: Record<string, TemaLevelInfo> = {}
  const levels: Record<Level, number> = { NA: 0, NM: 0, NB: 0 }

  let checksDone = 0
  let checksTotal = 0
  let weightDone = 0
  let weightTotal = 0
  let scoreSum = 0
  let scoreCount = 0

  const countCheck = (column: Column, cell: Cell | undefined) => {
    const w = SUBGROUP_WEIGHTS[column.subgrup] ?? 1
    checksTotal++
    weightTotal += w
    if (cell?.v === FET) {
      checksDone++
      weightDone += w
    }
  }
  const countScore = (cell: Cell | undefined) => {
    const value = parseScore(cell?.v)
    if (value !== null) {
      scoreSum += value
      scoreCount++
    }
  }

  for (const tema of temes) {
    const temaRow = temaRowId(tema)
    if (!temaRow) continue

    // Tema scope cells count once per tema
    for (const column of checkColumns) if (column.ambit === 'tema') countCheck(column, cells[temaRow]?.[column.col_id])
    for (const column of scoreColumns) if (column.ambit === 'tema') countScore(cells[temaRow]?.[column.col_id])

    let levelSum = 0
    let levelCount = 0
    for (const apartat of tema.apartats) {
      const rowId = apartat.row_id
      for (const column of checkColumns)
        if (column.ambit === 'apartat') countCheck(column, cells[rowId]?.[column.col_id])
      for (const column of scoreColumns) if (column.ambit === 'apartat') countScore(cells[rowId]?.[column.col_id])

      const info = computeApartatLevel(scoreColumns, cells, rowId, temaRow)
      apartatLevels[rowId] = info
      if (info.level) {
        levels[info.level]++
        levelSum += LEVEL_VALUE[info.level]
        levelCount++
      }
    }
    const average = levelCount ? levelSum / levelCount : null
    temaLevels[tema.id] = { average, level: average === null ? null : temaLevelFromAverage(average) }
  }

  return {
    apartatLevels,
    temaLevels,
    metrics: {
      checksDone,
      checksTotal,
      checksPct: checksTotal ? Math.round((checksDone / checksTotal) * 100) : 0,
      weightedPct: weightTotal ? Math.round((weightDone / weightTotal) * 100) : 0,
      scoreAverage: scoreCount ? scoreSum / scoreCount : null,
      scoreCount,
      levels,
    },
  }
}
