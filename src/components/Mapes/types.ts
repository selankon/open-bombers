// Colors of branches and drawings. Each one has the semantic tokens `mapa.<color>`, `mapa.<color>.bg`
// (soft tint) and `mapa.<color>.solid` (strong fill with white text)
export const MAPA_COLORS = ['tinta', 'primari', 'blau', 'verd', 'groc', 'vermell', 'lila'] as const
export type MapaColor = (typeof MAPA_COLORS)[number]
// Color picked by the user for an idea: `#rrggbb` or `#rrggbbaa` (see-through / transparent)
export type CustomColor = `#${string}`
export type NodeColor = MapaColor | CustomColor

// Look of an idea
export const NODE_FORMES = ['rectangle', 'pindola', 'cercle', 'text'] as const
export type NodeForma = (typeof NODE_FORMES)[number]
export const NODE_EMPLENATS = ['buit', 'suau', 'ple'] as const
export type NodeEmplenat = (typeof NODE_EMPLENATS)[number]
export const NODE_MIDES = ['s', 'm', 'l'] as const
export type NodeMida = (typeof NODE_MIDES)[number]

// Line from the parent to an idea
export const BRANCA_GRUIXOS = [1, 2, 3, 5, 8] as const
export const BRANCA_ESTILS = ['continua', 'discontinua', 'puntejada'] as const
export type BrancaEstil = (typeof BRANCA_ESTILS)[number]
export const BRANCA_TRACATS = ['corba', 'recta', 'colze'] as const
export type BrancaTracat = (typeof BRANCA_TRACATS)[number]

export interface BrancaStyle {
  // Width in px (default: depends on the depth)
  gruix?: number
  estil?: BrancaEstil
  tracat?: BrancaTracat
  // Arrow head at the idea
  fletxa?: boolean
  // Label written on the line
  text?: string
}

/**
 * A mind map node. Nodes without `pare` are roots (a map can hold several trees).
 * `x`/`y` are the center of the node in world coordinates.
 */
export interface MapaNode {
  id: string
  pare: string | null
  text: string
  x: number
  y: number
  // Own color; when missing the node uses the color of its nearest colored ancestor
  color?: NodeColor
  // Hides the descendants
  plegat?: boolean
  // Style (defaults: rectangle, empty fill except roots, medium text)
  forma?: NodeForma
  emplenat?: NodeEmplenat
  mida?: NodeMida
  // Line that joins the node with its parent
  branca?: BrancaStyle
}

export type Eina = 'ploma' | 'subratllador'

/**
 * A handwritten stroke. Points are [x, y, pressure] in world coordinates, or relative to the node
 * center when `node` is set (so the ink moves with the node).
 */
export interface MapaTrace {
  id: string
  node: string | null
  eina: Eina
  color: MapaColor
  gruix: number
  // Whether the pressure comes from a pen (otherwise it is simulated from the speed)
  pressio?: boolean
  punts: [number, number, number][]
}

export const FORMA_TIPUS = ['rect', 'elipse', 'linia', 'fletxa'] as const
export type FormaTipus = (typeof FORMA_TIPUS)[number]

/** A geometric shape drawn with the shapes tool, from (x1, y1) to (x2, y2) */
export interface MapaForma {
  id: string
  tipus: FormaTipus
  x1: number
  y1: number
  x2: number
  y2: number
  color: MapaColor
  gruix: number
}

/** A pasted / inserted picture. (x, y) is the top-left corner. `src` is a data URL. */
export interface MapaImatge {
  id: string
  x: number
  y: number
  w: number
  h: number
  src: string
}

// Everything the editor changes (and undo / redo restores)
export interface MapaContingut {
  nodes: MapaNode[]
  traces: MapaTrace[]
  formes: MapaForma[]
  imatges: MapaImatge[]
}

export interface MapaMental extends MapaContingut {
  id: string
  titol: string
  // Linked tema (id) and apartat (row_id). Both null for a free map.
  tema_id: string | null
  row_id: string | null
  creat: string
  modificat: string
}

// A single map saved as a file to share it (".mapa.json")
export interface MapaFile {
  format: string
  version: number
  exported_at: string
  mapa: MapaMental
}

// What the list needs from every map
export interface MapaResum {
  id: string
  titol: string
  tema_id: string | null
  row_id: string | null
  creat: string
  modificat: string
  num_nodes: number
}

export interface NouMapaParams {
  titol: string
  tema_id: string | null
  row_id: string | null
  // Initial nodes (e.g. the tema with its apartats). Empty: one root with the title.
  nodes?: MapaNode[]
}

export interface MapaInfoParams {
  id: string
  titol: string
  tema_id: string | null
  row_id: string | null
}

export type SaveContentParams = { id: string } & MapaContingut

export interface Viewport {
  x: number
  y: number
  k: number
}

// Canvas tools
export type Tool = 'seleccio' | 'ploma' | 'subratllador' | 'goma' | 'forma'

// Selected drawing element (ideas use their own selection)
export type ItemRef = { kind: 'trace' | 'forma' | 'imatge'; id: string }

// Measured size of every node (world px)
export type NodeSizes = Record<string, { w: number; h: number }>
