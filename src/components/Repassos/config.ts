import { ISO_DAYS, IsoDay } from '~utils/dates'
import { IcsOptions, PaquetState, RepasConfig, RepassosState } from './types'

export const DEFAULT_ICS_OPTIONS: IcsOptions = {
  mode: 'allday',
  start: '18:00',
  duration_min: 60,
  alarm: 'none',
  range: 'from_today',
  include_done: false,
  include_estudis: true,
  include_tests: true,
}

export const DEFAULT_REPAS_CONFIG: RepasConfig = {
  dia_setmanal_defecte: 2, // dimarts
  dia_mensual_defecte: 4, // dijous
  setmanes_fins_setmanal: 1,
  setmanes_fins_mensual: 4,
  dies_fins_diari: 1,
  data_examen: null,
  horitzo_setmanes: 52,
  llindar_sobrecarrega: 15,
  dies_bloquejats: [],
  sync_repas_seguent: true,
  llarg_actiu: true,
  setmanes_fins_llarg: 26, // ~6 mesos
  tests_actius: true,
  dies_test: [1, 5], // dilluns i divendres
  temes_per_test_max: 6,
  temes_per_test_min: 3,
  test_interval_inicial: 1,
  test_interval_maxim: 8,
  test_llindar_alt: 85,
  test_llindar_baix: 70,
  ics: DEFAULT_ICS_OPTIONS,
}

export const defaultPaquetState = (): PaquetState => ({ resultats: {}, manuals: {}, exclosos: [], a_app: [] })

export const defaultRepassosState = (): RepassosState => ({
  estudis: {},
  config: { ...DEFAULT_REPAS_CONFIG, dies_test: [...DEFAULT_REPAS_CONFIG.dies_test], ics: { ...DEFAULT_ICS_OPTIONS } },
  setmanes: {},
  overrides: {},
  fets: {},
  fet_dates: {},
  puntuals: {},
  paquet: defaultPaquetState(),
})

const isObject = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v)

// Monthly reviews used to repeat every 4 weeks: only the first one (stored in the cells) is kept
const isOldMonthly = (id: string) => {
  const [, tipus, n] = id.split('|')
  return tipus === 'mensual' && Number(n) >= 2
}

const withoutOldMonthly = <T>(map: Record<string, T>) =>
  Object.fromEntries(Object.entries(map).filter(([id]) => !isOldMonthly(id)))

const migratePaquet = (raw: any): PaquetState => {
  const base = defaultPaquetState()
  if (!isObject(raw)) return base
  const resultats: PaquetState['resultats'] = {}
  for (const [temaId, list] of Object.entries(isObject(raw.resultats) ? raw.resultats : {})) {
    if (!Array.isArray(list)) continue
    const clean = list
      .filter((r) => isObject(r) && typeof r.data === 'string')
      .map((r) => ({ data: r.data as string, percent: typeof r.percent === 'number' ? r.percent : null }))
      .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
    if (clean.length) resultats[temaId] = clean
  }
  return {
    resultats,
    manuals: isObject(raw.manuals) ? raw.manuals : {},
    exclosos: Array.isArray(raw.exclosos) ? raw.exclosos : [],
    a_app: Array.isArray(raw.a_app) ? raw.a_app : [],
  }
}

/** Fills missing fields of a stored/imported state with defaults */
export const migrateRepassosState = (raw: any): RepassosState => {
  const base = defaultRepassosState()
  if (!raw || typeof raw !== 'object') return base
  // Accept both `{ row: "YYYY-MM-DD" }` and `{ row: { data } }`
  const estudis: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw.estudis || {})) {
    const d = typeof v === 'string' ? v : (v as any)?.data
    if (d) estudis[k] = d
  }
  const fets: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw.fets || {})) {
    const d = typeof v === 'string' ? v : (v as any)?.fet_el
    if (d) fets[k] = d
  }
  const overrides: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw.overrides || {})) {
    const d = typeof v === 'string' ? v : (v as any)?.data
    if (d) overrides[k] = d
  }
  const rawConfig: Record<string, any> = isObject(raw.config) ? { ...raw.config } : {}
  // Monthly reviews don't repeat any more
  delete rawConfig.setmanes_entre_mensuals
  const diesTest = Array.isArray(rawConfig.dies_test)
    ? (rawConfig.dies_test.map(Number).filter((d: number) => ISO_DAYS.includes(d as IsoDay)) as IsoDay[])
    : base.config.dies_test
  return {
    estudis,
    config: {
      ...base.config,
      ...rawConfig,
      ics: { ...base.config.ics, ...(rawConfig.ics || {}) },
      dies_bloquejats: Array.isArray(rawConfig.dies_bloquejats) ? rawConfig.dies_bloquejats : [],
      dies_test: diesTest,
    },
    setmanes: raw.setmanes || {},
    overrides: withoutOldMonthly(overrides),
    fets: withoutOldMonthly(fets),
    fet_dates: isObject(raw.fet_dates) ? withoutOldMonthly(raw.fet_dates) : {},
    puntuals: isObject(raw.puntuals) ? raw.puntuals : {},
    paquet: migratePaquet(raw.paquet),
  }
}
