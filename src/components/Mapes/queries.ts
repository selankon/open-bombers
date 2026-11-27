import { QueryClient, useMutation, UseMutationOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '~src/services/api'
import { resumOf } from './logic'
import { MapaFile, MapaInfoParams, MapaMental, MapaResum, NouMapaParams, SaveContentParams } from './types'

export const MapesKeys = {
  all: ['mapes'],
  list: ['mapes', 'list'],
  detail: (id: string) => ['mapes', 'detail', id],
}

type Options<TData, TVars> = Omit<UseMutationOptions<TData, Error, TVars>, 'mutationFn'>

// Writes a saved map back to both caches
const storeMapa = (queryClient: QueryClient, mapa: MapaMental) => {
  queryClient.setQueryData(MapesKeys.detail(mapa.id), mapa)
  queryClient.setQueryData<MapaResum[]>(MapesKeys.list, (prev) =>
    prev ? [resumOf(mapa), ...prev.filter((m) => m.id !== mapa.id)] : prev
  )
}

// Summaries of every map
export const useMapes = () =>
  useQuery({
    queryKey: MapesKeys.list,
    queryFn: () => api.mapes.list(),
  })

// One full map
export const useMapa = (id: string) =>
  useQuery({
    queryKey: MapesKeys.detail(id),
    queryFn: () => api.mapes.get(id),
  })

export const useCreateMapa = (options?: Options<MapaMental, NouMapaParams>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: NouMapaParams) => api.mapes.create(params),
    onSuccess: (mapa) => storeMapa(queryClient, mapa),
    ...options,
  })
}

// Autosave of the editor content
export const useSaveMapaContent = (options?: Options<MapaMental, SaveContentParams>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: SaveContentParams) => api.mapes.saveContent(params),
    onSuccess: (mapa) => storeMapa(queryClient, mapa),
    ...options,
  })
}

export const useSaveMapaInfo = (options?: Options<MapaMental, MapaInfoParams>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: MapaInfoParams) => api.mapes.saveInfo(params),
    onSuccess: (mapa) => storeMapa(queryClient, mapa),
    ...options,
  })
}

export const useDuplicateMapa = (options?: Options<MapaMental, { id: string; titol: string }>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; titol: string }) => api.mapes.duplicate(params),
    onSuccess: (mapa) => storeMapa(queryClient, mapa),
    ...options,
  })
}

export const useRemoveMapa = (options?: Options<string, string>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.mapes.remove(id),
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: MapesKeys.detail(id) })
      queryClient.setQueryData<MapaResum[]>(MapesKeys.list, (prev) => prev?.filter((m) => m.id !== id))
    },
    ...options,
  })
}

// One map as a shareable file (read only, nothing to store)
export const useExportMapaFile = (options?: Options<MapaFile, string>) =>
  useMutation({
    mutationFn: (id: string) => api.mapes.exportFile(id),
    ...options,
  })

// Adds a shared map as a new one
export const useImportMapaFile = (options?: Options<MapaMental, unknown>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: unknown) => api.mapes.importFile(file),
    onSuccess: (mapa) => storeMapa(queryClient, mapa),
    ...options,
  })
}
