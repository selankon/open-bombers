import { Level, Structure } from '~components/Planificacio/types'
import { indexStructure, temaShortCode } from '~components/Planificacio/structure'
import { hashString } from '~utils/codec'
import { addDaysTo, DayString } from '~utils/dates'
import { IcsEntry, IcsOptions, IcsState, Session, SessionKind } from './types'

const UID_DOMAIN = 'repassos.local'
const TZID = 'Europe/Madrid'

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
]

const SUMMARY_LABELS: Record<SessionKind, string> = {
  d1: 'Repàs diari',
  setmanal: 'Repàs setmanal',
  mensual: 'Repàs mensual',
  estudi: 'Estudi',
}

/** RFC 5545 text escaping */
export const escapeText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Folds a content line at 75 octets without splitting UTF-8 characters */
export const foldLine = (line: string) => {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  let size = 0
  for (const ch of line) {
    const len = encoder.encode(ch).length
    // continuation lines start with a space, which counts towards the 75 octets
    const limit = parts.length === 0 ? 75 : 74
    if (size + len > limit) {
      parts.push(current)
      current = ''
      size = 0
    }
    current += ch
    size += len
  }
  parts.push(current)
  return parts.join('\r\n ')
}

const compactDay = (d: DayString) => d.replace(/-/g, '')

const utcStamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d+/, '').replace(/Z?$/, 'Z')

const addMinutes = (hhmm: string, minutes: number) => {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + minutes
  return {
    dayOffset: Math.floor(total / 1440),
    time: `${String(Math.floor((total % 1440) / 60)).padStart(2, '0')}${String(total % 60).padStart(2, '0')}00`,
  }
}

export interface IcsEvent {
  uid: string
  hash: string
  lines: string[]
}

interface BuildParams {
  sessions: Session[]
  structure: Structure
  levels: Record<string, Level | null>
  options: IcsOptions
  avui: DayString
}

/**
 * Builds the content of every event (without the export-dependent fields: SEQUENCE,
 * LAST-MODIFIED and DTSTAMP). The hash identifies content changes.
 */
export const buildIcsEvents = ({ sessions, structure, levels, options, avui }: BuildParams): IcsEvent[] => {
  const { rowToTema, rowIndex } = indexStructure(structure)
  const apartatOf = (rowId: string) => rowToTema[rowId]?.apartats.find((a) => a.row_id === rowId)
  const events: IcsEvent[] = []

  for (const session of sessions) {
    if (session.kind === 'estudi' && !options.include_estudis) continue
    if (options.range === 'from_today' && session.date < avui) continue

    const rowIds =
      session.kind === 'estudi'
        ? session.rowIds
        : session.instances.filter((i) => options.include_done || !i.isDone).map((i) => i.rowId)
    if (!rowIds.length) continue

    const sorted = [...new Set(rowIds)].sort((a, b) => (rowIndex[a] ?? 0) - (rowIndex[b] ?? 0))
    const description = sorted
      .map((rowId) => {
        const tema = rowToTema[rowId]
        const apartat = apartatOf(rowId)
        if (!tema || !apartat) return rowId
        const prefix = levels[rowId] === 'NB' ? '[NB] ' : ''
        return `${prefix}${temaShortCode(tema)} · ${apartat.num} ${apartat.titol}`
      })
      .join('\n')
    const count = sorted.length
    const summary = `${SUMMARY_LABELS[session.kind]} (${count} ${count === 1 ? 'apartat' : 'apartats'})`

    const lines: string[] = []
    if (options.mode === 'allday') {
      lines.push(`DTSTART;VALUE=DATE:${compactDay(session.date)}`)
      lines.push(`DTEND;VALUE=DATE:${compactDay(addDaysTo(session.date, 1))}`)
    } else {
      const start = addMinutes(options.start, 0)
      const end = addMinutes(options.start, options.duration_min)
      lines.push(`DTSTART;TZID=${TZID}:${compactDay(session.date)}T${start.time}`)
      lines.push(`DTEND;TZID=${TZID}:${compactDay(addDaysTo(session.date, end.dayOffset))}T${end.time}`)
    }
    lines.push(`SUMMARY:${escapeText(summary)}`)
    lines.push(`DESCRIPTION:${escapeText(description)}`)
    lines.push('CATEGORIES:Repassos')
    lines.push('TRANSP:TRANSPARENT')
    if (options.alarm !== 'none') {
      const trigger = options.alarm === 'before_15' ? '-PT15M' : options.mode === 'allday' ? 'PT9H' : null
      if (trigger) {
        lines.push(
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${escapeText(summary)}`,
          `TRIGGER:${trigger}`,
          'END:VALARM'
        )
      } else {
        // timed event and "9:00 the same day": absolute trigger in local time is not portable, use the start
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(summary)}`, 'TRIGGER:PT0M', 'END:VALARM')
      }
    }
    const uid = `${session.uid}@${UID_DOMAIN}`
    events.push({ uid, hash: hashString(lines.join('\n')), lines })
  }
  return events
}

/**
 * Computes the new SEQUENCE / LAST-MODIFIED state for a set of events
 */
export const nextIcsEntries = (events: IcsEvent[], state: IcsState, now: string) => {
  const entries: Record<string, IcsEntry> = { ...state.entries }
  for (const ev of events) {
    const prev = entries[ev.uid]
    if (!prev) entries[ev.uid] = { hash: ev.hash, sequence: 0, modificat_el: now }
    else if (prev.hash !== ev.hash) entries[ev.uid] = { hash: ev.hash, sequence: prev.sequence + 1, modificat_el: now }
  }
  return entries
}

/** Whether the current events differ from the last exported file */
export const hasUnexportedChanges = (events: IcsEvent[], state: IcsState) => {
  if (!state.darrera_exportacio) return events.length > 0
  const exported = state.exported || {}
  if (Object.keys(exported).length !== events.length) return true
  return events.some((ev) => exported[ev.uid] !== ev.hash)
}

/**
 * Serializes the calendar
 */
export const serializeIcs = (
  events: IcsEvent[],
  entries: Record<string, IcsEntry>,
  options: IcsOptions,
  now: string
) => {
  const out: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Open Bombers//Repassos//CA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Repassos Bombers',
    `X-WR-TIMEZONE:${TZID}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]
  if (options.mode === 'timed') out.push(...VTIMEZONE)
  for (const ev of events) {
    const entry = entries[ev.uid]
    out.push('BEGIN:VEVENT')
    out.push(`UID:${ev.uid}`)
    out.push(`DTSTAMP:${utcStamp(now)}`)
    out.push(`SEQUENCE:${entry?.sequence ?? 0}`)
    out.push(`LAST-MODIFIED:${utcStamp(entry?.modificat_el ?? now)}`)
    out.push(...ev.lines)
    out.push('END:VEVENT')
  }
  out.push('END:VCALENDAR')
  return out.map(foldLine).join('\r\n') + '\r\n'
}
