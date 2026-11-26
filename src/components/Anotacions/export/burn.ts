import type { PDFDocument, PDFImage, PDFPage } from 'pdf-lib'
import { strokeOutline, outlinePath } from '~components/Mapes/ink'
import { formaPaths } from '~components/Mapes/geometry'
import { ColorResolver } from '~components/Mapes/export/colors'
import { MapaColor } from '~components/Mapes/types'
import { PDF } from '~utils/constants'
import { annotatedPages } from '../logic'
import { NotaPdf, PaginaAnotacions, Pagines, TracaPdf } from '../types'
import { applyMatrix, Matrix, svgDrawMatrix, viewToUser, visibleBox } from './coords'
import { cubicPath } from './path'

/**
 * Burns the annotations into a copy of the PDF (pure: no DOM). pdf-lib comes in as a parameter
 * so the caller loads it on demand and it stays out of the main bundle.
 */

type PdfLib = typeof import('pdf-lib')

type Rgb = [number, number, number]

// A picture pdf-lib can embed: PNG or JPEG, as bytes or a data URL
export type PdfImageData = { data: Uint8Array | string; kind: 'png' | 'jpg' }

export interface BurnOptions {
  resolve: ColorResolver
  // Turns a picture data URL into something pdf-lib can embed (null skips it)
  loadImage: (src: string) => Promise<PdfImageData | null>
  author: string
  date?: Date
}

const FALLBACK_RGB: Rgb = [0, 0, 0]

const channel = (v: string) => (v.endsWith('%') ? (parseFloat(v) / 100) * 255 : parseFloat(v))

/** CSS color (hex or rgb()/rgba()) → RGB in 0..1. Transparency is ignored: inks are opaque. */
export const parseColor = (css: string): Rgb | null => {
  const s = css.trim().toLowerCase()
  if (s === 'white') return [1, 1, 1]
  if (s === 'black') return [0, 0, 0]
  const hex = s.match(/^#([0-9a-f]{3,8})$/)?.[1]
  if (hex && [3, 4, 6, 8].includes(hex.length)) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as Rgb
  }
  const fn = s.match(/^rgba?\(([^)]+)\)$/)?.[1]
  if (fn) {
    const parts = fn
      .split(/[\s,/]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map(channel)
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      return parts.map((v) => Math.min(1, Math.max(0, v / 255))) as Rgb
    }
  }
  return null
}

type Ctx = {
  lib: PdfLib
  doc: PDFDocument
  page: PDFPage
  ink: (c: MapaColor) => ReturnType<PdfLib['rgb']>
  marker: (c: MapaColor) => ReturnType<PdfLib['rgb']>
  image: (src: string) => Promise<PDFImage | null>
}

const rectPath = (x: number, y: number, w: number, h: number) => `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`

// Bézier handle length that makes a quarter circle
const KAPPA = 0.5523

/** Path operators of a rounded rectangle (radius clamped to half the shorter side) */
const roundedRect = (lib: PdfLib, x: number, y: number, w: number, h: number, radius: number) => {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2))
  const k = r * KAPPA
  const { moveTo, lineTo, appendBezierCurve: curve, closePath } = lib
  return [
    moveTo(x + r, y),
    lineTo(x + w - r, y),
    curve(x + w - r + k, y, x + w, y + r - k, x + w, y + r),
    lineTo(x + w, y + h - r),
    curve(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h),
    lineTo(x + r, y + h),
    curve(x + r - k, y + h, x, y + h - r + k, x, y + h - r),
    lineTo(x, y + r),
    curve(x, y + r - k, x + r - k, y, x + r, y),
    closePath(),
  ]
}

const drawTrace = ({ lib, page, ink, marker }: Ctx, t: TracaPdf) => {
  const d = cubicPath(outlinePath(strokeOutline(t.punts, t.eina, t.gruix, !!t.pressio)))
  if (!d) return
  const opts = { x: 0, y: 0, borderWidth: 0 }
  if (t.eina === 'subratllador')
    page.drawSvgPath(d, { ...opts, color: marker(t.color), blendMode: lib.BlendMode.Multiply })
  else page.drawSvgPath(d, { ...opts, color: ink(t.color) })
}

/** Everything drawn on the page itself, in page view coordinates (the matrix is already set) */
const drawPagina = async (ctx: Ctx, p: PaginaAnotacions) => {
  const { lib, page, ink, marker } = ctx
  const multiply = lib.BlendMode.Multiply

  // 1. Text highlights: marker tints blended over the print
  for (const m of p.marques) {
    if (m.tipus !== 'ressaltat') continue
    for (const r of m.rects) {
      page.drawSvgPath(rectPath(r.x, r.y, r.w, r.h), { x: 0, y: 0, color: marker(m.color), blendMode: multiply })
    }
  }
  // 2. Highlighter strokes
  for (const t of p.traces) if (t.eina === 'subratllador') drawTrace(ctx, t)
  // 3. Shapes
  for (const f of p.formes) {
    const { d, arrow } = formaPaths(f)
    const color = ink(f.color)
    page.drawSvgPath(cubicPath(d), {
      x: 0,
      y: 0,
      borderColor: color,
      borderWidth: f.gruix,
      borderLineCap: lib.LineCapStyle.Round,
    })
    if (arrow) page.drawSvgPath(arrow, { x: 0, y: 0, color, borderColor: color, borderWidth: 1 })
  }
  // 4. Pen strokes
  for (const t of p.traces) if (t.eina !== 'subratllador') drawTrace(ctx, t)
  // 5. Pictures. Under the flipped matrix an image box goes from y = −(top + h) to y = −top.
  for (const i of p.imatges) {
    const img = await ctx.image(i.src)
    if (!img) continue
    const y = -(i.y + i.h)
    // Rounded corners, like in the reader
    page.pushOperators(lib.pushGraphicsState(), ...roundedRect(lib, i.x, y, i.w, i.h, PDF.EXPORT_IMAGE_RADIUS))
    page.pushOperators(lib.clip(), lib.endPath())
    page.drawImage(img, { x: i.x, y, width: i.w, height: i.h })
    page.pushOperators(lib.popGraphicsState())
  }
  // 6. Text underlines: a line along the bottom of every rect
  for (const m of p.marques) {
    if (m.tipus !== 'subratllat') continue
    for (const r of m.rects) {
      const th = Math.max(PDF.EXPORT_UNDERLINE_MIN, r.h * PDF.EXPORT_UNDERLINE)
      page.drawSvgPath(rectPath(r.x, r.y + r.h - th, r.w, th), { x: 0, y: 0, color: ink(m.color) })
    }
  }
}

/** Sticky note as a real PDF comment (/Text annotation), centred on its pin */
const addNote = (
  lib: PdfLib,
  doc: PDFDocument,
  page: PDFPage,
  toUser: Matrix,
  n: NotaPdf,
  color: Rgb,
  o: BurnOptions
) => {
  const { PDFHexString, PDFString } = lib
  const s = PDF.EXPORT_NOTE_SIZE
  // With NoRotate the icon stays upright, pinned at the Rect's upper-left corner (in user space).
  // Putting that corner at the icon's top-left as seen on the page centres it on the pin at any rotation.
  const [x, y] = applyMatrix(toUser, n.x - s / 2, n.y - s / 2)
  const annot = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Text',
    Rect: [x, y - s, x + s, y],
    Contents: PDFHexString.fromText(n.text),
    T: PDFHexString.fromText(o.author),
    NM: PDFHexString.fromText(n.id),
    M: PDFString.fromDate(o.date ?? new Date()),
    Name: 'Comment',
    C: color,
    // Print + NoZoom + NoRotate: the icon prints, keeps its size when zooming and stays upright
    F: 28,
    Open: false,
    P: page.ref,
  })
  page.node.addAnnot(doc.context.register(annot))
}

/** Original PDF bytes + annotations → bytes of the annotated copy */
export const burnAnotacions = async (
  lib: PdfLib,
  bytes: Uint8Array,
  pagines: Pagines,
  o: BurnOptions
): Promise<Uint8Array> => {
  const doc = await lib.PDFDocument.load(bytes)
  const pages = doc.getPages()
  const rgbOf = (token: string) => parseColor(o.resolve(token)) ?? FALLBACK_RGB
  const ink = (c: MapaColor) => lib.rgb(...rgbOf(`pdf.${c}`))
  const marker = (c: MapaColor) => lib.rgb(...rgbOf(`pdf.marca.${c}`))

  // The same picture pasted twice is embedded once
  const images = new Map<string, Promise<PDFImage | null>>()
  const image = (src: string) => {
    if (!images.has(src)) {
      images.set(
        src,
        o
          .loadImage(src)
          .then((img) => (img ? (img.kind === 'png' ? doc.embedPng(img.data) : doc.embedJpg(img.data)) : null))
      )
    }
    return images.get(src)!
  }

  for (const n of annotatedPages(pagines)) {
    const page = pages[n - 1]
    if (!page) continue
    const p = pagines[n]
    const box = visibleBox(page.getCropBox(), page.getMediaBox())
    const toUser = viewToUser(box, page.getRotation().angle)

    const hasDrawings = p.marques.length + p.traces.length + p.formes.length + p.imatges.length > 0
    if (hasDrawings) {
      // pdf-lib wraps the original content in q/Q, so this starts from a clean graphics state
      page.pushOperators(
        lib.pushGraphicsState(),
        lib.concatTransformationMatrix(...svgDrawMatrix(toUser)),
        lib.setLineJoin(lib.LineJoinStyle.Round)
      )
      await drawPagina({ lib, doc, page, ink, marker, image }, p)
      page.pushOperators(lib.popGraphicsState())
    }

    for (const note of p.notes) {
      if (note.text.trim()) addNote(lib, doc, page, toUser, note, rgbOf(`pdf.${note.color}`), o)
    }
  }

  return doc.save()
}
