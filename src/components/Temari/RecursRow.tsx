import {
  Badge,
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Portal,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconType } from 'react-icons'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '~components/Layout/ConfirmDialog'
import { Card } from '~components/Layout/LayoutComponents'
import { temariPdfPath } from '~src/router/routes'
import api from '~src/services/api'
import { icons } from '~theme/icons'
import { downloadBlob } from '~utils/download'
import { useRemoveRecurs } from './queries'
import { formatMida, hostOf, recursKind, recursPdfId } from './recursos'
import { Recurs, RecursKind } from './types'

const KIND_ICON: Record<RecursKind, IconType> = {
  pdf: icons.pdf,
  imatge: icons.image,
  video: icons.video,
  audio: icons.audio,
  enllac: icons.link,
  fitxer: icons.file,
}

type RecursRowProps = {
  recurs: Recurs
  // Number of annotations of its PDF (0 when it has none)
  anotacions: number
  onEdit: (recurs: Recurs) => void
  // Opens a picture, video or audio in the viewer
  onView: (recurs: Recurs) => void
}

/**
 * One extra tema or resource added by the user: open it, edit it, download it or delete it
 */
export const RecursRow = ({ recurs, anotacions, onEdit, onView }: RecursRowProps) => {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const confirm = useDisclosure()
  const [isDownloading, setIsDownloading] = useState(false)
  const { mutateAsync: remove, isPending: isRemoving } = useRemoveRecurs()
  const kind = recursKind(recurs)
  const isTema = recurs.categoria === 'tema'

  const errorToast = (title: string) =>
    toast({
      title,
      description: t('recursos.file_error_desc', {
        defaultValue: 'Ho sentim, el fitxer no s’ha pogut llegir d’aquest dispositiu. Prova de tornar-lo a afegir.',
      }),
      status: 'error',
      duration: 5000,
      isClosable: true,
    })

  const download = async () => {
    if (!recurs.fitxer) return
    setIsDownloading(true)
    try {
      downloadBlob(await api.recursos.getBlob(recurs.id), recurs.fitxer.nom)
    } catch {
      errorToast(t('recursos.download_error', { defaultValue: 'No s’ha pogut descarregar el fitxer' }))
    } finally {
      setIsDownloading(false)
    }
  }

  const open = () => {
    if (kind === 'pdf') return navigate(temariPdfPath(recursPdfId(recurs.id)))
    if (kind === 'enllac' && recurs.url) return void window.open(recurs.url, '_blank', 'noopener,noreferrer')
    if (kind === 'fitxer') return void download()
    onView(recurs)
  }

  const handleRemove = async () => {
    try {
      await remove(recurs.id)
      confirm.onClose()
      toast({
        title: isTema
          ? t('recursos.tema_removed', { defaultValue: 'Tema esborrat' })
          : t('recursos.removed', { defaultValue: 'Recurs esborrat' }),
        status: 'success',
        duration: 3000,
      })
    } catch {
      toast({
        title: t('recursos.remove_error', { defaultValue: 'No s’ha pogut esborrar' }),
        description: t('recursos.remove_error_desc', { defaultValue: 'Torna-ho a provar d’aquí a un moment.' }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const openLabel =
    kind === 'enllac'
      ? t('recursos.open_link', { defaultValue: 'Obre l’enllaç' })
      : kind === 'fitxer'
        ? t('recursos.download', { defaultValue: 'Descarrega el fitxer' })
        : t('temari.open', { defaultValue: 'Obre' })
  const openIcon = kind === 'enllac' ? icons.external : kind === 'fitxer' ? icons.download : icons.study
  const moreLabel = t('recursos.actions', { defaultValue: 'Més opcions de «{{name}}»', name: recurs.titol })

  return (
    <Card px={{ base: 3, md: 4 }} py={3}>
      <Flex align='center' gap={3}>
        <Flex
          w={10}
          h={10}
          flexShrink={0}
          borderRadius='sm'
          bg={isTema ? 'temaCode' : 'surfaceMuted'}
          color={isTema ? 'white' : 'accent'}
          align='center'
          justify='center'
          fontWeight={800}
          fontSize='sm'
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {isTema && recurs.tema !== null ? recurs.tema : <Icon as={KIND_ICON[kind]} boxSize={5} />}
        </Flex>
        <Box flex={1} minW={0}>
          <Text fontWeight={700} fontSize='sm' noOfLines={2}>
            {recurs.titol}
          </Text>
          <Flex align='center' gap={2} mt={0.5} wrap='wrap' fontSize='xs' color='textMuted'>
            {isTema && (
              <Badge colorScheme='gray' variant='subtle' fontSize='2xs' borderRadius='full' px={2}>
                {t('recursos.own_badge', { defaultValue: 'Afegit per tu' })}
              </Badge>
            )}
            <Flex align='center' gap={1} minW={0}>
              {isTema && <Icon as={KIND_ICON[kind]} flexShrink={0} />}
              <Text noOfLines={1} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {recurs.fitxer ? formatMida(recurs.fitxer.mida) : recurs.url ? hostOf(recurs.url) : null}
              </Text>
            </Flex>
            {anotacions > 0 && (
              <Flex align='center' gap={1} color='accent'>
                <Icon as={icons.annotated} />
                <Text sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {t('temari.annotated_badge', {
                    defaultValue: '{{count}} anotacions',
                    defaultValue_one: '{{count}} anotació',
                    count: anotacions,
                  })}
                </Text>
              </Flex>
            )}
          </Flex>
        </Box>
        <Flex gap={1} flexShrink={0}>
          <Menu placement='bottom-end' isLazy>
            <MenuButton
              as={IconButton}
              aria-label={moreLabel}
              icon={<Icon as={icons.more} boxSize={5} />}
              variant='ghost'
              colorScheme='gray'
              isLoading={isDownloading}
            />
            <Portal>
              <MenuList borderRadius='md' boxShadow='floating' borderColor='border' py={1}>
                <MenuItem icon={<Icon as={icons.edit} boxSize={4} />} onClick={() => onEdit(recurs)}>
                  {t('recursos.edit', { defaultValue: 'Edita' })}
                </MenuItem>
                {recurs.fitxer && kind !== 'fitxer' && (
                  <MenuItem icon={<Icon as={icons.download} boxSize={4} />} onClick={download}>
                    {t('recursos.download', { defaultValue: 'Descarrega el fitxer' })}
                  </MenuItem>
                )}
                <MenuDivider />
                <MenuItem icon={<Icon as={icons.delete} boxSize={4} />} color='nb.fg' onClick={confirm.onOpen}>
                  {t('recursos.remove', { defaultValue: 'Esborra' })}
                </MenuItem>
              </MenuList>
            </Portal>
          </Menu>
          <Button leftIcon={<Icon as={openIcon} />} onClick={open} display={{ base: 'none', sm: 'inline-flex' }}>
            {kind === 'fitxer' ? t('recursos.download_short', { defaultValue: 'Descarrega' }) : openLabel}
          </Button>
          <IconButton
            aria-label={openLabel}
            icon={<Icon as={openIcon} boxSize={5} />}
            onClick={open}
            display={{ base: 'inline-flex', sm: 'none' }}
          />
        </Flex>
      </Flex>

      <ConfirmDialog
        isOpen={confirm.isOpen}
        onClose={confirm.onClose}
        isDestructive
        isLoading={isRemoving}
        title={
          isTema
            ? t('recursos.remove_tema_title', { defaultValue: 'Esborrar aquest tema?' })
            : t('recursos.remove_title', { defaultValue: 'Esborrar aquest recurs?' })
        }
        body={
          recurs.fitxer
            ? t('recursos.remove_body_file', {
                defaultValue:
                  'S’esborrarà «{{name}}» i el seu fitxer d’aquest dispositiu, amb les anotacions que hi hagis fet. El fitxer original que tens a l’ordinador o al mòbil no es toca. Aquesta acció no es pot desfer.',
                name: recurs.titol,
              })
            : t('recursos.remove_body_link', {
                defaultValue: 'S’esborrarà l’enllaç «{{name}}». Aquesta acció no es pot desfer.',
                name: recurs.titol,
              })
        }
        confirmLabel={t('recursos.remove', { defaultValue: 'Esborra' })}
        onConfirm={handleRemove}
      />
    </Card>
  )
}
