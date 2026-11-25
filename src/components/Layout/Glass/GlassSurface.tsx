import { Box, BoxProps } from '@chakra-ui/react'
import { forwardRef } from 'react'
import { blur } from '~theme/tokens'

/**
 * Translucent "liquid glass" surface for chrome (navbar, bottom nav, floating buttons).
 * Falls back to an opaque surface when backdrop-filter is unsupported or transparency is reduced.
 */
export const GlassSurface = forwardRef<HTMLDivElement, BoxProps>((props, ref) => (
  <Box
    ref={ref}
    bg='surface'
    sx={{
      '@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))': {
        bg: 'surfaceGlass',
        backdropFilter: blur.glass,
        WebkitBackdropFilter: blur.glass,
      },
      '@media (prefers-reduced-transparency: reduce)': {
        bg: 'surface',
        backdropFilter: 'none',
      },
    }}
    boxShadow='inset 0 1px 0 rgba(255,255,255,0.35)'
    {...props}
  />
))
GlassSurface.displayName = 'GlassSurface'
