import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import api from '~src/services/api'
import { BackupFile } from './types'

// Build the backup object with every slice
export const useExportBackup = (options?: Omit<UseMutationOptions<BackupFile, Error, void>, 'mutationFn'>) =>
  useMutation({
    mutationFn: () => api.backup.export(),
    ...options,
  })

// Replace all local data with a backup
export const useImportBackup = (options?: Omit<UseMutationOptions<void, Error, BackupFile>, 'mutationFn'>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: BackupFile) => api.backup.import(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
    },
    ...options,
  })
}

// Delete all local data
export const useResetData = (options?: Omit<UseMutationOptions<void, Error, void>, 'mutationFn'>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.backup.reset(),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
    },
    ...options,
  })
}
