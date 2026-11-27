import { useMutation, UseMutationOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '~src/services/api'
import { AnotacionsKeys } from '~components/Anotacions/queries'
import { sortRecursos } from './recursos'
import { Recurs, RecursParams, TemariBatchResult, TemariProgress, UpdateRecursParams } from './types'

export const TemariKeys = {
  saved: ['temari', 'saved'],
  recursos: ['temari', 'recursos'],
}

type Options<TData, TVars> = Omit<UseMutationOptions<TData, Error, TVars>, 'mutationFn'>

// Ids of the PDFs saved for offline reading
export const useSavedPdfs = () =>
  useQuery({
    queryKey: TemariKeys.saved,
    queryFn: () => api.temari.getSaved(),
  })

type SaveParams = { ids: string[]; onProgress?: TemariProgress }

// Save PDFs on this device
export const useSavePdfs = (options?: Omit<UseMutationOptions<TemariBatchResult, Error, SaveParams>, 'mutationFn'>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, onProgress }: SaveParams) => api.temari.save(ids, onProgress),
    onSuccess: ({ ok }) => {
      queryClient.setQueryData<string[]>(TemariKeys.saved, (prev = []) => [...new Set([...prev, ...ok])])
    },
    ...options,
  })
}

// Delete offline copies
export const useRemovePdfs = (options?: Omit<UseMutationOptions<string[], Error, string[]>, 'mutationFn'>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await api.temari.remove(ids)
      return ids
    },
    onSuccess: (ids) => {
      queryClient.setQueryData<string[]>(TemariKeys.saved, (prev = []) => prev.filter((id) => !ids.includes(id)))
    },
    ...options,
  })
}

// Extra temes and resources added by the user
export const useRecursos = () =>
  useQuery({
    queryKey: TemariKeys.recursos,
    queryFn: () => api.recursos.list(),
  })

const upsert = (recurs: Recurs) => (prev: Recurs[] | undefined) =>
  prev ? sortRecursos([...prev.filter((r) => r.id !== recurs.id), recurs]) : prev

export const useCreateRecurs = (options?: Options<Recurs, RecursParams>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: RecursParams) => api.recursos.create(params),
    onSuccess: (recurs) => queryClient.setQueryData<Recurs[]>(TemariKeys.recursos, upsert(recurs)),
    ...options,
  })
}

export const useUpdateRecurs = (options?: Options<Recurs, UpdateRecursParams>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: UpdateRecursParams) => api.recursos.update(params),
    onSuccess: (recurs) => queryClient.setQueryData<Recurs[]>(TemariKeys.recursos, upsert(recurs)),
    ...options,
  })
}

// Deletes a resource with its file and the annotations of its PDF
export const useRemoveRecurs = (options?: Options<string, string>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.recursos.remove(id),
    onSuccess: (id) => {
      queryClient.setQueryData<Recurs[]>(TemariKeys.recursos, (prev) => prev?.filter((r) => r.id !== id))
      queryClient.invalidateQueries({ queryKey: AnotacionsKeys.list })
    },
    ...options,
  })
}

// The file of a resource (only while it's being viewed)
export const useRecursBlob = (id: string | null) =>
  useQuery({
    queryKey: [...TemariKeys.recursos, 'blob', id],
    queryFn: () => api.recursos.getBlob(id as string),
    enabled: !!id,
    gcTime: 0,
  })
