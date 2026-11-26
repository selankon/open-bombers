import { FormaTipus, MapaColor, MapaForma, MapaImatge, MapaTrace } from '~components/Mapes/types'

/**
 * Annotations drawn over a syllabus PDF. The PDF itself is never changed: annotations are a
 * layer kept apart (IndexedDB), and can be burnt into a copy of the PDF when exporting.
 *
 * Coordinates are in PDF points of the page as pdf.js shows it at scale 1 (rotation applied):
 * origin at the top-left corner, y grows downwards, same units as the page width / height.
 */

/** Freehand stroke (pen / highlighter). `node` is always null: it's the mind map type, reused. */
export type TracaPdf = MapaTrace

/** Rectangle, ellipse, line or arrow */
export type FormaPdf = MapaForma

/** Pasted / inserted picture (data URL, WebP or JPEG). (x, y) is the top-left corner. */
export type ImatgePdf = MapaImatge

/** Sticky note. (x, y) is the point the pin marks. */
export interface NotaPdf {
  id: string
  x: number
  y: number
  text: string
  color: MapaColor
}

export const MARCA_TIPUS = ['ressaltat', 'subratllat'] as const
export type MarcaTipus = (typeof MARCA_TIPUS)[number]

/** Highlight or underline of selected text: one rectangle per line of the selection */
export interface MarcaText {
  id: string
  tipus: MarcaTipus
  color: MapaColor
  rects: { x: number; y: number; w: number; h: number }[]
  // The text that was marked (for search / export)
  text?: string
}

export interface PaginaAnotacions {
  traces: TracaPdf[]
  formes: FormaPdf[]
  imatges: ImatgePdf[]
  notes: NotaPdf[]
  marques: MarcaText[]
}

// Annotations of every page, keyed by page number (1-based). Pages without annotations are left out.
export type Pagines = Record<string, PaginaAnotacions>

/** Stored record: one per PDF, keyed by the TemariPdf id */
export interface PdfAnotacions {
  id: string
  modificat: string
  pagines: Pagines
}

// What the Temari list needs to know about every annotated PDF
export interface AnotacionsResum {
  id: string
  modificat: string
  // Number of annotations of every kind
  total: number
}

export type SaveAnotacionsParams = { id: string; pagines: Pagines }

// Reader tools. `seleccio` reads, scrolls, selects text and moves annotations; `text` highlights or
// underlines the text the user selects.
export type EinaPdf = 'seleccio' | 'text' | 'ploma' | 'subratllador' | 'forma' | 'goma' | 'nota'

export type BrushPdf = { color: MapaColor; gruix: number; forma: FormaTipus }

// Text tool: highlight or underline, and the color last used for each
export type TextBrush = { tipus: MarcaTipus; colors: Record<MarcaTipus, MapaColor> }

// Selected annotation (strokes, shapes, pictures and text marks; notes open their own popover)
export type SeleccioPdf = { page: number; kind: 'trace' | 'forma' | 'imatge' | 'marca'; id: string }

// A rectangle in PDF points of a page
export type RectPdf = MarcaText['rects'][number]

// Size of a page in PDF points (scale 1)
export type PageSize = { w: number; h: number }
