import {
  Icon,
  IconButton,
  IconButtonProps,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Portal,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '~components/Layout/ConfirmDialog'
import { mapaPath } from '~src/router/routes'
import { icons } from '~theme/icons'
import { ExportKind } from './export/useExportMapa'
import { MapaFormModal } from './MapaFormModal'
import { useDuplicateMapa, useRemoveMapa, useSaveMapaInfo } from './queries'
import { MapaResum } from './types'

type MapaActionsMenuProps = {
  mapa: Pick<MapaResum, 'id' | 'titol' | 'tema_id' | 'row_id'>
  // Runs before duplicating (the editor saves pending changes first)
  onBeforeDuplicate?: () => Promise<unknown> | void
  // Runs before deleting (the editor stops its autosave)
  onBeforeRemove?: () => void
  onRemoved?: () => void
  // Only inside the editor (the export needs the measured ideas)
  onExport?: (kind: ExportKind) => void
  exporting?: ExportKind | null
} & Omit<IconButtonProps, 'aria-label'>

/**
 * "…" menu of a map: change its data, duplicate it, delete it
 */
export const MapaActionsMenu = ({
  mapa,
  onBeforeDuplicate,
  onBeforeRemove,
  onRemoved,
  onExport,
  exporting,
  ...props
}: MapaActionsMenuProps) => {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const form = useDisclosure()
  const confirm = useDisclosure()
  const { mutateAsync: saveInfo, isPending: isSaving } = useSaveMapaInfo()
  const { mutateAsync: duplicate } = useDuplicateMapa()
  const { mutateAsync: remove, isPending: isRemoving } = useRemoveMapa()

  const fail = (title: string) =>
    toast({
      title,
      description: t('mapes.retry_desc', { defaultValue: 'Torna-ho a provar d’aquí a un moment.' }),
      status: 'error',
      duration: 5000,
      isClosable: true,
    })

  const onDuplicate = async () => {
    try {
      await onBeforeDuplicate?.()
      const copy = await duplicate({
        id: mapa.id,
        titol: t('mapes.copy_of', { defaultValue: '{{title}} (còpia)', title: mapa.titol }),
      })
      toast({ title: t('mapes.duplicated', { defaultValue: 'Mapa duplicat' }), status: 'success', duration: 3000 })
      navigate(mapaPath(copy.id))
    } catch {
      fail(t('mapes.duplicate_error', { defaultValue: 'No s’ha pogut duplicar el mapa' }))
    }
  }

  const onRemove = async () => {
    try {
      onBeforeRemove?.()
      await remove(mapa.id)
      confirm.onClose()
      toast({ title: t('mapes.removed', { defaultValue: 'Mapa eliminat' }), status: 'success', duration: 3000 })
      onRemoved?.()
    } catch {
      fail(t('mapes.remove_error', { defaultValue: 'No s’ha pogut eliminar el mapa' }))
    }
  }

  return (
    <>
      <Menu placement='bottom-end' isLazy>
        <MenuButton
          as={IconButton}
          aria-label={t('mapes.actions', { defaultValue: 'Opcions del mapa' })}
          icon={<Icon as={icons.more} />}
          variant='ghost'
          colorScheme='gray'
          borderRadius='full'
          fontSize='lg'
          onClick={(e: MouseEvent) => e.stopPropagation()}
          {...props}
        />
        <Portal>
          <MenuList borderRadius='md' boxShadow='floating' borderColor='border' py={1}>
            <MenuItem icon={<Icon as={icons.edit} boxSize={4} />} onClick={form.onOpen}>
              {t('mapes.edit_info', { defaultValue: 'Canvia el títol o el tema' })}
            </MenuItem>
            {onExport && (
              <>
                <MenuItem
                  icon={<Icon as={icons.exportImage} boxSize={4} />}
                  onClick={() => onExport('png')}
                  isDisabled={!!exporting}
                >
                  {t('mapes.export_png', { defaultValue: 'Exporta com a imatge (PNG)' })}
                </MenuItem>
                <MenuItem
                  icon={<Icon as={icons.pdf} boxSize={4} />}
                  onClick={() => onExport('pdf')}
                  isDisabled={!!exporting}
                >
                  {t('mapes.export_pdf', { defaultValue: 'Exporta en PDF (DIN A4)' })}
                </MenuItem>
                <MenuDivider />
              </>
            )}
            <MenuItem icon={<Icon as={icons.copy} boxSize={4} />} onClick={onDuplicate}>
              {t('mapes.duplicate', { defaultValue: 'Duplica' })}
            </MenuItem>
            <MenuItem icon={<Icon as={icons.delete} boxSize={4} />} color='nb.fg' onClick={confirm.onOpen}>
              {t('mapes.remove', { defaultValue: 'Elimina' })}
            </MenuItem>
          </MenuList>
        </Portal>
      </Menu>

      <MapaFormModal
        isOpen={form.isOpen}
        onClose={form.onClose}
        mode='edit'
        initial={mapa}
        isLoading={isSaving}
        onSubmit={async ({ titol, tema_id, row_id }) => {
          try {
            await saveInfo({ id: mapa.id, titol, tema_id, row_id })
            form.onClose()
            toast({
              title: t('mapes.info_saved', { defaultValue: 'Dades desades' }),
              status: 'success',
              duration: 3000,
            })
          } catch {
            fail(t('mapes.info_error', { defaultValue: 'No s’han pogut desar les dades del mapa' }))
          }
        }}
      />

      <ConfirmDialog
        isOpen={confirm.isOpen}
        onClose={confirm.onClose}
        isDestructive
        isLoading={isRemoving}
        title={t('mapes.confirm_remove_title', { defaultValue: 'Eliminar el mapa?' })}
        body={t('mapes.confirm_remove_body', {
          defaultValue: 'S’esborrarà «{{title}}» amb totes les seves idees. Aquesta acció no es pot desfer.',
          title: mapa.titol,
        })}
        confirmLabel={t('mapes.remove', { defaultValue: 'Elimina' })}
        onConfirm={onRemove}
      />
    </>
  )
}
