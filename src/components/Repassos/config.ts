import { IcsOptions, RepasConfig, RepassosState } from './types'

export const DEFAULT_ICS_OPTIONS: IcsOptions = {
  mode: 'allday',
  start: '18:00',
  duration_min: 60,
  alarm: 'none',
  range: 'from_today',
  include_done: false,
  include_estudis: true,
}

export const DEFAULT_REPAS_CONFIG: RepasConfig = {
  dia_setmanal_defecte: 2, // dimarts
  dia_mensual_defecte: 4, // dijous
  setmanes_fins_setmanal: 1,
  setmanes_fins_mensual: 4,
  setmanes_entre_mensuals: 4,
  dies_fins_diari: 1,
  data_examen: null,
  horitzo_setmanes: 52,
  llindar_sobrecarrega: 15,
  dies_bloquejats: [],
  sync_repas_seguent: true,
  ics: DEFAULT_ICS_OPTIONS,
}

export const defaultRepassosState = (): RepassosState => ({
  estudis: {},
  config: { ...DEFAULT_REPAS_CONFIG, ics: { ...DEFAULT_ICS_OPTIONS } },
  setmanes: {},
  overrides: {},
  fets: {},
  fet_dates: {},
})

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
  return {
    estudis,
    config: {
      ...base.config,
      ...(raw.config || {}),
      ics: { ...base.config.ics, ...(raw.config?.ics || {}) },
      dies_bloquejats: Array.isArray(raw.config?.dies_bloquejats) ? raw.config.dies_bloquejats : [],
    },
    setmanes: raw.setmanes || {},
    overrides,
    fets,
    fet_dates: raw.fet_dates && typeof raw.fet_dates === 'object' ? raw.fet_dates : {},
  }
}
