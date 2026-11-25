import { MapaColor, MapaNode, NodeEmplenat, NodeForma, NodeMida } from './types'

/**
 * Resolved look of an idea, shared by the editor (Chakra) and the export (canvas) so both match
 */

const FONT_PX: Record<'root' | 'child', Record<NodeMida, number>> = {
  root: { s: 14, m: 16, l: 20 },
  child: { s: 12, m: 14, l: 18 },
}

export const LINE_HEIGHT = 1.35

export interface NodeLook {
  forma: NodeForma
  emplenat: NodeEmplenat
  mida: NodeMida
  fontPx: number
  fontWeight: number
  padX: number
  padY: number
  borderPx: number
  // Max text width before wrapping (px)
  maxW: number
  minW: number
  // Tokens
  fill: string | null
  stroke: string | null
  text: string
}

export const nodeLook = (node: MapaNode, isRoot: boolean, color: MapaColor): NodeLook => {
  const forma = node.forma ?? 'rectangle'
  const emplenat = node.emplenat ?? (isRoot ? 'suau' : 'buit')
  const mida = node.mida ?? 'm'
  const round = forma === 'cercle'
  return {
    forma,
    emplenat,
    mida,
    fontPx: FONT_PX[isRoot ? 'root' : 'child'][mida],
    fontWeight: isRoot ? 700 : 500,
    padX: round ? 18 : isRoot ? 20 : 16,
    padY: round ? 18 : isRoot ? 12 : 8,
    borderPx: forma === 'text' ? 0 : isRoot ? 2 : 1.5,
    maxW: round ? 140 : isRoot ? 280 : 240,
    minW: round ? 72 : isRoot ? 96 : 64,
    fill:
      emplenat === 'ple'
        ? `mapa.${color}.solid`
        : emplenat === 'suau'
          ? `mapa.${color}.bg`
          : forma === 'text'
            ? null
            : 'surface',
    stroke: forma === 'text' ? null : `mapa.${color}`,
    text: emplenat === 'ple' ? 'mapa.onSolid' : 'textPrimary',
  }
}

/** Corner radius (px) of an idea of height h */
export const nodeRadius = (look: NodeLook, isRoot: boolean, h: number) =>
  look.forma === 'pindola' ? h / 2 : look.forma === 'rectangle' ? (isRoot ? 16 : 10) : look.forma === 'text' ? 8 : 0
