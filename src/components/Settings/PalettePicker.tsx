import { Box, Flex, Icon, SimpleGrid, Text } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { usePalette } from '~components/Layout/Contexts/PaletteContext'
import { icons } from '~theme/icons'
import { PRESS_SCALE, spring } from '~theme/motion'
import { PALETTE_IDS, PALETTES, PaletteId } from '~theme/palettes'

/**
 * Lets the user choose the accent palette of the app
 */
export const PalettePicker = () => {
  const { t } = useTranslation()
  const { palette, setPalette } = usePalette()

  // Literal t() calls so i18next-parser picks every name up
  const names: Record<PaletteId, string> = {
    brasa: t('palette.brasa', { defaultValue: 'Brasa' }),
    vermell: t('palette.vermell', { defaultValue: 'Vermell foc' }),
    blau: t('palette.blau', { defaultValue: 'Blau marí' }),
    petroli: t('palette.petroli', { defaultValue: 'Petroli' }),
    indi: t('palette.indi', { defaultValue: 'Indi' }),
    or: t('palette.or', { defaultValue: 'Or' }),
  }

  return (
    <SimpleGrid
      role='radiogroup'
      aria-label={t('settings.palette', { defaultValue: 'Color principal' })}
      columns={{ base: 2, sm: 3, md: 6 }}
      spacing={3}
    >
      {PALETTE_IDS.map((id) => {
        const scale = PALETTES[id]
        const isSelected = id === palette
        return (
          <Flex
            key={id}
            as={motion.button}
            type='button'
            role='radio'
            aria-checked={isSelected}
            onClick={() => setPalette(id)}
            whileTap={{ scale: PRESS_SCALE }}
            // @ts-ignore framer-motion transition prop through Chakra
            transition={spring.snappy}
            direction='column'
            align='center'
            gap={2}
            p={3}
            borderRadius='md'
            borderWidth='2px'
            borderColor={isSelected ? 'accent' : 'border'}
            bg={isSelected ? 'surfaceMuted' : 'surface'}
            _hover={{ borderColor: isSelected ? 'accent' : 'textMuted' }}
            _focusVisible={{ outline: '2px solid', outlineColor: 'accent', outlineOffset: '2px' }}
          >
            <Box
              position='relative'
              boxSize={12}
              borderRadius='full'
              bgGradient={`linear(135deg, ${scale[400]}, ${scale[700]})`}
              boxShadow='card'
            >
              {isSelected && (
                <Flex
                  as={motion.div}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  // @ts-ignore framer-motion transition prop through Chakra
                  transition={spring.bouncy}
                  position='absolute'
                  inset={0}
                  align='center'
                  justify='center'
                  color='white'
                >
                  <Icon as={icons.check} boxSize={5} />
                </Flex>
              )}
            </Box>
            <Flex gap={1} aria-hidden='true'>
              {([100, 300, 500, 700] as const).map((k) => (
                <Box key={k} boxSize={2.5} borderRadius='full' bg={scale[k]} />
              ))}
            </Flex>
            <Text fontSize='sm' fontWeight={600} color='textPrimary'>
              {names[id]}
            </Text>
          </Flex>
        )
      })}
    </SimpleGrid>
  )
}
