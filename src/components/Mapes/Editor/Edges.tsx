import { memo } from 'react'
import { colorOf, depthOf, edgePath } from '../logic'
import { MapaNode } from '../types'

/**
 * Branch curves between every visible node and its parent, drawn below the nodes
 */
export const Edges = memo(({ nodes, map }: { nodes: MapaNode[]; map: Record<string, MapaNode> }) => (
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
      return (
        <path
          key={n.id}
          d={edgePath(parent, n)}
          fill='none'
          stroke={`var(--chakra-colors-mapa-${colorOf(map, n.id)})`}
          strokeWidth={depth <= 1 ? 3 : 2}
          strokeLinecap='round'
          opacity={depth <= 1 ? 0.9 : 0.7}
        />
      )
    })}
  </svg>
))
Edges.displayName = 'Edges'
