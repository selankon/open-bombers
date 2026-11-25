import { Flex, Icon, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { icons } from '~theme/icons'
import { useOnline } from '../useOnline'

export const OfflineBanner = () => {
  const { t } = useTranslation()
  const isOffline = !useOnline()

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
