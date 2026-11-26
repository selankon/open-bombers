import { Box } from '@chakra-ui/react'
import {
  forwardRef,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { MAPA } from '~utils/constants'
import { visibleTraces } from '../content'
import { byId, canReparent, childrenOf, colorOf, toWorld, visibleNodes } from '../logic'
import { FormaTipus, ItemRef, MapaColor, MapaContingut, MapaForma, NodeSizes, Tool, Viewport } from '../types'
import { Draft, DraftLayer, FormesLayer, ImatgesLayer, TracesLayer } from './Drawings'
import { EdgeLabels } from './EdgeLabels'
import { Edges } from './Edges'
import { NodeView } from './NodeView'

type Pt = { x: number; y: number }

type Gesture =
  | { type: 'pan'; start: Pt; vp: Viewport; moved: boolean }
  | { type: 'pinch'; dist: number; mid: Pt; vp: Viewport }
  | { type: 'node'; id: string; last: Pt; start: Pt; moved: boolean }
  | { type: 'item'; ref: ItemRef; last: Pt; start: Pt; moved: boolean }
  | { type: 'resize'; id: string; start: Pt; w: number; h: number; started: boolean }
  | { type: 'draw'; punts: [number, number, number][]; pressio: boolean }
  | { type: 'shape'; from: Pt; to: Pt }
  | { type: 'erase' }

export type CanvasHandle = { focus: () => void }

export type Brush = { color: MapaColor; gruix: number; forma: FormaTipus }

type CanvasProps = {
  content: MapaContingut
  sizes: NodeSizes
  vp: Viewport
  vpRef: { current: Viewport }
  setVp: (vp: Viewport | ((v: Viewport) => Viewport)) => void
  tool: Tool
  brush: Brush
  selectedId: string | null
  selectedItem: ItemRef | null
  editingId: string | null
  editDraft: string | null
  labelEditingId: string | null
  dragIds: Set<string> | null
  dropTarget: string | null
  onSize: (id: string, w: number, h: number) => void
  onSelect: (id: string | null) => void
  onSelectItem: (ref: ItemRef | null) => void
  onTapSelected: (id: string) => void
  onEdit: (id: string) => void
  onDragStart: (id: string) => void
  onDragMove: (id: string, dx: number, dy: number, target: string | null) => void
  onDragEnd: (id: string, target: string | null) => void
  onItemDragStart: (ref: ItemRef) => void
  onItemDragMove: (ref: ItemRef, dx: number, dy: number) => void
  onResizeStart: () => void
  onResize: (id: string, w: number, h: number) => void
  onToggleFold: (id: string) => void
  onBackgroundDoubleClick: (x: number, y: number) => void
  onCommit: (id: string, text: string, next?: 'child' | 'sibling') => void
  onCancel: (id: string) => void
  onEditLabel: (id: string) => void
  onCommitLabel: (id: string, text: string) => void
  onCancelLabel: () => void
  onAddTrace: (punts: [number, number, number][], pressio: boolean) => void
  onAddForma: (forma: Omit<MapaForma, 'id'>) => void
  onEraseStart: () => void
  onErase: (x: number, y: number, r: number) => void
  onKeyDown: (e: KeyboardEvent) => void
  ariaLabel: string
}

const isDrawingTool = (tool: Tool) => tool !== 'seleccio'

/**
 * The infinite canvas.
 * - Selection tool: drag the background (or one finger) to pan, pinch / wheel to zoom, drag ideas
 *   (with their branch) and drawings, drop an idea on another one to hang it there.
 * - Drawing tools: the pen / mouse draws. Once a stylus has been used, fingers pan and zoom instead
 *   of drawing (palm friendly, like on paper apps).
 */
export const Canvas = forwardRef<CanvasHandle, CanvasProps>((props, ref) => {
  const { content, sizes, vp, vpRef, setVp, tool, brush, selectedId, selectedItem } = props
  const { t } = useTranslation()
  const el = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, Pt>())
  const gesture = useRef<Gesture | null>(null)
  const penSeen = useRef(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const nodesRef = useRef(content.nodes)
  nodesRef.current = content.nodes
  const propsRef = useRef(props)
  propsRef.current = props

  useImperativeHandle(ref, () => ({ focus: () => el.current?.focus({ preventScroll: true }) }), [])

  const local = (e: { clientX: number; clientY: number }) => {
    const rect = el.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  const world = (e: { clientX: number; clientY: number }) => {
    const p = local(e)
    return toWorld(vpRef.current, p.x, p.y)
  }

  const grab = (e: PointerEvent) => {
    el.current?.focus({ preventScroll: true })
    el.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, local(e))
  }

  const startPinch = () => {
    const [a, b] = Array.from(pointers.current.values())
    setDraft(null)
    gesture.current = {
      type: 'pinch',
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      vp: vpRef.current,
    }
  }

  // Node under the pointer, ignoring the dragged branch (it has pointer-events off)
  const targetAt = (e: PointerEvent, id: string) => {
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-node-id]')
    const target = hit?.getAttribute('data-node-id') ?? null
    if (!target || target === id) return null
    const node = nodesRef.current.find((n) => n.id === id)
    if (node?.pare === target || !canReparent(nodesRef.current, id, target)) return null
    return target
  }

  const pressure = (e: PointerEvent) => (e.pointerType === 'pen' ? e.pressure || 0.5 : 0.5)

  // Drawing tools take the pointer before the ideas see it
  const onPointerDownCapture = (e: PointerEvent) => {
    if (e.pointerType === 'pen') penSeen.current = true
    const p = propsRef.current
    if (!isDrawingTool(p.tool) || e.button !== 0) return
    if (e.pointerType === 'touch' && penSeen.current) return
    if (pointers.current.size) return
    e.stopPropagation()
    grab(e)
    const w = world(e)
    if (p.tool === 'goma') {
      gesture.current = { type: 'erase' }
      const r = MAPA.ERASER_RADIUS / vpRef.current.k
      p.onEraseStart()
      p.onErase(w.x, w.y, r)
      setDraft({ kind: 'goma', x: w.x, y: w.y, r })
    } else if (p.tool === 'forma') {
      gesture.current = { type: 'shape', from: w, to: w }
    } else {
      const punts: [number, number, number][] = [[w.x, w.y, pressure(e)]]
      gesture.current = { type: 'draw', punts, pressio: e.pointerType === 'pen' }
      setDraft({
        kind: 'trace',
        eina: p.tool,
        color: p.brush.color,
        gruix: p.brush.gruix,
        pressio: e.pointerType === 'pen',
        punts,
      })
    }
  }

  const onNodePointerDown = useCallback(
    (id: string, e: PointerEvent) => {
      if (e.button !== 0) return
      e.stopPropagation()
      grab(e)
      if (pointers.current.size >= 2) return startPinch()
      const p = local(e)
      gesture.current = { type: 'node', id, last: toWorld(vpRef.current, p.x, p.y), start: p, moved: false }
    },
    [vpRef]
  )

  const onItemPointerDown = useCallback(
    (ref: ItemRef, e: PointerEvent) => {
      if (e.button !== 0) return
      e.stopPropagation()
      grab(e)
      if (pointers.current.size >= 2) return startPinch()
      const p = local(e)
      propsRef.current.onSelectItem(ref)
      gesture.current = { type: 'item', ref, last: toWorld(vpRef.current, p.x, p.y), start: p, moved: false }
    },
    [vpRef]
  )

  const onResizePointerDown = useCallback((id: string, e: PointerEvent) => {
    grab(e)
    const img = propsRef.current.content.imatges.find((i) => i.id === id)
    if (!img) return
    gesture.current = { type: 'resize', id, start: world(e), w: img.w, h: img.h, started: false }
  }, [])

  const onSelectEdge = useCallback((id: string) => {
    el.current?.focus({ preventScroll: true })
    propsRef.current.onSelect(id)
  }, [])

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return
    grab(e)
    if (pointers.current.size >= 2) return startPinch()
    gesture.current = { type: 'pan', start: local(e), vp: vpRef.current, moved: false }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    const p = local(e)
    pointers.current.set(e.pointerId, p)
    const g = gesture.current
    const P = propsRef.current
    if (!g) return
    switch (g.type) {
      case 'pinch': {
        if (pointers.current.size < 2) return
        const [a, b] = Array.from(pointers.current.values())
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const k = Math.min(MAPA.ZOOM_MAX, Math.max(MAPA.ZOOM_MIN, g.vp.k * (dist / g.dist)))
        const f = k / g.vp.k
        setVp({ k, x: mid.x - (g.mid.x - g.vp.x) * f, y: mid.y - (g.mid.y - g.vp.y) * f })
        return
      }
      case 'pan': {
        const dx = p.x - g.start.x
        const dy = p.y - g.start.y
        if (!g.moved && Math.hypot(dx, dy) < MAPA.DRAG_THRESHOLD) return
        g.moved = true
        setVp({ ...g.vp, x: g.vp.x + dx, y: g.vp.y + dy })
        return
      }
      case 'node':
      case 'item': {
        if (!g.moved) {
          if (Math.hypot(p.x - g.start.x, p.y - g.start.y) < MAPA.DRAG_THRESHOLD) return
          g.moved = true
          if (g.type === 'node') P.onDragStart(g.id)
          else P.onItemDragStart(g.ref)
        }
        const w = toWorld(vpRef.current, p.x, p.y)
        if (g.type === 'node') P.onDragMove(g.id, w.x - g.last.x, w.y - g.last.y, targetAt(e, g.id))
        else P.onItemDragMove(g.ref, w.x - g.last.x, w.y - g.last.y)
        g.last = w
        return
      }
      case 'resize': {
        if (!g.started) {
          g.started = true
          P.onResizeStart()
        }
        const w = world(e)
        const nw = Math.max(32, g.w + (w.x - g.start.x))
        P.onResize(g.id, nw, (nw * g.h) / g.w)
        return
      }
      case 'draw': {
        // Coalesced events give smoother strokes with fast pens
        const events = (e.nativeEvent as globalThis.PointerEvent).getCoalescedEvents?.() ?? []
        const list = events.length ? events : [e.nativeEvent]
        for (const ev of list) {
          const w = world(ev)
          g.punts.push([w.x, w.y, ev.pointerType === 'pen' ? ev.pressure || 0.5 : 0.5])
        }
        setDraft((d) => (d?.kind === 'trace' ? { ...d, punts: [...g.punts] } : d))
        return
      }
      case 'shape': {
        let to = world(e)
        if (e.shiftKey) to = constrain(P.brush.forma, g.from, to)
        g.to = to
        setDraft({
          kind: 'forma',
          forma: {
            tipus: P.brush.forma,
            x1: g.from.x,
            y1: g.from.y,
            x2: to.x,
            y2: to.y,
            color: P.brush.color,
            gruix: P.brush.gruix,
          },
        })
        return
      }
      case 'erase': {
        const w = world(e)
        const r = MAPA.ERASER_RADIUS / vpRef.current.k
        P.onErase(w.x, w.y, r)
        setDraft({ kind: 'goma', x: w.x, y: w.y, r })
      }
    }
  }

  const onPointerUp = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    const P = propsRef.current
    if (g?.type === 'pinch') {
      // Lifting one finger of a pinch: the other one goes on panning
      const rest = Array.from(pointers.current.values())[0]
      gesture.current = rest ? { type: 'pan', start: rest, vp: vpRef.current, moved: true } : null
      return
    }
    gesture.current = null
    setDraft(null)
    if (!g) return
    const cancelled = e.type === 'pointercancel'
    switch (g.type) {
      case 'pan':
        if (!g.moved && !cancelled) {
          P.onSelect(null)
          P.onSelectItem(null)
        }
        return
      case 'node':
        if (g.moved) P.onDragEnd(g.id, cancelled ? null : targetAt(e, g.id))
        else if (!cancelled) g.id === P.selectedId ? P.onTapSelected(g.id) : P.onSelect(g.id)
        return
      case 'draw':
        if (!cancelled) P.onAddTrace(g.punts, g.pressio)
        return
      case 'shape': {
        const minSize = 4 / vpRef.current.k
        if (!cancelled && Math.hypot(g.to.x - g.from.x, g.to.y - g.from.y) >= minSize) {
          P.onAddForma({
            tipus: P.brush.forma,
            x1: g.from.x,
            y1: g.from.y,
            x2: g.to.x,
            y2: g.to.y,
            color: P.brush.color,
            gruix: P.brush.gruix,
          })
        }
      }
    }
  }

  const onDoubleClick = (e: MouseEvent) => {
    if (isDrawingTool(propsRef.current.tool)) return
    const w = world(e)
    props.onBackgroundDoubleClick(w.x, w.y)
  }

  const interactive = tool === 'seleccio'
  const map = useMemo(() => byId(content.nodes), [content.nodes])
  const visible = useMemo(() => visibleNodes(content.nodes), [content.nodes])
  const traces = useMemo(() => visibleTraces(content, new Set(visible.map((n) => n.id))), [content, visible])
  const childCount = useMemo(() => {
    const counts: Record<string, number> = {}
    content.nodes.forEach((n) => n.pare && (counts[n.pare] = (counts[n.pare] || 0) + 1))
    return counts
  }, [content.nodes])

  const {
    editingId,
    editDraft,
    labelEditingId,
    dragIds,
    dropTarget,
    onEdit,
    onToggleFold,
    onSize,
    onCommit,
    onCancel,
    onEditLabel,
    onCommitLabel,
    onCancelLabel,
  } = props

  // Rendered apart from the viewport so panning doesn't re-render every node
  const world_ = useMemo(() => {
    const itemProps = { interactive, selected: selectedItem, onItemPointerDown }
    return (
      <>
        <ImatgesLayer
          imatges={content.imatges}
          {...itemProps}
          onResizePointerDown={onResizePointerDown}
          altText={t('mapes.image_alt', { defaultValue: 'Imatge del mapa' })}
          resizeLabel={t('mapes.image_resize', { defaultValue: 'Canvia la mida de la imatge' })}
        />
        <FormesLayer formes={content.formes} {...itemProps} />
        <Edges
          nodes={visible}
          map={map}
          sizes={sizes}
          selectedId={selectedId}
          interactive={interactive}
          onSelect={onSelectEdge}
          onEditLabel={onEditLabel}
        />
        {visible.map((n) => {
          const parent = n.pare ? map[n.pare] : undefined
          const kids = childrenOf(content.nodes, n.id)
          const side = parent ? (n.x >= parent.x ? 1 : -1) : kids.length && kids.every((k) => k.x < n.x) ? -1 : 1
          return (
            <NodeView
              key={n.id}
              node={n}
              color={colorOf(map, n.id)}
              isRoot={!n.pare}
              childCount={childCount[n.id] || 0}
              side={side}
              isSelected={n.id === selectedId}
              isEditing={n.id === editingId}
              isDropTarget={n.id === dropTarget}
              isDragging={!!dragIds?.has(n.id)}
              interactive={interactive}
              onPointerDown={onNodePointerDown}
              onDoubleClick={onEdit}
              onToggleFold={onToggleFold}
              onSize={onSize}
              initialDraft={n.id === editingId ? editDraft : null}
              onCommit={onCommit}
              onCancel={onCancel}
            />
          )
        })}
        {/* Labels stay readable even where a line passes under an idea */}
        <EdgeLabels
          nodes={visible}
          map={map}
          sizes={sizes}
          editingId={labelEditingId}
          interactive={interactive}
          onSelect={onSelectEdge}
          onEdit={onEditLabel}
          onCommit={onCommitLabel}
          onCancel={onCancelLabel}
        />
        {/* See-through highlighter over the ideas, pen ink on top of everything */}
        <TracesLayer traces={traces.filter((tr) => tr.eina === 'subratllador')} map={map} {...itemProps} />
        <TracesLayer traces={traces.filter((tr) => tr.eina === 'ploma')} map={map} {...itemProps} />
      </>
    )
  }, [
    content,
    traces,
    visible,
    map,
    sizes,
    childCount,
    interactive,
    selectedId,
    selectedItem,
    editingId,
    editDraft,
    labelEditingId,
    dropTarget,
    dragIds,
    onNodePointerDown,
    onItemPointerDown,
    onResizePointerDown,
    onSelectEdge,
    onEdit,
    onToggleFold,
    onSize,
    onCommit,
    onCancel,
    onEditLabel,
    onCommitLabel,
    onCancelLabel,
    t,
  ])

  // Dots get sparser when zooming out so the background stays calm
  let grid = MAPA.GRID * vp.k
  while (grid < MAPA.GRID_MIN) grid *= 2

  return (
    <Box
      ref={el}
      position='absolute'
      inset={0}
      bg='mapa.canvas'
      tabIndex={0}
      role='tree'
      aria-label={props.ariaLabel}
      outline='none'
      cursor={isDrawingTool(tool) ? 'crosshair' : 'default'}
      onPointerDownCapture={onPointerDownCapture}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onKeyDown={props.onKeyDown}
      sx={{ touchAction: 'none', overflow: 'clip' }}
      style={{
        backgroundImage: 'radial-gradient(var(--chakra-colors-mapa-grid) 1.2px, transparent 1.2px)',
        backgroundSize: `${grid}px ${grid}px`,
        backgroundPosition: `${vp.x}px ${vp.y}px`,
      }}
    >
      <Box
        position='absolute'
        left={0}
        top={0}
        transformOrigin='0 0'
        style={{ transform: `translate3d(${vp.x}px, ${vp.y}px, 0) scale(${vp.k})` }}
      >
        {world_}
        <DraftLayer draft={draft} />
      </Box>
    </Box>
  )
})
Canvas.displayName = 'Canvas'

/** Shift while drawing: squares / circles, and lines at multiples of 45° */
export const constrain = (tipus: FormaTipus, from: Pt, to: Pt): Pt => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (tipus === 'rect' || tipus === 'elipse') {
    const s = Math.max(Math.abs(dx), Math.abs(dy))
    return { x: from.x + Math.sign(dx || 1) * s, y: from.y + Math.sign(dy || 1) * s }
  }
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
  const len = Math.hypot(dx, dy)
  return { x: from.x + Math.cos(angle) * len, y: from.y + Math.sin(angle) * len }
}
