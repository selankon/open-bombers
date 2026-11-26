/**
 * Rewrites the quadratic curves (Q, T) of an absolute SVG path as exact cubic curves (C).
 * pdf-lib turns Q into the PDF `v` operator, which is only an approximation, and its T keeps the
 * wrong control point, which garbles handwriting. Other commands (M, L, H, V, C, A, Z) pass through.
 * Only absolute commands are supported: the app's own paths never use relative ones.
 */

const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, Q: 4, T: 2, A: 7, Z: 0 }

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi

type Pt = { x: number; y: number }

const cubicFromQuad = (p0: Pt, q: Pt, p: Pt) => {
  const c1 = { x: p0.x + ((q.x - p0.x) * 2) / 3, y: p0.y + ((q.y - p0.y) * 2) / 3 }
  const c2 = { x: p.x + ((q.x - p.x) * 2) / 3, y: p.y + ((q.y - p.y) * 2) / 3 }
  return `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p.x} ${p.y}`
}

export const cubicPath = (d: string) => {
  const out: string[] = []
  let cur: Pt = { x: 0, y: 0 }
  let start: Pt = cur
  // Control point of the last quadratic curve (for T)
  let lastQ: Pt | null = null

  for (const [, cmd, body] of d.matchAll(/([MLHVCQTAZ])([^MLHVCQTAZ]*)/gi)) {
    const C = cmd.toUpperCase()
    if (C !== cmd) throw new Error(`relative path command ${cmd}`)
    const nums = (body.match(NUMBER) ?? []).map(Number)
    const n = ARGS[C]
    if (!n) {
      out.push('Z')
      cur = start
      lastQ = null
      continue
    }
    for (let i = 0; i + n <= nums.length; i += n) {
      const a = nums.slice(i, i + n)
      // Extra pairs after M are lines
      const c = C === 'M' && i > 0 ? 'L' : C
      let q: Pt | null = null
      switch (c) {
        case 'M':
          cur = start = { x: a[0], y: a[1] }
          out.push(`M ${a[0]} ${a[1]}`)
          break
        case 'L':
          cur = { x: a[0], y: a[1] }
          out.push(`L ${a[0]} ${a[1]}`)
          break
        case 'H':
          cur = { x: a[0], y: cur.y }
          out.push(`L ${cur.x} ${cur.y}`)
          break
        case 'V':
          cur = { x: cur.x, y: a[0] }
          out.push(`L ${cur.x} ${cur.y}`)
          break
        case 'C':
          cur = { x: a[4], y: a[5] }
          out.push(`C ${a.join(' ')}`)
          break
        case 'A':
          cur = { x: a[5], y: a[6] }
          out.push(`A ${a.join(' ')}`)
          break
        case 'Q':
        case 'T': {
          // T mirrors the previous control point around the current point
          q = c === 'Q' ? { x: a[0], y: a[1] } : lastQ ? { x: 2 * cur.x - lastQ.x, y: 2 * cur.y - lastQ.y } : cur
          const p = c === 'Q' ? { x: a[2], y: a[3] } : { x: a[0], y: a[1] }
          out.push(cubicFromQuad(cur, q, p))
          cur = p
        }
      }
      lastQ = q
    }
  }
  return out.join(' ')
}
