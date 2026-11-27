import { isNodeColor } from './colors'
import { temaShortCode } from '~components/Planificacio/structure'
import { Structure, Tema } from '~components/Planificacio/types'
import { MAPA } from '~utils/constants'
import {
  BRANCA_ESTILS,
  BRANCA_TRACATS,
  BrancaStyle,
  FORMA_TIPUS,
  MAPA_COLORS,
  MapaColor,
  NodeColor,
  MapaForma,
  MapaImatge,
  MapaMental,
  MapaNode,
  MapaResum,
  MapaTrace,
  NODE_EMPLENATS,
  NODE_FORMES,
  NODE_MIDES,
  Viewport,
} from './types'

/**
 * Pure mind map logic: tree helpers, node placement and viewport math.
 * Node functions never mutate: they return a new array (unchanged nodes keep their identity).
 */

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const now = () => new Date().toISOString()

const isColor = (c: unknown): c is MapaColor => MAPA_COLORS.includes(c as MapaColor)
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => list.includes(v as T)
const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback)
const list = (v: unknown): any[] => (Array.isArray(v) ? v.filter((x) => x && typeof x.id === 'string') : [])

const migrateBranca = (b: any): BrancaStyle | undefined => {
  if (!b || typeof b !== 'object') return undefined
  const result: BrancaStyle = {
    ...(Number(b.gruix) > 0 ? { gruix: Math.min(12, Number(b.gruix)) } : {}),
    ...(oneOf(BRANCA_ESTILS, b.estil) ? { estil: b.estil } : {}),
    ...(oneOf(BRANCA_TRACATS, b.tracat) ? { tracat: b.tracat } : {}),
    ...(b.fletxa ? { fletxa: true } : {}),
    ...(typeof b.text === 'string' && b.text.trim() ? { text: b.text } : {}),
  }
  return Object.keys(result).length ? result : undefined
}

const migrateNode = (n: any): MapaNode => {
  const branca = migrateBranca(n.branca)
  return {
    id: n.id,
    pare: typeof n.pare === 'string' ? n.pare : null,
    text: typeof n.text === 'string' ? n.text : '',
    x: num(n.x),
    y: num(n.y),
    ...(isNodeColor(n.color) ? { color: n.color } : {}),
    ...(n.plegat ? { plegat: true } : {}),
    ...(oneOf(NODE_FORMES, n.forma) ? { forma: n.forma } : {}),
    ...(oneOf(NODE_EMPLENATS, n.emplenat) ? { emplenat: n.emplenat } : {}),
    ...(oneOf(NODE_MIDES, n.mida) ? { mida: n.mida } : {}),
    ...(branca ? { branca } : {}),
  }
}

const migrateTrace = (t: any): MapaTrace | null => {
  const punts = Array.isArray(t.punts)
    ? t.punts
        .filter((p: any) => Array.isArray(p) && p.length >= 2)
        .map((p: any): [number, number, number] => [num(p[0]), num(p[1]), num(p[2], 0.5)])
    : []
  if (!punts.length) return null
  return {
    id: t.id,
    node: typeof t.node === 'string' ? t.node : null,
    eina: t.eina === 'subratllador' ? 'subratllador' : 'ploma',
    color: isColor(t.color) ? t.color : 'tinta',
    gruix: Math.max(1, num(t.gruix, 4)),
    ...(t.pressio ? { pressio: true } : {}),
    punts,
  }
}

const migrateForma = (f: any): MapaForma | null =>
  oneOf(FORMA_TIPUS, f.tipus)
    ? {
        id: f.id,
        tipus: f.tipus,
        x1: num(f.x1),
        y1: num(f.y1),
        x2: num(f.x2),
        y2: num(f.y2),
        color: isColor(f.color) ? f.color : 'tinta',
        gruix: Math.max(1, num(f.gruix, 3)),
      }
    : null

const migrateImatge = (i: any): MapaImatge | null =>
  typeof i.src === 'string' && i.src.startsWith('data:image/')
    ? { id: i.id, x: num(i.x), y: num(i.y), w: Math.max(8, num(i.w, 200)), h: Math.max(8, num(i.h, 200)), src: i.src }
    : null

const notNull = <T>(v: T | null): v is T => v !== null

/** Normalizes a stored or imported map */
export const migrateMapa = (raw: any): MapaMental => {
  const created = typeof raw?.creat === 'string' ? raw.creat : now()
  const nodes = list(raw?.nodes).map(migrateNode)
  const ids = new Set(nodes.map((n) => n.id))
  return {
    id: typeof raw?.id === 'string' ? raw.id : newId(),
    titol: typeof raw?.titol === 'string' ? raw.titol : '',
    tema_id: typeof raw?.tema_id === 'string' ? raw.tema_id : null,
    row_id: typeof raw?.row_id === 'string' ? raw.row_id : null,
    creat: created,
    modificat: typeof raw?.modificat === 'string' ? raw.modificat : created,
    // Orphans (their parent is gone) become roots
    nodes: nodes.map((n) => (n.pare && !ids.has(n.pare) ? { ...n, pare: null } : n)),
    // Ink of a deleted node is dropped
    traces: list(raw?.traces)
      .map(migrateTrace)
      .filter(notNull)
      .filter((t) => !t.node || ids.has(t.node)),
    formes: list(raw?.formes).map(migrateForma).filter(notNull),
    imatges: list(raw?.imatges).map(migrateImatge).filter(notNull),
  }
}

export const resumOf = (m: MapaMental): MapaResum => ({
  id: m.id,
  titol: m.titol,
  tema_id: m.tema_id,
  row_id: m.row_id,
  creat: m.creat,
  modificat: m.modificat,
  num_nodes: m.nodes.length,
})

export const byId = (nodes: MapaNode[]) => Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<string, MapaNode>

/** Children of a node (or the roots with null), top to bottom */
export const childrenOf = (nodes: MapaNode[], id: string | null) =>
  nodes.filter((n) => n.pare === id).sort((a, b) => a.y - b.y || a.x - b.x)

/** Ids of a node and all its descendants */
export const subtreeIds = (nodes: MapaNode[], id: string) => {
  const result = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const n of nodes) {
      if (n.pare && result.has(n.pare) && !result.has(n.id)) {
        result.add(n.id)
        grew = true
      }
    }
  }
  return result
}

/** Nodes not hidden by a folded ancestor */
export const visibleNodes = (nodes: MapaNode[]) => {
  const map = byId(nodes)
  const hidden = (n: MapaNode): boolean => {
    let p = n.pare ? map[n.pare] : undefined
    const seen = new Set<string>()
    while (p && !seen.has(p.id)) {
      if (p.plegat) return true
      seen.add(p.id)
      p = p.pare ? map[p.pare] : undefined
    }
    return false
  }
  return nodes.filter((n) => !hidden(n))
}

/** Color of a node: its own or the nearest colored ancestor's */
export const colorOf = (map: Record<string, MapaNode>, id: string): NodeColor => {
  let n: MapaNode | undefined = map[id]
  const seen = new Set<string>()
  while (n && !seen.has(n.id)) {
    if (n.color) return n.color
    seen.add(n.id)
    n = n.pare ? map[n.pare] : undefined
  }
  return 'primari'
}

/** Root of the tree that holds a node */
export const rootOf = (map: Record<string, MapaNode>, id: string): MapaNode | undefined => {
  let n: MapaNode | undefined = map[id]
  const seen = new Set<string>()
  while (n?.pare && map[n.pare] && !seen.has(n.id)) {
    seen.add(n.id)
    n = map[n.pare]
  }
  return n
}

/** Depth of a node (roots are 0) */
export const depthOf = (map: Record<string, MapaNode>, id: string) => {
  let d = 0
  let n = map[id]
  while (n?.pare && map[n.pare] && d < 100) {
    n = map[n.pare]
    d++
  }
  return d
}

const overlaps = (nodes: MapaNode[], x: number, y: number) =>
  nodes.some((n) => Math.abs(n.x - x) < MAPA.NODE_W && Math.abs(n.y - y) < MAPA.NODE_H + 8)

/** Moves a position down until it doesn't overlap any node */
const freeSpot = (nodes: MapaNode[], x: number, y: number) => {
  let ny = y
  for (let i = 0; i < 200 && overlaps(nodes, x, ny); i++) ny += MAPA.SIBLING_GAP_Y / 2
  return ny
}

/** Side (+1 right, -1 left) where the children of a node grow */
const sideOf = (nodes: MapaNode[], node: MapaNode) => {
  const parent = node.pare ? nodes.find((n) => n.id === node.pare) : undefined
  if (parent) return node.x >= parent.x ? 1 : -1
  // Roots balance their children between both sides
  const kids = childrenOf(nodes, node.id)
  const right = kids.filter((k) => k.x >= node.x).length
  return right > kids.length - right ? -1 : 1
}

export const addRoot = (nodes: MapaNode[], x: number, y: number, text = '', id = newId()) => {
  const node: MapaNode = { id, pare: null, text, x, y: freeSpot(nodes, x, y) }
  return { nodes: [...nodes, node], id: node.id }
}

export const addChild = (nodes: MapaNode[], parentId: string, text = '', id = newId()) => {
  const parent = nodes.find((n) => n.id === parentId)
  if (!parent) return { nodes, id: null }
  const side = sideOf(nodes, parent)
  const x = parent.x + side * MAPA.CHILD_GAP_X
  const sameSide = childrenOf(nodes, parent.id).filter((k) => (k.x >= parent.x ? 1 : -1) === side)
  const y = sameSide.length ? sameSide[sameSide.length - 1].y + MAPA.SIBLING_GAP_Y : parent.y
  const node: MapaNode = { id, pare: parent.id, text, x, y: freeSpot(nodes, x, y) }
  // A folded parent opens so the new child is visible
  const next = nodes.map((n) => (n.id === parent.id && n.plegat ? { ...n, plegat: false } : n))
  return { nodes: [...next, node], id: node.id }
}

/** New node below another one, with the same parent (a root gets a child instead) */
export const addSibling = (nodes: MapaNode[], id: string, text = '', newNodeId = newId()) => {
  const node = nodes.find((n) => n.id === id)
  if (!node) return { nodes, id: null }
  if (!node.pare) return addChild(nodes, id, text, newNodeId)
  const sibling: MapaNode = {
    id: newNodeId,
    pare: node.pare,
    text,
    x: node.x,
    y: freeSpot(nodes, node.x, node.y + MAPA.SIBLING_GAP_Y),
  }
  return { nodes: [...nodes, sibling], id: sibling.id }
}

export const removeSubtree = (nodes: MapaNode[], id: string) => {
  const ids = subtreeIds(nodes, id)
  return nodes.filter((n) => !ids.has(n.id))
}

export const updateNode = (nodes: MapaNode[], id: string, patch: Partial<MapaNode>) =>
  nodes.map((n) => (n.id === id ? { ...n, ...patch } : n))

/** Moves a node with all its descendants */
export const moveSubtree = (nodes: MapaNode[], id: string, dx: number, dy: number) => {
  const ids = subtreeIds(nodes, id)
  return nodes.map((n) => (ids.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n))
}

/** Can `id` hang from `parentId` without creating a cycle? */
export const canReparent = (nodes: MapaNode[], id: string, parentId: string | null) => {
  if (parentId === null) return true
  if (parentId === id) return false
  return !subtreeIds(nodes, id).has(parentId)
}

export const reparent = (nodes: MapaNode[], id: string, parentId: string | null) =>
  canReparent(nodes, id, parentId) ? updateNode(nodes, id, { pare: parentId }) : nodes

/**
 * Hangs a node (with its subtree) from another one and moves it to where a new child would go
 */
export const attachTo = (nodes: MapaNode[], id: string, parentId: string) => {
  if (!canReparent(nodes, id, parentId)) return nodes
  const ids = subtreeIds(nodes, id)
  const node = nodes.find((n) => n.id === id)
  if (!node) return nodes
  const rest = nodes.filter((n) => !ids.has(n.id))
  const { nodes: withSpot, id: spotId } = addChild(rest, parentId)
  const spot = withSpot.find((n) => n.id === spotId)
  if (!spot) return nodes
  const moved = moveSubtree(nodes, id, spot.x - node.x, spot.y - node.y)
  return updateNode(moved, id, { pare: parentId }).map((n) =>
    n.id === parentId && n.plegat ? { ...n, plegat: false } : n
  )
}

/** Color for a whole branch: the node gets it and its descendants follow it */
export const setBranchColor = (nodes: MapaNode[], id: string, color: NodeColor) => {
  const ids = subtreeIds(nodes, id)
  return nodes.map((n) => {
    if (n.id === id) return { ...n, color }
    if (ids.has(n.id) && n.color) {
      const { color: _drop, ...rest } = n
      return rest
    }
    return n
  })
}

/**
 * Nearest node for keyboard navigation: left/right go to the parent or the first child
 * (depending on the side), up/down to the previous / next sibling.
 */
export const neighbour = (nodes: MapaNode[], id: string, dir: 'up' | 'down' | 'left' | 'right') => {
  const node = nodes.find((n) => n.id === id)
  if (!node) return null
  const visible = visibleNodes(nodes)
  const parent = node.pare ? visible.find((n) => n.id === node.pare) : undefined
  if (dir === 'up' || dir === 'down') {
    // Siblings on the same side of the parent
    const side = (n: MapaNode) => (parent ? (n.x >= parent.x ? 1 : -1) : 0)
    const list = childrenOf(visible, node.pare).filter((s) => side(s) === side(node))
    const i = list.findIndex((s) => s.id === id)
    return list[dir === 'up' ? i - 1 : i + 1]?.id ?? null
  }
  const want = dir === 'right' ? 1 : -1
  if (parent && Math.sign(parent.x - node.x) === want) return parent.id
  const kids = childrenOf(visible, node.id).filter((k) => Math.sign(k.x - node.x) === want)
  if (!kids.length) return null
  // The child closest to the node vertically
  return kids.reduce((best, k) => (Math.abs(k.y - node.y) < Math.abs(best.y - node.y) ? k : best)).id
}

/** Initial nodes of a map made from a tema: the tema in the middle and its apartats around */
export const nodesFromTema = (tema: Tema, apartatRowId: string | null = null): MapaNode[] => {
  const apartat = apartatRowId ? tema.apartats.find((a) => a.row_id === apartatRowId) : undefined
  const root: MapaNode = { id: newId(), pare: null, text: apartat ? apartat.titol : tema.nom, x: 0, y: 0 }
  if (apartat) return [root]
  const right = Math.ceil(tema.apartats.length / 2)
  const place = (count: number, i: number) => (i - (count - 1) / 2) * MAPA.SIBLING_GAP_Y
  const kids = tema.apartats.map((a, i): MapaNode => {
    const isRight = i < right
    const count = isRight ? right : tema.apartats.length - right
    const index = isRight ? i : i - right
    return {
      id: newId(),
      pare: root.id,
      text: a.titol,
      x: (isRight ? 1 : -1) * MAPA.CHILD_GAP_X * 1.2,
      y: place(count, index),
    }
  })
  return [root, ...kids]
}

const clampZoom = (k: number) => Math.min(MAPA.ZOOM_MAX, Math.max(MAPA.ZOOM_MIN, k))

type Bounds = { minX: number; maxX: number; minY: number; maxY: number }

/** Viewport that shows a world box in w × h screen px (never zooms in past 100%) */
export const fitViewport = (b: Bounds | null, w: number, h: number): Viewport => {
  if (!b || !w || !h) return { x: w / 2, y: h / 2, k: 1 }
  const pad = MAPA.FIT_PADDING
  const k = clampZoom(Math.min(1, (w - pad * 2) / (b.maxX - b.minX), (h - pad * 2) / (b.maxY - b.minY)))
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  return { x: w / 2 - cx * k, y: h / 2 - cy * k, k }
}

/** Zooms by a factor keeping the screen point (sx, sy) still */
export const zoomAt = (vp: Viewport, factor: number, sx: number, sy: number): Viewport => {
  const k = clampZoom(vp.k * factor)
  const f = k / vp.k
  return { k, x: sx - (sx - vp.x) * f, y: sy - (sy - vp.y) * f }
}

export const toWorld = (vp: Viewport, sx: number, sy: number) => ({ x: (sx - vp.x) / vp.k, y: (sy - vp.y) / vp.k })

/** Viewport that puts a world point in the middle of the screen */
export const centerOn = (vp: Viewport, x: number, y: number, w: number, h: number): Viewport => ({
  ...vp,
  x: w / 2 - x * vp.k,
  y: h / 2 - y * vp.k,
})

/** Is a world point (with the node size) outside the visible area? */
export const isOffscreen = (vp: Viewport, x: number, y: number, w: number, h: number) => {
  const sx = x * vp.k + vp.x
  const sy = y * vp.k + vp.y
  const mx = (MAPA.NODE_W / 2) * vp.k
  const my = (MAPA.NODE_H / 2) * vp.k
  return sx - mx < 0 || sx + mx > w || sy - my < 0 || sy + my > h
}

/** Short label of the temari link of a map: "T3", "T3 · 3.2" or null for a free map */
export const linkLabel = (structure: Structure, temaId: string | null, rowId: string | null) => {
  const tema = structure.temes.find((t) => t.id === temaId)
  if (!tema) return null
  const apartat = tema.apartats.find((a) => a.row_id === rowId)
  return apartat ? `${temaShortCode(tema)} · ${apartat.num}` : temaShortCode(tema)
}
