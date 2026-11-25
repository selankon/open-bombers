export type ColumnGroup = 'info' | 'abans' | 'despres' | 'repassos'

export type ColumnSubgroup = 'info' | 'imprescindibles' | 'tasques2' | 'tasques3' | 'repassos'

export type ColumnType = 'date' | 'check' | 'score' | 'number' | 'text' | 'select_nivell' | 'auto_nivell_tema'

// tema: one cell per tema (rowspan), stored under the first apartat row id
export type ColumnScope = 'tema' | 'apartat'

export type Level = 'NA' | 'NM' | 'NB'

export interface Column {
  col_id: string
  titol: string
  grup: ColumnGroup
  subgrup: ColumnSubgroup
  tipus: ColumnType
  ambit: ColumnScope
}

export interface Apartat {
  row_id: string
  num: string
  titol: string
}

export interface Tema {
  id: string
  codi: string
  nom: string
  apartats: Apartat[]
}

export interface Structure {
  columns: Column[]
  temes: Tema[]
}

/**
 * A stored cell. `v` is the value as in the original app ("FET", "7.5", "2026-11-24", "NA"...),
 * `t` the ISO timestamp of the last change and `m` marks a manual nivell_apartat choice.
 */
export interface Cell {
  v: string
  t: string
  m?: boolean
}

export type RowCells = Record<string, Cell>

// row_id → col_id → cell
export type Cells = Record<string, RowCells>

export interface SaveCellParams {
  rowId: string
  colId: string
  value: string
  manual?: boolean
}

export interface ApartatLevelInfo {
  // Level computed from the scores (null if no scores)
  auto: Level | null
  // Average of the scores used
  average: number | null
  // How many scores were averaged
  count: number
  // Level shown: the manual one when set, otherwise the auto one
  level: Level | null
  isManual: boolean
}

export interface TemaLevelInfo {
  level: Level | null
  average: number | null
}

export interface PlanMetrics {
  checksDone: number
  checksTotal: number
  checksPct: number
  weightedPct: number
  scoreAverage: number | null
  scoreCount: number
  levels: Record<Level, number>
}

export interface PlanDerived {
  apartatLevels: Record<string, ApartatLevelInfo>
  temaLevels: Record<string, TemaLevelInfo>
  metrics: PlanMetrics
}
