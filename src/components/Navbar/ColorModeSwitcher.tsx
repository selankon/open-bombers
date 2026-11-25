import { IconButton, useColorMode } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { icons } from '~theme/icons'

export const ColorModeSwitcher = () => {
  const { t } = useTranslation()
  const { colorMode, toggleColorMode } = useColorMode()
  const Icon = colorMode === 'light' ? icons.dark : icons.light
  return (
    <IconButton
      aria-label={t('navbar.toggle_color_mode', { defaultValue: 'Canviar el mode de color' })}
      icon={<Icon size={18} />}
      onClick={toggleColorMode}
      variant='ghost'
      colorScheme='gray'
      size='sm'
      borderRadius='full'
    />
  )
}
