import { MAPA_COLORS, MapaColor } from '~components/Mapes/types'
import { eraseAt } from '~components/Mapes/content'
import { MARCA_TIPUS, MarcaText, MarcaTipus, PaginaAnotacions, Pagines, PdfAnotacions, RectPdf } from './types'

/**
 * Pure helpers over PDF annotations. Like the mind map helpers, they return the same object
 * when nothing changes (so undo history and autosave can compare by identity).
 */

export const emptyPagina = (): PaginaAnotacions => ({ traces: [], formes: [], imatges: [], notes: [], marques: [] })

export const countPagina = (p: PaginaAnotacions) =>
  p.traces.length + p.formes.length + p.imatges.length + p.notes.length + p.marques.length

export const countPagines = (pagines: Pagines) => Object.values(pagines).reduce((n, p) => n + countPagina(p), 0)

// Shared empty page: pages without annotations keep the same props (memoized pages don't re-render)
const EMPTY_PAGINA: PaginaAnotacions = Object.freeze(emptyPagina())

export const paginaOf = (pagines: Pagines, page: number) => pagines[page] ?? EMPTY_PAGINA

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

// ---- Text marks (highlight / underline of selected text) ----

/**
 * Merges the rectangles of a text selection into one per line (pdf.js splits the text in one span per
 * run). Rects on the same line overlap vertically; a wide horizontal gap (another column) starts a new
 * rect. Tiny rects (empty spans, line breaks) are dropped.
 */
export const mergeLineRects = (rects: RectPdf[], minSize = 1): RectPdf[] => {
  const lines: RectPdf[][] = []
  const sorted = rects.filter((r) => r.w >= minSize && r.h >= minSize).sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2))
  for (const r of sorted) {
    const line = lines.find((l) =>
      l.some((o) => Math.min(o.y + o.h, r.y + r.h) - Math.max(o.y, r.y) >= Math.min(o.h, r.h) * 0.5)
    )
    if (line) line.push(r)
    else lines.push([r])
  }
  const out: RectPdf[] = []
  for (const line of lines) {
    line.sort((a, b) => a.x - b.x)
    let cur = { ...line[0] }
    for (const r of line.slice(1)) {
      const lineH = Math.max(cur.h, r.h)
      if (r.x - (cur.x + cur.w) > lineH * 3) {
        out.push(cur)
        cur = { ...r }
        continue
      }
      const x2 = Math.max(cur.x + cur.w, r.x + r.w)
      const y1 = Math.min(cur.y, r.y)
      const y2 = Math.max(cur.y + cur.h, r.y + r.h)
      cur = { x: cur.x, y: y1, w: x2 - cur.x, h: y2 - y1 }
    }
    out.push(cur)
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x)
}

// Height of the band an underline reacts to (PDF points)
const UNDERLINE_HIT = 6

/** Area of a mark that reacts to taps and the eraser (an underline only near its line) */
export const marcaHitRects = (m: MarcaText): RectPdf[] =>
  m.tipus === 'ressaltat'
    ? m.rects
    : m.rects.map((r) => ({ x: r.x, y: r.y + r.h - UNDERLINE_HIT / 2, w: r.w, h: UNDERLINE_HIT }))

const hitsRect = (r: RectPdf, x: number, y: number, reach: number) =>
  x >= r.x - reach && x <= r.x + r.w + reach && y >= r.y - reach && y <= r.y + r.h + reach

/** Removes the strokes, shapes and text marks touched by the eraser at (x, y) */
export const eraseAll = (p: PaginaAnotacions, x: number, y: number, r: number): PaginaAnotacions => {
  const drawn = eraseAt(p, x, y, r)
  const marques = p.marques.filter((m) => !marcaHitRects(m).some((rc) => hitsRect(rc, x, y, r)))
  return marques.length === p.marques.length ? drawn : { ...drawn, marques }
}

export const updateMarca = (p: PaginaAnotacions, id: string, patch: Partial<Omit<MarcaText, 'id'>>) => ({
  ...p,
  marques: p.marques.map((m) => (m.id === id ? { ...m, ...patch } : m)),
})

export const removeMarca = (p: PaginaAnotacions, id: string) => ({
  ...p,
  marques: p.marques.filter((m) => m.id !== id),
})

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
          rects: arr(m.rects, (r) =>
            [r?.x, r?.y, r?.w, r?.h].every((v) => num(v) !== null) ? { x: r.x, y: r.y, w: r.w, h: r.h } : null
          ),
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
