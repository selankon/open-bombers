import { useTheme, useToast } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { lightResolver } from '~components/Mapes/export/colors'
import { pdfFileName } from '~components/Temari/logic'
import { TemariPdf } from '~components/Temari/types'
import api from '~src/services/api'
import { PDF, PDF_ANOTAT_SUFFIX } from '~utils/constants'
import { downloadBlob } from '~utils/download'
import { countPagines } from '../logic'
import { Pagines } from '../types'
import { burnAnotacions } from './burn'
import { imageForPdf } from './images'

/** "tema-9.pdf" → "tema-9-anotat.pdf" */
export const annotatedFileName = (pdf: TemariPdf) => pdfFileName(pdf).replace(/\.pdf$/i, '') + PDF_ANOTAT_SUFFIX

/**
 * Exports a copy of the PDF with the annotations burnt into its pages: drawings, highlights and
 * pictures on the page itself, notes as real PDF comments.
 */
export const useExportPdf = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const theme = useTheme()
  const [busy, setBusy] = useState(false)

  const exportPdf = async (pdf: TemariPdf, pagines: Pagines) => {
    if (!countPagines(pagines)) {
      toast({
        title: t('anotacions.export_empty', { defaultValue: 'Aquest PDF encara no té anotacions' }),
        description: t('anotacions.export_empty_desc', {
          defaultValue: 'Dibuixa, subratlla o afegeix una nota i després podràs exportar-lo.',
        }),
        status: 'info',
        duration: 3000,
      })
      return
    }
    setBusy(true)
    try {
      // pdf-lib only loads when someone exports
      const [lib, blob] = await Promise.all([import('pdf-lib'), api.temari.getBlob(pdf.id)])
      const bytes = await burnAnotacions(lib, new Uint8Array(await blob.arrayBuffer()), pagines, {
        resolve: lightResolver(theme),
        loadImage: imageForPdf,
        author: PDF.EXPORT_AUTHOR,
      })
      downloadBlob(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), annotatedFileName(pdf))
      toast({
        title: t('anotacions.exported', { defaultValue: 'PDF exportat' }),
        status: 'success',
        duration: 3000,
      })
    } catch {
      toast({
        title: t('anotacions.export_error', { defaultValue: 'No s’ha pogut exportar el PDF' }),
        description: t('anotacions.export_error_desc', {
          defaultValue:
            'Ho sentim, alguna cosa ha fallat en preparar el fitxer. Comprova la connexió si el PDF no està desat per llegir sense connexió i torna-ho a provar.',
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setBusy(false)
    }
  }

  return { exportPdf, busy }
}
