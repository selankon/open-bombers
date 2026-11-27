import { DayString, IsoDay, WeekId } from '~utils/dates'

// llarg: long-term reminder (~6 months), puntual: one-off review of an apartat that was blurry in a test
export type TipusRepas = 'd1' | 'setmanal' | 'mensual' | 'llarg' | 'puntual'

export type SessionKind = TipusRepas | 'estudi' | 'test'

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
  include_tests: boolean
}

export interface RepasConfig {
  dia_setmanal_defecte: IsoDay
  dia_mensual_defecte: IsoDay
  setmanes_fins_setmanal: number
  setmanes_fins_mensual: number
  dies_fins_diari: number
  data_examen: DayString | null
  horitzo_setmanes: number
  llindar_sobrecarrega: number
  dies_bloquejats: DayString[]
  sync_repas_seguent: boolean
  // Long-term reminder: S + n weeks, then n weeks after the previous one was done
  llarg_actiu: boolean
  setmanes_fins_llarg: number
  // Tests of the study package (spec §3.7)
  tests_actius: boolean
  dies_test: IsoDay[]
  temes_per_test_max: number
  temes_per_test_min: number
  test_interval_inicial: number
  test_interval_maxim: number
  test_llindar_alt: number
  test_llindar_baix: number
  ics: IcsOptions
}

export interface TestResultat {
  data: DayString
  // % of right answers, null when not given (keeps the box)
  percent: number | null
}

export interface PaquetState {
  // tema id → test results, oldest first (one per day)
  resultats: Record<string, TestResultat[]>
  // tema id → day it was added by hand
  manuals: Record<string, DayString>
  // tema ids removed by hand
  exclosos: string[]
  // tema ids already added to the package in the tests App
  a_app: string[]
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
  // instance id → ISO timestamp (only llarg and puntual, the rest live in the planificació cells)
  fets: Record<string, string>
  // instance id → day it occupied when it was marked as done (it stays there)
  fet_dates: Record<string, DayString>
  // puntual instance id → day
  puntuals: Record<string, DayString>
  paquet: PaquetState
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
  // study day for d1, target week for setmanal/mensual/llarg, the day for puntual
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
  // for kind = test
  tests: TestItem[]
  pending: number
  done: number
  overdue: number
}

/** A tema of the study package with its derived schedule */
export interface PaquetTema {
  temaId: string
  // day it entered the package
  entrada: DayString
  isManual: boolean
  // Leitner box and its interval in weeks
  caixa: number
  interval: number
  resultats: TestResultat[]
  darrer: TestResultat | null
  // next test day (may be in the past: it is due)
  proper: DayString
  aApp: boolean
}

/** One tema of a test session */
export interface TestItem {
  temaId: string
  isDone: boolean
  percent: number | null
  // interval (weeks) the tema has before this test
  interval: number
}

export interface GenerateParams {
  estudis: Record<string, DayString>
  config: RepasConfig
  setmanes: Record<WeekId, WeekConfig>
  overrides: Record<string, DayString>
  fets: Record<string, string>
  fetDates?: Record<string, DayString>
  puntuals?: Record<string, DayString>
  avui: DayString
}

export interface RegisterStudyParams {
  rowIds: string[]
  date: DayString
}

export interface SaveTestParams {
  temaId: string
  data: DayString
  // undefined removes the result of that day
  resultat?: { percent: number | null }
}

export interface MoveSessionParams {
  session: Session
  date: DayString
}

export interface AddPuntualsParams {
  rowIds: string[]
  date: DayString
}
