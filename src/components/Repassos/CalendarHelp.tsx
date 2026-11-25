import {
  Alert,
  AlertIcon,
  Box,
  Code,
  Heading,
  ListItem,
  OrderedList,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  UnorderedList,
} from '@chakra-ui/react'
import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '~components/Layout/LayoutComponents'

const Url = ({ children }: { children: string }) => (
  <Code display='block' whiteSpace='pre-wrap' wordBreak='break-all' fontSize='xs' p={2} my={1.5} borderRadius='8px'>
    {children}
  </Code>
)

const Block = ({ title, children }: { title: string; children: ReactNode }) => (
  <Box>
    <Heading size='xs' mb={2} textTransform='uppercase' letterSpacing='0.06em' color='textMuted'>
      {title}
    </Heading>
    {children}
  </Box>
)

/**
 * Static help: how to subscribe to / import the .ics file
 */
export const CalendarHelpContent = () => {
  const { t } = useTranslation()
  return (
    <Card p={{ base: 3, md: 6 }}>
      <Tabs colorScheme='primary' variant='soft-rounded' isFitted={false}>
        <TabList flexWrap='wrap' gap={1} mb={2}>
          <Tab fontSize='sm'>{t('help.tab1', { defaultValue: 'Nextcloud + Android (recomanat)' })}</Tab>
          <Tab fontSize='sm'>{t('help.tab2', { defaultValue: 'Altres calendaris' })}</Tab>
          <Tab fontSize='sm'>{t('help.tab3', { defaultValue: 'Importació puntual' })}</Tab>
        </TabList>
        <TabPanels fontSize='sm' lineHeight={1.6}>
          <TabPanel px={{ base: 1, md: 4 }}>
            <Stack spacing={5}>
              <Block title={t('help.setup', { defaultValue: 'Configuració (una sola vegada)' })}>
                <OrderedList spacing={2}>
                  <ListItem>
                    {t('help.nc1', {
                      defaultValue:
                        'Instal·la ICSx⁵ (F-Droid o Play Store). És l’app germana de DAVx⁵ que gestiona les subscripcions a fitxers .ics. DAVx⁵ no cal per a això.',
                    })}
                  </ListItem>
                  <ListItem>
                    {t('help.nc2', {
                      defaultValue:
                        'Exporta el .ics des de l’app i puja’l a Nextcloud, per exemple a la carpeta Repassos/.',
                    })}
                  </ListItem>
                  <ListItem>
                    {t('help.nc3', {
                      defaultValue:
                        'Crea una contrasenya d’aplicació a Nextcloud (Configuració → Seguretat → Dispositius i sessions). Recomanat: un usuari de Nextcloud a part, perquè una contrasenya d’aplicació dona accés a tot el compte.',
                    })}
                  </ListItem>
                  <ListItem>
                    {t('help.nc4', { defaultValue: 'A ICSx⁵ prem ＋ i introdueix l’URL. Hi ha dues opcions:' })}
                    <UnorderedList mt={1.5} spacing={2}>
                      <ListItem>
                        <Text as='span' fontWeight={700}>
                          {t('help.nc4a_title', { defaultValue: 'Privada (recomanada):' })}
                        </Text>
                        <Url>
                          {'https://<el-teu-nextcloud>/remote.php/dav/files/<usuari>/Repassos/repassos_bombers.ics'}
                        </Url>
                        {t('help.nc4a', {
                          defaultValue: 'Activa «Requereix autenticació» i posa l’usuari i la contrasenya d’aplicació.',
                        })}
                      </ListItem>
                      <ListItem>
                        <Text as='span' fontWeight={700}>
                          {t('help.nc4b_title', { defaultValue: 'Enllaç públic:' })}
                        </Text>{' '}
                        {t('help.nc4b', {
                          defaultValue:
                            'a Nextcloud, «Compartir → Enllaç públic». Afegeix /download al final de l’enllaç:',
                        })}
                        <Url>{'https://<el-teu-nextcloud>/s/AbCdEf/download'}</Url>
                        {t('help.nc4b2', {
                          defaultValue: 'Qui tingui l’enllaç veu els repassos; s’hi pot posar contrasenya.',
                        })}
                      </ListItem>
                    </UnorderedList>
                  </ListItem>
                  <ListItem>
                    {t('help.nc5', {
                      defaultValue:
                        'Posa-li de nom «Repassos», tria un color i fixa un interval de sincronització (per exemple, cada hora).',
                    })}
                  </ListItem>
                </OrderedList>
                <Text mt={2} color='textMuted'>
                  {t('help.nc_readonly', {
                    defaultValue:
                      'El calendari apareixerà com de només lectura a qualsevol app de calendari d’Android.',
                  })}
                </Text>
              </Block>
              <Block title={t('help.each_change', { defaultValue: 'Cada vegada que canviïs alguna cosa' })}>
                <OrderedList spacing={2}>
                  <ListItem>
                    {t('help.change1', {
                      defaultValue:
                        '«Compartir .ics» → Nextcloud → mateixa carpeta i mateix nom → tria «Substituir». La ruta i l’enllaç es mantenen.',
                    })}
                  </ListItem>
                  <ListItem>
                    {t('help.change2', {
                      defaultValue: 'Espera el següent refresc d’ICSx⁵, o força la sincronització des de l’app.',
                    })}
                  </ListItem>
                </OrderedList>
              </Block>
              <Alert status='warning' borderRadius='12px' fontSize='sm'>
                <AlertIcon />
                {t('help.nc_note', {
                  defaultValue:
                    'Evita la subscripció des de la web de Nextcloud Calendar («Nova subscripció des d’enllaç»): el servidor la refresca, per defecte, com a molt un cop per setmana, i DAVx⁵ no la sincronitza.',
                })}
              </Alert>
            </Stack>
          </TabPanel>
          <TabPanel px={{ base: 1, md: 4 }}>
            <Text mb={3}>
              {t('help.other_intro', {
                defaultValue: 'Si el fitxer és en una URL accessible, t’hi pots subscriure des d’altres calendaris:',
              })}
            </Text>
            <UnorderedList spacing={2}>
              <ListItem>
                <b>Google Calendar (web):</b>{' '}
                {t('help.google', {
                  defaultValue:
                    '«Altres calendaris → ＋ → Des d’un URL». Google el refresca cada 12-24 h i no es pot forçar.',
                })}
              </ListItem>
              <ListItem>
                <b>Apple Calendar:</b>{' '}
                {t('help.apple', {
                  defaultValue: '«Fitxer → Nova subscripció de calendari». Pots triar la freqüència de refresc.',
                })}
              </ListItem>
              <ListItem>
                <b>Thunderbird:</b>{' '}
                {t('help.thunderbird', { defaultValue: '«Nou calendari → A la xarxa → iCalendar (ICS)».' })}
              </ListItem>
            </UnorderedList>
          </TabPanel>
          <TabPanel px={{ base: 1, md: 4 }}>
            <UnorderedList spacing={2}>
              <ListItem>
                {t('help.import1', {
                  defaultValue:
                    'Obre el .ics amb la teva app de calendari i importa’l en un calendari dedicat «Repassos», mai al personal.',
                })}
              </ListItem>
              <ListItem>
                {t('help.import2', {
                  defaultValue:
                    'Per actualitzar-lo: buida o esborra abans aquest calendari i torna a importar. Si no, hi quedaran esdeveniments de sessions que ja no existeixen.',
                })}
              </ListItem>
            </UnorderedList>
            <Box mt={5} overflowX='auto'>
              <Box
                as='table'
                fontSize='xs'
                w='full'
                sx={{
                  'th, td': {
                    textAlign: 'left',
                    p: 2,
                    borderBottom: '1px solid',
                    borderColor: 'border',
                    verticalAlign: 'top',
                  },
                }}
              >
                <thead>
                  <tr>
                    <th />
                    <th>{t('help.subscription', { defaultValue: 'Subscripció (recomanada)' })}</th>
                    <th>{t('help.import', { defaultValue: 'Importació puntual' })}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>{t('help.row_moved', { defaultValue: 'Sessions mogudes' })}</th>
                    <td>{t('help.sub_moved', { defaultValue: 'Es mouen' })}</td>
                    <td>
                      {t('help.imp_moved', {
                        defaultValue: 'S’actualitzen només als clients que respecten l’UID; als altres es dupliquen',
                      })}
                    </td>
                  </tr>
                  <tr>
                    <th>{t('help.row_removed', { defaultValue: 'Sessions que ja no existeixen' })}</th>
                    <td>{t('help.sub_removed', { defaultValue: 'Desapareixen' })}</td>
                    <td>{t('help.imp_removed', { defaultValue: 'Es queden: cal buidar abans el calendari' })}</td>
                  </tr>
                  <tr>
                    <th>{t('help.row_editable', { defaultValue: 'Editable al mòbil' })}</th>
                    <td>{t('help.sub_editable', { defaultValue: 'No (només lectura)' })}</td>
                    <td>{t('help.imp_editable', { defaultValue: 'Sí, però els canvis no tornen a l’app' })}</td>
                  </tr>
                  <tr>
                    <th>{t('help.row_requires', { defaultValue: 'Requisit' })}</th>
                    <td>
                      {t('help.sub_requires', { defaultValue: 'Que el fitxer sigui en una URL (p. ex. Nextcloud)' })}
                    </td>
                    <td>{t('help.imp_requires', { defaultValue: 'Cap' })}</td>
                  </tr>
                </tbody>
              </Box>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  )
}
