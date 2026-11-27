import { MAPA } from '~utils/constants'
import { colorLook } from '../colors'
import { absPoints, contentBounds, sizeOf, visibleTraces } from '../content'
import { edgeGeometry, formaPaths } from '../geometry'
import { HIGHLIGHTER_OPACITY, strokePath } from '../ink'
import { byId, colorOf, depthOf, maxLines, visibleNodes } from '../logic'
import { LINE_HEIGHT, nodeLook, nodeRadius } from '../nodeLook'
import { MapaContingut, MapaTrace, NodeSizes } from '../types'
import { ColorResolver } from './colors'

/**
 * Draws a whole map on a canvas, on white, with the same look as the editor.
 * Used for the PNG and PDF exports.
 */

type RenderOptions = {
  resolve: ColorResolver
  font: string
  // Pixels per world px
  scale: number
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })

/** Splits a text in lines that fit in maxW, like the CSS wrapping of the ideas */
const wrap = (ctx: CanvasRenderingContext2D, text: string, maxW: number) => {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/(\s+)/)) {
      const next = line + word
      if (!line || ctx.measureText(next).width <= maxW) {
        line = next
        continue
      }
      lines.push(line.trimEnd())
      line = word.trimStart()
      // Words longer than the box break anywhere
      while (ctx.measureText(line).width > maxW && line.length > 1) {
        let cut = line.length - 1
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxW) cut--
        lines.push(line.slice(0, cut))
        line = line.slice(cut)
      }
    }
    lines.push(line.trimEnd())
  }
  return lines
}

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export const renderMapa = async (c: MapaContingut, sizes: NodeSizes, { resolve, font, scale }: RenderOptions) => {
  const bounds = contentBounds(c, sizes) ?? { minX: 0, maxX: 200, minY: 0, maxY: 120 }
  const pad = MAPA.EXPORT_PADDING
  const worldW = bounds.maxX - bounds.minX + pad * 2
  const worldH = bounds.maxY - bounds.minY + pad * 2
  const k = Math.min(scale, MAPA.EXPORT_MAX_PX / Math.max(worldW, worldH))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(worldW * k))
  canvas.height = Math.max(1, Math.round(worldH * k))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(k, 0, 0, k, (pad - bounds.minX) * k, (pad - bounds.minY) * k)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const map = byId(c.nodes)
  const visible = visibleNodes(c.nodes)
  const traces = visibleTraces(c, new Set(visible.map((n) => n.id)))

  const drawTrace = (t: MapaTrace) => {
    ctx.save()
    ctx.globalAlpha = t.eina === 'subratllador' ? HIGHLIGHTER_OPACITY : 1
    ctx.fillStyle = resolve(`mapa.${t.color}`)
    ctx.fill(new Path2D(strokePath(absPoints(t, map), t.eina, t.gruix, !!t.pressio)))
    ctx.restore()
  }

  // 1. Pictures
  const images = await Promise.all(c.imatges.map((i) => loadImage(i.src)))
  c.imatges.forEach((i, idx) => {
    const img = images[idx]
    if (img) ctx.drawImage(img, i.x, i.y, i.w, i.h)
  })

  // 2. Shapes (below the ideas)
  for (const f of c.formes) {
    const { d, arrow } = formaPaths(f)
    ctx.strokeStyle = resolve(`mapa.${f.color}`)
    ctx.fillStyle = ctx.strokeStyle
    ctx.lineWidth = f.gruix
    ctx.stroke(new Path2D(d))
    if (arrow) ctx.fill(new Path2D(arrow))
  }

  // 3. Lines between ideas
  const labels: { x: number; y: number; text: string }[] = []
  for (const n of visible) {
    const parent = n.pare ? map[n.pare] : undefined
    if (!parent) continue
    const depth = depthOf(map, n.id)
    const g = edgeGeometry(parent, n, sizeOf(sizes, parent.id), sizeOf(sizes, n.id), depth)
    ctx.save()
    ctx.globalAlpha = depth <= 1 ? 0.9 : 0.7
    ctx.strokeStyle = resolve(colorLook(colorOf(map, n.id)).line)
    ctx.fillStyle = ctx.strokeStyle
    ctx.lineWidth = g.width
    ctx.setLineDash(g.dash ?? [])
    ctx.stroke(new Path2D(g.d))
    ctx.setLineDash([])
    if (g.arrow) ctx.fill(new Path2D(g.arrow))
    ctx.restore()
    if (n.branca?.text) labels.push({ ...g.mid, text: n.branca.text })
  }

  // 5. Ideas
  for (const n of visible) {
    const isRoot = !n.pare
    const look = nodeLook(n, isRoot, colorOf(map, n.id))
    const { w, h } = sizeOf(sizes, n.id)
    const x = n.x - w / 2
    const y = n.y - h / 2
    if (look.forma === 'cercle') {
      ctx.beginPath()
      ctx.ellipse(n.x, n.y, w / 2, h / 2, 0, 0, Math.PI * 2)
    } else {
      roundRect(ctx, x, y, w, h, nodeRadius(look, isRoot, h))
    }
    if (look.fill) {
      ctx.fillStyle = resolve(look.fill)
      ctx.fill()
    }
    if (look.stroke && look.borderPx) {
      ctx.strokeStyle = resolve(look.stroke)
      ctx.lineWidth = look.borderPx
      ctx.stroke()
    }
    if (!n.text) continue
    ctx.font = `${look.fontWeight} ${look.fontPx}px ${font}`
    ctx.fillStyle = resolve(look.text)
    // The box is as wide as the text on screen: a little slack absorbs font metric differences
    const inner = w - look.padX * 2 - look.borderPx * 2
    const maxW = inner * 1.06 + 2
    let lines = wrap(ctx, n.text, maxW)
    const lh = look.fontPx * LINE_HEIGHT
    // A box with a hand-set height cuts the text with "…", like on screen
    const max = maxLines(n.alt, look.padY, look.borderPx, lh)
    if (max && lines.length > max) {
      let last = lines[max - 1]
      while (last && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1)
      lines = [...lines.slice(0, max - 1), `${last.trimEnd()}…`]
    }
    const top = n.y - (lines.length * lh) / 2
    lines.forEach((s, i) => ctx.fillText(s, n.x, top + lh * (i + 0.5)))
  }

  // 5b. Labels on the lines (over the ideas, like in the editor)
  for (const l of labels) {
    ctx.font = `600 12px ${font}`
    const lines = wrap(ctx, l.text, 160)
    const w = Math.max(...lines.map((s) => ctx.measureText(s).width)) + 16
    const lh = 12 * LINE_HEIGHT
    const h = lines.length * lh + 8
    ctx.fillStyle = resolve('mapa.label')
    roundRect(ctx, l.x - w / 2, l.y - h / 2, w, h, 8)
    ctx.fill()
    ctx.fillStyle = resolve('textMuted')
    lines.forEach((s, i) => ctx.fillText(s, l.x, l.y - h / 2 + 4 + lh * (i + 0.5)))
  }

  // 6. Highlighter over the ideas, pen ink on top
  traces.filter((t) => t.eina === 'subratllador').forEach(drawTrace)
  traces.filter((t) => t.eina === 'ploma').forEach(drawTrace)

  return canvas
}

export const canvasBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('export failed'))), type, quality)
  )
