/**
 * From the page as pdf.js shows it (scale 1: origin top-left, y down, rotation applied) to PDF
 * user space (origin bottom-left, y up, unrotated), so annotations land where they were drawn.
 */

// PDF matrix [a b c d e f]: x' = a·x + c·y + e, y' = b·x + d·y + f
export type Matrix = [number, number, number, number, number, number]

export type Box = { x: number; y: number; width: number; height: number }

/** Visible area of the page, like pdf.js: the crop box clipped to the media box (or the media box) */
export const visibleBox = (crop: Box, media: Box): Box => {
  const x1 = Math.max(crop.x, media.x)
  const y1 = Math.max(crop.y, media.y)
  const x2 = Math.min(crop.x + crop.width, media.x + media.width)
  const y2 = Math.min(crop.y + crop.height, media.y + media.height)
  return x2 > x1 && y2 > y1 ? { x: x1, y: y1, width: x2 - x1, height: y2 - y1 } : media
}

const normalRotation = (angle: number) => {
  const r = ((Math.round(angle) % 360) + 360) % 360
  return r % 90 === 0 ? r : 0
}

/**
 * User space → page view at scale 1. Same maths as pdf.js `PageViewport`:
 *   0°: (x, y) → (x − x1, y2 − y)        90°: (x, y) → (y − y1, x − x1)
 *   180°: (x, y) → (x2 − x, y − y1)      270°: (x, y) → (y2 − y, x2 − x)
 */
export const viewportMatrix = (box: Box, rotation: number): Matrix => {
  const r = normalRotation(rotation)
  const [A, B, C, D] = r === 90 ? [0, 1, 1, 0] : r === 180 ? [-1, 0, 0, 1] : r === 270 ? [0, -1, -1, 0] : [1, 0, 0, -1]
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  // Rotated a quarter turn, the page width comes from the box height
  const [ox, oy] = A === 0 ? [box.height / 2, box.width / 2] : [box.width / 2, box.height / 2]
  return [A, B, C, D, ox - A * cx - C * cy, oy - B * cx - D * cy]
}

export const invert = ([a, b, c, d, e, f]: Matrix): Matrix => {
  const det = a * d - b * c
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det]
}

export const applyMatrix = ([a, b, c, d, e, f]: Matrix, x: number, y: number): [number, number] => [
  a * x + c * y + e,
  b * x + d * y + f,
]

/** Page view (pdf.js scale 1) → PDF user space */
export const viewToUser = (box: Box, rotation: number) => invert(viewportMatrix(box, rotation))

/**
 * Matrix to draw SVG-like paths given in page view coordinates with pdf-lib. Its `drawSvgPath`
 * flips y on its own (scale 1, −1), so the flip is undone here: M = viewToUser ∘ (x, y) → (x, −y).
 */
export const svgDrawMatrix = (toUser: Matrix): Matrix => {
  const [a, b, c, d, e, f] = toUser
  return [a, b, -c, -d, e, f]
}
