import { memo, PointerEvent } from 'react'
import { marcaHitRects } from '../logic'
import { MarcaText } from '../types'

const tokenVar = (token: string) => `var(--chakra-colors-${token.replace(/\./g, '-')})`

const svgStyle = { position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' } as const

// Underline thickness and how far it sits above the bottom of the line box (PDF points)
const UNDERLINE_W = 1.25
const UNDERLINE_LIFT = 1
// Rounded corners of a highlight, and the gap around a selected mark (PDF points)
const HIGHLIGHT_R = 1.5
const SELECTED_PAD = 2

/** Highlights: marker tints, for the layer blended with the print (multiply) */
export const HighlightsLayer = memo(({ marques }: { marques: MarcaText[] }) => (
  <svg width={1} height={1} style={svgStyle} aria-hidden>
    {marques.map((m) =>
      m.tipus === 'ressaltat' ? (
        <g key={m.id} fill={tokenVar(`pdf.marca.${m.color}`)}>
          {m.rects.map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={HIGHLIGHT_R} />
          ))}
        </g>
      ) : null
    )}
  </svg>
))
HighlightsLayer.displayName = 'HighlightsLayer'

/**
 * Underlines (ink), the outline of the selected mark and, with the selection tool, the areas that
 * react to a tap. Only the marks themselves take the pointer: the text around them stays selectable.
 */
export const MarquesInkLayer = memo(
  ({
    marques,
    selectedId,
    interactive,
    onMarcaPointerDown,
  }: {
    marques: MarcaText[]
    selectedId: string | null
    interactive: boolean
    onMarcaPointerDown: (id: string, e: PointerEvent) => void
  }) => (
    <svg width={1} height={1} style={svgStyle} aria-hidden>
      {marques.map((m) => (
        <g key={m.id}>
          {m.id === selectedId &&
            m.rects.map((r, i) => (
              <rect
                key={`s${i}`}
                x={r.x - SELECTED_PAD}
                y={r.y - SELECTED_PAD}
                width={r.w + SELECTED_PAD * 2}
                height={r.h + SELECTED_PAD * 2}
                rx={HIGHLIGHT_R + SELECTED_PAD}
                fill='none'
                stroke={tokenVar('accent')}
                strokeWidth={1.5}
              />
            ))}
          {m.tipus === 'subratllat' &&
            m.rects.map((r, i) => (
              <line
                key={`u${i}`}
                x1={r.x}
                x2={r.x + r.w}
                y1={r.y + r.h - UNDERLINE_LIFT}
                y2={r.y + r.h - UNDERLINE_LIFT}
                stroke={tokenVar(`pdf.${m.color}`)}
                strokeWidth={UNDERLINE_W}
                strokeLinecap='round'
              />
            ))}
          {interactive &&
            marcaHitRects(m).map((r, i) => (
              <rect
                key={`h${i}`}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill='transparent'
                style={{ pointerEvents: 'fill', cursor: 'pointer', touchAction: 'pan-x pan-y' }}
                onPointerDown={(e) => onMarcaPointerDown(m.id, e)}
                // A drag that starts on a mark doesn't select text
                onMouseDown={(e) => e.preventDefault()}
              />
            ))}
        </g>
      ))}
    </svg>
  )
)
MarquesInkLayer.displayName = 'MarquesInkLayer'
