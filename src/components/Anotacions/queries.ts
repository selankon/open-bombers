import { useMutation, UseMutationOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '~src/services/api'
import { countPagines } from './logic'
import { AnotacionsResum, PdfAnotacions, SaveAnotacionsParams } from './types'

export const AnotacionsKeys = {
  all: ['anotacions'],
  list: ['anotacions', 'list'],
  detail: (id: string) => ['anotacions', 'detail', id],
}

type Options<TData, TVars> = Omit<UseMutationOptions<TData, Error, TVars>, 'mutationFn'>

// Which PDFs have annotations (and how many)
export const useAnotacionsList = () =>
  useQuery({
    queryKey: AnotacionsKeys.list,
    queryFn: () => api.anotacions.list(),
  })

// Annotations of one PDF
export const useAnotacions = (id: string) =>
  useQuery({
    queryKey: AnotacionsKeys.detail(id),
    queryFn: () => api.anotacions.get(id),
  })

// Autosave of the reader
export const useSaveAnotacions = (options?: Options<PdfAnotacions, SaveAnotacionsParams>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: SaveAnotacionsParams) => api.anotacions.save(params),
    onSuccess: (record) => {
      queryClient.setQueryData(AnotacionsKeys.detail(record.id), record)
      const total = countPagines(record.pagines)
      queryClient.setQueryData<AnotacionsResum[]>(AnotacionsKeys.list, (prev) => {
        if (!prev) return prev
        const rest = prev.filter((a) => a.id !== record.id)
        return total ? [...rest, { id: record.id, modificat: record.modificat, total }] : rest
      })
    },
    ...options,
  })
}

// Deletes every annotation of a PDF
export const useRemoveAnotacions = (options?: Options<string, string>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.anotacions.remove(id),
    onSuccess: (id) => {
      queryClient.setQueryData<PdfAnotacions>(AnotacionsKeys.detail(id), (prev) =>
        prev ? { ...prev, pagines: {} } : prev
      )
      queryClient.setQueryData<AnotacionsResum[]>(AnotacionsKeys.list, (prev) => prev?.filter((a) => a.id !== id))
    },
    ...options,
  })
}

/**
 * The PDF opened with pdf.js, plus the size of every page (PDF points). Uses the offline copy when
 * there is one. Not kept in the cache once the reader closes (it holds the pdf.js worker).
 */
export const usePdfDocument = (id: string) =>
  useQuery({
    queryKey: ['anotacions', 'document', id],
    queryFn: async () => {
      const blob = await api.temari.getBlob(id)
      const { openPdf } = await import('./pdfjs')
      const doc = await openPdf(await blob.arrayBuffer())
      const sizes = await Promise.all(
        Array.from({ length: doc.numPages }, async (_, i) => {
          const { width, height } = (await doc.getPage(i + 1)).getViewport({ scale: 1 })
          return { w: width, h: height }
        })
      )
      return { doc, sizes }
    },
    gcTime: 0,
  })
