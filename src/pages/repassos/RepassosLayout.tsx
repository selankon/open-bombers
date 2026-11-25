import { Alert, AlertDescription, AlertIcon, Button, Flex, useDisclosure } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { MainContainer, PageHeader } from '~components/Layout/LayoutComponents'
import { RoutedTabs } from '~components/Layout/RoutedTabs'
import { IcsExportModal } from '~components/Repassos/IcsExportModal'
import { RegisterStudyInitial, RegisterStudyModal } from '~components/Repassos/RegisterStudyModal'
import { useIcsExport } from '~components/Repassos/useIcsExport'
import { ROUTES } from '~src/router/routes'
import { icons } from '~theme/icons'

export type RepassosLayoutContext = {
  openRegister: (initial?: RegisterStudyInitial) => void
}

export const RepassosLayout = () => {
  const { t } = useTranslation()
  const register = useDisclosure()
  const exporter = useDisclosure()
  const [initial, setInitial] = useState<RegisterStudyInitial>()
  const { isDirty, lastExport } = useIcsExport()

  const openRegister = useCallback(
    (init?: RegisterStudyInitial) => {
      setInitial(init)
      register.onOpen()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [register.onOpen]
  )

  return (
    <MainContainer>
      <PageHeader
        title={t('repassos.title', { defaultValue: 'Calendari de Repassos' })}
        subtitle={t('repassos.subtitle', {
          defaultValue: 'Repàs diari, setmanal i mensual de cada apartat a partir del dia que el vas estudiar.',
        })}
        right={
          <>
            <Button
              variant='outline'
              colorScheme='gray'
              bg='surface'
              leftIcon={<icons.download />}
              onClick={exporter.onOpen}
            >
              {t('ics.title', { defaultValue: 'Exportar calendari (.ics)' })}
            </Button>
            <Button leftIcon={<icons.add />} onClick={() => openRegister()}>
              {t('repassos.register_button', { defaultValue: 'Registrar estudi' })}
            </Button>
          </>
        }
      />
      {isDirty && lastExport && (
        <Alert status='info' borderRadius='14px' mb={4} variant='subtle'>
          <AlertIcon />
          <AlertDescription fontSize='sm' flex={1}>
            {t('ics.dirty', { defaultValue: 'Hi ha canvis no exportats al calendari' })}
          </AlertDescription>
          <Button size='xs' variant='ghost' onClick={exporter.onOpen}>
            {t('ics.export_now', { defaultValue: 'Exportar' })}
          </Button>
        </Alert>
      )}
      <Flex mb={5}>
        <RoutedTabs
          id='repassos'
          tabs={[
            { path: ROUTES.REPASSOS.TODAY, label: t('repassos.tab_today', { defaultValue: 'Avui' }) },
            { path: ROUTES.REPASSOS.CALENDAR, label: t('repassos.tab_calendar', { defaultValue: 'Calendari' }) },
          ]}
        />
      </Flex>
      <Outlet context={{ openRegister } satisfies RepassosLayoutContext} />
      <RegisterStudyModal isOpen={register.isOpen} onClose={register.onClose} initial={initial} />
      <IcsExportModal isOpen={exporter.isOpen} onClose={exporter.onClose} />
    </MainContainer>
  )
}
