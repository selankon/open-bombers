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
} from 'react'
import { MAPA } from '~utils/constants'
import { byId, canReparent, childrenOf, colorOf, toWorld, visibleNodes } from '../logic'
import { MapaNode, Viewport } from '../types'
import { Edges } from './Edges'
import { NodeView } from './NodeView'

type Gesture =
  | { type: 'pan'; start: { x: number; y: number }; vp: Viewport; moved: boolean }
  | { type: 'pinch'; dist: number; mid: { x: number; y: number }; vp: Viewport }
  | { type: 'node'; id: string; last: { x: number; y: number }; start: { x: number; y: number }; moved: boolean }

export type CanvasHandle = { focus: () => void }

type CanvasProps = {
  nodes: MapaNode[]
  vp: Viewport
  vpRef: { current: Viewport }
  setVp: (vp: Viewport | ((v: Viewport) => Viewport)) => void
  selectedId: string | null
  editingId: string | null
  editDraft: string | null
  dragIds: Set<string> | null
  dropTarget: string | null
  onSelect: (id: string | null) => void
  onTapSelected: (id: string) => void
  onEdit: (id: string) => void
  onDragStart: (id: string) => void
  onDragMove: (id: string, dx: number, dy: number, target: string | null) => void
  onDragEnd: (id: string, target: string | null) => void
  onToggleFold: (id: string) => void
  onBackgroundDoubleClick: (x: number, y: number) => void
  onCommit: (id: string, text: string, next?: 'child' | 'sibling') => void
  onCancel: (id: string) => void
  onKeyDown: (e: KeyboardEvent) => void
  ariaLabel: string
}

/**
 * The infinite canvas: pan with a drag on the background (or one finger), zoom with the wheel or
 * a pinch, drag nodes to move them with their branch, drop a node on another one to hang it there.
 */
export const Canvas = forwardRef<CanvasHandle, CanvasProps>(
  (
    {
      nodes,
      vp,
      vpRef,
      setVp,
      selectedId,
      editingId,
      editDraft,
      dragIds,
      dropTarget,
      onSelect,
      onTapSelected,
      onEdit,
      onDragStart,
      onDragMove,
      onDragEnd,
      onToggleFold,
      onBackgroundDoubleClick,
      onCommit,
      onCancel,
      onKeyDown,
      ariaLabel,
    },
    ref
  ) => {
    const el = useRef<HTMLDivElement>(null)
    const pointers = useRef(new Map<number, { x: number; y: number }>())
    const gesture = useRef<Gesture | null>(null)
    const nodesRef = useRef(nodes)
    nodesRef.current = nodes

    useImperativeHandle(ref, () => ({ focus: () => el.current?.focus({ preventScroll: true }) }), [])

    const local = (e: { clientX: number; clientY: number }) => {
      const rect = el.current!.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const startPinch = () => {
      const [a, b] = Array.from(pointers.current.values())
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

    const onNodePointerDown = useCallback(
      (id: string, e: PointerEvent) => {
        if (e.button !== 0) return
        e.stopPropagation()
        el.current?.focus({ preventScroll: true })
        el.current?.setPointerCapture(e.pointerId)
        const p = local(e)
        pointers.current.set(e.pointerId, p)
        if (pointers.current.size >= 2) return startPinch()
        const w = toWorld(vpRef.current, p.x, p.y)
        gesture.current = { type: 'node', id, last: w, start: p, moved: false }
      },
      [vpRef]
    )

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return
      el.current?.focus({ preventScroll: true })
      el.current?.setPointerCapture(e.pointerId)
      const p = local(e)
      pointers.current.set(e.pointerId, p)
      if (pointers.current.size >= 2) return startPinch()
      gesture.current = { type: 'pan', start: p, vp: vpRef.current, moved: false }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return
      const p = local(e)
      pointers.current.set(e.pointerId, p)
      const g = gesture.current
      if (!g) return
      if (g.type === 'pinch') {
        if (pointers.current.size < 2) return
        const [a, b] = Array.from(pointers.current.values())
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const k = Math.min(MAPA.ZOOM_MAX, Math.max(MAPA.ZOOM_MIN, g.vp.k * (dist / g.dist)))
        const f = k / g.vp.k
        setVp({ k, x: mid.x - (g.mid.x - g.vp.x) * f, y: mid.y - (g.mid.y - g.vp.y) * f })
        return
      }
      if (g.type === 'pan') {
        const dx = p.x - g.start.x
        const dy = p.y - g.start.y
        if (!g.moved && Math.hypot(dx, dy) < MAPA.DRAG_THRESHOLD) return
        g.moved = true
        setVp({ ...g.vp, x: g.vp.x + dx, y: g.vp.y + dy })
        return
      }
      if (!g.moved) {
        if (Math.hypot(p.x - g.start.x, p.y - g.start.y) < MAPA.DRAG_THRESHOLD) return
        g.moved = true
        onDragStart(g.id)
      }
      const w = toWorld(vpRef.current, p.x, p.y)
      onDragMove(g.id, w.x - g.last.x, w.y - g.last.y, targetAt(e, g.id))
      g.last = w
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.delete(e.pointerId)
      const g = gesture.current
      if (g?.type === 'pinch') {
        // Lifting one finger of a pinch: the other one goes on panning
        const rest = Array.from(pointers.current.values())[0]
        gesture.current = rest ? { type: 'pan', start: rest, vp: vpRef.current, moved: true } : null
        return
      }
      gesture.current = null
      if (!g || e.type === 'pointercancel') {
        if (g?.type === 'node' && g.moved) onDragEnd(g.id, null)
        return
      }
      if (g.type === 'pan') {
        if (!g.moved) onSelect(null)
        return
      }
      if (g.moved) onDragEnd(g.id, targetAt(e, g.id))
      else if (g.id === selectedId) onTapSelected(g.id)
      else onSelect(g.id)
    }

    const onDoubleClick = (e: MouseEvent) => {
      const p = local(e)
      const w = toWorld(vpRef.current, p.x, p.y)
      onBackgroundDoubleClick(w.x, w.y)
    }

    const map = useMemo(() => byId(nodes), [nodes])
    const visible = useMemo(() => visibleNodes(nodes), [nodes])
    const childCount = useMemo(() => {
      const counts: Record<string, number> = {}
      nodes.forEach((n) => n.pare && (counts[n.pare] = (counts[n.pare] || 0) + 1))
      return counts
    }, [nodes])

    // Rendered apart from the viewport so panning doesn't re-render every node
    const content = useMemo(
      () => (
        <>
          <Edges nodes={visible} map={map} />
          {visible.map((n) => {
            const parent = n.pare ? map[n.pare] : undefined
            const kids = childrenOf(nodes, n.id)
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
                onPointerDown={onNodePointerDown}
                onDoubleClick={onEdit}
                onToggleFold={onToggleFold}
                initialDraft={n.id === editingId ? editDraft : null}
                onCommit={onCommit}
                onCancel={onCancel}
              />
            )
          })}
        </>
      ),
      [
        visible,
        map,
        nodes,
        childCount,
        selectedId,
        editingId,
        editDraft,
        dropTarget,
        dragIds,
        onNodePointerDown,
        onEdit,
        onToggleFold,
        onCommit,
        onCancel,
      ]
    )

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
        aria-label={ariaLabel}
        outline='none'
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
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
          {content}
        </Box>
      </Box>
    )
  }
)
Canvas.displayName = 'Canvas'
