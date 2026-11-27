import { COL, DEFAULT_COLUMNS, FET } from '~components/Planificacio/columns'
import { defaultStructure } from '~components/Planificacio/structure'
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
  AddPuntualsParams,
  IcsState,
  Instance,
  MoveSessionParams,
  RegisterStudyParams,
  RepasConfig,
  RepassosState,
  SaveTestParams,
  WeekConfig,
} from '~components/Repassos/types'
import { BackupFile } from '~components/Backup/types'
import { pdfById, pdfUrl } from '~components/Temari/logic'
import { ALL_TEMARI_PDFS } from '~src/data/temari-pdfs'
import { TemariBatchResult, TemariPdf, TemariProgress } from '~components/Temari/types'
import { BACKUP_VERSION, IDB_STORES, STORAGE_KEYS, TEMARI_CACHE_NAME } from '~utils/constants'
import { DayString, IsoDay, isoDayOf, today, weekIdOf, WeekId } from '~utils/dates'
import { getSlices, readSlice, registerSlice, removeSlice, writeSlice } from './storage'
import { db } from './db'
import { migrateMapa, newId, resumOf } from '~components/Mapes/logic'
import { MapaInfoParams, MapaMental, NouMapaParams, SaveContentParams } from '~components/Mapes/types'
import { countPagines, migrateAnotacions } from '~components/Anotacions/logic'
import { AnotacionsResum, PdfAnotacions, SaveAnotacionsParams } from '~components/Anotacions/types'

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
  // Columns are not editable: always use the current definitions (e.g. data_classe is per apartat now)
  migrate: (raw) => ({ ...defaultStructure(), ...(raw || {}), columns: DEFAULT_COLUMNS.map((c) => ({ ...c })) }),
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

/** Copy of `map` without the instance ids that match */
const withoutIds = <T>(map: Record<string, T>, drop: (id: string) => boolean) =>
  Object.fromEntries(Object.entries(map).filter(([id]) => !drop(id)))

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

  // Sets the class (study) day of some apartats, restarts their cycle and ticks "Veure la classe"
  registerStudy: async ({ rowIds, date }: RegisterStudyParams) => {
    const state = readSlice(repassosSlice)
    const rows = new Set(rowIds)
    const estudis = { ...state.estudis }
    rowIds.forEach((r) => (estudis[r] = date))
    const overrides = withoutIds(state.overrides, (id) => rows.has(parseInstanceId(id).rowId))
    // Long-term reminders done belong to the previous cycle
    const isOldLlarg = (id: string) => {
      const { rowId, tipus } = parseInstanceId(id)
      return tipus === 'llarg' && rows.has(rowId) && state.estudis[rowId] !== date
    }
    let cells = readSlice(cellsSlice)
    for (const r of rowIds) {
      if (cells[r]?.[COL.VEURE_CLASSE]?.v !== FET) cells = withCell(cells, r, COL.VEURE_CLASSE, FET)
    }
    return commit(cells, {
      ...state,
      estudis,
      overrides,
      fets: withoutIds(state.fets, isOldLlarg),
      fet_dates: withoutIds(state.fet_dates, isOldLlarg),
    })
  },

  // Forgets the study day of some apartats (their reviews disappear)
  removeStudy: async (rowIds: string[]) => {
    const state = readSlice(repassosSlice)
    const rows = new Set(rowIds)
    const estudis = Object.fromEntries(Object.entries(state.estudis).filter(([r]) => !rows.has(r)))
    // Puntual reviews don't depend on the study day: they stay
    const ofRows = (id: string) => {
      const { rowId, tipus } = parseInstanceId(id)
      return rows.has(rowId) && tipus !== 'puntual'
    }
    let cells = readSlice(cellsSlice)
    if (state.config.sync_repas_seguent) rowIds.forEach((r) => (cells = withCell(cells, r, COL.REPAS_SEGUENT, '')))
    return commit(cells, {
      ...state,
      estudis,
      overrides: withoutIds(state.overrides, ofRows),
      fets: withoutIds(state.fets, ofRows),
      fet_dates: withoutIds(state.fet_dates, ofRows),
    })
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

  // Marks instances as done / not done (d1, setmanal and mensual live in the planificació cells)
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

  // Creates one-off reviews of the blurry apartats of a test (one pending per apartat and day)
  addPuntuals: async ({ rowIds, date }: AddPuntualsParams) => {
    const state = readSlice(repassosSlice)
    const puntuals = { ...state.puntuals }
    for (const rowId of rowIds) {
      const ids = Object.keys(puntuals).filter((id) => parseInstanceId(id).rowId === rowId)
      if (ids.some((id) => puntuals[id] === date && !state.fets[id])) continue
      const n = ids.reduce((max, id) => Math.max(max, parseInstanceId(id).n), 0) + 1
      puntuals[instanceId(rowId, 'puntual', n)] = date
    }
    return commit(readSlice(cellsSlice), { ...state, puntuals })
  },

  removePuntual: async (id: string) => {
    const state = readSlice(repassosSlice)
    const drop = (key: string) => key === id
    return commit(readSlice(cellsSlice), {
      ...state,
      puntuals: withoutIds(state.puntuals, drop),
      fets: withoutIds(state.fets, drop),
      fet_dates: withoutIds(state.fet_dates, drop),
      overrides: withoutIds(state.overrides, drop),
    })
  },

  // Saves (or removes) the test result of a tema on a day
  saveTestResult: async ({ temaId, data, resultat }: SaveTestParams) => {
    const state = readSlice(repassosSlice)
    const list = (state.paquet.resultats[temaId] || []).filter((r) => r.data !== data)
    if (resultat) list.push({ data, percent: resultat.percent })
    list.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
    const resultats = { ...state.paquet.resultats }
    if (list.length) resultats[temaId] = list
    else delete resultats[temaId]
    return commit(readSlice(cellsSlice), { ...state, paquet: { ...state.paquet, resultats } })
  },

  // Adds a tema to the package by hand, or removes it
  setInPaquet: async ({ temaId, inPaquet }: { temaId: string; inPaquet: boolean }) => {
    const state = readSlice(repassosSlice)
    const exclosos = state.paquet.exclosos.filter((id) => id !== temaId)
    const manuals = { ...state.paquet.manuals }
    if (inPaquet) manuals[temaId] ||= today()
    else {
      delete manuals[temaId]
      exclosos.push(temaId)
    }
    return commit(readSlice(cellsSlice), { ...state, paquet: { ...state.paquet, exclosos, manuals } })
  },

  // Remembers which temes are already in the package of the tests App
  setAApp: async ({ temaIds, value }: { temaIds: string[]; value: boolean }) => {
    const state = readSlice(repassosSlice)
    const set = new Set(state.paquet.a_app)
    temaIds.forEach((id) => (value ? set.add(id) : set.delete(id)))
    return commit(readSlice(cellsSlice), { ...state, paquet: { ...state.paquet, a_app: Array.from(set) } })
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

// Mind maps endpoints. They live in IndexedDB (ink strokes don't fit in localStorage).
const readMapa = async (id: string) => {
  const raw = await db.get<MapaMental>(IDB_STORES.MAPES, id)
  return raw ? migrateMapa(raw) : null
}

const getMapa = async (id: string) => {
  const mapa = await readMapa(id)
  if (!mapa) throw new ApiError(`mapa ${id} not found`)
  return mapa
}

const allMapes = async () => (await db.getAll<MapaMental>(IDB_STORES.MAPES)).map(migrateMapa)

export const mapes = {
  // Summaries of every map, the most recently edited first
  list: async () => (await allMapes()).map(resumOf).sort((a, b) => (a.modificat < b.modificat ? 1 : -1)),
  get: getMapa,
  create: async ({ titol, tema_id, row_id, nodes }: NouMapaParams) => {
    const t = now()
    const mapa: MapaMental = {
      id: newId(),
      titol,
      tema_id,
      row_id,
      creat: t,
      modificat: t,
      nodes: nodes?.length ? nodes : [{ id: newId(), pare: null, text: titol, x: 0, y: 0 }],
      traces: [],
      formes: [],
      imatges: [],
    }
    return db.put(IDB_STORES.MAPES, mapa)
  },
  // Saves the content edited in the editor (ideas, ink, shapes and pictures)
  saveContent: async ({ id, nodes, traces, formes, imatges }: SaveContentParams) => {
    const mapa = await getMapa(id)
    return db.put(IDB_STORES.MAPES, { ...mapa, nodes, traces, formes, imatges, modificat: now() })
  },
  // Title and link to the temari
  saveInfo: async ({ id, titol, tema_id, row_id }: MapaInfoParams) => {
    const mapa = await getMapa(id)
    return db.put(IDB_STORES.MAPES, { ...mapa, titol, tema_id, row_id, modificat: now() })
  },
  duplicate: async ({ id, titol }: { id: string; titol: string }) => {
    const mapa = await getMapa(id)
    const t = now()
    return db.put(IDB_STORES.MAPES, { ...mapa, id: newId(), titol, creat: t, modificat: t })
  },
  remove: async (id: string) => {
    await db.delete(IDB_STORES.MAPES, id)
    return id
  },
}

const allAnotacions = async () =>
  (await db.getAll<PdfAnotacions>(IDB_STORES.ANOTACIONS))
    .map(migrateAnotacions)
    .filter((a): a is PdfAnotacions => a !== null)

/**
 * Annotations drawn over the syllabus PDFs (one record per PDF, in IndexedDB).
 * A PDF without annotations has no record, so `list` tells which PDFs are annotated.
 */
export const anotacions = {
  list: async (): Promise<AnotacionsResum[]> =>
    (await allAnotacions()).map((a) => ({ id: a.id, modificat: a.modificat, total: countPagines(a.pagines) })),
  // Annotations of one PDF (empty when it has none)
  get: async (id: string): Promise<PdfAnotacions> => {
    const raw = await db.get<PdfAnotacions>(IDB_STORES.ANOTACIONS, id)
    return migrateAnotacions(raw) ?? { id, modificat: now(), pagines: {} }
  },
  save: async ({ id, pagines }: SaveAnotacionsParams): Promise<PdfAnotacions> => {
    const record: PdfAnotacions = { id, modificat: now(), pagines }
    if (countPagines(pagines)) await db.put(IDB_STORES.ANOTACIONS, record)
    else await db.delete(IDB_STORES.ANOTACIONS, id)
    return record
  },
  remove: async (id: string) => {
    await db.delete(IDB_STORES.ANOTACIONS, id)
    return id
  },
}

// Backup endpoints: every registered slice goes into the file, plus the mind maps and the PDF annotations
export const backup = {
  export: async (): Promise<BackupFile> => {
    const file: BackupFile = { version: BACKUP_VERSION, app: 'bombers', exported_at: now() }
    for (const slice of getSlices()) file[slice.name] = readSlice(slice)
    file.mapes = await allMapes()
    file.anotacions = await allAnotacions()
    return file
  },
  import: async (file: BackupFile) => {
    if (!file || typeof file !== 'object' || typeof file.version !== 'number') {
      throw new ApiError('invalid backup')
    }
    if (file.version > BACKUP_VERSION) throw new ApiError('backup from a newer version')
    // Validate the maps and the annotations before writing anything, so a broken file changes nothing
    const importedMapes = Array.isArray(file.mapes) ? file.mapes.map(migrateMapa) : null
    const importedAnotacions = Array.isArray(file.anotacions) ? file.anotacions.map(migrateAnotacions) : null
    if (importedAnotacions?.some((a) => a === null)) throw new ApiError('invalid annotations in backup')
    for (const slice of getSlices()) {
      const raw = file[slice.name]
      // v1 backups have no repassos: start them empty
      const value = raw === undefined ? slice.defaults() : slice.migrate ? slice.migrate(raw) : raw
      writeSlice(slice, value)
    }
    // Backups older than v3 have no maps: keep the ones on this device
    if (importedMapes) await db.replaceAll(IDB_STORES.MAPES, importedMapes)
    // Backups older than v4 (and transfer codes) have no annotations: keep the ones on this device
    if (importedAnotacions) {
      // A PDF without annotations has no record
      const records = (importedAnotacions as PdfAnotacions[]).filter((a) => countPagines(a.pagines) > 0)
      await db.replaceAll(IDB_STORES.ANOTACIONS, records)
    }
  },
  reset: async () => {
    for (const slice of getSlices()) removeSlice(slice)
    await db.clear(IDB_STORES.MAPES)
    await db.clear(IDB_STORES.ANOTACIONS)
  },
}

const hasCacheStorage = () => typeof caches !== 'undefined'

const openTemariCache = () => {
  if (!hasCacheStorage()) throw new ApiError('cache storage not supported')
  return caches.open(TEMARI_CACHE_NAME)
}

const fetchPdf = async (pdf: TemariPdf) => {
  const res = await fetch(pdfUrl(pdf))
  if (!res.ok) throw new ApiError(`pdf ${pdf.id}: ${res.status}`)
  return res
}

/**
 * Syllabus PDFs. They are not a storage slice (too big for localStorage, and not part of backups):
 * offline copies live in Cache Storage, keyed by their official URL.
 */
export const temari = {
  // Ids of the PDFs saved on this device
  getSaved: async (): Promise<string[]> => {
    if (!hasCacheStorage()) return []
    const cache = await openTemariCache()
    const urls = new Set((await cache.keys()).map((r) => r.url))
    return ALL_TEMARI_PDFS.filter((pdf) => urls.has(pdfUrl(pdf))).map((pdf) => pdf.id)
  },
  // Download PDFs into the offline cache, one by one. Failures don't stop the batch.
  save: async (ids: string[], onProgress?: TemariProgress): Promise<TemariBatchResult> => {
    const cache = await openTemariCache()
    // Ask the browser not to evict the files under storage pressure (best effort)
    navigator.storage?.persist?.().catch(() => undefined)
    const result: TemariBatchResult = { ok: [], failed: [] }
    for (const [i, id] of ids.entries()) {
      const pdf = pdfById(id)
      try {
        if (!pdf) throw new ApiError(`unknown pdf ${id}`)
        await cache.put(pdfUrl(pdf), await fetchPdf(pdf))
        result.ok.push(id)
      } catch {
        result.failed.push(id)
      }
      onProgress?.(i + 1, ids.length)
    }
    return result
  },
  remove: async (ids: string[]) => {
    if (!hasCacheStorage()) return
    const cache = await openTemariCache()
    for (const id of ids) {
      const pdf = pdfById(id)
      if (pdf) await cache.delete(pdfUrl(pdf))
    }
  },
  // The PDF contents: the offline copy when there is one, otherwise from the official server
  getBlob: async (id: string): Promise<Blob> => {
    const pdf = pdfById(id)
    if (!pdf) throw new ApiError(`unknown pdf ${id}`)
    const cached = hasCacheStorage() ? await (await openTemariCache()).match(pdfUrl(pdf)) : undefined
    const res = cached ?? (await fetchPdf(pdf))
    // Force the type so the browser opens it with its PDF viewer
    return new Blob([await res.arrayBuffer()], { type: 'application/pdf' })
  },
}

export default {
  plan,
  repassos,
  ics,
  backup,
  temari,
  mapes,
  anotacions,
}
