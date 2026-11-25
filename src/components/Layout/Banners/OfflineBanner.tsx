import { Flex, Icon, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { icons } from '~theme/icons'

export const OfflineBanner = () => {
  const { t } = useTranslation()
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  // Track the browser connectivity
  useEffect(() => {
    const on = () => setIsOffline(false)
    const off = () => setIsOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (!isOffline) return null

  return (
    <Flex bg='slate.800' color='white' px={4} py={2} gap={2} align='center' justify='center' fontSize='sm'>
      <Icon as={icons.offline} />
      <Text>
        {t('offline.banner', {
          defaultValue: 'Estàs sense connexió. Tot continua funcionant: les dades es desen en aquest dispositiu.',
        })}
      </Text>
    </Flex>
  )
}
