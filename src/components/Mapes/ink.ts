import { getStroke } from 'perfect-freehand'
import { Eina } from './types'

/**
 * Handwriting: turns the points of a stroke into a filled outline with perfect-freehand.
 * The pen thins with the pressure (real with a stylus, simulated from the speed otherwise);
 * the highlighter keeps a constant width.
 */
export const strokeOutline = (
  punts: [number, number, number][],
  eina: Eina,
  gruix: number,
  pressio: boolean,
  last = true
) =>
  getStroke(punts, {
    size: gruix,
    thinning: eina === 'ploma' ? 0.6 : 0,
    smoothing: 0.5,
    streamline: eina === 'ploma' ? 0.45 : 0.6,
    simulatePressure: eina === 'ploma' && !pressio,
    start: { cap: true },
    end: { cap: true },
    last,
  })

const avg = (a: number, b: number) => (a + b) / 2

/** Outline points → smooth closed SVG path (quadratic curves through the midpoints) */
export const outlinePath = (pts: number[][]) => {
  const len = pts.length
  if (len < 4) return ''
  let a = pts[0]
  let b = pts[1]
  const c = pts[2]
  let d = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${avg(b[0], c[0]).toFixed(2)},${avg(b[1], c[1]).toFixed(2)} T`
  for (let i = 2; i < len - 1; i++) {
    a = pts[i]
    b = pts[i + 1]
    d += `${avg(a[0], b[0]).toFixed(2)},${avg(a[1], b[1]).toFixed(2)} `
  }
  return d + 'Z'
}

export const strokePath = (
  punts: [number, number, number][],
  eina: Eina,
  gruix: number,
  pressio: boolean,
  last = true
) => outlinePath(strokeOutline(punts, eina, gruix, pressio, last))

// The highlighter is see-through so the ideas stay readable
export const HIGHLIGHTER_OPACITY = 0.35

/** Centre line of a stroke (used as a wide invisible hit area) */
export const centerLine = (punts: [number, number, number][]) =>
  punts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
