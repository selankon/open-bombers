import { useCallback, useMemo } from 'react'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { Level } from '~components/Planificacio/types'
import { ICS_FILE_NAME } from '~utils/constants'
import { buildIcsEvents, hasUnexportedChanges, nextIcsEntries, serializeIcs } from './ics'
import { useIcsState, useSaveIcsState } from './queries'

/**
 * Current calendar events, whether they changed since the last export, and the export action
 */
export const useIcsExport = () => {
  const { sessions, structure, derived, repassos, avui } = useStudyData()
  const { data: icsState } = useIcsState()
  const { mutateAsync: saveIcsState } = useSaveIcsState()
  const options = repassos.config.ics

  const events = useMemo(() => {
    const levels: Record<string, Level | null> = {}
    for (const [rowId, info] of Object.entries(derived.apartatLevels)) levels[rowId] = info.level
    return buildIcsEvents({ sessions, structure, levels, options, avui })
  }, [sessions, structure, derived.apartatLevels, options, avui])

  const isDirty = useMemo(() => (icsState ? hasUnexportedChanges(events, icsState) : false), [events, icsState])

  // Builds the file and stores SEQUENCE / LAST-MODIFIED / exported hashes
  const buildFile = useCallback(async () => {
    const now = new Date().toISOString()
    const entries = nextIcsEntries(events, icsState, now)
    const text = serializeIcs(events, entries, options, now)
    const isFirstExport = !icsState?.darrera_exportacio
    await saveIcsState({
      entries,
      exported: Object.fromEntries(events.map((e) => [e.uid, e.hash])),
      darrera_exportacio: now,
    })
    return { file: new File([text], ICS_FILE_NAME, { type: 'text/calendar;charset=utf-8' }), isFirstExport }
  }, [events, icsState, options, saveIcsState])

  return {
    events,
    isDirty,
    buildFile,
    lastExport: icsState?.darrera_exportacio,
    helpSeen: !!icsState?.ajuda_vista,
    saveIcsState,
  }
}
