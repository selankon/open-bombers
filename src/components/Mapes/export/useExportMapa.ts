import { useTheme, useToast } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MAPA, MAPA_PDF_EXT, MAPA_PNG_EXT } from '~utils/constants'
import { downloadBlob } from '~utils/download'
import { contentBounds } from '../content'
import { MapaContingut, NodeSizes } from '../types'
import { lightResolver } from './colors'
import { jpegToA4Pdf } from './pdf'
import { canvasBlob, renderMapa } from './render'

export type ExportKind = 'png' | 'pdf'

/** "Tema 3: Prevenció!" → "tema-3-prevencio" */
export const fileSlug = (title: string) =>
  title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'mapa'

/**
 * Exports the map as a PNG picture or as an A4 PDF page
 */
export const useExportMapa = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const theme = useTheme()
  const [busy, setBusy] = useState<ExportKind | null>(null)

  const exportMapa = async (kind: ExportKind, title: string, content: MapaContingut, sizes: NodeSizes) => {
    setBusy(kind)
    try {
      const resolve = lightResolver(theme)
      const font = theme.fonts?.body ?? 'sans-serif'
      const name = fileSlug(title)
      if (kind === 'png') {
        const canvas = await renderMapa(content, sizes, { resolve, font, scale: MAPA.EXPORT_PNG_SCALE })
        downloadBlob(await canvasBlob(canvas, 'image/png'), name + MAPA_PNG_EXT)
      } else {
        // Enough resolution for print, whatever the size of the map
        const b = contentBounds(content, sizes)
        const side = (b ? Math.max(b.maxX - b.minX, b.maxY - b.minY) : 200) + MAPA.EXPORT_PADDING * 2
        const scale = Math.min(3, MAPA.EXPORT_PDF_PX / side)
        const canvas = await renderMapa(content, sizes, { resolve, font, scale })
        const jpeg = new Uint8Array(await (await canvasBlob(canvas, 'image/jpeg', 0.92)).arrayBuffer())
        downloadBlob(jpegToA4Pdf(jpeg, canvas.width, canvas.height, title), name + MAPA_PDF_EXT)
      }
      toast({
        title:
          kind === 'png'
            ? t('mapes.exported_png', { defaultValue: 'Imatge exportada' })
            : t('mapes.exported_pdf', { defaultValue: 'PDF exportat' }),
        status: 'success',
        duration: 3000,
      })
    } catch {
      toast({
        title: t('mapes.export_error', { defaultValue: 'No s’ha pogut exportar el mapa' }),
        description: t('mapes.export_error_desc', {
          defaultValue: 'Pot ser que el mapa sigui massa gran per al navegador. Prova-ho amb menys imatges.',
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setBusy(null)
    }
  }

  return { exportMapa, busy }
}
