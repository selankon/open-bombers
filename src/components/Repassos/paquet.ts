import { Tema } from '~components/Planificacio/types'
import { TEST_MIN_EARLY_DAYS as MIN_EARLY_DAYS, TEST_PROJECCIO_SETMANES } from '~utils/constants'
import { addDaysTo, dayOfTimestamp, DayString, daysBetween, isoDayOf } from '~utils/dates'
import { horizonOf } from './logic'
import { Instance, PaquetState, PaquetTema, RepasConfig, Session, TestItem } from './types'

/**
 * Study package (spec §3.7): temes that finished their monthly review are kept alive with tests
 * in the App. Each tema is in a Leitner box: good results make it wait longer, bad ones bring it back.
 */

/** Interval (weeks) of a box: initial · 2^box, up to the maximum */
export const intervalOf = (caixa: number, config: RepasConfig) =>
  Math.max(1, Math.min(config.test_interval_inicial * 2 ** caixa, config.test_interval_maxim))

/** Highest box: the first one that reaches the maximum interval */
export const maxCaixa = (config: RepasConfig) => {
  let k = 0
  while (k < 20 && intervalOf(k, config) < config.test_interval_maxim) k++
  return k
}

/** Box after a test result (null = no percentage given: it stays) */
export const nextCaixa = (caixa: number, percent: number | null, config: RepasConfig) => {
  if (percent === null) return caixa
  if (percent >= config.test_llindar_alt) return Math.min(caixa + 1, maxCaixa(config))
  if (percent < config.test_llindar_baix) return 0
  return caixa
}

/** A result low enough to review the blurry apartats */
export const isFluix = (percent: number | null, config: RepasConfig) =>
  percent !== null && percent < config.test_llindar_baix

/** Day each tema entered automatically: when every studied apartat has done its monthly review */
const autoEntrades = (temes: Tema[], estudis: Record<string, DayString>, instances: Instance[]) => {
  const mensualByRow = new Map<string, Instance>()
  for (const inst of instances) if (inst.tipus === 'mensual') mensualByRow.set(inst.rowId, inst)
  const result: Record<string, DayString> = {}
  for (const tema of temes) {
    const studied = tema.apartats.filter((a) => estudis[a.row_id])
    if (!studied.length) continue
    let entrada = ''
    let complete = true
    for (const a of studied) {
      const fetEl = mensualByRow.get(a.row_id)?.fetEl
      if (!fetEl) {
        complete = false
        break
      }
      const day = dayOfTimestamp(fetEl)
      if (day > entrada) entrada = day
    }
    if (complete) result[tema.id] = entrada
  }
  return result
}

interface DerivePaquetParams {
  temes: Tema[]
  estudis: Record<string, DayString>
  instances: Instance[]
  paquet: PaquetState
  config: RepasConfig
}

/** Temes of the package with their box and next test day, in syllabus order */
export const derivePaquet = ({ temes, estudis, instances, paquet, config }: DerivePaquetParams): PaquetTema[] => {
  const auto = autoEntrades(temes, estudis, instances)
  const exclosos = new Set(paquet.exclosos)
  const aApp = new Set(paquet.a_app)
  const result: PaquetTema[] = []
  for (const tema of temes) {
    if (exclosos.has(tema.id)) continue
    const resultats = paquet.resultats[tema.id] || []
    const manual = paquet.manuals[tema.id]
    const entradaAuto = auto[tema.id]
    if (!manual && !entradaAuto && !resultats.length) continue
    const entrada = [manual, entradaAuto, resultats[0]?.data].filter((d): d is string => !!d).sort()[0]
    const caixa = resultats.reduce((k, r) => nextCaixa(k, r.percent, config), 0)
    const darrer = resultats[resultats.length - 1] || null
    const interval = intervalOf(caixa, config)
    result.push({
      temaId: tema.id,
      entrada,
      isManual: !!manual && !entradaAuto,
      caixa,
      interval,
      resultats,
      darrer,
      proper: darrer ? addDaysTo(darrer.data, interval * 7) : addDaysTo(entrada, intervalOf(0, config) * 7),
      aApp: aApp.has(tema.id),
    })
  }
  return result
}

interface TestSessionsParams {
  paquet: PaquetTema[]
  config: RepasConfig
  avui: DayString
  // tema id → position in the syllabus
  temaOrder: Record<string, number>
}

/**
 * Test sessions: the days with results (done) plus a projection of the next test days. A test not
 * done is never overdue: its temes are still due and go to the next test day.
 */
export const testSessions = ({ paquet, config, avui, temaOrder }: TestSessionsParams): Session[] => {
  if (!config.tests_actius) return []
  const byDay = new Map<DayString, TestItem[]>()
  const add = (day: DayString, item: TestItem) => {
    const list = byDay.get(day)
    if (list) list.push(item)
    else byDay.set(day, [item])
  }

  // Done tests, with the interval each tema had at that moment
  for (const tema of paquet) {
    let caixa = 0
    for (const r of tema.resultats) {
      add(r.data, { temaId: tema.temaId, isDone: true, percent: r.percent, interval: intervalOf(caixa, config) })
      caixa = nextCaixa(caixa, r.percent, config)
    }
  }

  // Projection: every tema is assumed to keep its box
  const testDays = new Set<number>(config.dies_test)
  const blocked = new Set(config.dies_bloquejats)
  const horizon = horizonOf(config, avui)
  const projectionEnd = addDaysTo(avui, TEST_PROJECCIO_SETMANES * 7)
  const until = horizon < projectionEnd ? horizon : projectionEnd
  const minGap = intervalOf(0, config) * 7
  const sim = paquet.map((p) => ({ temaId: p.temaId, caixa: p.caixa, proper: p.proper, darrer: p.darrer?.data }))
  const byDue = (a: (typeof sim)[number], b: (typeof sim)[number]) =>
    a.proper < b.proper ? -1 : a.proper > b.proper ? 1 : (temaOrder[a.temaId] ?? 0) - (temaOrder[b.temaId] ?? 0)

  for (let d = avui; testDays.size && d <= until; d = addDaysTo(d, 1)) {
    if (!testDays.has(isoDayOf(d)) || blocked.has(d)) continue
    // Temes already tested that day (only possible today) don't count twice
    const doneThatDay = new Set((byDay.get(d) || []).map((i) => i.temaId))
    const candidates = sim.filter((t) => !doneThatDay.has(t.temaId)).sort(byDue)
    const chosen = candidates.filter((t) => t.proper <= d).slice(0, config.temes_per_test_max)
    // Too few: bring forward the next ones so the test mixes temes (interleaving)
    for (const t of candidates) {
      if (doneThatDay.size + chosen.length >= Math.min(config.temes_per_test_min, config.temes_per_test_max)) break
      if (chosen.includes(t) || (t.darrer && daysBetween(t.darrer, d) < minGap)) continue
      // Only a little early (a quarter of its interval), so good results still space it out
      const maxEarly = Math.max(MIN_EARLY_DAYS, Math.floor((intervalOf(t.caixa, config) * 7) / 4))
      if (daysBetween(d, t.proper) > maxEarly) continue
      chosen.push(t)
    }
    for (const t of chosen) {
      const interval = intervalOf(t.caixa, config)
      add(d, { temaId: t.temaId, isDone: false, percent: null, interval })
      t.darrer = d
      t.proper = addDaysTo(d, interval * 7)
    }
  }

  return Array.from(byDay.entries()).map(([date, items]) => {
    const tests = items.sort((a, b) => (temaOrder[a.temaId] ?? 0) - (temaOrder[b.temaId] ?? 0))
    const done = tests.filter((i) => i.isDone).length
    return {
      key: `test|${date}`,
      uid: `test-${date}`,
      kind: 'test',
      anchor: date,
      date,
      isManual: false,
      instances: [],
      rowIds: [],
      tests,
      pending: tests.length - done,
      done,
      overdue: 0,
    }
  })
}
