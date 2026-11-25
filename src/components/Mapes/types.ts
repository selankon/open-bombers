// Branch colors. Each one has the semantic tokens `mapa.<color>` and `mapa.<color>.bg`
export const MAPA_COLORS = ['primari', 'blau', 'verd', 'groc', 'vermell', 'lila'] as const
export type MapaColor = (typeof MAPA_COLORS)[number]

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
  color?: MapaColor
  // Hides the descendants
  plegat?: boolean
}

/**
 * A handwritten stroke (phase 2). Points are [x, y, pressure] in world coordinates, or relative
 * to the node center when `node` is set (so the ink moves with the node).
 */
export interface MapaTrace {
  id: string
  node: string | null
  eina: 'ploma' | 'subratllador'
  color: MapaColor
  gruix: number
  punts: [number, number, number][]
}

export interface MapaMental {
  id: string
  titol: string
  // Linked tema (id) and apartat (row_id). Both null for a free map.
  tema_id: string | null
  row_id: string | null
  creat: string
  modificat: string
  nodes: MapaNode[]
  traces: MapaTrace[]
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

export interface Viewport {
  x: number
  y: number
  k: number
}
