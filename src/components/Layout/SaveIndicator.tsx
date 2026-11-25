import { Box, Flex, Text } from '@chakra-ui/react'
import { useIsMutating, useMutationState } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

/**
 * Save status pill: saved / saving / error, based on the running mutations
 */
export const SaveIndicator = () => {
  const { t } = useTranslation()
  const pending = useIsMutating()
  const statuses = useMutationState({ select: (m) => m.state.status })
  const last = statuses[statuses.length - 1]

  const state = pending > 0 ? 'saving' : last === 'error' ? 'error' : 'saved'
  const conf = {
    saved: { color: '#10B981', text: t('save.saved', { defaultValue: 'Totes les dades desades' }) },
    saving: { color: '#F59E0B', text: t('save.saving', { defaultValue: 'Desant canvis...' }) },
    error: { color: '#EF4444', text: t('save.error', { defaultValue: 'Error en desar al dispositiu' }) },
  }[state]

  return (
    <Flex
      align='center'
      gap={2}
      px={3}
      py={1.5}
      borderRadius='full'
      bg='surface'
      borderWidth='1px'
      borderColor='border'
      fontSize='xs'
      fontWeight={600}
      color='textMuted'
      role='status'
      aria-live='polite'
    >
      <Box w={2} h={2} borderRadius='full' bg={conf.color} boxShadow={`0 0 0 3px ${conf.color}33`} />
      <Text>{conf.text}</Text>
    </Flex>
  )
}
