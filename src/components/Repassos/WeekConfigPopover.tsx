import {
  Box,
  Button,
  ButtonGroup,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Stack,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { ISO_DAYS, isoDayShortName, IsoDay, WeekId } from '~utils/dates'
import { weekDay } from './logic'
import { useSetWeekConfig } from './queries'

/**
 * Week header button: choose the weekly and monthly review days of one week
 */
export const WeekConfigPopover = ({ week, compact }: { week: WeekId; compact?: boolean }) => {
  const { t } = useTranslation()
  const { repassos } = useStudyData()
  const { mutate } = useSetWeekConfig()
  const override = repassos.setmanes[week]
  const hasOverride = !!override && Object.keys(override).length > 0
  const label = `S${week.split('-W')[1]}`

  const set = (key: 'dia_setmanal' | 'dia_mensual', day: IsoDay) => {
    const defaults = key === 'dia_setmanal' ? repassos.config.dia_setmanal_defecte : repassos.config.dia_mensual_defecte
    const next = { ...(override || {}) }
    if (day === defaults) delete next[key]
    else next[key] = day
    mutate({ week, config: next })
  }

  const row = (key: 'dia_setmanal' | 'dia_mensual', title: string) => {
    const current = weekDay(week, key === 'dia_setmanal' ? 'setmanal' : 'mensual', repassos.config, repassos.setmanes)
    return (
      <Box>
        <Text fontSize='xs' fontWeight={700} mb={1.5}>
          {title}
        </Text>
        <ButtonGroup size='xs' isAttached variant='outline'>
          {ISO_DAYS.map((d) => (
            <Button
              key={d}
              onClick={() => set(key, d)}
              variant={current === d ? 'solid' : 'outline'}
              colorScheme={current === d ? 'primary' : 'gray'}
              borderRadius={0}
              _first={{ borderLeftRadius: 'full' }}
              _last={{ borderRightRadius: 'full' }}
              aria-pressed={current === d}
              minW={8}
            >
              {isoDayShortName(d)}
            </Button>
          ))}
        </ButtonGroup>
      </Box>
    )
  }

  return (
    <Popover placement='bottom-start' isLazy>
      <PopoverTrigger>
        <Button
          size='xs'
          variant='ghost'
          colorScheme='gray'
          fontWeight={700}
          color={hasOverride ? 'accent' : 'textMuted'}
          px={compact ? 0 : 2}
          minW={compact ? 7 : 10}
          position='relative'
          aria-label={t('repassos.week_config', { defaultValue: 'Configurar la setmana {{ week }}', week })}
        >
          {label}
          {hasOverride && (
            <Tooltip label={t('repassos.week_has_override', { defaultValue: 'Aquesta setmana té dies propis' })}>
              <Box position='absolute' top='2px' right='2px' w={1.5} h={1.5} borderRadius='full' bg='accent' />
            </Tooltip>
          )}
        </Button>
      </PopoverTrigger>
      <Portal>
        <PopoverContent w='auto' borderRadius='16px' boxShadow='floating'>
          <PopoverArrow />
          <PopoverBody p={4}>
            <Stack spacing={3}>
              <Text fontWeight={800} fontSize='sm'>
                {t('repassos.week', { defaultValue: 'Setmana {{ week }}', week })}
              </Text>
              {row('dia_setmanal', t('repassos.week_setmanal', { defaultValue: 'Repàs setmanal:' }))}
              {row('dia_mensual', t('repassos.week_mensual', { defaultValue: 'Repàs mensual:' }))}
              <Button
                size='xs'
                variant='ghost'
                colorScheme='gray'
                isDisabled={!hasOverride}
                onClick={() => mutate({ week, config: null })}
                alignSelf='flex-start'
              >
                {t('repassos.week_reset', { defaultValue: 'Restablir per defecte' })}
              </Button>
            </Stack>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  )
}
