import {
  Box,
  Button,
  Flex,
  Icon,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { LoadingSpinner } from '~components/Layout/LoadingSpinner'
import { icons } from '~theme/icons'
import { downloadBlob } from '~utils/download'
import { useRecursBlob } from './queries'
import { recursKind } from './recursos'
import { Recurs } from './types'

type RecursViewerProps = {
  recurs: Recurs | null
  onClose: () => void
}

/**
 * Shows a picture, video or audio added by the user, without leaving the app
 */
export const RecursViewer = ({ recurs, onClose }: RecursViewerProps) => {
  const { t } = useTranslation()
  const blob = useRecursBlob(recurs?.id ?? null)
  const src = useMemo(() => (blob.data ? URL.createObjectURL(blob.data) : null), [blob.data])
  const kind = recurs ? recursKind(recurs) : null

  // Free the object URL when the file changes or the viewer closes
  useEffect(() => () => void (src && URL.revokeObjectURL(src)), [src])

  const download = () => recurs?.fitxer && blob.data && downloadBlob(blob.data, recurs.fitxer.nom)

  return (
    <Modal isOpen={!!recurs} onClose={onClose} isCentered size={{ base: 'full', md: '4xl' }}>
      <ModalOverlay backdropFilter='blur(2px)' />
      <ModalContent borderRadius={{ base: 0, md: 'sheet' }} mx={{ md: 4 }} overflow='hidden'>
        <ModalHeader pr={14}>
          <Text noOfLines={1}>{recurs?.titol}</Text>
          {recurs?.fitxer && (
            <Text fontSize='xs' fontWeight={400} color='textMuted' noOfLines={1}>
              {recurs.fitxer.nom}
            </Text>
          )}
        </ModalHeader>
        <ModalCloseButton aria-label={t('common.close', { defaultValue: 'Tancar' })} />
        <ModalBody pb={{ base: 'calc(16px + env(safe-area-inset-bottom))', md: 6 }}>
          {blob.isError ? (
            <ElementNotFound
              icon={icons.warning}
              title={t('recursos.view_error_title', { defaultValue: 'No hem pogut obrir el fitxer' })}
              desc={t('recursos.view_error_desc', {
                defaultValue:
                  'Ho sentim, el fitxer no s’ha pogut llegir d’aquest dispositiu. Prova de tornar-lo a afegir.',
              })}
              action={
                <Button leftIcon={<Icon as={icons.reset} />} onClick={() => blob.refetch()}>
                  {t('recursos.retry', { defaultValue: 'Torna-ho a provar' })}
                </Button>
              }
            />
          ) : !src ? (
            <LoadingSpinner minH='40vh' />
          ) : (
            <Flex direction='column' gap={4}>
              <Flex
                align='center'
                justify='center'
                bg='surfaceMuted'
                borderRadius='md'
                overflow='hidden'
                minH={kind === 'audio' ? 24 : '40vh'}
              >
                {kind === 'imatge' && (
                  <Image src={src} alt={recurs?.titol} maxH='70dvh' maxW='full' objectFit='contain' />
                )}
                {kind === 'video' && (
                  <Box as='video' src={src} controls playsInline maxH='70dvh' maxW='full' w='full' bg='black' />
                )}
                {kind === 'audio' && <Box as='audio' src={src} controls w='full' px={4} />}
              </Flex>
              <Flex justify='flex-end'>
                <Button variant='outline' colorScheme='gray' leftIcon={<Icon as={icons.download} />} onClick={download}>
                  {t('recursos.download', { defaultValue: 'Descarrega el fitxer' })}
                </Button>
              </Flex>
            </Flex>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
