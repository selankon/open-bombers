import { ItemRef } from '~components/Mapes/types'
import { FormaPdf, NotaPdf, SeleccioPdf } from '../types'

/**
 * What a page tells the reader. Every callback has a stable identity (pages are memoized),
 * and coordinates are always in PDF points of that page.
 */
export type PageHandlers = {
  onPenSeen: () => void
  onAddTrace: (page: number, punts: [number, number, number][], pressio: boolean) => void
  onAddForma: (page: number, forma: Omit<FormaPdf, 'id'>) => void
  onEraseStart: () => void
  onErase: (page: number, x: number, y: number, r: number) => void
  onSelect: (sel: SeleccioPdf | null) => void
  // Start of a drag or resize: makes the whole gesture one undo step
  onCheckpoint: () => void
  onItemDragMove: (page: number, ref: ItemRef, dx: number, dy: number) => void
  onResize: (page: number, id: string, w: number, h: number) => void
  onAddNote: (page: number, x: number, y: number) => void
  onOpenNote: (id: string | null) => void
  onNoteMove: (page: number, id: string, dx: number, dy: number) => void
  onSaveNote: (page: number, id: string, patch: Partial<Omit<NotaPdf, 'id'>>) => void
  onRemoveNote: (page: number, id: string) => void
}

type Pt = { x: number; y: number }

/**
 * Follows a press on an element until it's released: below `threshold` px it's a tap, beyond it a drag.
 * Window listeners, so it keeps working when the pointer leaves the element.
 */
export const trackPointer = (
  e: { clientX: number; clientY: number },
  threshold: number,
  { onDragStart, onDrag, onTap }: { onDragStart?: () => void; onDrag: (client: Pt) => void; onTap?: () => void }
) => {
  const start = { x: e.clientX, y: e.clientY }
  let moved = false
  const move = (ev: PointerEvent) => {
    if (!moved) {
      if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < threshold) return
      moved = true
      onDragStart?.()
    }
    onDrag({ x: ev.clientX, y: ev.clientY })
  }
  const end = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    if (!moved && ev.type === 'pointerup') onTap?.()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)
}
