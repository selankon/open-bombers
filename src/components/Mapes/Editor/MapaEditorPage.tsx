import { Button, Icon } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { LoadingSpinner } from '~components/Layout/LoadingSpinner'
import { ROUTES } from '~src/router/routes'
import { icons } from '~theme/icons'
import { useMapa } from '../queries'
import { MapaEditor } from './MapaEditor'

/**
 * Loads one map and opens it in the editor
 */
export const MapaEditorPage = () => {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const { data: mapa, isLoading, isError } = useMapa(id)

  if (isLoading) return <LoadingSpinner minH='60vh' />
  if (isError || !mapa)
    return (
      <ElementNotFound
        icon={icons.mapes}
        title={t('mapes.not_found_title', { defaultValue: 'No trobem aquest mapa' })}
        desc={t('mapes.not_found_desc', {
          defaultValue: 'Potser s’ha eliminat o és d’un altre dispositiu. Els teus mapes són a la llista.',
        })}
        action={
          <Button as={RouterLink} to={ROUTES.MAPES.LIST} leftIcon={<Icon as={icons.back} />}>
            {t('mapes.back', { defaultValue: 'Torna als mapes' })}
          </Button>
        }
        minH='60vh'
        justify='center'
      />
    )
  return <MapaEditor key={mapa.id} mapa={mapa} />
}
