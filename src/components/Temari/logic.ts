import { Tema } from '~components/Planificacio/types'
import { ALL_TEMARI_PDFS, TEMARI_PDFS } from '~src/data/temari-pdfs'
import { TEMARI_BASE_URL } from '~utils/constants'
import { TemariPdf } from './types'

export const pdfUrl = (pdf: TemariPdf) => `${TEMARI_BASE_URL}/${pdf.path}`

// Name of the file when it's saved to the device
export const pdfFileName = (pdf: TemariPdf) => pdf.path.split('/').pop() ?? `${pdf.id}.pdf`

export const pdfById = (id: string) => ALL_TEMARI_PDFS.find((p) => p.id === id)

// Tema number from its code ("TEMA 8." → 8). Temes are user-editable, so the number is the link to the PDF.
export const temaNumber = (tema: Pick<Tema, 'codi'>): number | null => {
  const n = tema.codi.match(/\d+/)?.[0]
  return n ? Number(n) : null
}

export const pdfForTema = (tema: Pick<Tema, 'codi'>): TemariPdf | undefined => {
  const n = temaNumber(tema)
  return n === null ? undefined : TEMARI_PDFS.find((p) => p.tema === n)
}

// Compact list of numbers: [1, 2, 3, 5] → "1–3, 5"
export const formatRanges = (nums: number[]) => {
  const sorted = [...nums].sort((a, b) => a - b)
  const parts: string[] = []
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i]
    while (sorted[i + 1] === sorted[i] + 1) i++
    parts.push(start === sorted[i] ? `${start}` : `${start}–${sorted[i]}`)
  }
  return parts.join(', ')
}
