import { Button, Flex, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { usePWAUpdate } from '~components/Layout/Contexts/PWAUpdateProvider'

export const PWAUpdateBanner = () => {
  const { t } = useTranslation()
  const { isUpdateAvailable, isUpdating, triggerUpdate } = usePWAUpdate()

  if (!isUpdateAvailable) return null

  return (
    <Flex
      bgGradient='linear(to-r, primary.600, primary.400)'
      color='white'
      px={4}
      py={2}
      gap={3}
      align='center'
      justify='center'
      fontSize='sm'
    >
      <Text>{t('pwa.update_available', { defaultValue: "Hi ha una nova versió de l'aplicació." })}</Text>
      <Button
        size='xs'
        bg='white'
        color='primary.700'
        _hover={{ bg: 'primary.50' }}
        onClick={triggerUpdate}
        isLoading={isUpdating}
      >
        {t('pwa.update_button', { defaultValue: 'Actualitzar' })}
      </Button>
    </Flex>
  )
}
