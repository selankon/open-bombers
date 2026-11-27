import { useMutation, UseMutationOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlanKeys } from '~components/Planificacio/queries'
import { Cells } from '~components/Planificacio/types'
import api from '~src/services/api'
import { DayString, WeekId } from '~utils/dates'
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
} from './types'

export const RepassosKeys = {
  state: ['repassos'],
}

export const IcsKeys = {
  state: ['ics'],
}

type CommitResult = { cells: Cells; repassos: RepassosState }

// Study days, configuration, overrides and done marks
export const useRepassosState = () =>
  useQuery({
    queryKey: RepassosKeys.state,
    queryFn: () => api.repassos.getState(),
  })

// Calendar export state (SEQUENCE, last export…)
export const useIcsState = () =>
  useQuery({
    queryKey: IcsKeys.state,
    queryFn: () => api.ics.getState(),
  })

/**
 * Every repassos mutation may also change planificació cells (done marks, repas_seguent, veure_classe)
 */
const useRepassosMutation = <P>(
  fn: (params: P) => Promise<CommitResult>,
  options?: Omit<UseMutationOptions<CommitResult, Error, P>, 'mutationFn'>
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: ({ cells, repassos }) => {
      queryClient.setQueryData(PlanKeys.cells, cells)
      queryClient.setQueryData(RepassosKeys.state, repassos)
    },
    ...options,
  })
}

// Register (or restart) the study day of some apartats
export const useRegisterStudy = (
  options?: Omit<UseMutationOptions<CommitResult, Error, RegisterStudyParams>, 'mutationFn'>
) => useRepassosMutation((p: RegisterStudyParams) => api.repassos.registerStudy(p), options)

// Forget the study day of some apartats
export const useRemoveStudy = (options?: Omit<UseMutationOptions<CommitResult, Error, string[]>, 'mutationFn'>) =>
  useRepassosMutation((rowIds: string[]) => api.repassos.removeStudy(rowIds), options)

// Update the configuration
export const useUpdateRepasConfig = (
  options?: Omit<UseMutationOptions<CommitResult, Error, Partial<RepasConfig>>, 'mutationFn'>
) => useRepassosMutation((config: Partial<RepasConfig>) => api.repassos.updateConfig(config), options)

// Set or clear the review days of a week
export const useSetWeekConfig = (
  options?: Omit<UseMutationOptions<CommitResult, Error, { week: WeekId; config: WeekConfig | null }>, 'mutationFn'>
) => useRepassosMutation((p: { week: WeekId; config: WeekConfig | null }) => api.repassos.setWeekConfig(p), options)

// Move a whole session
export const useMoveSession = (
  options?: Omit<UseMutationOptions<CommitResult, Error, MoveSessionParams>, 'mutationFn'>
) => useRepassosMutation((p: MoveSessionParams) => api.repassos.moveSession(p), options)

// Move one instance (date null restores the calculated day)
export const useMoveInstance = (
  options?: Omit<UseMutationOptions<CommitResult, Error, { id: string; date: DayString | null }>, 'mutationFn'>
) => useRepassosMutation((p: { id: string; date: DayString | null }) => api.repassos.moveInstance(p), options)

// Mark instances as done / not done
export const useSetDone = (
  options?: Omit<UseMutationOptions<CommitResult, Error, { instances: Instance[]; done: boolean }>, 'mutationFn'>
) => useRepassosMutation((p: { instances: Instance[]; done: boolean }) => api.repassos.setDone(p), options)

// Move every overdue instance to today
export const useMoveOverdueToToday = (
  options?: Omit<UseMutationOptions<CommitResult, Error, Instance[]>, 'mutationFn'>
) => useRepassosMutation((instances: Instance[]) => api.repassos.moveOverdueToToday(instances), options)

// Create one-off reviews of some apartats
export const useAddPuntuals = (
  options?: Omit<UseMutationOptions<CommitResult, Error, AddPuntualsParams>, 'mutationFn'>
) => useRepassosMutation((p: AddPuntualsParams) => api.repassos.addPuntuals(p), options)

// Delete a one-off review
export const useRemovePuntual = (options?: Omit<UseMutationOptions<CommitResult, Error, string>, 'mutationFn'>) =>
  useRepassosMutation((id: string) => api.repassos.removePuntual(id), options)

// Save or remove the test result of a tema
export const useSaveTestResult = (
  options?: Omit<UseMutationOptions<CommitResult, Error, SaveTestParams>, 'mutationFn'>
) => useRepassosMutation((p: SaveTestParams) => api.repassos.saveTestResult(p), options)

// Add a tema to the study package by hand, or remove it
export const useSetInPaquet = (
  options?: Omit<UseMutationOptions<CommitResult, Error, { temaId: string; inPaquet: boolean }>, 'mutationFn'>
) => useRepassosMutation((p: { temaId: string; inPaquet: boolean }) => api.repassos.setInPaquet(p), options)

// Mark temes as added (or not) to the package of the tests App
export const useSetAApp = (
  options?: Omit<UseMutationOptions<CommitResult, Error, { temaIds: string[]; value: boolean }>, 'mutationFn'>
) => useRepassosMutation((p: { temaIds: string[]; value: boolean }) => api.repassos.setAApp(p), options)

// Save the calendar export state
export const useSaveIcsState = (
  options?: Omit<UseMutationOptions<IcsState, Error, Partial<IcsState>>, 'mutationFn'>
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (state: Partial<IcsState>) => api.ics.saveState(state),
    onSuccess: (state) => {
      queryClient.setQueryData(IcsKeys.state, state)
    },
    ...options,
  })
}
