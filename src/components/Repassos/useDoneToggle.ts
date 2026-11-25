import { useToast } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSetDone } from './queries'
import { Instance } from './types'

/**
 * Marks instances as done / not done with feedback
 */
export const useDoneToggle = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const { mutate } = useSetDone()

  const setDone = useCallback(
    (instances: Instance[], done: boolean) => {
      if (done && navigator.vibrate) navigator.vibrate(8)
      mutate(
        { instances, done },
        {
          onError: () =>
            toast({
              title: t('common.error', { defaultValue: 'Error' }),
              description: t('common.save_error_desc', {
                defaultValue: "No s'ha pogut desar al dispositiu. Torna-ho a provar.",
              }),
              status: 'error',
              duration: 5000,
              isClosable: true,
            }),
        }
      )
    },
    [mutate, toast, t]
  )

  const toggleOne = useCallback((instance: Instance, done: boolean) => setDone([instance], done), [setDone])

  return { setDone, toggleOne }
}
