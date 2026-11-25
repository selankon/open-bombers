import { useMutation, UseMutationOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '~src/services/api'
import { Cells, SaveCellParams } from './types'

export const PlanKeys = {
  all: ['plan'],
  structure: ['plan', 'structure'],
  cells: ['plan', 'cells'],
}

// Temes, apartats and columns
export const useStructure = () =>
  useQuery({
    queryKey: PlanKeys.structure,
    queryFn: () => api.plan.getStructure(),
  })

// Values of every cell
export const useCells = () =>
  useQuery({
    queryKey: PlanKeys.cells,
    queryFn: () => api.plan.getCells(),
  })

// Save one cell
export const useSaveCell = (options?: Omit<UseMutationOptions<Cells, Error, SaveCellParams>, 'mutationFn'>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: SaveCellParams) => api.plan.saveCell(params),
    onSuccess: (cells) => {
      queryClient.setQueryData(PlanKeys.cells, cells)
    },
    ...options,
  })
}
