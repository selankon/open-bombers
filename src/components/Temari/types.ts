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
