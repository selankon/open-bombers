import { Box } from '@chakra-ui/react'
import { PointerEvent, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { constrain } from '~components/Mapes/Editor/Canvas'
import { Draft, DraftLayer, FormesLayer, ImatgesLayer, TracesLayer } from '~components/Mapes/Editor/Drawings'
import { ItemRef } from '~components/Mapes/types'
import { MAPA, PDF } from '~utils/constants'
import { BrushPdf, EinaPdf, PageSize, PaginaAnotacions, SeleccioPdf } from '../types'
import { PageHandlers, trackPointer } from './handlers'
import { HighlightsLayer, MarquesInkLayer } from './MarquesLayer'

type Pt = { x: number; y: number }

type PageOverlayProps = {
  page: number
  size: PageSize
  // Screen px per PDF point
  scale: number
  pagina: PaginaAnotacions
  tool: EinaPdf
  brush: BrushPdf
  // Once a stylus has drawn, fingers scroll and zoom instead of drawing
  penSeen: boolean
  selected: SeleccioPdf | null
  handlers: PageHandlers
}

const NO_NODES = {}

type Gesture =
  | { type: 'draw'; punts: [number, number, number][]; pressio: boolean }
  | { type: 'shape'; from: Pt; to: Pt }
  | { type: 'erase' }
  | { type: 'note'; start: Pt; client: Pt }

/**
 * Annotations of one page, drawn in PDF points and scaled with the page. With a drawing tool it
 * takes the pointer (pen, highlighter, shapes, eraser, notes); with the selection tool only the
 * annotations themselves react, so the text under them stays selectable.
 */
export const PageOverlay = ({
  page,
  size,
  scale,
  pagina,
  tool,
  brush,
  penSeen,
  selected,
  handlers,
}: PageOverlayProps) => {
  const { t } = useTranslation()
  const el = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const pointers = useRef(new Set<number>())
  const [draft, setDraft] = useState<Draft | null>(null)
  const propsRef = useRef({ page, size, pagina, brush, tool, handlers })
  propsRef.current = { page, size, pagina, brush, tool, handlers }

  // `text` leaves the pointer to the text layer (the user selects the text to mark)
  const drawing = tool !== 'seleccio' && tool !== 'text'

  // Client point → page point. Uses the real box, so it also works mid-pinch (scaled with a transform).
  const toPage = (e: { clientX: number; clientY: number }) => {
    const r = el.current!.getBoundingClientRect()
    const f = propsRef.current.size.w / (r.width || 1)
    return { x: (e.clientX - r.left) * f, y: (e.clientY - r.top) * f, f }
  }

  const cancel = () => {
    gesture.current = null
    setDraft(null)
  }

  const onPointerDown = (e: PointerEvent) => {
    const P = propsRef.current
    if (e.pointerType === 'pen') P.handlers.onPenSeen()
    if (!drawing || e.button !== 0) return
    if (e.pointerType === 'touch' && penSeen) return
    pointers.current.add(e.pointerId)
    // A second finger: it's a pinch (the reader zooms), not a stroke
    if (pointers.current.size > 1) return cancel()
    e.preventDefault()
    el.current?.setPointerCapture(e.pointerId)
    const p = toPage(e)
    if (P.tool === 'goma') {
      gesture.current = { type: 'erase' }
      const r = PDF.ERASER_RADIUS * p.f
      P.handlers.onEraseStart()
      P.handlers.onErase(P.page, p.x, p.y, r)
      setDraft({ kind: 'goma', x: p.x, y: p.y, r })
    } else if (P.tool === 'forma') {
      gesture.current = { type: 'shape', from: p, to: p }
    } else if (P.tool === 'nota') {
      gesture.current = { type: 'note', start: p, client: { x: e.clientX, y: e.clientY } }
    } else if (P.tool === 'ploma' || P.tool === 'subratllador') {
      const pressio = e.pointerType === 'pen'
      const punts: [number, number, number][] = [[p.x, p.y, pressio ? e.pressure || 0.5 : 0.5]]
      gesture.current = { type: 'draw', punts, pressio }
      setDraft({ kind: 'trace', eina: P.tool, color: P.brush.color, gruix: P.brush.gruix, pressio, punts })
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    const g = gesture.current
    const P = propsRef.current
    if (!g || !pointers.current.has(e.pointerId)) return
    switch (g.type) {
      case 'draw': {
        // Coalesced events give smoother strokes with fast pens
        const events = (e.nativeEvent as globalThis.PointerEvent).getCoalescedEvents?.() ?? []
        for (const ev of events.length ? events : [e.nativeEvent]) {
          const p = toPage(ev)
          g.punts.push([p.x, p.y, ev.pointerType === 'pen' ? ev.pressure || 0.5 : 0.5])
        }
        setDraft((d) => (d?.kind === 'trace' ? { ...d, punts: [...g.punts] } : d))
        return
      }
      case 'shape': {
        let to: Pt = toPage(e)
        if (e.shiftKey) to = constrain(P.brush.forma, g.from, to)
        g.to = to
        setDraft({
          kind: 'forma',
          forma: { tipus: P.brush.forma, x1: g.from.x, y1: g.from.y, x2: to.x, y2: to.y, ...colorWidth(P.brush) },
        })
        return
      }
      case 'erase': {
        const p = toPage(e)
        const r = PDF.ERASER_RADIUS * p.f
        P.handlers.onErase(P.page, p.x, p.y, r)
        setDraft({ kind: 'goma', x: p.x, y: p.y, r })
      }
    }
  }

  const onPointerUp = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    const P = propsRef.current
    cancel()
    if (!g || e.type === 'pointercancel') return
    if (g.type === 'draw') P.handlers.onAddTrace(P.page, g.punts, g.pressio)
    else if (g.type === 'shape') {
      const minSize = 4 * toPage(e).f
      if (Math.hypot(g.to.x - g.from.x, g.to.y - g.from.y) >= minSize) {
        P.handlers.onAddForma(P.page, {
          tipus: P.brush.forma,
          x1: g.from.x,
          y1: g.from.y,
          x2: g.to.x,
          y2: g.to.y,
          ...colorWidth(P.brush),
        })
      }
    } else if (g.type === 'note') {
      if (Math.hypot(e.clientX - g.client.x, e.clientY - g.client.y) < MAPA.DRAG_THRESHOLD * 2) {
        P.handlers.onAddNote(P.page, g.start.x, g.start.y)
      }
    }
  }

  // ---- Selection tool: select, move and resize annotations ----
  const onItemPointerDown = useCallback((ref: ItemRef, e: PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const P = propsRef.current
    P.handlers.onSelect({ page: P.page, ...ref })
    let last = toPage(e)
    trackPointer(e, MAPA.DRAG_THRESHOLD, {
      onDragStart: P.handlers.onCheckpoint,
      onDrag: (c) => {
        const p = toPage({ clientX: c.x, clientY: c.y })
        propsRef.current.handlers.onItemDragMove(propsRef.current.page, ref, p.x - last.x, p.y - last.y)
        last = p
      },
    })
  }, [])

  const onResizePointerDown = useCallback((id: string, e: PointerEvent) => {
    const P = propsRef.current
    const img = P.pagina.imatges.find((i) => i.id === id)
    if (!img) return
    const start = toPage(e)
    trackPointer(e, 0, {
      onDragStart: P.handlers.onCheckpoint,
      onDrag: (c) => {
        const p = toPage({ clientX: c.x, clientY: c.y })
        const w = Math.max(16, img.w + (p.x - start.x))
        propsRef.current.handlers.onResize(propsRef.current.page, id, w, (w * img.h) / img.w)
      },
    })
  }, [])

  // A tap on a highlight or underline selects it (a drag over it still scrolls)
  const onMarcaPointerDown = useCallback((id: string, e: PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    trackPointer(e, MAPA.DRAG_THRESHOLD, {
      onDrag: () => undefined,
      onTap: () => propsRef.current.handlers.onSelect({ page: propsRef.current.page, kind: 'marca', id }),
    })
  }, [])

  const interactive = tool === 'seleccio'
  const itemProps = {
    interactive,
    selected: selected && selected.kind !== 'marca' ? { kind: selected.kind, id: selected.id } : null,
    onItemPointerDown,
    palette: 'pdf' as const,
  }

  return (
    <Box
      ref={el}
      position='absolute'
      inset={0}
      pointerEvents={drawing ? 'auto' : 'none'}
      cursor={drawing ? 'crosshair' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      sx={{ touchAction: drawing && !penSeen ? 'none' : 'pan-x pan-y' }}
    >
      {/* Highlighter: blended with the print (multiply). No z-index on the parent, so the blend reaches the canvas. */}
      <Box
        position='absolute'
        left={0}
        top={0}
        transformOrigin='0 0'
        style={{ transform: `scale(${scale})`, mixBlendMode: 'multiply' }}
      >
        <HighlightsLayer marques={pagina.marques} />
        <TracesLayer traces={pagina.traces.filter((tr) => tr.eina === 'subratllador')} map={NO_NODES} {...itemProps} />
        {draft?.kind === 'trace' && draft.eina === 'subratllador' && <DraftLayer draft={draft} palette='pdf' />}
      </Box>
      {/* Everything else, in PDF points scaled to the screen */}
      <Box position='absolute' left={0} top={0} transformOrigin='0 0' style={{ transform: `scale(${scale})` }}>
        <MarquesInkLayer
          marques={pagina.marques}
          selectedId={selected?.kind === 'marca' ? selected.id : null}
          interactive={interactive}
          onMarcaPointerDown={onMarcaPointerDown}
        />
        <ImatgesLayer
          imatges={pagina.imatges}
          {...itemProps}
          onResizePointerDown={onResizePointerDown}
          altText={t('anotacions.image_alt', { defaultValue: 'Imatge enganxada al PDF' })}
          resizeLabel={t('anotacions.image_resize', { defaultValue: 'Canvia la mida de la imatge' })}
        />
        <FormesLayer formes={pagina.formes} {...itemProps} />
        <TracesLayer traces={pagina.traces.filter((tr) => tr.eina === 'ploma')} map={NO_NODES} {...itemProps} />
        {!(draft?.kind === 'trace' && draft.eina === 'subratllador') && <DraftLayer draft={draft} palette='pdf' />}
      </Box>
    </Box>
  )
}

const colorWidth = (b: BrushPdf) => ({ color: b.color, gruix: b.gruix })
