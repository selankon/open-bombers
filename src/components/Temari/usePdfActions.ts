import { useToast } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '~src/services/api'
import { TEMARI_DOWNLOAD_DELAY } from '~utils/constants'
import { downloadBlob } from '~utils/download'
import { pdfFileName, pdfUrl } from './logic'
import { useSavedPdfs } from './queries'
import { TemariPdf } from './types'

// Blob URLs stay alive a while so the new tab can finish loading the PDF
const BLOB_URL_TTL = 5 * 60 * 1000

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Open and download syllabus PDFs, using the offline copy when there is one
 */
export const usePdfActions = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: saved = [] } = useSavedPdfs()
  const [busyId, setBusyId] = useState<string | null>(null)

  const isSaved = (pdf: TemariPdf) => saved.includes(pdf.id)

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

  const open = async (pdf: TemariPdf) => {
    if (!isSaved(pdf)) {
      if (!navigator.onLine) return errorToast()
      // Not saved: let the browser open the official URL
      window.open(pdfUrl(pdf), '_blank', 'noopener')
      return
    }
    // Open the tab now, while we still have the user gesture, and point it to the PDF once it's read
    const win = window.open('', '_blank')
    setBusyId(pdf.id)
    try {
      const blob = await api.temari.getBlob(pdf.id)
      if (win) {
        const url = URL.createObjectURL(blob)
        win.location.href = url
        setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_TTL)
      } else {
        downloadBlob(blob, pdfFileName(pdf))
      }
    } catch {
      win?.close()
      errorToast()
    } finally {
      setBusyId(null)
    }
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
