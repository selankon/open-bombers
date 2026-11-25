import { useMutation, UseMutationOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '~src/services/api'
import { TemariBatchResult, TemariProgress } from './types'

export const TemariKeys = {
  saved: ['temari', 'saved'],
}

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
