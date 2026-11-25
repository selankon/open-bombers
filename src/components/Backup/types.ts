/**
 * Backup file. Besides these fields it holds one property per registered storage slice
 * (structure, cells, repassos, ics…), see services/storage.ts
 */
export interface BackupFile {
  version: number
  app: string
  exported_at: string
  [slice: string]: any
}
