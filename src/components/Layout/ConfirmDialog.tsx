import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
} from '@chakra-ui/react'
import { ReactNode, useRef } from 'react'
import { useTranslation } from 'react-i18next'

type ConfirmDialogProps = {
  isOpen: boolean
  title: ReactNode
  body: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  isDestructive?: boolean
  isLoading?: boolean
}

/**
 * Confirmation modal with a clear explanation and an explicit confirm button
 */
export const ConfirmDialog = ({
  isOpen,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  isDestructive,
  isLoading,
}: ConfirmDialogProps) => {
  const { t } = useTranslation()
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose} isCentered>
      <AlertDialogOverlay backdropFilter='blur(2px)'>
        <AlertDialogContent borderRadius='sheet' mx={4}>
          <AlertDialogHeader fontSize='lg'>{title}</AlertDialogHeader>
          <AlertDialogBody color='lightText'>{body}</AlertDialogBody>
          <AlertDialogFooter gap={2}>
            <Button ref={cancelRef} variant='ghost' colorScheme='gray' onClick={onClose}>
              {t('common.cancel', { defaultValue: 'Cancel·lar' })}
            </Button>
            <Button colorScheme={isDestructive ? 'red' : 'primary'} onClick={onConfirm} isLoading={isLoading}>
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}
