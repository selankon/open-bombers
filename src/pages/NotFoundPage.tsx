import { Button } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { ROUTES } from '~src/router/routes'
import { icons } from '~theme/icons'

export const NotFoundPage = () => {
  const { t } = useTranslation()
  return (
    <ElementNotFound
      icon={icons.info}
      title={t('not_found.title', { defaultValue: 'Aquesta pàgina no existeix' })}
      desc={t('not_found.desc', { defaultValue: "Potser l'enllaç és antic. Torna a l'inici per continuar." })}
      action={
        <Button as={RouterLink} to={ROUTES.HOME}>
          {t('not_found.back', { defaultValue: "Tornar a l'inici" })}
        </Button>
      }
    />
  )
}
