import {
  Box,
  Button,
  Flex,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { ROUTES } from '~src/router/routes'
import { icons } from '~theme/icons'
import { canShareFiles, downloadBlob, shareFile } from '~utils/download'
import { IcsOptionsFields } from './IcsOptionsFields'
import { useIcsExport } from './useIcsExport'

/**
 * Export the review calendar as .ics (download or Web Share)
 */
export const IcsExportModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const { events, buildFile, lastExport, helpSeen, saveIcsState, isDirty } = useIcsExport()
  const isShareable = canShareFiles()

  const afterExport = async (isFirstExport: boolean) => {
    onClose()
    // The first time, show how to add the file to a calendar
    if (isFirstExport && !helpSeen) {
      await saveIcsState({ ajuda_vista: true })
      navigate(ROUTES.HELP.CALENDAR)
    }
  }

  const handleDownload = async () => {
    try {
      const { file, isFirstExport } = await buildFile()
      downloadBlob(file, file.name)
      toast({ title: t('ics.downloaded', { defaultValue: 'Calendari exportat' }), status: 'success', duration: 3000 })
      await afterExport(isFirstExport)
    } catch {
      toast({ title: t('common.error', { defaultValue: 'Error' }), status: 'error', duration: 5000 })
    }
  }

  const handleShare = async () => {
    try {
      const { file, isFirstExport } = await buildFile()
      const shared = await shareFile(file, 'Repassos Bombers')
      if (shared) {
        toast({ title: t('ics.shared', { defaultValue: 'Calendari compartit' }), status: 'success', duration: 3000 })
        await afterExport(isFirstExport)
      }
    } catch {
      toast({
        title: t('ics.share_error', { defaultValue: "No s'ha pogut compartir" }),
        description: t('ics.share_error_desc', { defaultValue: 'Prova de descarregar el fitxer.' }),
        status: 'error',
        duration: 5000,
      })
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'lg' }} scrollBehavior='inside'>
      <ModalOverlay backdropFilter='blur(2px)' />
      <ModalContent borderRadius={{ base: 0, md: 'sheet' }}>
        <ModalHeader>{t('ics.title', { defaultValue: 'Exportar calendari (.ics)' })}</ModalHeader>
        <ModalCloseButton aria-label={t('common.close', { defaultValue: 'Tancar' })} />
        <ModalBody>
          <Stack spacing={5}>
            <Box bg='surfaceMuted' borderRadius='12px' p={3} fontSize='sm'>
              <Text>
                {t('ics.summary', {
                  defaultValue: '{{ count }} esdeveniments: un per sessió de repàs.',
                  count: events.length,
                })}
              </Text>
              <Text color='textMuted' fontSize='xs' mt={1}>
                {lastExport
                  ? t('ics.last_export', {
                      defaultValue: 'Última exportació: {{ date }}',
                      date: new Date(lastExport).toLocaleString('ca'),
                    })
                  : t('ics.never_exported', { defaultValue: 'Encara no has exportat mai el calendari.' })}
                {isDirty && lastExport && ` · ${t('ics.dirty_short', { defaultValue: 'hi ha canvis nous' })}`}
              </Text>
            </Box>
            <IcsOptionsFields />
            <Link
              as={RouterLink}
              to={ROUTES.HELP.CALENDAR}
              onClick={onClose}
              color='accent'
              fontWeight={600}
              fontSize='sm'
            >
              {t('ics.help_link', { defaultValue: 'Com afegir-ho al meu calendari?' })}
            </Link>
          </Stack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Flex gap={2} w='full' justify='flex-end' wrap='wrap'>
            {isShareable && (
              <Button variant='outline' colorScheme='gray' leftIcon={<icons.share />} onClick={handleShare}>
                {t('ics.share', { defaultValue: 'Compartir .ics' })}
              </Button>
            )}
            <Button leftIcon={<icons.download />} onClick={handleDownload}>
              {t('ics.download', { defaultValue: 'Descarregar' })}
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
