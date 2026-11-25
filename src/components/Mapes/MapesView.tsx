import { Badge, Box, Button, Flex, Heading, Icon, Select, SimpleGrid, Text, useDisclosure } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { ca } from 'date-fns/locale'
import { motion, useReducedMotion } from 'framer-motion'
import { ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { Card, MainContainer, PageHeader } from '~components/Layout/LayoutComponents'
import { LoadingSpinner } from '~components/Layout/LoadingSpinner'
import { temaShortCode } from '~components/Planificacio/structure'
import { mapaPath } from '~src/router/routes'
import { icons } from '~theme/icons'
import { PRESS_SCALE, spring, STAGGER_MAX, STAGGER_STEP } from '~theme/motion'
import { linkLabel } from './logic'
import { MapaActionsMenu } from './MapaActionsMenu'
import { MapaFormModal } from './MapaFormModal'
import { useMapes } from './queries'
import { MapaResum } from './types'
import { useNewMapa } from './useNewMapa'

// Filter values: '' every map, FREE the maps without tema, otherwise a tema id
const FREE = '_lliures'

const FadeIn = ({ index, children }: { index: number; children: ReactNode }) => {
  const reduce = useReducedMotion()
  return (
    <Box
      as={motion.div}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      // @ts-ignore framer-motion transition prop through Chakra
      transition={{ ...spring.smooth, delay: Math.min(index, STAGGER_MAX) * STAGGER_STEP }}
    >
      {children}
    </Box>
  )
}

const MapaCard = ({ mapa }: { mapa: MapaResum }) => {
  const { t } = useTranslation()
  const { structure } = useStudyData()
  const link = linkLabel(structure, mapa.tema_id, mapa.row_id)
  const edited = formatDistanceToNow(new Date(mapa.modificat), { addSuffix: true, locale: ca })

  return (
    <Card
      as={motion.div}
      position='relative'
      whileTap={{ scale: PRESS_SCALE }}
      // @ts-ignore framer-motion transition prop through Chakra
      transition={spring.snappy}
      _hover={{ boxShadow: 'raised' }}
      h='full'
    >
      <Flex
        as={RouterLink}
        to={mapaPath(mapa.id)}
        direction='column'
        gap={3}
        p={4}
        pr={12}
        h='full'
        borderRadius='card'
        _focusVisible={{ boxShadow: 'outline', outline: 'none' }}
      >
        <Flex
          w={10}
          h={10}
          borderRadius='sm'
          bg='mapa.primari.bg'
          color='accent'
          align='center'
          justify='center'
          flexShrink={0}
        >
          <Icon as={icons.mapes} boxSize={5} />
        </Flex>
        <Box minW={0}>
          <Text fontWeight={700} noOfLines={2}>
            {mapa.titol}
          </Text>
          <Text fontSize='xs' color='textMuted' mt={1}>
            {t('mapes.card_meta', {
              defaultValue: '{{count}} idees · editat {{when}}',
              count: mapa.num_nodes,
              when: edited,
            })}
          </Text>
        </Box>
        <Box mt='auto'>
          {link ? (
            <Badge borderRadius='full' px={2} bg='mapa.primari.bg' color='accent' textTransform='none'>
              {link}
            </Badge>
          ) : (
            <Badge borderRadius='full' px={2} bg='surfaceMuted' color='textMuted' textTransform='none'>
              {t('mapes.free_badge', { defaultValue: 'Lliure' })}
            </Badge>
          )}
        </Box>
      </Flex>
      <Box position='absolute' top={2} right={2}>
        <MapaActionsMenu mapa={mapa} />
      </Box>
    </Card>
  )
}

/**
 * Every mind map, filterable by tema
 */
export const MapesView = () => {
  const { t } = useTranslation()
  const { structure } = useStudyData()
  const [params, setParams] = useSearchParams()
  const filter = params.get('tema') ?? ''
  const { data: mapes, isLoading, isError, refetch } = useMapes()
  const form = useDisclosure()
  const { create, isPending } = useNewMapa()

  const setFilter = (value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set('tema', value)
    else next.delete('tema')
    setParams(next, { replace: true })
  }

  const visible = useMemo(
    () => (mapes ?? []).filter((m) => (!filter ? true : filter === FREE ? !m.tema_id : m.tema_id === filter)),
    [mapes, filter]
  )

  // Temes that have maps, for the filter
  const temesAmbMapes = useMemo(() => {
    const ids = new Set((mapes ?? []).map((m) => m.tema_id))
    return structure.temes.filter((tm) => ids.has(tm.id) || tm.id === filter)
  }, [mapes, structure, filter])

  const filterTema = filter && filter !== FREE ? filter : null
  const formInitial = useMemo(() => (filterTema ? { tema_id: filterTema } : undefined), [filterTema])
  const newButton = (
    <Button leftIcon={<Icon as={icons.add} />} onClick={form.onOpen} size='md'>
      {t('mapes.new', { defaultValue: 'Nou mapa' })}
    </Button>
  )

  let body: ReactNode
  if (isLoading) body = <LoadingSpinner />
  else if (isError)
    body = (
      <ElementNotFound
        icon={icons.warning}
        title={t('mapes.load_error', { defaultValue: 'No hem pogut obrir els mapes' })}
        desc={t('mapes.load_error_desc', {
          defaultValue:
            'Pot ser que el navegador bloquegi l’emmagatzematge (per exemple, en mode privat). Torna-ho a provar.',
        })}
        action={
          <Button variant='outline' colorScheme='gray' onClick={() => refetch()}>
            {t('common.retry', { defaultValue: 'Torna-ho a provar' })}
          </Button>
        }
      />
    )
  else if (!mapes?.length)
    body = (
      <ElementNotFound
        icon={icons.mapes}
        title={t('mapes.empty_title', { defaultValue: 'Encara no tens cap mapa mental' })}
        desc={t('mapes.empty_desc', {
          defaultValue:
            'Crea’n un per resumir un tema: la idea principal al centre i les branques al voltant. També el pots obrir des de la taula de planificació.',
        })}
        action={newButton}
      />
    )
  else if (!visible.length)
    body = (
      <ElementNotFound
        icon={icons.filter}
        title={t('mapes.empty_filter_title', { defaultValue: 'Cap mapa amb aquest filtre' })}
        desc={t('mapes.empty_filter_desc', { defaultValue: 'Crea’n un per a aquest tema o mostra tots els mapes.' })}
        action={
          <Flex gap={2} wrap='wrap' justify='center'>
            <Button variant='outline' colorScheme='gray' onClick={() => setFilter('')}>
              {t('mapes.show_all', { defaultValue: 'Mostra’ls tots' })}
            </Button>
            {newButton}
          </Flex>
        }
      />
    )
  else
    body = (
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing={4}>
        {visible.map((m, i) => (
          <FadeIn key={m.id} index={i}>
            <MapaCard mapa={m} />
          </FadeIn>
        ))}
      </SimpleGrid>
    )

  return (
    <MainContainer>
      <PageHeader
        title={t('mapes.title', { defaultValue: 'Mapes mentals' })}
        subtitle={t('mapes.subtitle', {
          defaultValue: 'Resumeix cada tema amb idees i branques. Funciona amb teclat, ratolí i pantalla tàctil.',
        })}
        right={!!mapes?.length && newButton}
      />
      {!!mapes?.length && (
        <Flex mb={4} align='center' gap={3}>
          <Heading as='h2' size='xs' color='textMuted' fontWeight={600} flexShrink={0}>
            {t('mapes.filter', { defaultValue: 'Mostra' })}
          </Heading>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            maxW='xs'
            size='sm'
            borderRadius='sm'
            bg='surface'
            aria-label={t('mapes.filter_label', { defaultValue: 'Filtra per tema' })}
          >
            <option value=''>{t('mapes.filter_all', { defaultValue: 'Tots els mapes' })}</option>
            <option value={FREE}>{t('mapes.filter_free', { defaultValue: 'Mapes lliures' })}</option>
            {temesAmbMapes.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {temaShortCode(tm)} · {tm.nom}
              </option>
            ))}
          </Select>
        </Flex>
      )}
      {body}

      <MapaFormModal
        isOpen={form.isOpen}
        onClose={form.onClose}
        mode='create'
        initial={formInitial}
        isLoading={isPending}
        onSubmit={async (values) => {
          if (await create(values)) form.onClose()
        }}
      />
    </MainContainer>
  )
}
