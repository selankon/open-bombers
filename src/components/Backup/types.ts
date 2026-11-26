import { PdfAnotacions } from '~components/Anotacions/types'
import { MapaMental } from '~components/Mapes/types'

/**
 * Backup file. Besides these fields it holds one property per registered storage slice
 * (structure, cells, repassos, ics…), see services/storage.ts
 */
export interface BackupFile {
  version: number
  app: string
  exported_at: string
  // Mind maps (since v3)
  mapes?: MapaMental[]
  // Annotations of the syllabus PDFs (since v4). Transfer codes leave them out.
  anotacions?: PdfAnotacions[]
  [slice: string]: any
}
