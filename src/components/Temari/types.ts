export interface TemariPdf {
  id: string
  // Tema number, or null for documents that cover the whole syllabus
  tema: number | null
  // Manual code (e.g. MAN.GRAL.008)
  manual: string | null
  // Path relative to TEMARI_BASE_URL
  path: string
  // Comes from the guide update and replaces the original manual
  actualitzat: boolean
}

// Called after each file of a batch operation
export type TemariProgress = (done: number, total: number) => void

export interface TemariBatchResult {
  ok: string[]
  failed: string[]
}

// Extra tema (number + title + file) or resource outside the syllabus (file or link)
export type RecursCategoria = 'tema' | 'extra'

// How a resource opens: in the PDF reader, in a media viewer, as a link or as a download
export type RecursKind = 'pdf' | 'imatge' | 'video' | 'audio' | 'enllac' | 'fitxer'

export interface RecursFitxer {
  nom: string
  mime: string
  // Bytes
  mida: number
}

/** Stored record. The file itself lives in its own store, with the same id. */
export interface Recurs {
  id: string
  categoria: RecursCategoria
  // Tema number (extra temes only)
  tema: number | null
  titol: string
  // A file or a link (only resources can be a link)
  fitxer: RecursFitxer | null
  url: string | null
  creat: string
  modificat: string
}

export interface RecursParams {
  categoria: RecursCategoria
  tema: number | null
  titol: string
  // New file. When editing, null keeps the current one.
  fitxer: File | null
  url: string | null
}

export type UpdateRecursParams = RecursParams & { id: string }
