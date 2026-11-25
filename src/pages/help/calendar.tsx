import { Button } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { MainContainer, PageHeader } from '~components/Layout/LayoutComponents'
import { CalendarHelpContent } from '~components/Repassos/CalendarHelp'
import { icons } from '~theme/icons'

export const CalendarHelp = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <MainContainer maxW='container.md'>
      <PageHeader
        title={t('help.title', { defaultValue: 'Com afegir-ho al meu calendari' })}
        subtitle={t('help.subtitle', {
          defaultValue: 'Dues maneres de fer servir el fitxer .ics: subscripció (recomanada) o importació puntual.',
        })}
        right={
          <Button variant='ghost' colorScheme='gray' leftIcon={<icons.prev />} onClick={() => navigate(-1)}>
            {t('common.back', { defaultValue: 'Tornar' })}
          </Button>
        }
      />
      <CalendarHelpContent />
    </MainContainer>
  )
}
