import { COL, FET } from '~components/Planificacio/columns'
import { Cells } from '~components/Planificacio/types'
import {
  addDaysTo,
  addWeeksToId,
  dayInWeek,
  dayOfTimestamp,
  DayString,
  daysOfWeek,
  IsoDay,
  weekIdOf,
  WeekId,
} from '~utils/dates'
import { GenerateParams, Instance, RepasConfig, RepassosState, Session, TipusRepas, WeekConfig } from './types'

export const instanceId = (rowId: string, tipus: TipusRepas, n: number) => `${rowId}|${tipus}|${n}`

export const parseInstanceId = (id: string) => {
  const [rowId, tipus, n] = id.split('|')
  return { rowId, tipus: tipus as TipusRepas, n: Number(n) }
}

/** Planificació column that stores the "done" mark of an instance, if any */
export const cellColumnForInstance = (tipus: TipusRepas, n: number): string | null => {
  if (tipus === 'd1') return COL.REPAS_DIA
  if (tipus === 'setmanal') return COL.REPAS_SETMANA
  if (tipus === 'mensual' && n === 1) return COL.REPAS_MES
  return null
}

/**
 * Merges the "done" marks: the planificació cells (d1, setmanal, mensual, using the cell
 * timestamp as fet_el) and the calendar store (llarg, puntual)
 */
export const buildFets = (cells: Cells, estudis: Record<string, DayString>, fets: Record<string, string>) => {
  const merged: Record<string, string> = { ...fets }
  for (const rowId of Object.keys(estudis)) {
    const row = cells[rowId]
    if (!row) continue
    const pairs: [TipusRepas, number, string][] = [
      ['d1', 1, COL.REPAS_DIA],
      ['setmanal', 1, COL.REPAS_SETMANA],
      ['mensual', 1, COL.REPAS_MES],
    ]
    for (const [tipus, n, col] of pairs) {
      const cell = row[col]
      if (cell?.v === FET) merged[instanceId(rowId, tipus, n)] = cell.t || new Date().toISOString()
    }
  }
  return merged
}

/** Effective review day of a week for a review type */
export const weekDay = (
  w: WeekId,
  tipus: 'setmanal' | 'mensual',
  config: RepasConfig,
  setmanes: Record<WeekId, WeekConfig>
): IsoDay => {
  const override = setmanes[w]
  if (tipus === 'setmanal') return override?.dia_setmanal ?? config.dia_setmanal_defecte
  return override?.dia_mensual ?? config.dia_mensual_defecte
}

/**
 * Day of week `w` for the configured week day, skipping blocked days:
 * next free day of the same week, else the previous one, else keep it with a warning
 */
export const diaEfectiu = (w: WeekId, isoDay: IsoDay, blocked: Set<string>) => {
  const target = dayInWeek(w, isoDay)
  if (!blocked.has(target)) return { day: target, hasWarning: false }
  const days = daysOfWeek(w)
  for (let i = isoDay; i < 7; i++) if (!blocked.has(days[i])) return { day: days[i], hasWarning: false }
  for (let i = isoDay - 2; i >= 0; i--) if (!blocked.has(days[i])) return { day: days[i], hasWarning: false }
  return { day: target, hasWarning: true }
}

/** First day from `d` on that is not blocked */
export const seguentDiaLliure = (d: DayString, blocked: Set<string>) => {
  let day = d
  for (let i = 0; i < 366 && blocked.has(day); i++) day = addDaysTo(day, 1)
  return day
}

/** Last day for which monthly and long-term reviews are generated */
export const horizonOf = (config: RepasConfig, avui: DayString) =>
  config.data_examen || addDaysTo(avui, config.horitzo_setmanes * 7)

/**
 * Pure generator of every review instance (spec §3.2 + priorities of §3.3)
 */
export const generarInstancies = ({
  estudis,
  config,
  setmanes,
  overrides,
  fets,
  fetDates = {},
  puntuals = {},
  avui,
}: GenerateParams): Instance[] => {
  const blocked = new Set(config.dies_bloquejats)
  const horizon = horizonOf(config, avui)
  const instances: Instance[] = []

  const push = (
    rowId: string,
    tipus: TipusRepas,
    n: number,
    studyDate: string,
    anchor: string,
    calc: string,
    hasWarning: boolean
  ) => {
    const id = instanceId(rowId, tipus, n)
    const fetEl = fets[id]
    const override = overrides[id]
    const isDone = !!fetEl
    // A done review stays on the day it had when it was marked (not on the day it was marked)
    const date = isDone ? fetDates[id] || override || calc : override || calc
    const instance: Instance = {
      id,
      rowId,
      tipus,
      n,
      studyDate,
      anchor,
      calcDate: calc,
      date,
      isMoved: !isDone && !!override,
      isDone,
      fetEl,
      status: isDone ? 'fet' : date < avui ? 'endarrerit' : 'pendent',
      hasWarning,
    }
    instances.push(instance)
    return instance
  }

  for (const [rowId, studyDate] of Object.entries(estudis)) {
    if (!studyDate) continue
    const studyWeek = weekIdOf(studyDate)

    // Daily review: D + n, next free day
    push(
      rowId,
      'd1',
      1,
      studyDate,
      studyDate,
      seguentDiaLliure(addDaysTo(studyDate, config.dies_fins_diari), blocked),
      false
    )

    // Weekly review: configured day of week S + n
    const wSetmanal = addWeeksToId(studyWeek, config.setmanes_fins_setmanal)
    const setmanal = diaEfectiu(wSetmanal, weekDay(wSetmanal, 'setmanal', config, setmanes), blocked)
    push(rowId, 'setmanal', 1, studyDate, wSetmanal, setmanal.day, setmanal.hasWarning)

    // Monthly review: only once, at S + 4 (then the tema is parked and kept alive with tests)
    const wMensual = addWeeksToId(studyWeek, config.setmanes_fins_mensual)
    const mensual = diaEfectiu(wMensual, weekDay(wMensual, 'mensual', config, setmanes), blocked)
    if (mensual.day <= horizon) push(rowId, 'mensual', 1, studyDate, wMensual, mensual.day, mensual.hasWarning)

    // Long-term reminders: S + n weeks, then n weeks after the previous one was done
    if (config.llarg_actiu && config.setmanes_fins_llarg > 0) {
      let w = addWeeksToId(studyWeek, config.setmanes_fins_llarg)
      for (let n = 1; n < 100; n++) {
        const llarg = diaEfectiu(w, weekDay(w, 'mensual', config, setmanes), blocked)
        if (llarg.day > horizon) break
        const inst = push(rowId, 'llarg', n, studyDate, w, llarg.day, llarg.hasWarning)
        const base = inst.fetEl ? weekIdOf(dayOfTimestamp(inst.fetEl)) : w
        w = addWeeksToId(base, config.setmanes_fins_llarg)
      }
    }
  }

  // One-off reviews of the apartats that were blurry in a test
  for (const [id, date] of Object.entries(puntuals)) {
    const { rowId, n } = parseInstanceId(id)
    push(rowId, 'puntual', n, estudis[rowId] || date, date, date, false)
  }
  return instances
}

const KIND_ORDER: Record<string, number> = {
  estudi: 0,
  d1: 1,
  setmanal: 2,
  mensual: 3,
  llarg: 4,
  puntual: 5,
  test: 6,
}

/** Sessions by day, then kind */
export const sortSessions = (sessions: Session[]) =>
  [...sessions].sort((a, b) =>
    a.date === b.date ? KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.key.localeCompare(b.key) : a.date < b.date ? -1 : 1
  )

/**
 * Groups instances in sessions: same type + anchor + day. Manually moved instances (or done on
 * another day) form their own session on the destination day.
 */
export const groupSessions = (instances: Instance[], estudis: Record<string, DayString>): Session[] => {
  const map = new Map<string, Session>()
  for (const inst of instances) {
    const isManual = inst.isMoved || (inst.isDone && inst.date !== inst.calcDate)
    const key = isManual ? `${inst.tipus}|${inst.anchor}|m|${inst.date}` : `${inst.tipus}|${inst.anchor}|${inst.date}`
    let session = map.get(key)
    if (!session) {
      session = {
        key,
        uid: isManual ? `${inst.tipus}-${inst.anchor}-m-${inst.date}` : `${inst.tipus}-${inst.anchor}`,
        kind: inst.tipus,
        anchor: inst.anchor,
        date: inst.date,
        isManual,
        instances: [],
        rowIds: [],
        tests: [],
        pending: 0,
        done: 0,
        overdue: 0,
      }
      map.set(key, session)
    }
    session.instances.push(inst)
    session.rowIds.push(inst.rowId)
    if (inst.isDone) session.done++
    else session.pending++
    if (inst.status === 'endarrerit') session.overdue++
  }

  // Study sessions, one per day
  for (const [rowId, date] of Object.entries(estudis)) {
    const key = `estudi|${date}`
    let session = map.get(key)
    if (!session) {
      session = {
        key,
        uid: `estudi-${date}`,
        kind: 'estudi',
        anchor: date,
        date,
        isManual: false,
        instances: [],
        rowIds: [],
        tests: [],
        pending: 0,
        done: 0,
        overdue: 0,
      }
      map.set(key, session)
    }
    session.rowIds.push(rowId)
  }

  return sortSessions(Array.from(map.values()))
}

/** Not done instances per day */
export const loadByDay = (instances: Instance[]) => {
  const load: Record<string, number> = {}
  for (const inst of instances) if (!inst.isDone) load[inst.date] = (load[inst.date] || 0) + 1
  return load
}

/** Next not done instance day of each row */
export const nextPendingByRow = (instances: Instance[]) => {
  const next: Record<string, string> = {}
  for (const inst of instances) {
    if (inst.isDone) continue
    if (!next[inst.rowId] || inst.date < next[inst.rowId]) next[inst.rowId] = inst.date
  }
  return next
}

// The calendar reviews shown in the planificació columns of one apartat
export type RowReviews = Partial<Record<'d1' | 'setmanal' | 'mensual', Instance>>

/** Per apartat: its daily, weekly and monthly review */
export const reviewsByRow = (instances: Instance[]) => {
  const result: Record<string, RowReviews> = {}
  for (const inst of instances) {
    if (inst.tipus !== 'd1' && inst.tipus !== 'setmanal' && inst.tipus !== 'mensual') continue
    ;(result[inst.rowId] ||= {})[inst.tipus] = inst
  }
  return result
}

/** Convenience: all instances from the stored states */
export const instancesFromState = (state: RepassosState, cells: Cells, avui: DayString) =>
  generarInstancies({
    estudis: state.estudis,
    config: state.config,
    setmanes: state.setmanes,
    overrides: state.overrides,
    fets: buildFets(cells, state.estudis, state.fets),
    fetDates: state.fet_dates,
    puntuals: state.puntuals,
    avui,
  })
