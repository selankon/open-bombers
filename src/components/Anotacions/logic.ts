import { MAPA_COLORS, MapaColor } from '~components/Mapes/types'
import { MARCA_TIPUS, MarcaTipus, PaginaAnotacions, Pagines, PdfAnotacions } from './types'

/**
 * Pure helpers over PDF annotations. Like the mind map helpers, they return the same object
 * when nothing changes (so undo history and autosave can compare by identity).
 */

export const emptyPagina = (): PaginaAnotacions => ({ traces: [], formes: [], imatges: [], notes: [], marques: [] })

export const countPagina = (p: PaginaAnotacions) =>
  p.traces.length + p.formes.length + p.imatges.length + p.notes.length + p.marques.length

export const countPagines = (pagines: Pagines) => Object.values(pagines).reduce((n, p) => n + countPagina(p), 0)

export const paginaOf = (pagines: Pagines, page: number) => pagines[page] ?? emptyPagina()

/** Applies a change to one page. Pages left empty are removed. */
export const onPagina =
  (page: number, fn: (p: PaginaAnotacions) => PaginaAnotacions) =>
  (pagines: Pagines): Pagines => {
    const current = paginaOf(pagines, page)
    const next = fn(current)
    if (next === current) return pagines
    const { [page]: _, ...rest } = pagines
    return countPagina(next) ? { ...rest, [page]: next } : rest
  }

// Page numbers with annotations, in order
export const annotatedPages = (pagines: Pagines) =>
  Object.keys(pagines)
    .map(Number)
    .filter((n) => countPagina(pagines[n]) > 0)
    .sort((a, b) => a - b)

// ---- Reading stored data (backups and old versions must never break the reader) ----

const arr = <T>(v: unknown, fn: (x: any) => T | null): T[] =>
  Array.isArray(v) ? v.map(fn).filter((x): x is T => x !== null) : []

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v: unknown) => (typeof v === 'string' ? v : null)
const color = (v: unknown): MapaColor => (MAPA_COLORS.includes(v as MapaColor) ? (v as MapaColor) : 'tinta')
const withId = (x: any) => x && typeof x === 'object' && typeof x.id === 'string'

export const migratePagina = (raw: any): PaginaAnotacions => ({
  traces: arr(raw?.traces, (t) =>
    withId(t) && Array.isArray(t.punts) ? { ...t, node: null, color: color(t.color), gruix: num(t.gruix) ?? 2 } : null
  ),
  formes: arr(raw?.formes, (f) => (withId(f) ? { ...f, color: color(f.color), gruix: num(f.gruix) ?? 2 } : null)),
  imatges: arr(raw?.imatges, (i) => (withId(i) && str(i.src) ? i : null)),
  notes: arr(raw?.notes, (n) =>
    withId(n) && num(n.x) !== null && num(n.y) !== null
      ? { id: n.id, x: n.x, y: n.y, text: str(n.text) ?? '', color: color(n.color) }
      : null
  ),
  marques: arr(raw?.marques, (m) =>
    withId(m) && Array.isArray(m.rects)
      ? {
          ...m,
          tipus: MARCA_TIPUS.includes(m.tipus) ? (m.tipus as MarcaTipus) : 'ressaltat',
          color: color(m.color),
        }
      : null
  ),
})

export const migrateAnotacions = (raw: any): PdfAnotacions | null => {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null
  const pagines: Pagines = {}
  for (const [key, value] of Object.entries(raw.pagines ?? {})) {
    const n = Number(key)
    if (!Number.isInteger(n) || n < 1) continue
    const p = migratePagina(value)
    if (countPagina(p)) pagines[n] = p
  }
  return { id: raw.id, modificat: str(raw.modificat) ?? new Date(0).toISOString(), pagines }
}
