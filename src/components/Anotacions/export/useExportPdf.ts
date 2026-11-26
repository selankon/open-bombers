import { useToast } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TemariPdf } from '~components/Temari/types'
import { Pagines } from '../types'

/**
 * Exports a copy of the PDF with the annotations burnt into its pages.
 * Placeholder: the pdf-lib export lands in the next step.
 */
export const useExportPdf = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const exportPdf = async (_pdf: TemariPdf, _pagines: Pagines) => {
    setBusy(true)
    toast({
      title: t('anotacions.export_soon', { defaultValue: 'Aviat podràs exportar el PDF anotat' }),
      status: 'info',
      duration: 3000,
    })
    setBusy(false)
  }

  return { exportPdf, busy }
}
