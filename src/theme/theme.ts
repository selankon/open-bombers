import { extendTheme, type ThemeConfig } from '@chakra-ui/react'
import { colors } from '~theme/colors'
import { DEFAULT_PALETTE, PALETTES, PaletteId } from '~theme/palettes'
import { semanticColors } from '~theme/semantic'
import { radii, shadows } from '~theme/tokens'
import { Button } from './components/button'

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: false,
}

const fontStack =
  "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

/**
 * Builds the theme with the chosen accent palette as `primary`
 */
export const makeTheme = (palette: PaletteId) =>
  extendTheme({
    config,
    colors: { ...colors, primary: PALETTES[palette] },
    fonts: {
      heading: fontStack,
      body: fontStack,
    },
    radii: {
      card: radii.md,
      sheet: radii.lg,
    },
    shadows: {
      e1: shadows.e1,
      e2: shadows.e2,
      e3: shadows.e3,
    },
    semanticTokens: {
      colors: semanticColors,
      shadows: {
        card: { default: shadows.e1, _dark: shadows.e1Dark },
        raised: { default: shadows.e2, _dark: shadows.e2Dark },
        floating: { default: shadows.e3, _dark: shadows.e3Dark },
      },
    },
    styles: {
      global: {
        body: {
          bg: 'pageBg',
          color: 'textPrimary',
        },
        '::selection': { bg: 'primary.200' },
      },
    },
    components: {
      Button,
      Heading: { baseStyle: { letterSpacing: '-0.02em' } },
      Tooltip: { baseStyle: { borderRadius: 'md', bg: 'slate.900', color: 'white', px: 3, py: 2, fontSize: 'xs' } },
    },
  })

const theme = makeTheme(DEFAULT_PALETTE)

export default theme
