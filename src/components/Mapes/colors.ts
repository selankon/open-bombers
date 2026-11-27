import { CustomColor, MAPA_COLORS, MapaColor, NodeColor } from './types'

/**
 * Colors of ideas and branches: a palette color (Chakra semantic tokens `mapa.<color>…`) or a custom one
 * picked by the user (`#rrggbb` or `#rrggbbaa`, the alpha allows see-through and transparent colors).
 */

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i

export const isPaletteColor = (c: unknown): c is MapaColor => MAPA_COLORS.includes(c as MapaColor)
export const isCustomColor = (c: unknown): c is CustomColor => typeof c === 'string' && HEX.test(c)
export const isNodeColor = (c: unknown): c is NodeColor => isPaletteColor(c) || isCustomColor(c)

export type Rgba = { r: number; g: number; b: number; a: number }

export const parseCustom = (c: CustomColor): Rgba => ({
  r: parseInt(c.slice(1, 3), 16),
  g: parseInt(c.slice(3, 5), 16),
  b: parseInt(c.slice(5, 7), 16),
  a: c.length > 7 ? parseInt(c.slice(7, 9), 16) / 255 : 1,
})

const hex2 = (v: number) =>
  Math.round(Math.min(255, Math.max(0, v)))
    .toString(16)
    .padStart(2, '0')

/** `#rrggbb` from the color input plus an opacity (0–1). Opaque colors keep the short form. */
export const customColor = (rgb: string, alpha: number): CustomColor => {
  const base = rgb.slice(0, 7).toLowerCase()
  return (alpha >= 1 ? base : `${base}${hex2(alpha * 255)}`) as CustomColor
}

const rgba = ({ r, g, b }: Rgba, a: number) => `rgba(${r}, ${g}, ${b}, ${Math.round(a * 1000) / 1000})`

// Opacity of the soft fill, like the `.bg` tokens of the palette
const SOFT_ALPHA = 0.16

export interface ColorLook {
  // Line and border
  line: string
  // Soft and solid fills
  bg: string
  solid: string
  // Text on the solid fill
  onSolid: string
  // Always visible version (selection ring, fold toggle), even for transparent colors
  strong: string
}

/** Chakra tokens for palette colors, CSS colors for custom ones (both work as Chakra props) */
export const colorLook = (c: NodeColor): ColorLook => {
  if (!isCustomColor(c)) {
    return {
      line: `mapa.${c}`,
      bg: `mapa.${c}.bg`,
      solid: `mapa.${c}.solid`,
      onSolid: 'mapa.onSolid',
      strong: `mapa.${c}`,
    }
  }
  const p = parseCustom(c)
  // Relative luminance decides between light and dark text on the solid fill
  const lum = (0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b) / 255
  return {
    line: rgba(p, p.a),
    bg: rgba(p, p.a * SOFT_ALPHA),
    solid: rgba(p, p.a),
    onSolid: p.a < 0.5 ? 'textPrimary' : lum > 0.6 ? 'mapa.onLight' : 'mapa.onSolid',
    strong: p.a < 0.2 ? 'accent' : rgba(p, 1),
  }
}

/** A Chakra color token or a CSS color, as a CSS value (SVG attributes, box-shadow strings) */
export const cssColor = (v: string) =>
  /^(#|rgb|hsl|transparent)/.test(v) ? v : `var(--chakra-colors-${v.replace(/\./g, '-')})`
