import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  format,
  getISODay,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  setISOWeek,
  setISOWeekYear,
  startOfISOWeek,
} from 'date-fns'
import { ca } from 'date-fns/locale/ca'

/** A calendar day as `YYYY-MM-DD` (local time) */
export type DayString = string

/** ISO week identifier, e.g. `2026-W46` */
export type WeekId = string

/** ISO day of week: 1 = Monday … 7 = Sunday */
export type IsoDay = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const ISO_DAYS: IsoDay[] = [1, 2, 3, 4, 5, 6, 7]

/** Parses a `YYYY-MM-DD` string as a local date (midnight) */
export const parseDay = (d: DayString): Date => parseISO(d)

/** Formats a date as `YYYY-MM-DD` */
export const toDay = (d: Date): DayString => format(d, 'yyyy-MM-dd')

/** Today as `YYYY-MM-DD` */
export const today = (): DayString => toDay(new Date())

/** Local day of an ISO timestamp */
export const dayOfTimestamp = (iso: string): DayString => toDay(new Date(iso))

export const addDaysTo = (d: DayString, n: number): DayString => toDay(addDays(parseDay(d), n))

export const daysBetween = (from: DayString, to: DayString) => differenceInCalendarDays(parseDay(to), parseDay(from))

export const isoDayOf = (d: DayString): IsoDay => getISODay(parseDay(d)) as IsoDay

/** ISO week identifier of a day */
export const weekIdOf = (d: DayString | Date): WeekId => {
  const date = typeof d === 'string' ? parseDay(d) : d
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`
}

/** Monday of an ISO week */
export const weekStart = (w: WeekId): DayString => {
  const [y, wk] = w.split('-W').map(Number)
  const date = startOfISOWeek(setISOWeek(setISOWeekYear(new Date(y, 0, 4), y), wk))
  return toDay(date)
}

/** Monday of the week of a day */
export const mondayOf = (d: DayString): DayString => toDay(startOfISOWeek(parseDay(d)))

/** Adds n weeks to a week identifier */
export const addWeeksToId = (w: WeekId, n: number): WeekId => weekIdOf(addWeeks(parseDay(weekStart(w)), n))

/** Day of a week for an ISO day of week */
export const dayInWeek = (w: WeekId, isoDay: IsoDay): DayString => addDaysTo(weekStart(w), isoDay - 1)

/** The 7 days of a week, Monday first */
export const daysOfWeek = (w: WeekId): DayString[] => ISO_DAYS.map((d) => dayInWeek(w, d))

const strip = (s: string) => s.replace(/\.$/, '')

// Usual Catalan abbreviations (date-fns uses "dm" for dimecres)
const SHORT_DAYS = ['dl', 'dt', 'dc', 'dj', 'dv', 'ds', 'dg']

/** Catalan short day name for an ISO day of week: dl, dt, dc… */
export const isoDayShortName = (isoDay: IsoDay) => SHORT_DAYS[isoDay - 1]

/** Catalan short day name of a day */
export const shortDayName = (d: DayString) => isoDayShortName(getISODay(parseDay(d)) as IsoDay)

/** `dt 10-nov` */
export const formatShort = (d: DayString) => {
  const date = parseDay(d)
  return `${shortDayName(d)} ${format(date, 'd')}-${strip(format(date, 'LLL', { locale: ca }))}`
}

/** `dimarts 10 de novembre` */
export const formatLong = (d: DayString) => format(parseDay(d), "EEEE d 'de' MMMM", { locale: ca })

/** `novembre 2026` */
export const formatMonth = (d: DayString) => format(parseDay(d), 'LLLL yyyy', { locale: ca })

/** `10/11` */
export const formatDayMonth = (d: DayString) => format(parseDay(d), 'd/M')

/** `10/11/2026` */
export const formatNumeric = (d: DayString) => format(parseDay(d), 'dd/MM/yyyy')

/** Inclusive list of days between two days */
export const dayRange = (from: DayString, to: DayString): DayString[] => {
  const n = daysBetween(from, to)
  if (n < 0) return []
  return Array.from({ length: n + 1 }, (_, i) => addDaysTo(from, i))
}
