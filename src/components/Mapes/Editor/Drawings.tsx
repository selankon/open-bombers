import { Box } from '@chakra-ui/react'
import { memo, PointerEvent } from 'react'
import { absPoints } from '../content'
import { formaPaths } from '../geometry'
import { centerLine, HIGHLIGHTER_OPACITY, strokePath } from '../ink'
import { ItemRef, MapaForma, MapaImatge, MapaNode, MapaTrace } from '../types'

type ItemHandlers = {
  // Only with the selection tool
  interactive: boolean
  selected: ItemRef | null
  onItemPointerDown: (ref: ItemRef, e: PointerEvent) => void
}

const svgStyle = { position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' } as const
const tokenVar = (token: string) => `var(--chakra-colors-${token.replace(/\./g, '-')})`
const SELECTED = tokenVar('accent')

const hitProps = (interactive: boolean, onDown: (e: PointerEvent) => void, width: number) =>
  interactive
    ? {
        fill: 'none',
        stroke: 'transparent',
        strokeWidth: Math.max(16, width + 10),
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        style: { pointerEvents: 'stroke' as const, cursor: 'move' },
        onPointerDown: onDown,
      }
    : null

/** Handwritten strokes (one layer for the highlighter, below the ideas, and one for the pen, above) */
export const TracesLayer = memo(
  ({
    traces,
    map,
    interactive,
    selected,
    onItemPointerDown,
  }: { traces: MapaTrace[]; map: Record<string, MapaNode> } & ItemHandlers) => (
    <svg width={1} height={1} style={svgStyle} aria-hidden>
      {traces.map((t) => {
        const pts = absPoints(t, map)
        const hit = hitProps(interactive, (e) => onItemPointerDown({ kind: 'trace', id: t.id }, e), t.gruix)
        const isSel = selected?.kind === 'trace' && selected.id === t.id
        return (
          <g key={t.id}>
            {isSel && (
              <path
                d={centerLine(pts)}
                fill='none'
                stroke={SELECTED}
                strokeWidth={t.gruix + 8}
                strokeLinecap='round'
                strokeLinejoin='round'
                opacity={0.25}
              />
            )}
            <path
              d={strokePath(pts, t.eina, t.gruix, !!t.pressio)}
              fill={tokenVar(`mapa.${t.color}`)}
              opacity={t.eina === 'subratllador' ? HIGHLIGHTER_OPACITY : 1}
            />
            {hit && <path d={centerLine(pts)} {...hit} />}
          </g>
        )
      })}
    </svg>
  )
)
TracesLayer.displayName = 'TracesLayer'

export const FormaShape = ({ f, opacity = 1 }: { f: Omit<MapaForma, 'id'>; opacity?: number }) => {
  const { d, arrow } = formaPaths(f)
  const color = tokenVar(`mapa.${f.color}`)
  return (
    <g opacity={opacity}>
      <path d={d} fill='none' stroke={color} strokeWidth={f.gruix} strokeLinecap='round' strokeLinejoin='round' />
      {arrow && <path d={arrow} fill={color} stroke={color} strokeWidth={1} strokeLinejoin='round' />}
    </g>
  )
}

/** Shapes drawn with the shapes tool */
export const FormesLayer = memo(
  ({ formes, interactive, selected, onItemPointerDown }: { formes: MapaForma[] } & ItemHandlers) => (
    <svg width={1} height={1} style={svgStyle} aria-hidden>
      {formes.map((f) => {
        const hit = hitProps(interactive, (e) => onItemPointerDown({ kind: 'forma', id: f.id }, e), f.gruix)
        const isSel = selected?.kind === 'forma' && selected.id === f.id
        return (
          <g key={f.id}>
            {isSel && (
              <path
                d={formaPaths(f).d}
                fill='none'
                stroke={SELECTED}
                strokeWidth={f.gruix + 8}
                strokeLinecap='round'
                opacity={0.25}
              />
            )}
            <FormaShape f={f} />
            {hit && <path d={formaPaths(f).d} {...hit} />}
          </g>
        )
      })}
    </svg>
  )
)
FormesLayer.displayName = 'FormesLayer'

/** Pasted pictures, with a resize handle on the selected one */
export const ImatgesLayer = memo(
  ({
    imatges,
    interactive,
    selected,
    onItemPointerDown,
    onResizePointerDown,
    altText,
    resizeLabel,
  }: {
    imatges: MapaImatge[]
    onResizePointerDown: (id: string, e: PointerEvent) => void
    altText: string
    resizeLabel: string
  } & ItemHandlers) => (
    <>
      {imatges.map((i) => {
        const isSel = selected?.kind === 'imatge' && selected.id === i.id
        return (
          <Box
            key={i.id}
            position='absolute'
            left={`${i.x}px`}
            top={`${i.y}px`}
            w={`${i.w}px`}
            h={`${i.h}px`}
            pointerEvents={interactive ? 'auto' : 'none'}
            cursor='move'
            onPointerDown={(e: PointerEvent) => onItemPointerDown({ kind: 'imatge', id: i.id }, e)}
            borderRadius='sm'
            boxShadow={isSel ? `0 0 0 2px ${SELECTED}` : 'card'}
            sx={{ touchAction: 'none' }}
          >
            <img
              src={i.src}
              alt={altText}
              draggable={false}
              style={{ width: '100%', height: '100%', display: 'block', borderRadius: 10, userSelect: 'none' }}
            />
            {isSel && interactive && (
              <Box
                as='span'
                role='button'
                aria-label={resizeLabel}
                position='absolute'
                right='-10px'
                bottom='-10px'
                w={5}
                h={5}
                borderRadius='full'
                bg='surface'
                borderWidth='2px'
                borderColor='accent'
                boxShadow='raised'
                cursor='nwse-resize'
                onPointerDown={(e: PointerEvent) => {
                  e.stopPropagation()
                  onResizePointerDown(i.id, e)
                }}
              />
            )}
          </Box>
        )
      })}
    </>
  )
)
ImatgesLayer.displayName = 'ImatgesLayer'

/** Stroke or shape being drawn right now */
export type Draft =
  | {
      kind: 'trace'
      eina: MapaTrace['eina']
      color: MapaTrace['color']
      gruix: number
      pressio: boolean
      punts: [number, number, number][]
    }
  | { kind: 'forma'; forma: Omit<MapaForma, 'id'> }
  | { kind: 'goma'; x: number; y: number; r: number }

export const DraftLayer = ({ draft }: { draft: Draft | null }) => {
  if (!draft) return null
  return (
    <svg width={1} height={1} style={svgStyle} aria-hidden>
      {draft.kind === 'trace' && (
        <path
          d={strokePath(draft.punts, draft.eina, draft.gruix, draft.pressio, false)}
          fill={tokenVar(`mapa.${draft.color}`)}
          opacity={draft.eina === 'subratllador' ? HIGHLIGHTER_OPACITY : 1}
        />
      )}
      {draft.kind === 'forma' && <FormaShape f={draft.forma} opacity={0.8} />}
      {draft.kind === 'goma' && (
        <circle
          cx={draft.x}
          cy={draft.y}
          r={draft.r}
          fill='none'
          stroke={tokenVar('textMuted')}
          strokeWidth={1}
          strokeDasharray='3 3'
        />
      )}
    </svg>
  )
}
