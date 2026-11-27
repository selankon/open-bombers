import { RECURS_PDF_PREFIX } from '~utils/constants'
import { Recurs, RecursKind, TemariPdf } from './types'

// Reader id of a PDF added by the user
export const recursPdfId = (id: string) => `${RECURS_PDF_PREFIX}${id}`

export const isRecursPdfId = (pdfId: string) => pdfId.startsWith(RECURS_PDF_PREFIX)

export const recursIdOf = (pdfId: string) => (isRecursPdfId(pdfId) ? pdfId.slice(RECURS_PDF_PREFIX.length) : null)

export const recursKind = (recurs: Pick<Recurs, 'fitxer' | 'url'>): RecursKind => {
  const f = recurs.fitxer
  if (!f) return 'enllac'
  const mime = f.mime.toLowerCase()
  const ext = f.nom.split('.').pop()?.toLowerCase() ?? ''
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (mime.startsWith('image/')) return 'imatge'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'fitxer'
}

/** A PDF added by the user, shaped like a syllabus PDF so the reader, annotations and export work the same */
export const pdfOfRecurs = (recurs: Recurs): TemariPdf => ({
  id: recursPdfId(recurs.id),
  tema: recurs.tema,
  manual: null,
  path: recurs.fitxer?.nom || `${recurs.titol || recurs.id}.pdf`,
  actualitzat: false,
})

// "youtube.com/watch?v=…" → "https://youtube.com/watch?v=…". Null when it isn't a web link.
export const normalizeUrl = (raw: string): string | null => {
  const s = raw.trim()
  if (!s) return null
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(s) ? s : `https://${s}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

// Host shown under a link ("www.youtube.com" → "youtube.com")
export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// 1536 → "1,5 kB"
export const formatMida = (bytes: number) => {
  const units = ['B', 'kB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toLocaleString('ca', { maximumFractionDigits: i === 0 || n >= 10 ? 0 : 1 })} ${units[i]}`
}

const str = (v: unknown) => (typeof v === 'string' ? v : null)

/** Checks a stored record, so a broken one never breaks the page */
export const migrateRecurs = (raw: unknown): Recurs | null => {
  const r = raw as Partial<Recurs> | null
  if (!r || typeof r !== 'object' || typeof r.id !== 'string') return null
  const f = r.fitxer as Partial<Recurs['fitxer']>
  const fitxer =
    f && typeof f === 'object' && typeof f.nom === 'string'
      ? { nom: f.nom, mime: str(f.mime) ?? '', mida: typeof f.mida === 'number' ? f.mida : 0 }
      : null
  const url = str(r.url)
  if (!fitxer && !url) return null
  const categoria = r.categoria === 'tema' ? 'tema' : 'extra'
  return {
    id: r.id,
    categoria,
    tema: categoria === 'tema' && typeof r.tema === 'number' && Number.isFinite(r.tema) ? r.tema : null,
    titol: str(r.titol) ?? '',
    fitxer,
    url: fitxer ? null : url,
    creat: str(r.creat) ?? new Date(0).toISOString(),
    modificat: str(r.modificat) ?? new Date(0).toISOString(),
  }
}

// Extra temes by number, then resources by title
export const sortRecursos = (list: Recurs[]) =>
  [...list].sort(
    (a, b) =>
      (a.tema ?? Infinity) - (b.tema ?? Infinity) || a.titol.localeCompare(b.titol, 'ca', { sensitivity: 'base' })
  )
