import { Box, BoxProps, useToken } from '@chakra-ui/react'
import { useId } from 'react'

/**
 * App logo drawn inline so it follows the chosen accent palette
 */
export const AppLogo = (props: BoxProps) => {
  const gradientId = useId()
  const [from, to, drop] = useToken('colors', ['primary.400', 'primary.600', 'primary.500'])
  return (
    <Box as='svg' viewBox='0 0 512 512' aria-hidden='true' flexShrink={0} {...props}>
      <defs>
        <linearGradient id={gradientId} x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stopColor={from} />
          <stop offset='1' stopColor={to} />
        </linearGradient>
      </defs>
      <rect width='512' height='512' rx='112' fill={`url(#${gradientId})`} />
      <path
        d='M262 92c14 62 92 104 92 196 0 64-44 120-98 120s-98-50-98-112c0-58 40-84 52-132 26 30 30 58 30 86 26-22 34-78 22-158z'
        fill='white'
      />
      <path d='M256 300c18 26 40 40 40 70 0 24-18 40-40 40s-40-16-40-40c0-28 26-42 40-70z' fill={drop} />
    </Box>
  )
}
