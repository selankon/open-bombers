import { memo, MouseEvent, PointerEvent } from 'react'
import { sizeOf } from '../content'
import { edgeGeometry } from '../geometry'
import { colorOf, depthOf } from '../logic'
import { MapaNode, NodeSizes } from '../types'

type EdgesProps = {
  nodes: MapaNode[]
  map: Record<string, MapaNode>
  sizes: NodeSizes
  selectedId: string | null
  // Lines react to taps only with the selection tool
  interactive: boolean
  onSelect: (id: string) => void
  onEditLabel: (id: string) => void
}

/**
 * Lines between every visible idea and its parent, drawn below the ideas.
 * A tap on a line selects its idea (to change the line style); a double tap writes on it.
 */
export const Edges = memo(({ nodes, map, sizes, selectedId, interactive, onSelect, onEditLabel }: EdgesProps) => (
  <svg
    width={1}
    height={1}
    style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
    aria-hidden
  >
    {nodes.map((n) => {
      const parent = n.pare ? map[n.pare] : undefined
      if (!parent) return null
      const depth = depthOf(map, n.id)
      const g = edgeGeometry(parent, n, sizeOf(sizes, parent.id), sizeOf(sizes, n.id), depth)
      const color = `var(--chakra-colors-mapa-${colorOf(map, n.id)})`
      const selected = n.id === selectedId
      return (
        <g key={n.id} opacity={selected ? 1 : depth <= 1 ? 0.9 : 0.7}>
          <path
            d={g.d}
            fill='none'
            stroke={color}
            strokeWidth={g.width + (selected ? 1 : 0)}
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeDasharray={g.dash?.join(' ')}
          />
          {g.arrow && <path d={g.arrow} fill={color} stroke={color} strokeWidth={1} strokeLinejoin='round' />}
          {interactive && (
            <path
              d={g.d}
              fill='none'
              stroke='transparent'
              strokeWidth={Math.max(16, g.width + 12)}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onPointerDown={(e: PointerEvent) => {
                e.stopPropagation()
                onSelect(n.id)
              }}
              onDoubleClick={(e: MouseEvent) => {
                e.stopPropagation()
                onEditLabel(n.id)
              }}
            />
          )}
        </g>
      )
    })}
  </svg>
))
Edges.displayName = 'Edges'
