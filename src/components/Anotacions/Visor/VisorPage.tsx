import { Button, Flex, Icon } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { LoadingSpinner } from '~components/Layout/LoadingSpinner'
import { useOnline } from '~components/Layout/useOnline'
import { pdfById, pdfForTema } from '~components/Temari/logic'
import { ROUTES } from '~src/router/routes'
import { TEMARI_CORRECCIONS } from '~src/data/temari-pdfs'
import { icons } from '~theme/icons'
import { useAnotacions, usePdfDocument } from '../queries'
import { Visor } from './Visor'

const FULL_H = 'calc(100dvh - 56px - env(safe-area-inset-top))'

/**
 * Opens one syllabus PDF in the reader, with its annotations
 */
export const VisorPage = () => {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const isOnline = useOnline()
  const queryClient = useQueryClient()
  const { structure } = useStudyData()
  const pdf = pdfById(id)
  const document = usePdfDocument(pdf ? id : '')
  const anotacions = useAnotacions(id)
  const doc = document.data?.doc

  // Free the PDF in the worker once the reader closes (or loads it again)
  useEffect(() => {
    if (!doc) return
    return () => {
      setTimeout(() => {
        const current = queryClient.getQueryData<{ doc: typeof doc }>(['anotacions', 'document', id])
        if (current?.doc !== doc) doc.destroy()
      }, 1000)
    }
  }, [doc, id, queryClient])

  // Title: the tema name from the planning (the user may have renamed it)
  const { title, subtitle } = useMemo(() => {
    if (!pdf) return { title: '', subtitle: null }
    if (pdf.id === TEMARI_CORRECCIONS.id)
      return {
        title: t('temari.correccions', { defaultValue: 'Correccions de la guia orientativa de continguts' }),
        subtitle: null,
      }
    const tema = structure.temes.find((tm) => pdfForTema(tm)?.id === pdf.id)
    return {
      title: tema?.nom ?? t('temari.tema_fallback', { defaultValue: 'Tema {{n}}', n: pdf.tema }),
      subtitle: pdf.manual,
    }
  }, [pdf, structure.temes, t])

  const back = (
    <Button as={RouterLink} to={ROUTES.TEMARI} leftIcon={<Icon as={icons.back} />}>
      {t('anotacions.back', { defaultValue: 'Torna al temari' })}
    </Button>
  )

  if (!pdf)
    return (
      <ElementNotFound
        icon={icons.pdf}
        title={t('anotacions.not_found_title', { defaultValue: 'No trobem aquest PDF' })}
        desc={t('anotacions.not_found_desc', {
          defaultValue: 'Potser l’enllaç és d’una versió anterior del temari. Tots els manuals són a la pàgina Temari.',
        })}
        action={back}
        minH={FULL_H}
        justify='center'
      />
    )

  if (document.isError || anotacions.isError)
    return (
      <ElementNotFound
        icon={isOnline ? icons.warning : icons.offline}
        title={t('anotacions.load_error_title', { defaultValue: 'No hem pogut obrir el PDF' })}
        desc={
          isOnline
            ? t('anotacions.load_error_desc', {
                defaultValue:
                  'El servidor de la Generalitat no respon o el fitxer no s’ha pogut llegir. Torna-ho a provar d’aquí a una estona.',
              })
            : t('anotacions.load_error_offline', {
                defaultValue:
                  'Estàs sense connexió i aquest PDF no està desat al dispositiu. Desa’l des del Temari quan tinguis connexió.',
              })
        }
        action={
          <Flex gap={2} wrap='wrap' justify='center'>
            <Button
              leftIcon={<Icon as={icons.reset} />}
              onClick={() => {
                document.refetch()
                anotacions.refetch()
              }}
            >
              {t('anotacions.retry', { defaultValue: 'Torna-ho a provar' })}
            </Button>
            <Button as={RouterLink} to={ROUTES.TEMARI} variant='ghost' colorScheme='gray'>
              {t('anotacions.back', { defaultValue: 'Torna al temari' })}
            </Button>
          </Flex>
        }
        minH={FULL_H}
        justify='center'
      />
    )

  if (!document.data || !anotacions.data) return <LoadingSpinner minH={FULL_H} />

  return (
    <Visor
      key={pdf.id}
      pdf={pdf}
      title={title}
      subtitle={subtitle}
      doc={document.data.doc}
      sizes={document.data.sizes}
      initial={anotacions.data.pagines}
    />
  )
}
