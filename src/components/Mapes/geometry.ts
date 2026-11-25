import { BrancaStyle, MapaNode } from './types'

/**
 * Shape of the line between a parent and a child: SVG path, optional arrow head and the point
 * where its label goes. Shared by the editor (SVG) and the export (canvas Path2D).
 */

type Size = { w: number; h: number }
type Pt = { x: number; y: number }

export interface EdgeGeometry {
  d: string
  arrow: string | null
  // Middle of the line, for its label
  mid: Pt
  width: number
  dash: number[] | null
}

const defaultWidth = (depth: number) => (depth <= 1 ? 3 : 2)

export const edgeWidth = (branca: BrancaStyle | undefined, depth: number) => branca?.gruix ?? defaultWidth(depth)

export const edgeDash = (branca: BrancaStyle | undefined, width: number) => {
  const g = Math.max(width, 2)
  if (branca?.estil === 'discontinua') return [g * 3, g * 2.5]
  if (branca?.estil === 'puntejada') return [0.1, g * 2.5]
  return null
}

/** Point where the line from the center towards (dx, dy) leaves the node box (or ellipse) */
const boundary = (c: Pt, s: Size, dx: number, dy: number, round: boolean) => {
  const hw = s.w / 2
  const hh = s.h / 2
  if (!dx && !dy) return c
  const t = round
    ? 1 / Math.sqrt((dx / hw) ** 2 + (dy / hh) ** 2)
    : Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity)
  return { x: c.x + dx * t, y: c.y + dy * t }
}

const cubicAt = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  }
}

const arrowHead = (tip: Pt, dir: Pt, width: number) => {
  const len = 6 + width * 2
  const n = { x: -dir.y, y: dir.x }
  const base = { x: tip.x - dir.x * len, y: tip.y - dir.y * len }
  const a = { x: base.x + n.x * len * 0.55, y: base.y + n.y * len * 0.55 }
  const b = { x: base.x - n.x * len * 0.55, y: base.y - n.y * len * 0.55 }
  return { d: `M ${tip.x} ${tip.y} L ${a.x} ${a.y} L ${b.x} ${b.y} Z`, back: len * 0.7 }
}

const unit = (dx: number, dy: number) => {
  const l = Math.hypot(dx, dy) || 1
  return { x: dx / l, y: dy / l }
}

export const edgeGeometry = (a: MapaNode, b: MapaNode, sa: Size, sb: Size, depth: number): EdgeGeometry => {
  const branca = b.branca
  const width = edgeWidth(branca, depth)
  const dash = edgeDash(branca, width)
  const tracat = branca?.tracat ?? 'corba'
  const roundA = a.forma === 'cercle'
  const roundB = b.forma === 'cercle'

  if (tracat === 'recta') {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const s = boundary(a, sa, dx, dy, roundA)
    let e = boundary(b, sb, -dx, -dy, roundB)
    const dir = unit(e.x - s.x, e.y - s.y)
    let arrow: string | null = null
    if (branca?.fletxa) {
      const head = arrowHead(e, dir, width)
      arrow = head.d
      e = { x: e.x - dir.x * head.back, y: e.y - dir.y * head.back }
    }
    return { d: `M ${s.x} ${s.y} L ${e.x} ${e.y}`, arrow, mid: { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 }, width, dash }
  }

  // Curves and elbows leave from the sides, or from top / bottom when the ideas are stacked
  const horizontal = Math.abs(b.x - a.x) >= (sa.w + sb.w) / 2 || Math.abs(b.y - a.y) < (sa.h + sb.h) / 2
  const sx = horizontal ? Math.sign(b.x - a.x) || 1 : 0
  const sy = horizontal ? 0 : Math.sign(b.y - a.y) || 1
  const s = { x: a.x + (sx * sa.w) / 2, y: a.y + (sy * sa.h) / 2 }
  let e = { x: b.x - (sx * sb.w) / 2, y: b.y - (sy * sb.h) / 2 }
  const dir = { x: sx, y: sy }
  let arrow: string | null = null
  if (branca?.fletxa) {
    const head = arrowHead(e, dir, width)
    arrow = head.d
    e = { x: e.x - dir.x * head.back, y: e.y - dir.y * head.back }
  }

  if (tracat === 'colze') {
    if (horizontal) {
      const mx = (s.x + e.x) / 2
      return { d: `M ${s.x} ${s.y} H ${mx} V ${e.y} H ${e.x}`, arrow, mid: { x: mx, y: (s.y + e.y) / 2 }, width, dash }
    }
    const my = (s.y + e.y) / 2
    return { d: `M ${s.x} ${s.y} V ${my} H ${e.x} V ${e.y}`, arrow, mid: { x: (s.x + e.x) / 2, y: my }, width, dash }
  }

  const c1 = horizontal ? { x: (s.x + e.x) / 2, y: s.y } : { x: s.x, y: (s.y + e.y) / 2 }
  const c2 = horizontal ? { x: (s.x + e.x) / 2, y: e.y } : { x: e.x, y: (s.y + e.y) / 2 }
  return {
    d: `M ${s.x} ${s.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${e.x} ${e.y}`,
    arrow,
    mid: cubicAt(s, c1, c2, e, 0.5),
    width,
    dash,
  }
}

/** Outline of a shape drawn with the shapes tool (SVG path), plus its arrow head */
export const formaPaths = (f: { tipus: string; x1: number; y1: number; x2: number; y2: number; gruix: number }) => {
  const l = Math.min(f.x1, f.x2)
  const t = Math.min(f.y1, f.y2)
  const w = Math.abs(f.x2 - f.x1)
  const h = Math.abs(f.y2 - f.y1)
  if (f.tipus === 'rect') {
    const r = Math.min(12, w / 4, h / 4)
    return {
      d: `M ${l + r} ${t} H ${l + w - r} Q ${l + w} ${t} ${l + w} ${t + r} V ${t + h - r} Q ${l + w} ${t + h} ${l + w - r} ${t + h} H ${l + r} Q ${l} ${t + h} ${l} ${t + h - r} V ${t + r} Q ${l} ${t} ${l + r} ${t} Z`,
      arrow: null,
    }
  }
  if (f.tipus === 'elipse') {
    const rx = w / 2
    const ry = h / 2
    const cx = l + rx
    return {
      d: `M ${cx - rx} ${t + ry} A ${rx} ${ry} 0 1 0 ${cx + rx} ${t + ry} A ${rx} ${ry} 0 1 0 ${cx - rx} ${t + ry} Z`,
      arrow: null,
    }
  }
  const dir = unit(f.x2 - f.x1, f.y2 - f.y1)
  if (f.tipus === 'fletxa' && (w || h)) {
    const head = arrowHead({ x: f.x2, y: f.y2 }, dir, f.gruix)
    const ex = f.x2 - dir.x * head.back
    const ey = f.y2 - dir.y * head.back
    return { d: `M ${f.x1} ${f.y1} L ${ex} ${ey}`, arrow: head.d }
  }
  return { d: `M ${f.x1} ${f.y1} L ${f.x2} ${f.y2}`, arrow: null }
}
