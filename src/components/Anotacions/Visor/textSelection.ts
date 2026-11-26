import { mergeLineRects } from '../logic'
import { PageSize, RectPdf } from '../types'

/**
 * Reading the user's text selection over the pdf.js text layers, in PDF points of each page
 */

// Fewer decimals: smaller records, same look
const round = (v: number) => Math.round(v * 10) / 10

// Longest text kept with a mark (it's only for search / export)
const MAX_TEXT = 2000

export type SeleccioText = Record<number, { rects: RectPdf[]; text: string }>

const pageOfNode = (node: Node, root: HTMLElement) => {
  const el = node.parentElement
  const layer = el?.closest('.textLayer')
  const page = layer?.closest<HTMLElement>('[data-page]')
  if (!layer || !page || !root.contains(page)) return null
  return page
}

/** Whether the current selection covers some text of the pages inside `root` */
export const hasTextSelection = (root: HTMLElement | null) => {
  const sel = window.getSelection()
  if (!root || !sel || sel.isCollapsed || !sel.rangeCount) return false
  for (let i = 0; i < sel.rangeCount; i++) {
    const r = sel.getRangeAt(i)
    if (root.contains(r.commonAncestorContainer) && r.toString().trim()) return true
  }
  return false
}

/**
 * The selected text of every page, as one rectangle per line (PDF points of that page). Only text
 * nodes inside the pages' text layers count: element boxes and anything outside the pages are ignored.
 */
export const readTextSelection = (root: HTMLElement | null, sizes: PageSize[]): SeleccioText => {
  const out: SeleccioText = {}
  const sel = window.getSelection()
  if (!root || !sel || sel.isCollapsed) return out
  const raw: Record<number, { rects: RectPdf[]; parts: { text: string; y: number }[] }> = {}
  const boxes = new Map<HTMLElement, DOMRect>()

  for (let i = 0; i < sel.rangeCount; i++) {
    const range = sel.getRangeAt(i)
    const common = range.commonAncestorContainer
    const walkRoot = common.nodeType === Node.TEXT_NODE ? common.parentNode : common
    if (!walkRoot) continue
    const walker = document.createTreeWalker(walkRoot, NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []
    if (common.nodeType === Node.TEXT_NODE) nodes.push(common as Text)
    else for (let n = walker.nextNode(); n; n = walker.nextNode()) if (range.intersectsNode(n)) nodes.push(n as Text)

    for (const node of nodes) {
      const pageEl = pageOfNode(node, root)
      if (!pageEl) continue
      const n = Number(pageEl.dataset.page)
      const size = sizes[n - 1]
      if (!size) continue
      const start = node === range.startContainer ? range.startOffset : 0
      const end = node === range.endContainer ? range.endOffset : node.length
      if (end <= start) continue
      const part = document.createRange()
      part.setStart(node, start)
      part.setEnd(node, end)
      let box = boxes.get(pageEl)
      if (!box) {
        box = pageEl.getBoundingClientRect()
        boxes.set(pageEl, box)
      }
      const f = size.w / (box.width || 1)
      const page = (raw[n] ??= { rects: [], parts: [] })
      const rects = Array.from(part.getClientRects())
      for (const r of rects) {
        page.rects.push({ x: (r.left - box.left) * f, y: (r.top - box.top) * f, w: r.width * f, h: r.height * f })
      }
      if (rects.length) page.parts.push({ text: node.data.slice(start, end), y: (rects[0].top - box.top) * f })
    }
  }

  for (const [key, { rects, parts }] of Object.entries(raw)) {
    const size = sizes[Number(key) - 1]
    // Spans may stick out of the page (the text layer clips them): keep only what's on the page
    const clipped = rects.map((r) => {
      const x = Math.max(0, r.x)
      const y = Math.max(0, r.y)
      return { x, y, w: Math.min(size.w, r.x + r.w) - x, h: Math.min(size.h, r.y + r.h) - y }
    })
    const merged = mergeLineRects(clipped, 1).filter((r) => r.w >= 2 && r.h >= 2)
    if (!merged.length) continue
    // Pieces on another line are joined with a space
    let text = ''
    parts.forEach((p, i) => {
      const prev = parts[i - 1]
      text += prev && Math.abs(p.y - prev.y) > 2 ? ` ${p.text}` : p.text
    })
    out[Number(key)] = {
      rects: merged.map((r) => ({ x: round(r.x), y: round(r.y), w: round(r.w), h: round(r.h) })),
      text: text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT),
    }
  }
  return out
}
