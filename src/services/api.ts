import { COL } from '~components/Planificacio/columns'
import { defaultStructure, temaRowId } from '~components/Planificacio/structure'
import { Cells, SaveCellParams, Structure } from '~components/Planificacio/types'
import { defaultRepassosState, migrateRepassosState } from '~components/Repassos/config'
import {
  cellColumnForInstance,
  instanceId,
  instancesFromState,
  nextPendingByRow,
  parseInstanceId,
} from '~components/Repassos/logic'
import {
  IcsState,
  Instance,
  MoveSessionParams,
  RegisterStudyParams,
  RepasConfig,
  RepassosState,
  WeekConfig,
} from '~components/Repassos/types'
import { BackupFile } from '~components/Backup/types'
import { BACKUP_VERSION, STORAGE_KEYS } from '~utils/constants'
import { DayString, IsoDay, isoDayOf, today, weekIdOf, WeekId } from '~utils/dates'
import { getSlices, readSlice, registerSlice, removeSlice, writeSlice } from './storage'

/**
 * Local "API". There is no backend: every method reads and writes localStorage through the
 * registered storage slices. Methods are async and keep the shape of a remote API so a real
 * backend can replace this file later without touching the query hooks.
 */

export class ApiError extends Error {
  constructor(message?: string) {
    super(message ? message : 'api error')
    this.name = 'ApiError'
  }
}

// Persisted slices. The `name` is the property used in the backup file.
export const structureSlice = registerSlice<Structure>({
  name: 'structure',
  key: STORAGE_KEYS.STRUCTURE,
  defaults: defaultStructure,
})

export const cellsSlice = registerSlice<Cells>({
  name: 'cells',
  key: STORAGE_KEYS.CELLS,
  defaults: () => ({}),
})

export const repassosSlice = registerSlice<RepassosState>({
  name: 'repassos',
  key: STORAGE_KEYS.REPASSOS,
  defaults: defaultRepassosState,
  migrate: migrateRepassosState,
})

export const defaultIcsState = (): IcsState => ({
  entries: {},
  exported: {},
  darrera_exportacio: null,
  ajuda_vista: false,
})

export const icsSlice = registerSlice<IcsState>({
  name: 'ics',
  key: STORAGE_KEYS.ICS,
  defaults: defaultIcsState,
  migrate: (raw) => ({ ...defaultIcsState(), ...(raw || {}) }),
})

const now = () => new Date().toISOString()

/** Returns a copy of `cells` with one cell changed (only the touched row gets a new object) */
const withCell = (cells: Cells, rowId: string, colId: string, value: string, manual?: boolean): Cells => {
  const row = { ...(cells[rowId] || {}) }
  if (value === '' && !manual) delete row[colId]
  else row[colId] = manual ? { v: value, t: now(), m: true } : { v: value, t: now() }
  return { ...cells, [rowId]: row }
}

/**
 * Keeps `repas_seguent` in sync with the next pending review of every studied apartat
 */
const syncRepasSeguent = (cells: Cells, repassos: RepassosState): Cells => {
  if (!repassos.config.sync_repas_seguent) return cells
  const next = nextPendingByRow(instancesFromState(repassos, cells, today()))
  let result = cells
  for (const rowId of Object.keys(repassos.estudis)) {
    const value = next[rowId] || ''
    if ((result[rowId]?.[COL.REPAS_SEGUENT]?.v || '') !== value) {
      result = withCell(result, rowId, COL.REPAS_SEGUENT, value)
    }
  }
  return result
}

/** Writes both slices after a change that may affect reviews */
const commit = (cells: Cells, repassos: RepassosState) => {
  const synced = syncRepasSeguent(cells, repassos)
  writeSlice(repassosSlice, repassos)
  writeSlice(cellsSlice, synced)
  return { cells: synced, repassos }
}

// Planificació endpoints
export const plan = {
  getStructure: async () => readSlice(structureSlice),
  getCells: async () => readSlice(cellsSlice),
  saveCell: async ({ rowId, colId, value, manual }: SaveCellParams) => {
    const previous = readSlice(cellsSlice)
    const cells = withCell(previous, rowId, colId, value, manual)
    if (colId === COL.REPAS_DIA || colId === COL.REPAS_SETMANA || colId === COL.REPAS_MES) {
      // Ticked from the table: remember the day the review had, so it stays there in the calendar
      const state = readSlice(repassosSlice)
      const tipus = colId === COL.REPAS_DIA ? 'd1' : colId === COL.REPAS_SETMANA ? 'setmanal' : 'mensual'
      const id = instanceId(rowId, tipus, 1)
      const fet_dates = { ...state.fet_dates }
      const current = instancesFromState(state, previous, today()).find((i) => i.id === id)
      if (value && current) fet_dates[id] = current.date
      else delete fet_dates[id]
      return commit(cells, { ...state, fet_dates }).cells
    }
    writeSlice(cellsSlice, cells)
    return cells
  },
}

// Calendari de repassos endpoints
export const repassos = {
  getState: async () => readSlice(repassosSlice),

  // Sets the study day of some apartats (restarts their cycle) and fills data_classe if empty
  registerStudy: async ({ rowIds, date }: RegisterStudyParams) => {
    const state = readSlice(repassosSlice)
    const rows = new Set(rowIds)
    const estudis = { ...state.estudis }
    rowIds.forEach((r) => (estudis[r] = date))
    const overrides = Object.fromEntries(
      Object.entries(state.overrides).filter(([id]) => !rows.has(parseInstanceId(id).rowId))
    )

    let cells = readSlice(cellsSlice)
    const structure = readSlice(structureSlice)
    for (const tema of structure.temes) {
      if (!tema.apartats.some((a) => rows.has(a.row_id))) continue
      const temaRow = temaRowId(tema)
      if (cells[temaRow]?.[COL.DATA_CLASSE]?.v) continue
      const dates = tema.apartats
        .map((a) => estudis[a.row_id])
        .filter(Boolean)
        .sort()
      if (dates.length) cells = withCell(cells, temaRow, COL.DATA_CLASSE, dates[0])
    }
    return commit(cells, { ...state, estudis, overrides })
  },

  // Forgets the study day of some apartats (their reviews disappear)
  removeStudy: async (rowIds: string[]) => {
    const state = readSlice(repassosSlice)
    const rows = new Set(rowIds)
    const estudis = Object.fromEntries(Object.entries(state.estudis).filter(([r]) => !rows.has(r)))
    const overrides = Object.fromEntries(
      Object.entries(state.overrides).filter(([id]) => !rows.has(parseInstanceId(id).rowId))
    )
    const fet_dates = Object.fromEntries(
      Object.entries(state.fet_dates).filter(([id]) => !rows.has(parseInstanceId(id).rowId))
    )
    let cells = readSlice(cellsSlice)
    if (state.config.sync_repas_seguent) rowIds.forEach((r) => (cells = withCell(cells, r, COL.REPAS_SEGUENT, '')))
    return commit(cells, { ...state, estudis, overrides, fet_dates })
  },

  updateConfig: async (config: Partial<RepasConfig>) => {
    const state = readSlice(repassosSlice)
    return commit(readSlice(cellsSlice), { ...state, config: { ...state.config, ...config } })
  },

  // Sets (or clears with null) the review days of one week
  setWeekConfig: async ({ week, config }: { week: WeekId; config: WeekConfig | null }) => {
    const state = readSlice(repassosSlice)
    const setmanes = { ...state.setmanes }
    const clean = config ? Object.fromEntries(Object.entries(config).filter(([, v]) => !!v)) : {}
    if (!Object.keys(clean).length) delete setmanes[week]
    else setmanes[week] = clean
    return commit(readSlice(cellsSlice), { ...state, setmanes })
  },

  // Moves a whole session: inside its own week it becomes a week override, otherwise manual moves
  moveSession: async ({ session, date }: MoveSessionParams) => {
    const state = readSlice(repassosSlice)
    const isWeekly = session.kind === 'setmanal' || session.kind === 'mensual'
    if (isWeekly && !session.isManual && weekIdOf(date) === session.anchor) {
      const key = session.kind === 'setmanal' ? 'dia_setmanal' : 'dia_mensual'
      const setmanes = {
        ...state.setmanes,
        [session.anchor]: { ...state.setmanes[session.anchor], [key]: isoDayOf(date) as IsoDay },
      }
      return commit(readSlice(cellsSlice), { ...state, setmanes })
    }
    if (session.kind === 'estudi') {
      return repassos.registerStudy({ rowIds: session.rowIds, date })
    }
    const overrides = { ...state.overrides }
    session.instances.filter((i) => !i.isDone).forEach((i) => (overrides[i.id] = date))
    return commit(readSlice(cellsSlice), { ...state, overrides })
  },

  // Moves one instance (null restores the calculated day)
  moveInstance: async ({ id, date }: { id: string; date: DayString | null }) => {
    const state = readSlice(repassosSlice)
    const overrides = { ...state.overrides }
    if (date) overrides[id] = date
    else delete overrides[id]
    return commit(readSlice(cellsSlice), { ...state, overrides })
  },

  // Marks instances as done / not done (d1, setmanal and mensual#1 live in the planificació cells)
  setDone: async ({ instances, done }: { instances: Instance[]; done: boolean }) => {
    const state = readSlice(repassosSlice)
    let cells = readSlice(cellsSlice)
    const fets = { ...state.fets }
    const fet_dates = { ...state.fet_dates }
    for (const inst of instances) {
      const col = cellColumnForInstance(inst.tipus, inst.n)
      if (col) cells = withCell(cells, inst.rowId, col, done ? 'FET' : '')
      else if (done) fets[inst.id] = now()
      else delete fets[inst.id]
      if (done) fet_dates[inst.id] = inst.date
      else delete fet_dates[inst.id]
    }
    return commit(cells, { ...state, fets, fet_dates })
  },

  // Creates manual moves of every overdue instance to today
  moveOverdueToToday: async (instances: Instance[]) => {
    const state = readSlice(repassosSlice)
    const overrides = { ...state.overrides }
    const avui = today()
    instances.filter((i) => i.status === 'endarrerit').forEach((i) => (overrides[i.id] = avui))
    return commit(readSlice(cellsSlice), { ...state, overrides })
  },
}

// Calendar export state endpoints
export const ics = {
  getState: async () => readSlice(icsSlice),
  saveState: async (state: Partial<IcsState>) => {
    const next = { ...readSlice(icsSlice), ...state }
    writeSlice(icsSlice, next)
    return next
  },
}

// Backup endpoints: every registered slice goes into the file
export const backup = {
  export: async (): Promise<BackupFile> => {
    const file: BackupFile = { version: BACKUP_VERSION, app: 'bombers', exported_at: now() }
    for (const slice of getSlices()) file[slice.name] = readSlice(slice)
    return file
  },
  import: async (file: BackupFile) => {
    if (!file || typeof file !== 'object' || typeof file.version !== 'number') {
      throw new ApiError('invalid backup')
    }
    if (file.version > BACKUP_VERSION) throw new ApiError('backup from a newer version')
    for (const slice of getSlices()) {
      const raw = file[slice.name]
      // v1 backups have no repassos: start them empty
      const value = raw === undefined ? slice.defaults() : slice.migrate ? slice.migrate(raw) : raw
      writeSlice(slice, value)
    }
  },
  reset: async () => {
    for (const slice of getSlices()) removeSlice(slice)
  },
}

export default {
  plan,
  repassos,
  ics,
  backup,
}
