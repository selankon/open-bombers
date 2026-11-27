import { Box, Button, Flex, Heading, IconButton, Select, Stack, Text, Tooltip, useToast } from '@chakra-ui/react'
import { ReactNode, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { Card } from '~components/Layout/LayoutComponents'
import { temaShortCode } from '~components/Planificacio/structure'
import { Tema } from '~components/Planificacio/types'
import { ROUTES } from '~src/router/routes'
import { icons } from '~theme/icons'
import { formatShort } from '~utils/dates'
import { maxCaixa } from './paquet'
import { useSetAApp, useSetInPaquet } from './queries'
import { useTemaById } from './TestSession'
import { PaquetTema } from './types'

const Section = ({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) => (
  <Box>
    <Flex align='center' justify='space-between' mb={3} gap={2} wrap='wrap'>
      <Heading size='sm'>{title}</Heading>
      {right}
    </Flex>
    {children}
  </Box>
)

const TemaLabel = ({ tema, id }: { tema?: Tema; id: string }) => (
  <Text fontSize='sm' noOfLines={2}>
    <Text as='span' fontWeight={800} color='accent'>
      {tema ? temaShortCode(tema) : id}
    </Text>
    {tema && (
      <>
        <Text as='span' color='textMuted'>
          {' · '}
        </Text>
        {tema.nom}
      </>
    )}
  </Text>
)

/** Dots showing how consolidated a tema is (its Leitner box) */
const CaixaMeter = ({ caixa, max }: { caixa: number; max: number }) => {
  const { t } = useTranslation()
  return (
    <Tooltip label={t('repassos.caixa_tooltip', { defaultValue: 'Consolidació: {{ n }} de {{ max }}', n: caixa, max })}>
      <Flex gap={1} aria-hidden>
        {Array.from({ length: max }, (_, i) => (
          <Box key={i} w={1.5} h={1.5} borderRadius='full' bg={i < caixa ? 'kind.test' : 'border'} />
        ))}
      </Flex>
    </Tooltip>
  )
}

const useErrorToast = () => {
  const { t } = useTranslation()
  const toast = useToast()
  return () =>
    toast({
      title: t('common.error', { defaultValue: 'Error' }),
      description: t('common.save_error_desc', {
        defaultValue: "No s'ha pogut desar al dispositiu. Torna-ho a provar.",
      }),
      status: 'error',
      duration: 5000,
      isClosable: true,
    })
}

const PaquetRow = ({ item, tema, max }: { item: PaquetTema; tema?: Tema; max: number }) => {
  const { t } = useTranslation()
  const toast = useToast()
  const onError = useErrorToast()
  const { avui } = useStudyData()
  const { mutate, isPending } = useSetInPaquet()
  const isDue = item.proper <= avui

  const remove = () =>
    mutate(
      { temaId: item.temaId, inPaquet: false },
      {
        onSuccess: () =>
          toast({
            title: t('repassos.paquet_removed', { defaultValue: 'Tema tret del paquet' }),
            status: 'success',
            duration: 3000,
          }),
        onError,
      }
    )

  return (
    <Flex align='center' gap={3} px={3} py={2.5} borderRadius='sm' _hover={{ bg: 'rowHover' }}>
      <Box flex={1} minW={0}>
        <TemaLabel tema={tema} id={item.temaId} />
        <Flex
          align='center'
          gap={2}
          mt={1}
          wrap='wrap'
          fontSize='xs'
          color='textMuted'
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        >
          <CaixaMeter caixa={item.caixa} max={max} />
          <Text>{t('repassos.test_interval', { defaultValue: 'Cada {{ count }} setm.', count: item.interval })}</Text>
          {item.darrer && (
            <Text>
              · {t('repassos.test_last', { defaultValue: 'darrer {{ date }}', date: formatShort(item.darrer.data) })}
              {item.darrer.percent !== null && ` (${item.darrer.percent} %)`}
            </Text>
          )}
        </Flex>
      </Box>
      <Text
        fontSize='xs'
        fontWeight={700}
        color={isDue ? 'kind.test' : 'textMuted'}
        whiteSpace='nowrap'
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {isDue
          ? t('repassos.paquet_due', { defaultValue: 'Toca ja' })
          : t('repassos.paquet_next', { defaultValue: 'Proper: {{ date }}', date: formatShort(item.proper) })}
      </Text>
      <IconButton
        aria-label={t('repassos.paquet_remove', { defaultValue: 'Treure del paquet' })}
        title={t('repassos.paquet_remove', { defaultValue: 'Treure del paquet' })}
        icon={<icons.close />}
        size='sm'
        variant='ghost'
        colorScheme='gray'
        onClick={remove}
        isLoading={isPending}
      />
    </Flex>
  )
}

/**
 * Study package: temes kept alive with tests in the App, the new ones to add there, and manual changes
 */
export const PaquetView = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const onError = useErrorToast()
  const { paquet, structure, repassos } = useStudyData()
  const temaById = useTemaById()
  const { mutate: setAApp, isPending: isMarking } = useSetAApp()
  const { mutate: setInPaquet, isPending: isAdding } = useSetInPaquet()
  const [toAdd, setToAdd] = useState('')
  const config = repassos.config
  const max = maxCaixa(config)

  const nous = paquet.filter((p) => !p.aApp)
  const sorted = useMemo(
    () => [...paquet].sort((a, b) => (a.proper < b.proper ? -1 : a.proper > b.proper ? 1 : 0)),
    [paquet]
  )
  const outside = useMemo(
    () => structure.temes.filter((tema) => !paquet.some((p) => p.temaId === tema.id)),
    [structure, paquet]
  )

  if (!config.tests_actius) {
    return (
      <Card>
        <ElementNotFound
          icon={icons.info}
          title={t('repassos.paquet_off_title', { defaultValue: 'Els tests del paquet estan desactivats' })}
          desc={t('repassos.paquet_off_desc', {
            defaultValue: 'Activa’ls a Ajustos per mantenir vius els temes que ja has repassat fent tests a l’App.',
          })}
          action={
            <Button as={RouterLink} to={ROUTES.SETTINGS} leftIcon={<icons.settings />}>
              {t('repassos.paquet_off_action', { defaultValue: 'Anar a Ajustos' })}
            </Button>
          }
        />
      </Card>
    )
  }

  const markAll = (temaIds: string[]) =>
    setAApp(
      { temaIds, value: true },
      {
        onSuccess: () =>
          toast({
            title: t('repassos.paquet_marked', { defaultValue: 'Marcat com a afegit a l’App' }),
            status: 'success',
            duration: 3000,
          }),
        onError,
      }
    )

  const add = () =>
    setInPaquet(
      { temaId: toAdd, inPaquet: true },
      {
        onSuccess: () => {
          setToAdd('')
          toast({
            title: t('repassos.paquet_added', { defaultValue: 'Tema afegit al paquet' }),
            status: 'success',
            duration: 3000,
          })
        },
        onError,
      }
    )

  return (
    <Stack spacing={8}>
      <Text fontSize='sm' color='textMuted' maxW='2xl'>
        {t('repassos.paquet_intro', {
          defaultValue:
            'Quan acabes el repàs mensual d’un tema, el deixes aparcat i entra aquí. Tingues a l’App un paquet d’estudi amb tots aquests temes i fes-ne tests sovint: el record actiu els manté frescos sense repassos teòrics extra.',
        })}
      </Text>

      {nous.length > 0 && (
        <Section
          title={t('repassos.paquet_nous_title', {
            defaultValue: 'Per afegir a l’App ({{ count }})',
            count: nous.length,
          })}
          right={
            nous.length > 1 && (
              <Button
                size='sm'
                variant='ghost'
                leftIcon={<icons.done />}
                onClick={() => markAll(nous.map((p) => p.temaId))}
                isLoading={isMarking}
              >
                {t('repassos.paquet_mark_all', { defaultValue: 'Ja els he afegit tots' })}
              </Button>
            )
          }
        >
          <Card p={2}>
            {nous.map((p) => (
              <Flex key={p.temaId} align='center' gap={3} px={3} py={2}>
                <Box flex={1} minW={0}>
                  <TemaLabel tema={temaById.get(p.temaId)} id={p.temaId} />
                </Box>
                <Button size='sm' variant='outline' onClick={() => markAll([p.temaId])} isDisabled={isMarking}>
                  {t('repassos.paquet_mark', { defaultValue: 'Ja l’he afegit' })}
                </Button>
              </Flex>
            ))}
          </Card>
        </Section>
      )}

      <Section title={t('repassos.paquet_title', { defaultValue: 'Al paquet ({{ count }})', count: paquet.length })}>
        {sorted.length ? (
          <Card p={2}>
            {sorted.map((p) => (
              <PaquetRow key={p.temaId} item={p} tema={temaById.get(p.temaId)} max={max} />
            ))}
          </Card>
        ) : (
          <Card>
            <ElementNotFound
              py={8}
              icon={icons.study}
              title={t('repassos.paquet_empty', { defaultValue: 'El paquet encara és buit' })}
              desc={t('repassos.paquet_empty_desc', {
                defaultValue:
                  'Quan facis el repàs mensual de tots els apartats estudiats d’un tema, entrarà aquí automàticament. També pots afegir a mà temes que ja tenies estudiats.',
              })}
            />
          </Card>
        )}
      </Section>

      {outside.length > 0 && (
        <Section title={t('repassos.paquet_add_title', { defaultValue: 'Afegir un tema a mà' })}>
          <Flex gap={2} maxW='lg'>
            <Select
              size='sm'
              borderRadius='md'
              bg='surface'
              value={toAdd}
              onChange={(e) => setToAdd(e.target.value)}
              placeholder={t('repassos.paquet_add_placeholder', { defaultValue: 'Tria un tema…' })}
              aria-label={t('repassos.paquet_add_title', { defaultValue: 'Afegir un tema a mà' })}
            >
              {outside.map((tema) => (
                <option key={tema.id} value={tema.id}>
                  {temaShortCode(tema)} · {tema.nom}
                </option>
              ))}
            </Select>
            <Button size='sm' leftIcon={<icons.add />} onClick={add} isDisabled={!toAdd} isLoading={isAdding}>
              {t('repassos.paquet_add', { defaultValue: 'Afegir' })}
            </Button>
          </Flex>
          <Text fontSize='xs' color='textMuted' mt={2}>
            {t('repassos.paquet_add_help', {
              defaultValue:
                'Per a temes que vas estudiar abans de fer servir l’app. El primer test serà d’aquí a una setmana.',
            })}
          </Text>
        </Section>
      )}
    </Stack>
  )
}
