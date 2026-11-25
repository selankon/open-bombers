import { MAPA } from '~utils/constants'
import { subtreeIds, visibleNodes } from './logic'
import { ItemRef, MapaColor, MapaContingut, MapaForma, MapaNode, MapaTrace, NodeSizes, Viewport } from './types'

/**
 * Pure helpers over the whole content of a map (ideas, ink, shapes and pictures).
 * Like the node helpers, they return the same object when nothing changes.
 */

type Fn<T> = (v: T) => T

export const onNodes =
  (fn: Fn<MapaNode[]>): Fn<MapaContingut> =>
  (c) => {
    const nodes = fn(c.nodes)
    return nodes === c.nodes ? c : { ...c, nodes }
  }

export const sizeOf = (sizes: NodeSizes, id: string) => sizes[id] ?? { w: MAPA.NODE_W, h: MAPA.NODE_H }

/** Removes an idea with its branch and the ink attached to them */
export const removeNodeContent = (c: MapaContingut, id: string): MapaContingut => {
  const ids = subtreeIds(c.nodes, id)
  return {
    ...c,
    nodes: c.nodes.filter((n) => !ids.has(n.id)),
    traces: c.traces.filter((t) => !t.node || !ids.has(t.node)),
  }
}

/** Points of a stroke in world coordinates */
export const absPoints = (t: MapaTrace, map: Record<string, MapaNode>): [number, number, number][] => {
  const node = t.node ? map[t.node] : undefined
  if (!node) return t.punts
  return t.punts.map(([x, y, p]) => [x + node.x, y + node.y, p])
}

const boundsOfPoints = (pts: { x: number; y: number }[]) => ({
  minX: Math.min(...pts.map((p) => p.x)),
  maxX: Math.max(...pts.map((p) => p.x)),
  minY: Math.min(...pts.map((p) => p.y)),
  maxY: Math.max(...pts.map((p) => p.y)),
})

export const traceBounds = (t: MapaTrace, map: Record<string, MapaNode>) => {
  const b = boundsOfPoints(absPoints(t, map).map(([x, y]) => ({ x, y })))
  const pad = t.gruix / 2
  return { minX: b.minX - pad, maxX: b.maxX + pad, minY: b.minY - pad, maxY: b.maxY + pad }
}

export const formaBounds = (f: MapaForma) => {
  const pad = f.gruix / 2 + (f.tipus === 'fletxa' ? f.gruix * 3 : 0)
  return {
    minX: Math.min(f.x1, f.x2) - pad,
    maxX: Math.max(f.x1, f.x2) + pad,
    minY: Math.min(f.y1, f.y2) - pad,
    maxY: Math.max(f.y1, f.y2) + pad,
  }
}

/** Visible ink: strokes of hidden (folded) ideas are hidden too */
export const visibleTraces = (c: MapaContingut, visibleIds: Set<string>) =>
  c.traces.filter((t) => !t.node || visibleIds.has(t.node))

/** Box of everything visible in the map (world px) */
export const contentBounds = (c: MapaContingut, sizes: NodeSizes) => {
  const visible = visibleNodes(c.nodes)
  const map = Object.fromEntries(c.nodes.map((n) => [n.id, n]))
  const boxes = [
    ...visible.map((n) => {
      const s = sizeOf(sizes, n.id)
      return { minX: n.x - s.w / 2, maxX: n.x + s.w / 2, minY: n.y - s.h / 2, maxY: n.y + s.h / 2 }
    }),
    ...visibleTraces(c, new Set(visible.map((n) => n.id))).map((t) => traceBounds(t, map)),
    ...c.formes.map(formaBounds),
    ...c.imatges.map((i) => ({ minX: i.x, maxX: i.x + i.w, minY: i.y, maxY: i.y + i.h })),
  ]
  if (!boxes.length) return null
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  }
}

/**
 * Idea under the middle of a new stroke (the stroke will move with it), the topmost one
 */
export const nodeUnder = (nodes: MapaNode[], sizes: NodeSizes, x: number, y: number) => {
  const visible = visibleNodes(nodes)
  for (let i = visible.length - 1; i >= 0; i--) {
    const n = visible[i]
    const s = sizeOf(sizes, n.id)
    if (Math.abs(x - n.x) <= s.w / 2 && Math.abs(y - n.y) <= s.h / 2) return n
  }
  return null
}

/** Makes a stroke from world points, attached to the idea it was drawn on (if any) */
export const makeTrace = (
  base: Omit<MapaTrace, 'node' | 'punts'>,
  punts: [number, number, number][],
  nodes: MapaNode[],
  sizes: NodeSizes
): MapaTrace => {
  const b = boundsOfPoints(punts.map(([x, y]) => ({ x, y })))
  const node = nodeUnder(nodes, sizes, (b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2)
  // Fewer decimals: smaller maps, same look
  const round = (v: number) => Math.round(v * 10) / 10
  return {
    ...base,
    node: node?.id ?? null,
    punts: punts.map(([x, y, p]) => [
      round(node ? x - node.x : x),
      round(node ? y - node.y : y),
      Math.round(p * 100) / 100,
    ]),
  }
}

const listOf = (kind: ItemRef['kind']) => (({ trace: 'traces', forma: 'formes', imatge: 'imatges' }) as const)[kind]

export const findItem = (c: MapaContingut, ref: ItemRef) =>
  (c[listOf(ref.kind)] as { id: string }[]).find((i) => i.id === ref.id)

export const removeItem = (c: MapaContingut, ref: ItemRef): MapaContingut => {
  const key = listOf(ref.kind)
  return { ...c, [key]: (c[key] as { id: string }[]).filter((i) => i.id !== ref.id) }
}

const updateIn = <T extends { id: string }>(items: T[], id: string, fn: (i: T) => T) =>
  items.map((i) => (i.id === id ? fn(i) : i))

export const moveItem = (c: MapaContingut, ref: ItemRef, dx: number, dy: number): MapaContingut => {
  if (ref.kind === 'trace')
    return {
      ...c,
      traces: updateIn(c.traces, ref.id, (t) => ({ ...t, punts: t.punts.map(([x, y, p]) => [x + dx, y + dy, p]) })),
    }
  if (ref.kind === 'forma')
    return {
      ...c,
      formes: updateIn(c.formes, ref.id, (f) => ({ ...f, x1: f.x1 + dx, y1: f.y1 + dy, x2: f.x2 + dx, y2: f.y2 + dy })),
    }
  return { ...c, imatges: updateIn(c.imatges, ref.id, (i) => ({ ...i, x: i.x + dx, y: i.y + dy })) }
}

/** New color and / or width of a stroke or shape */
export const restyleItem = (
  c: MapaContingut,
  ref: ItemRef,
  patch: { color?: MapaColor; gruix?: number }
): MapaContingut => {
  if (ref.kind === 'trace') return { ...c, traces: updateIn(c.traces, ref.id, (t) => ({ ...t, ...patch })) }
  if (ref.kind === 'forma') return { ...c, formes: updateIn(c.formes, ref.id, (f) => ({ ...f, ...patch })) }
  return c
}

export const resizeImatge = (c: MapaContingut, id: string, w: number, h: number): MapaContingut => ({
  ...c,
  imatges: updateIn(c.imatges, id, (i) => ({ ...i, w, h })),
})

// ---- Hit testing (eraser) ----

const distToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

const hitsTrace = (t: MapaTrace, map: Record<string, MapaNode>, x: number, y: number, r: number) => {
  const pts = absPoints(t, map)
  const reach = r + t.gruix / 2
  if (pts.length === 1) return Math.hypot(pts[0][0] - x, pts[0][1] - y) <= reach
  for (let i = 1; i < pts.length; i++) {
    if (distToSegment(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= reach) return true
  }
  return false
}

const hitsForma = (f: MapaForma, x: number, y: number, r: number) => {
  const reach = r + f.gruix / 2
  if (f.tipus === 'linia' || f.tipus === 'fletxa') return distToSegment(x, y, f.x1, f.y1, f.x2, f.y2) <= reach
  const [l, rr, t, b] = [Math.min(f.x1, f.x2), Math.max(f.x1, f.x2), Math.min(f.y1, f.y2), Math.max(f.y1, f.y2)]
  if (f.tipus === 'rect') {
    return (
      distToSegment(x, y, l, t, rr, t) <= reach ||
      distToSegment(x, y, rr, t, rr, b) <= reach ||
      distToSegment(x, y, rr, b, l, b) <= reach ||
      distToSegment(x, y, l, b, l, t) <= reach
    )
  }
  const rx = Math.max(1, (rr - l) / 2)
  const ry = Math.max(1, (b - t) / 2)
  const nx = (x - (l + rx)) / rx
  const ny = (y - (t + ry)) / ry
  return Math.abs(Math.hypot(nx, ny) - 1) * Math.min(rx, ry) <= reach
}

/** Removes the strokes and shapes touched by the eraser at (x, y) */
export const eraseAt = (c: MapaContingut, x: number, y: number, r: number): MapaContingut => {
  const map = Object.fromEntries(c.nodes.map((n) => [n.id, n]))
  const traces = c.traces.filter((t) => !hitsTrace(t, map, x, y, r))
  const formes = c.formes.filter((f) => !hitsForma(f, x, y, r))
  if (traces.length === c.traces.length && formes.length === c.formes.length) return c
  return { ...c, traces, formes }
}

/** Where a new picture goes: centered on the screen, at most a comfortable width */
export const placeImatge = (vp: Viewport, screen: { w: number; h: number }, w: number, h: number) => {
  const maxW = Math.min(MAPA.IMAGE_WORLD_W, (screen.w * 0.6) / vp.k)
  const scale = Math.min(1, maxW / w)
  const cw = w * scale
  const ch = h * scale
  const cx = (screen.w / 2 - vp.x) / vp.k
  const cy = (screen.h / 2 - vp.y) / vp.k
  return { x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch }
}
