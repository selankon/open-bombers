import { useToast } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { mapaPath } from '~src/router/routes'
import { MAPA_FILE_EXT } from '~utils/constants'
import { downloadBlob, shareFile } from '~utils/download'
import { useExportMapaFile, useImportMapaFile } from '../queries'
import { fileSlug } from './useExportMapa'

export type MapaFileAction = 'download' | 'share'

/**
 * Saves one map as a ".mapa.json" file (download or system share sheet) and opens shared ones.
 * The file keeps everything (ideas, ink, shapes and pictures) and the import adds it as a new map.
 */
export const useMapaFile = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const { mutateAsync: exportFile, isPending: isExporting } = useExportMapaFile()
  const { mutateAsync: importFile, isPending: isImporting } = useImportMapaFile()

  const saveFile = async (id: string, title: string, action: MapaFileAction) => {
    try {
      const data = await exportFile(id)
      const file = new File([JSON.stringify(data)], fileSlug(title) + MAPA_FILE_EXT, { type: 'application/json' })
      if (action === 'share') {
        await shareFile(file, title)
        return
      }
      downloadBlob(file, file.name)
      toast({
        title: t('mapes.file_downloaded', { defaultValue: 'Mapa descarregat' }),
        status: 'success',
        duration: 3000,
      })
    } catch {
      toast({
        title: t('mapes.file_error', { defaultValue: 'No s’ha pogut preparar el fitxer del mapa' }),
        description:
          action === 'share'
            ? t('mapes.file_share_error_desc', { defaultValue: 'Prova de descarregar-lo i enviar-lo tu mateix.' })
            : t('mapes.retry_desc', { defaultValue: 'Torna-ho a provar d’aquí a un moment.' }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const openFile = async (file?: File) => {
    if (!file) return
    let data: unknown
    try {
      data = JSON.parse(await file.text())
    } catch {
      data = null
    }
    try {
      const mapa = await importFile(data)
      toast({ title: t('mapes.file_imported', { defaultValue: 'Mapa importat' }), status: 'success', duration: 3000 })
      navigate(mapaPath(mapa.id))
    } catch {
      toast({
        title: t('mapes.file_invalid', { defaultValue: 'No hem pogut obrir aquest mapa' }),
        description: t('mapes.file_invalid_desc', {
          defaultValue:
            'Tria un fitxer .mapa.json exportat des d’Open Bombers. Si te l’han enviat, pot ser que sigui d’una versió més nova de l’app: actualitza-la i torna-ho a provar.',
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  return { saveFile, openFile, isExporting, isImporting }
}
