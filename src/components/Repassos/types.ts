import { DayString, IsoDay, WeekId } from '~utils/dates'

export type TipusRepas = 'd1' | 'setmanal' | 'mensual'

export type SessionKind = TipusRepas | 'estudi'

export type InstanceStatus = 'pendent' | 'endarrerit' | 'fet'

export interface IcsOptions {
  // allday: DTSTART;VALUE=DATE — timed: start hour + duration in Europe/Madrid
  mode: 'allday' | 'timed'
  start: string // HH:mm
  duration_min: number
  alarm: 'none' | 'same_day_9' | 'before_15'
  range: 'from_today' | 'all'
  include_done: boolean
  include_estudis: boolean
}

export interface RepasConfig {
  dia_setmanal_defecte: IsoDay
  dia_mensual_defecte: IsoDay
  setmanes_fins_setmanal: number
  setmanes_fins_mensual: number
  setmanes_entre_mensuals: number
  dies_fins_diari: number
  data_examen: DayString | null
  horitzo_setmanes: number
  llindar_sobrecarrega: number
  dies_bloquejats: DayString[]
  sync_repas_seguent: boolean
  ics: IcsOptions
}

export interface WeekConfig {
  dia_setmanal?: IsoDay
  dia_mensual?: IsoDay
}

export interface RepassosState {
  // row_id → study day
  estudis: Record<string, DayString>
  config: RepasConfig
  // week → day overrides
  setmanes: Record<WeekId, WeekConfig>
  // instance id → manual day
  overrides: Record<string, DayString>
  // instance id → ISO timestamp (only mensual n ≥ 2, the rest live in the planificació cells)
  fets: Record<string, string>
  // instance id → day it occupied when it was marked as done (it stays there)
  fet_dates: Record<string, DayString>
}

export interface IcsEntry {
  hash: string
  sequence: number
  modificat_el: string
}

export interface IcsState {
  // uid → state, used for SEQUENCE / LAST-MODIFIED
  entries: Record<string, IcsEntry>
  // uid → hash of the last exported file, to detect unexported changes
  exported: Record<string, string>
  darrera_exportacio: string | null
  ajuda_vista: boolean
}

export interface Instance {
  // `<row_id>|<tipus>|<n>`
  id: string
  rowId: string
  tipus: TipusRepas
  n: number
  studyDate: DayString
  // study day for d1, target week for setmanal/mensual
  anchor: string
  calcDate: DayString
  date: DayString
  isMoved: boolean
  isDone: boolean
  fetEl?: string
  status: InstanceStatus
  // the whole target week is blocked
  hasWarning: boolean
}

export interface Session {
  key: string
  // UID without the domain part
  uid: string
  kind: SessionKind
  anchor: string
  date: DayString
  // formed by manually moved (or done on another day) instances
  isManual: boolean
  instances: Instance[]
  // for kind = estudi
  rowIds: string[]
  pending: number
  done: number
  overdue: number
}

export interface GenerateParams {
  estudis: Record<string, DayString>
  config: RepasConfig
  setmanes: Record<WeekId, WeekConfig>
  overrides: Record<string, DayString>
  fets: Record<string, string>
  fetDates?: Record<string, DayString>
  avui: DayString
}

export interface RegisterStudyParams {
  rowIds: string[]
  date: DayString
}

export interface MoveSessionParams {
  session: Session
  date: DayString
}
