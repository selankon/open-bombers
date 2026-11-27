import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Grid,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useBreakpointValue,
  useToast,
} from '@chakra-ui/react'
import { DragEvent, memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { Card } from '~components/Layout/LayoutComponents'
import { temaShortCode } from '~components/Planificacio/structure'
import { icons } from '~theme/icons'
import {
  addDaysTo,
  daysOfWeek,
  DayString,
  formatMonth,
  formatShort,
  ISO_DAYS,
  isoDayShortName,
  mondayOf,
  parseDay,
  toDay,
  weekIdOf,
} from '~utils/dates'
import { useApartatLabel } from './ApartatItem'
import { useMoveSession, useUpdateRepasConfig } from './queries'
import { RegisterStudyInitial } from './RegisterStudyModal'
import { DRAG_MIME, SessionChip } from './SessionChip'
import { SessionDrawer } from './SessionDrawer'
import { useTemaById } from './TestSession'
import { kindColors, kindLabel } from './SessionKindLabel'
import { Session, SessionKind } from './types'
import { WeekConfigPopover } from './WeekConfigPopover'

type Mode = 'mes' | 'setmana'

const BLOCKED_BG = 'repeating-linear-gradient(45deg, transparent 0 6px, rgba(100,116,139,0.14) 6px 12px)'

type CalendarViewProps = {
  onRegister: (initial: RegisterStudyInitial) => void
}

/**
 * Monthly / weekly calendar of review sessions
 */
export const CalendarView = ({ onRegister }: CalendarViewProps) => {
  const { t } = useTranslation()
  const toast = useToast()
  const { sessions, avui, repassos, load } = useStudyData()
  const { mutateAsync: moveSession } = useMoveSession()
  const { mutate: updateConfig } = useUpdateRepasConfig()
  const [params, setParams] = useSearchParams()
  const isMobile = useBreakpointValue({ base: true, md: false }, { ssr: false })
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const mode: Mode = params.get('vista') === 'setmana' ? 'setmana' : 'mes'
  const cursor = params.get('d') || avui
  const setView = (next: { vista?: Mode; d?: string }) =>
    setParams({ vista: next.vista ?? mode, d: next.d ?? cursor }, { replace: true })

  const byDay = useMemo(() => {
    const map: Record<string, Session[]> = {}
    for (const s of sessions) (map[s.date] ||= []).push(s)
    return map
  }, [sessions])
  const sessionByKey = useMemo(() => new Map(sessions.map((s) => [s.key, s])), [sessions])
  const blocked = useMemo(() => new Set(repassos.config.dies_bloquejats), [repassos.config.dies_bloquejats])
  const selected = selectedKey ? sessionByKey.get(selectedKey) || null : null

  // Weeks to show: whole month (Monday first) or a single week
  const weeks = useMemo(() => {
    if (mode === 'setmana') return [weekIdOf(cursor)]
    const first = toDay(new Date(parseDay(cursor).getFullYear(), parseDay(cursor).getMonth(), 1))
    const last = toDay(new Date(parseDay(cursor).getFullYear(), parseDay(cursor).getMonth() + 1, 0))
    const out: string[] = []
    for (let d = mondayOf(first); d <= last; d = addDaysTo(d, 7)) out.push(weekIdOf(d))
    return out
  }, [mode, cursor])
  const month = parseDay(cursor).getMonth()

  const go = (dir: -1 | 1) => {
    if (mode === 'setmana') setView({ d: addDaysTo(cursor, 7 * dir) })
    else {
      const c = parseDay(cursor)
      setView({ d: toDay(new Date(c.getFullYear(), c.getMonth() + dir, 1)) })
    }
  }

  const title =
    mode === 'mes'
      ? formatMonth(cursor)
      : `${formatShort(daysOfWeek(weekIdOf(cursor))[0])} – ${formatShort(daysOfWeek(weekIdOf(cursor))[6])}`

  const handleOpen = useCallback((s: Session) => setSelectedKey(s.key), [])

  const handleDrop = useCallback(
    async (day: DayString, key: string) => {
      const session = sessionByKey.get(key)
      if (!session || session.date === day) return
      try {
        await moveSession({ session, date: day })
        toast({
          title: t('repassos.session_moved', { defaultValue: 'Sessió moguda al {{ date }}', date: formatShort(day) }),
          status: 'success',
          duration: 2500,
        })
      } catch {
        toast({ title: t('common.error', { defaultValue: 'Error' }), status: 'error', duration: 5000 })
      }
    },
    [sessionByKey, moveSession, toast, t]
  )

  const toggleBlocked = useCallback(
    (day: DayString) => {
      const list = repassos.config.dies_bloquejats
      updateConfig({ dies_bloquejats: list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort() })
    },
    [repassos.config.dies_bloquejats, updateConfig]
  )

  return (
    <Box>
      <Flex align='center' gap={2} mb={3} wrap='wrap'>
        <HStack spacing={1}>
          <IconButton
            aria-label={t('common.previous', { defaultValue: 'Anterior' })}
            icon={<icons.prev />}
            size='sm'
            variant='ghost'
            colorScheme='gray'
            onClick={() => go(-1)}
          />
          <IconButton
            aria-label={t('common.next', { defaultValue: 'Següent' })}
            icon={<icons.next />}
            size='sm'
            variant='ghost'
            colorScheme='gray'
            onClick={() => go(1)}
          />
          <Button size='sm' variant='outline' colorScheme='gray' onClick={() => setView({ d: avui })}>
            {t('repassos.today_button', { defaultValue: 'Avui' })}
          </Button>
        </HStack>
        <Text
          fontWeight={800}
          fontSize='lg'
          flex={1}
          minW='140px'
          sx={{ '&::first-letter': { textTransform: 'uppercase' } }}
        >
          {title}
        </Text>
        <ButtonGroup size='sm' isAttached variant='outline'>
          {(['mes', 'setmana'] as Mode[]).map((m) => (
            <Button
              key={m}
              onClick={() => setView({ vista: m })}
              variant={mode === m ? 'solid' : 'outline'}
              colorScheme={mode === m ? 'primary' : 'gray'}
              aria-pressed={mode === m}
              borderRadius={0}
              _first={{ borderLeftRadius: 'full' }}
              _last={{ borderRightRadius: 'full' }}
            >
              {m === 'mes'
                ? t('repassos.view_month', { defaultValue: 'Mes' })
                : t('repassos.view_week', { defaultValue: 'Setmana' })}
            </Button>
          ))}
        </ButtonGroup>
      </Flex>

      <Legend />

      <Card overflow='hidden'>
        <Grid
          templateColumns={`${isMobile ? 30 : 48}px repeat(7, minmax(0, 1fr))`}
          borderBottomWidth='1px'
          borderColor='border'
          bg='surfaceMuted'
        >
          <Box />
          {ISO_DAYS.map((d) => (
            <Text
              key={d}
              textAlign='center'
              fontSize='xs'
              fontWeight={700}
              color='textMuted'
              py={2}
              textTransform='uppercase'
            >
              {isoDayShortName(d)}
            </Text>
          ))}
        </Grid>
        {weeks.map((week) => (
          <Grid
            key={week}
            templateColumns={`${isMobile ? 30 : 48}px repeat(7, minmax(0, 1fr))`}
            borderBottomWidth='1px'
            borderColor='border'
            _last={{ borderBottom: 'none' }}
          >
            <Flex justify='center' pt={1.5} borderRightWidth='1px' borderColor='border' bg='surfaceMuted'>
              <WeekConfigPopover week={week} compact={isMobile} />
            </Flex>
            {daysOfWeek(week).map((day) => (
              <DayCell
                key={day}
                day={day}
                sessions={byDay[day]}
                isToday={day === avui}
                isOutside={mode === 'mes' && parseDay(day).getMonth() !== month}
                isBlocked={blocked.has(day)}
                load={load[day] || 0}
                threshold={repassos.config.llindar_sobrecarrega}
                isWeek={mode === 'setmana'}
                isMobile={isMobile}
                onOpen={handleOpen}
                onDrop={handleDrop}
                onToggleBlocked={toggleBlocked}
                onRegister={onRegister}
              />
            ))}
          </Grid>
        ))}
      </Card>

      <SessionDrawer session={selected} onClose={() => setSelectedKey(null)} />
    </Box>
  )
}

const Legend = () => {
  const { t } = useTranslation()
  const { repassos, instances } = useStudyData()
  const kinds: SessionKind[] = [
    'estudi',
    'd1',
    'setmanal',
    'mensual',
    ...(repassos.config.llarg_actiu ? (['llarg'] as const) : []),
    ...(instances.some((i) => i.tipus === 'puntual') ? (['puntual'] as const) : []),
    ...(repassos.config.tests_actius ? (['test'] as const) : []),
  ]
  return (
    <HStack spacing={3} mb={3} wrap='wrap' fontSize='xs' color='textMuted'>
      {kinds.map((k) => (
        <HStack key={k} spacing={1.5}>
          <Box w={2.5} h={2.5} borderRadius='3px' bg={kindColors(k).fg} />
          <Text>{kindLabel(t, k)}</Text>
        </HStack>
      ))}
      <HStack spacing={1.5}>
        <Box w={3} h={3} borderRadius='3px' bgImage={BLOCKED_BG} borderWidth='1px' borderColor='border' />
        <Text>{t('repassos.blocked', { defaultValue: 'Bloquejat' })}</Text>
      </HStack>
    </HStack>
  )
}

type DayCellProps = {
  day: DayString
  sessions?: Session[]
  isToday: boolean
  isOutside: boolean
  isBlocked: boolean
  load: number
  threshold: number
  isWeek: boolean
  isMobile: boolean
  onOpen: (s: Session) => void
  onDrop: (day: DayString, key: string) => void
  onToggleBlocked: (day: DayString) => void
  onRegister: (initial: RegisterStudyInitial) => void
}

const DayCell = memo(
  ({
    day,
    sessions,
    isToday,
    isOutside,
    isBlocked,
    load,
    threshold,
    isWeek,
    isMobile,
    onOpen,
    onDrop,
    onToggleBlocked,
    onRegister,
  }: DayCellProps) => {
    const { t } = useTranslation()
    const labelOf = useApartatLabel()
    const temaById = useTemaById()
    const [isOver, setIsOver] = useState(false)
    const isOverloaded = load > threshold

    const handleDragOver = (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_MIME)) return
      e.preventDefault()
      setIsOver(true)
    }
    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      setIsOver(false)
      const key = e.dataTransfer.getData(DRAG_MIME)
      if (key) onDrop(day, key)
    }

    return (
      <Box
        minH={isWeek ? { base: '160px', md: '320px' } : { base: '68px', md: '108px' }}
        p={isMobile ? 0.5 : 1.5}
        borderRightWidth='1px'
        borderColor='border'
        _last={{ borderRight: 'none' }}
        bgImage={isBlocked ? BLOCKED_BG : undefined}
        bgColor={isOver ? 'primary.50' : undefined}
        _dark={isOver ? { bgColor: 'whiteAlpha.100' } : undefined}
        opacity={isOutside ? 0.45 : 1}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsOver(false)}
        onDrop={handleDrop}
        transition='background 120ms'
        minW={0}
      >
        <Flex align='center' justify='space-between' mb={1} gap={0.5}>
          <Menu isLazy placement='bottom-start'>
            <MenuButton
              as={Button}
              size='xs'
              variant='ghost'
              colorScheme='gray'
              minW={6}
              h={6}
              px={1}
              borderRadius='full'
              bg={isToday ? 'accent' : undefined}
              color={isToday ? 'white' : 'textPrimary'}
              _hover={{ bg: isToday ? 'primary.600' : 'rowHover' }}
              fontWeight={isToday ? 800 : 600}
              aria-label={formatShort(day)}
            >
              {parseDay(day).getDate()}
            </MenuButton>
            <MenuList fontSize='sm'>
              <MenuItem icon={<icons.register />} onClick={() => onRegister({ date: day })}>
                {t('repassos.register_on_day', { defaultValue: 'Registrar estudi aquest dia' })}
              </MenuItem>
              <MenuItem icon={<icons.blocked />} onClick={() => onToggleBlocked(day)}>
                {isBlocked
                  ? t('repassos.unblock_day', { defaultValue: 'Desbloquejar el dia' })
                  : t('repassos.block_day', { defaultValue: 'Bloquejar el dia' })}
              </MenuItem>
            </MenuList>
          </Menu>
          {isOverloaded && (
            <Text
              fontSize='10px'
              color='nm.fg'
              fontWeight={800}
              title={t('repassos.overloaded', {
                defaultValue: 'Dia sobrecarregat ({{ count }} apartats)',
                count: load,
              })}
            >
              ⚠{!isMobile && ` ${load}`}
            </Text>
          )}
        </Flex>
        <Flex direction='column' gap={1}>
          {sessions?.map((s) => (
            <SessionChip
              key={s.key}
              session={s}
              onOpen={onOpen}
              compact={isMobile && !isWeek}
              expanded={isWeek && !isMobile}
              labels={
                !isWeek || isMobile
                  ? undefined
                  : s.kind === 'test'
                    ? s.tests.map((i) => {
                        const tema = temaById.get(i.temaId)
                        return tema ? `${temaShortCode(tema)} · ${tema.nom}` : i.temaId
                      })
                    : (s.kind === 'estudi' ? s.rowIds : s.instances.map((i) => i.rowId)).map((r) => {
                        const l = labelOf(r)
                        return `${l.code} · ${l.text}`
                      })
              }
            />
          ))}
        </Flex>
      </Box>
    )
  }
)
DayCell.displayName = 'DayCell'
