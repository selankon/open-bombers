import { defineStyle, defineStyleConfig } from '@chakra-ui/react'

const solid = defineStyle(({ colorScheme: c }) =>
  c === 'primary'
    ? {
        // 600 keeps white text above WCAG AA (500 is ~3.8:1)
        bg: 'primary.600',
        color: 'white',
        _hover: { bg: 'primary.700', _disabled: { bg: 'primary.600' } },
        _active: { bg: 'primary.800' },
      }
    : {}
)

export const Button = defineStyleConfig({
  baseStyle: {
    borderRadius: 'full',
    fontWeight: 600,
    transitionProperty: 'background, box-shadow, transform',
    transitionDuration: '120ms',
    _active: { transform: 'scale(0.97)' },
  },
  variants: { solid },
  defaultProps: { colorScheme: 'primary', size: 'sm' },
})
