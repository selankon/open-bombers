import { Box, Button, Flex, Heading, HStack, Stack, Text, useToast } from '@chakra-ui/react'
import { motion, useReducedMotion } from 'framer-motion'
import { ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { Card } from '~components/Layout/LayoutComponents'
import { ROUTES } from '~src/router/routes'
import { icons } from '~theme/icons'
import { spring, STAGGER_MAX, STAGGER_STEP } from '~theme/motion'
import { TODAY_PREVIEW_DAYS } from '~utils/constants'
import { addDaysTo, formatLong, formatShort } from '~utils/dates'
import { useMoveOverdueToToday } from './queries'
import { SessionCard } from './SessionCard'
import { kindColors, kindLabel } from './SessionKindLabel'
import { TestSessionCard } from './TestSession'

const Section = ({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) => (
  <Box>
    <Flex align='center' justify='space-between' mb={3} gap={2} wrap='wrap'>
      <Heading size='sm'>{title}</Heading>
      {right}
    </Flex>
    {children}
  </Box>
)

const Stagger = ({ index, children }: { index: number; children: ReactNode }) => {
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

/**
 * "Avui": overdue reviews, today's sessions and a preview of the next days
 */
export const TodayView = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const { sessions, instances, avui, repassos, load, paquet } = useStudyData()
  const { mutateAsync: moveOverdue, isPending: isMoving } = useMoveOverdueToToday()

  const overdue = useMemo(
    () =>
      sessions
        .filter((s) => s.kind !== 'estudi' && s.overdue > 0)
        .map((s) => ({ session: s, instances: s.instances.filter((i) => i.status === 'endarrerit') })),
    [sessions]
  )
  const overdueCount = overdue.reduce((acc, o) => acc + o.instances.length, 0)
  const todaySessions = useMemo(() => sessions.filter((s) => s.kind !== 'estudi' && s.date === avui), [sessions, avui])
  const nextDays = useMemo(() => {
    const until = addDaysTo(avui, TODAY_PREVIEW_DAYS)
    const days: Record<string, typeof sessions> = {}
    for (const s of sessions) {
      if (s.kind === 'estudi' || s.date <= avui || s.date > until || !s.pending) continue
      ;(days[s.date] ||= []).push(s)
    }
    return Object.entries(days)
  }, [sessions, avui])

  const handleMoveOverdue = async () => {
    try {
      await moveOverdue(instances)
      toast({
        title: t('repassos.overdue_moved', { defaultValue: 'Repassos endarrerits moguts a avui' }),
        status: 'success',
        duration: 3000,
      })
    } catch {
      toast({ title: t('common.error', { defaultValue: 'Error' }), status: 'error', duration: 5000 })
    }
  }

  const notInApp = paquet.filter((p) => !p.aApp).length

  if (!Object.keys(repassos.estudis).length && !paquet.length && !instances.length) {
    return (
      <ElementNotFound
        icon={icons.study}
        title={t('repassos.empty_title', { defaultValue: 'Encara no has registrat cap estudi' })}
        desc={t('repassos.empty_desc', {
          defaultValue:
            'Quan registris què has estudiat cada dia, aquí apareixeran els repassos i els tests que et toquen.',
        })}
      />
    )
  }

  const todayLoad = load[avui] || 0

  return (
    <Stack spacing={8}>
      {notInApp > 0 && (
        <Card px={4} py={3}>
          <Flex align='center' gap={3} wrap='wrap'>
            <Box w={2.5} h={2.5} borderRadius='full' bg={kindColors('test').fg} flexShrink={0} />
            <Text fontSize='sm' flex={1} minW='200px'>
              {t('repassos.paquet_nous', {
                defaultValue: 'Tens {{ count }} temes nous per afegir al paquet d’estudi de l’App.',
                count: notInApp,
              })}
            </Text>
            <Button as={RouterLink} to={ROUTES.REPASSOS.PAQUET} size='sm' variant='ghost' rightIcon={<icons.next />}>
              {t('repassos.paquet_open', { defaultValue: 'Veure el paquet' })}
            </Button>
          </Flex>
        </Card>
      )}

      {overdueCount > 0 && (
        <Section
          title={t('repassos.overdue', { defaultValue: 'Endarrerits ({{ count }})', count: overdueCount })}
          right={
            <Button
              size='sm'
              variant='outline'
              colorScheme='red'
              leftIcon={<icons.arrowRight />}
              onClick={handleMoveOverdue}
              isLoading={isMoving}
            >
              {t('repassos.move_overdue', { defaultValue: 'Moure endarrerits a avui' })}
            </Button>
          }
        >
          <Stack spacing={3}>
            {overdue.map(({ session, instances }, i) => (
              <Stagger key={session.key} index={i}>
                <SessionCard session={session} instances={instances} />
              </Stagger>
            ))}
          </Stack>
        </Section>
      )}

      <Section
        title={t('repassos.today', { defaultValue: 'Avui · {{ date }}', date: formatLong(avui) })}
        right={
          todayLoad > repassos.config.llindar_sobrecarrega && (
            <Text fontSize='sm' color='nm.fg' fontWeight={600}>
              ⚠{' '}
              {t('repassos.overloaded', { defaultValue: 'Dia sobrecarregat ({{ count }} apartats)', count: todayLoad })}
            </Text>
          )
        }
      >
        {todaySessions.length ? (
          <Stack spacing={3}>
            {todaySessions.map((s, i) => (
              <Stagger key={s.key} index={i}>
                {s.kind === 'test' ? <TestSessionCard session={s} /> : <SessionCard session={s} />}
              </Stagger>
            ))}
          </Stack>
        ) : (
          <Card>
            <ElementNotFound
              py={8}
              icon={icons.done}
              title={t('repassos.today_empty', { defaultValue: 'Avui no tens repassos' })}
              desc={t('repassos.today_empty_desc', { defaultValue: 'Aprofita per avançar temari o fer tests.' })}
            />
          </Card>
        )}
      </Section>

      <Section
        title={t('repassos.next_days', { defaultValue: 'Pròxims {{ count }} dies', count: TODAY_PREVIEW_DAYS })}
        right={
          <Button as={RouterLink} to={ROUTES.REPASSOS.CALENDAR} size='sm' variant='ghost' rightIcon={<icons.next />}>
            {t('repassos.open_calendar', { defaultValue: 'Obrir el calendari' })}
          </Button>
        }
      >
        {nextDays.length ? (
          <Card p={2}>
            {nextDays.map(([date, daySessions]) => (
              <Flex
                key={date}
                align='center'
                gap={3}
                px={2}
                py={2}
                borderBottomWidth='1px'
                borderColor='border'
                _last={{ borderBottom: 'none' }}
              >
                <Text w='80px' fontSize='sm' fontWeight={700} flexShrink={0}>
                  {formatShort(date)}
                </Text>
                <HStack spacing={2} wrap='wrap'>
                  {daySessions.map((s) => (
                    <Text
                      key={s.key}
                      fontSize='xs'
                      fontWeight={700}
                      px={2.5}
                      py={1}
                      borderRadius='full'
                      color={kindColors(s.kind).fg}
                      bg={kindColors(s.kind).bg}
                    >
                      {kindLabel(t, s.kind)} · {s.pending}
                    </Text>
                  ))}
                </HStack>
              </Flex>
            ))}
          </Card>
        ) : (
          <Text color='textMuted' fontSize='sm'>
            {t('repassos.next_days_empty', { defaultValue: 'Cap repàs els pròxims dies.' })}
          </Text>
        )}
      </Section>
    </Stack>
  )
}
