import { Box, BoxProps } from '@chakra-ui/react'
import { Level } from './types'

export const levelColors = (level: Level | null) => {
  if (!level) return { bg: 'transparent', fg: 'textMuted', border: 'border' }
  const k = level.toLowerCase()
  return { bg: `${k}.bg`, fg: `${k}.fg`, border: `${k}.border` }
}

/**
 * NA / NM / NB pill
 */
export const LevelBadge = ({ level, ...props }: { level: Level | null } & BoxProps) => {
  if (!level) return null
  const c = levelColors(level)
  return (
    <Box
      as='span'
      display='inline-flex'
      alignItems='center'
      px={1.5}
      h={5}
      borderRadius='6px'
      fontSize='2xs'
      fontWeight={700}
      letterSpacing='0.02em'
      bg={c.bg}
      color={c.fg}
      borderWidth='1px'
      borderColor={c.border}
      {...props}
    >
      {level}
    </Box>
  )
}
