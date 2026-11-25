import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react'
import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { BackupPanel } from '~components/Backup/BackupPanel'
import { Card, MainContainer, PageHeader } from '~components/Layout/LayoutComponents'
import { BlockedDaysEditor } from '~components/Repassos/BlockedDaysEditor'
import { IcsOptionsFields } from '~components/Repassos/IcsOptionsFields'
import { RepasSettingsForm } from '~components/Repassos/SettingsForm'
import { PalettePicker } from '~components/Settings/PalettePicker'
import { ROUTES } from '~src/router/routes'
import { icons } from '~theme/icons'

const SettingsSection = ({
  id,
  title,
  desc,
  children,
}: {
  id: string
  title: string
  desc?: string
  children: ReactNode
}) => (
  <Card as='section' id={id} p={{ base: 4, md: 6 }}>
    <Heading size='sm' mb={desc ? 1 : 4}>
      {title}
    </Heading>
    {desc && (
      <Text fontSize='sm' color='textMuted' mb={4}>
        {desc}
      </Text>
    )}
    {children}
  </Card>
)

export const View = () => {
  const { t } = useTranslation()
  return (
    <MainContainer maxW='container.lg'>
      <PageHeader title={t('settings.title', { defaultValue: 'Ajustos' })} />
      <Stack spacing={4}>
        <SettingsSection
          id='aparenca'
          title={t('settings.appearance', { defaultValue: 'Aparença' })}
          desc={t('settings.appearance_desc', {
            defaultValue: 'Tria el color principal de l’app. Es guarda en aquest dispositiu.',
          })}
        >
          <PalettePicker />
        </SettingsSection>
        <SettingsSection
          id='copia'
          title={t('settings.backup', { defaultValue: 'Còpia de seguretat i transferència' })}
        >
          <BackupPanel />
        </SettingsSection>
        <SettingsSection id='repassos' title={t('settings.repassos', { defaultValue: 'Repassos' })}>
          <RepasSettingsForm />
        </SettingsSection>
        <SettingsSection
          id='bloquejats'
          title={t('settings.blocked', { defaultValue: 'Dies bloquejats' })}
          desc={t('settings.blocked_desc', { defaultValue: 'Festius, vacances o dies en què no pots repassar.' })}
        >
          <BlockedDaysEditor />
        </SettingsSection>
        <SettingsSection id='calendari' title={t('settings.ics', { defaultValue: 'Exportació al calendari (.ics)' })}>
          <IcsOptionsFields />
          <Button
            as={RouterLink}
            to={ROUTES.HELP.CALENDAR}
            mt={5}
            variant='outline'
            colorScheme='gray'
            leftIcon={<icons.help />}
          >
            {t('ics.help_link', { defaultValue: 'Com afegir-ho al meu calendari?' })}
          </Button>
        </SettingsSection>
        <Box textAlign='center' color='textMuted' fontSize='xs' py={4}>
          {t('app.name', { defaultValue: 'Open Bombers' })} · {import.meta.env.COMMIT} ·{' '}
          {t('settings.local_only', { defaultValue: 'Totes les dades es guarden només en aquest dispositiu.' })}
        </Box>
      </Stack>
    </MainContainer>
  )
}
