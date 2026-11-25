/**
 * Resolves Chakra color tokens to CSS colors for the light theme (exports are printed on white)
 */
type AnyTheme = { colors?: Record<string, any>; semanticTokens?: { colors?: Record<string, any> } }

const palette = (theme: AnyTheme, value: string): string => {
  const m = value.match(/^([a-zA-Z]+)\.(\d+)$/)
  if (m) return theme.colors?.[m[1]]?.[m[2]] ?? value
  const direct = theme.colors?.[value]
  return typeof direct === 'string' ? direct : value
}

export const lightResolver = (theme: Record<string, any> & AnyTheme) => (token: string) => {
  const sem = theme.semanticTokens?.colors?.[token]
  const value = sem === undefined ? token : typeof sem === 'object' ? sem.default : sem
  return palette(theme, String(value))
}

export type ColorResolver = (token: string) => string
