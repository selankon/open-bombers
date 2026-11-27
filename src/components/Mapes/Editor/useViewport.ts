import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { MAPA } from '~utils/constants'
import { zoomAt } from '../logic'
import { Viewport } from '../types'

/**
 * Pan / zoom state of the canvas: size tracking and wheel / trackpad gestures.
 * A mouse wheel zooms (with Shift it pans). A trackpad pans with two fingers and zooms with a pinch
 * (the browser reports it as ctrl + wheel), like ctrl/cmd + wheel.
 */

// Mouse wheels move in whole notches (lines, or big integer pixel steps, vertical only); trackpads send
// small and fractional deltas, often with some horizontal movement
const isMouseWheel = (e: WheelEvent) =>
  e.deltaMode !== 0 || (e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 50)

/**
 */
export const useViewport = (ref: RefObject<HTMLElement>) => {
  const [vp, setVp] = useState<Viewport>({ x: 0, y: 0, k: 1 })
  const [size, setSize] = useState({ w: 0, h: 0 })
  const vpRef = useRef(vp)
  vpRef.current = vp

  // Track the canvas size
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  // Wheel and trackpad: needs a non-passive listener to stop the page from scrolling or zooming
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      // Lines / pages to pixels
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1
      const at = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * unit * 0.01)
        setVp((v) => zoomAt(v, factor, at.x, at.y))
      } else if (isMouseWheel(e) && !e.shiftKey) {
        const factor = MAPA.WHEEL_ZOOM_STEP ** -Math.sign(e.deltaY)
        setVp((v) => zoomAt(v, factor, at.x, at.y))
      } else {
        setVp((v) => ({ ...v, x: v.x - e.deltaX * unit, y: v.y - e.deltaY * unit }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ref])

  // Zoom by a factor around the center of the canvas (buttons and keyboard)
  const zoomBy = useCallback(
    (dir: 1 | -1) => setVp((v) => zoomAt(v, dir > 0 ? MAPA.ZOOM_STEP : 1 / MAPA.ZOOM_STEP, size.w / 2, size.h / 2)),
    [size]
  )

  return { vp, vpRef, setVp, size, zoomBy }
}
