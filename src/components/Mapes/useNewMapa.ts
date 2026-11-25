import { useToast } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { mapaPath } from '~src/router/routes'
import { nodesFromTema } from './logic'
import { MapaFormValues } from './MapaFormModal'
import { useCreateMapa } from './queries'

/**
 * Creates a map (seeded with the tema / apartat when linked) and opens it in the editor
 */
export const useNewMapa = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const { structure } = useStudyData()
  const { mutateAsync, isPending } = useCreateMapa()

  const create = async ({ titol, tema_id, row_id, amb_apartats }: MapaFormValues) => {
    const tema = structure.temes.find((tm) => tm.id === tema_id)
    const nodes = tema && (row_id || amb_apartats) ? nodesFromTema(tema, row_id) : undefined
    try {
      const mapa = await mutateAsync({ titol, tema_id, row_id, nodes })
      navigate(mapaPath(mapa.id))
      return true
    } catch {
      toast({
        title: t('mapes.create_error', { defaultValue: 'No s’ha pogut crear el mapa' }),
        description: t('mapes.storage_error_desc', {
          defaultValue:
            'Sembla que el navegador no deixa desar dades. Comprova que no estàs en mode privat i torna-ho a provar.',
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return false
    }
  }

  return { create, isPending }
}
