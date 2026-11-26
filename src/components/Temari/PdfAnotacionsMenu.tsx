import {
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Portal,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { useExportPdf } from '~components/Anotacions/export/useExportPdf'
import { useRemoveAnotacions } from '~components/Anotacions/queries'
import { ConfirmDialog } from '~components/Layout/ConfirmDialog'
import api from '~src/services/api'
import { icons } from '~theme/icons'
import { TemariPdf } from './types'

type PdfAnotacionsMenuProps = {
  pdf: TemariPdf
  nom: string
  // Download of the original file (takes the place of the row's download button)
  onDownload: () => void
  isDownloading: boolean
  // The PDF isn't on the device and there is no connection
  unavailable: boolean
}

/**
 * "…" menu of an annotated PDF: download the original, export it with the annotations, or delete them
 */
export const PdfAnotacionsMenu = ({ pdf, nom, onDownload, isDownloading, unavailable }: PdfAnotacionsMenuProps) => {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useDisclosure()
  const { exportPdf, busy: isExporting } = useExportPdf()
  const { mutateAsync: remove, isPending: isRemoving } = useRemoveAnotacions()

  const handleExport = async () => {
    try {
      const record = await api.anotacions.get(pdf.id)
      await exportPdf(pdf, record.pagines)
    } catch {
      toast({
        title: t('temari.export_error', { defaultValue: 'No s’ha pogut exportar el PDF' }),
        description: t('temari.export_error_desc', {
          defaultValue: 'Torna-ho a provar d’aquí a un moment. Les teves anotacions continuen desades.',
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handleRemove = async () => {
    try {
      await remove(pdf.id)
      confirm.onClose()
      toast({
        title: t('temari.annotations_removed', { defaultValue: 'Anotacions esborrades' }),
        status: 'success',
        duration: 3000,
      })
    } catch {
      toast({
        title: t('temari.annotations_remove_error', { defaultValue: 'No s’han pogut esborrar les anotacions' }),
        description: t('temari.annotations_remove_error_desc', {
          defaultValue: 'Torna-ho a provar d’aquí a un moment.',
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const label = t('temari.pdf_actions', { defaultValue: 'Més opcions del PDF' })

  return (
    <>
      <Menu placement='bottom-end' isLazy>
        <MenuButton
          as={IconButton}
          aria-label={label}
          icon={<Icon as={icons.more} boxSize={5} />}
          variant='ghost'
          colorScheme='gray'
          isLoading={isExporting || isDownloading}
        />
        <Portal>
          <MenuList borderRadius='md' boxShadow='floating' borderColor='border' py={1}>
            <MenuItem icon={<Icon as={icons.download} boxSize={4} />} onClick={onDownload} isDisabled={unavailable}>
              {t('temari.download_original', { defaultValue: 'Descarrega el PDF original' })}
            </MenuItem>
            <MenuItem
              icon={<Icon as={icons.export} boxSize={4} />}
              onClick={handleExport}
              isDisabled={unavailable || isExporting}
            >
              {t('temari.export_annotated', { defaultValue: 'Exporta amb les anotacions' })}
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={<Icon as={icons.delete} boxSize={4} />} color='nb.fg' onClick={confirm.onOpen}>
              {t('temari.remove_annotations', { defaultValue: 'Esborra les anotacions' })}
            </MenuItem>
          </MenuList>
        </Portal>
      </Menu>

      <ConfirmDialog
        isOpen={confirm.isOpen}
        onClose={confirm.onClose}
        isDestructive
        isLoading={isRemoving}
        title={t('temari.remove_annotations_title', { defaultValue: 'Esborrar les anotacions?' })}
        body={t('temari.remove_annotations_body', {
          defaultValue:
            'S’esborraran tots els traços, formes, notes i imatges que has afegit a «{{name}}». El PDF original no es toca. Aquesta acció no es pot desfer.',
          name: nom,
        })}
        confirmLabel={t('temari.remove_annotations', { defaultValue: 'Esborra les anotacions' })}
        onConfirm={handleRemove}
      />
    </>
  )
}
