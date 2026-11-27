import { useQueryClient } from '@tanstack/react-query'
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { derivePlan } from '~components/Planificacio/logic'
import { useCells, useStructure } from '~components/Planificacio/queries'
import { indexStructure } from '~components/Planificacio/structure'
import { Apartat, Cells, Level, PlanDerived, Structure, Tema } from '~components/Planificacio/types'
import {
  groupSessions,
  instancesFromState,
  loadByDay,
  reviewsByRow,
  RowReviews,
  sortSessions,
} from '~components/Repassos/logic'
import { derivePaquet, testSessions } from '~components/Repassos/paquet'
import { useRepassosState } from '~components/Repassos/queries'
import { Instance, PaquetTema, RepassosState, Session } from '~components/Repassos/types'
import { DATA_CHANGED_EVENT } from '~utils/constants'
import { DayString, today } from '~utils/dates'

export interface StudyData {
  avui: DayString
  structure: Structure
  cells: Cells
  derived: PlanDerived
  repassos: RepassosState
  instances: Instance[]
  // Study package temes with their next test (spec §3.7)
  paquet: PaquetTema[]
  // review, study and test sessions, by day
  sessions: Session[]
  // Calendar reviews shown in the planificació review columns, by row
  reviews: Record<string, RowReviews>
  load: Record<DayString, number>
  rowToTema: Record<string, Tema>
  rowIndex: Record<string, number>
  apartatOf: (rowId: string) => Apartat | undefined
  levelOf: (rowId: string) => Level | null
}

const StudyDataContext = createContext<StudyData | undefined>(undefined)

/**
 * Planificació + repassos data with everything derived from it (levels, metrics, review
 * instances and sessions), computed once for the whole app
 */
export const useStudyData = () => {
  const context = useContext(StudyDataContext)
  if (!context) {
    throw new Error('useStudyData must be used within a StudyDataProvider')
  }
  return context
}

export const StudyDataProvider = ({ children, fallback }: { children: ReactNode; fallback: ReactNode }) => {
  const value = useStudyDataProvider()
  if (!value) return <>{fallback}</>
  return <StudyDataContext.Provider value={value}>{children}</StudyDataContext.Provider>
}

const useAvui = () => {
  const [avui, setAvui] = useState(today())
  // Refresh "today" when the day changes (the app may stay open overnight)
  useEffect(() => {
    const id = setInterval(() => setAvui((prev) => (prev === today() ? prev : today())), 60_000)
    return () => clearInterval(id)
  }, [])
  return avui
}

const useStudyDataProvider = (): StudyData | null => {
  const queryClient = useQueryClient()
  const avui = useAvui()
  const { data: structure } = useStructure()
  const { data: cells } = useCells()
  const { data: repassos } = useRepassosState()

  // Reload everything when another tab changes the stored data
  useEffect(() => {
    const handler = () => queryClient.invalidateQueries()
    window.addEventListener(DATA_CHANGED_EVENT, handler)
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handler)
  }, [queryClient])

  const index = useMemo(() => (structure ? indexStructure(structure) : null), [structure])
  const derived = useMemo(() => (structure && cells ? derivePlan(structure, cells) : null), [structure, cells])
  const instances = useMemo(
    () => (repassos && cells ? instancesFromState(repassos, cells, avui) : null),
    [repassos, cells, avui]
  )
  const paquet = useMemo(
    () =>
      structure && instances && repassos
        ? derivePaquet({
            temes: structure.temes,
            estudis: repassos.estudis,
            instances,
            paquet: repassos.paquet,
            config: repassos.config,
          })
        : null,
    [structure, instances, repassos]
  )
  const temaOrder = useMemo(
    () => (structure ? Object.fromEntries(structure.temes.map((t, i) => [t.id, i])) : null),
    [structure]
  )
  const sessions = useMemo(
    () =>
      instances && repassos && paquet && temaOrder
        ? sortSessions([
            ...groupSessions(instances, repassos.estudis),
            ...testSessions({ paquet, config: repassos.config, avui, temaOrder }),
          ])
        : null,
    [instances, repassos, paquet, temaOrder, avui]
  )
  const load = useMemo(() => (instances ? loadByDay(instances) : null), [instances])
  const reviews = useMemo(() => (instances ? reviewsByRow(instances) : null), [instances])

  return useMemo(() => {
    if (!structure || !cells || !repassos || !derived || !instances || !paquet || !sessions || !index || !reviews)
      return null
    return {
      avui,
      structure,
      cells,
      derived,
      repassos,
      instances,
      paquet,
      sessions,
      reviews,
      load,
      rowToTema: index.rowToTema,
      rowIndex: index.rowIndex,
      apartatOf: (rowId: string) => index.rowToTema[rowId]?.apartats.find((a) => a.row_id === rowId),
      levelOf: (rowId: string) => derived.apartatLevels[rowId]?.level ?? null,
    }
  }, [avui, structure, cells, repassos, derived, instances, paquet, sessions, reviews, load, index])
}
