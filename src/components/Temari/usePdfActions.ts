import { useToast } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { temariPdfPath } from '~src/router/routes'
import api from '~src/services/api'
import { TEMARI_DOWNLOAD_DELAY } from '~utils/constants'
import { downloadBlob } from '~utils/download'
import { pdfFileName } from './logic'
import { isRecursPdfId } from './recursos'
import { useSavedPdfs } from './queries'
import { TemariPdf } from './types'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Open (in the reader) and download syllabus PDFs, using the offline copy when there is one
 */
export const usePdfActions = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const { data: saved = [] } = useSavedPdfs()
  const [busyId, setBusyId] = useState<string | null>(null)

  // PDFs added by the user are always on the device
  const isSaved = (pdf: TemariPdf) => isRecursPdfId(pdf.id) || saved.includes(pdf.id)

  const errorToast = () =>
    toast({
      title: t('temari.error_title', { defaultValue: 'No s’ha pogut obrir el PDF' }),
      description: navigator.onLine
        ? t('temari.error_desc', {
            defaultValue: 'El servidor de la Generalitat no respon. Torna-ho a provar d’aquí a una estona.',
          })
        : t('temari.error_offline', {
            defaultValue:
              'Estàs sense connexió i aquest PDF no està desat al dispositiu. Desa’l quan tinguis connexió.',
          }),
      status: 'error',
      duration: 5000,
      isClosable: true,
    })

  // Opens the PDF in the app's reader (where it can be annotated)
  const open = (pdf: TemariPdf) => {
    if (!isSaved(pdf) && !navigator.onLine) return errorToast()
    navigate(temariPdfPath(pdf.id))
  }

  const download = async (pdf: TemariPdf) => {
    setBusyId(pdf.id)
    try {
      downloadBlob(await api.temari.getBlob(pdf.id), pdfFileName(pdf))
    } catch {
      errorToast()
    } finally {
      setBusyId(null)
    }
  }

  // Save every PDF as a file, one after another. Returns the ids that failed.
  const downloadAll = async (pdfs: TemariPdf[], onProgress: (done: number, total: number) => void) => {
    const failed: string[] = []
    for (const [i, pdf] of pdfs.entries()) {
      try {
        downloadBlob(await api.temari.getBlob(pdf.id), pdfFileName(pdf))
        await wait(TEMARI_DOWNLOAD_DELAY)
      } catch {
        failed.push(pdf.id)
      }
      onProgress(i + 1, pdfs.length)
    }
    return failed
  }

  return { open, download, downloadAll, isSaved, busyId }
}
