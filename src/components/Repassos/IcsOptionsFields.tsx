import { Flex, FormControl, FormLabel, Input, Select, SimpleGrid, Stack, Switch } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { useUpdateRepasConfig } from './queries'
import { IcsOptions } from './types'

/**
 * ICS export options, saved on change in the review configuration
 */
export const IcsOptionsFields = () => {
  const { t } = useTranslation()
  const { repassos } = useStudyData()
  const { mutate } = useUpdateRepasConfig()
  const options = repassos.config.ics
  const set = (patch: Partial<IcsOptions>) => mutate({ ics: { ...options, ...patch } })

  return (
    <Stack spacing={4}>
      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
        <FormControl>
          <FormLabel fontSize='sm'>{t('ics.mode', { defaultValue: 'Tipus d’esdeveniment' })}</FormLabel>
          <Select
            size='sm'
            borderRadius='md'
            value={options.mode}
            onChange={(e) => set({ mode: e.target.value as IcsOptions['mode'] })}
          >
            <option value='allday'>{t('ics.mode_allday', { defaultValue: 'Dia complet' })}</option>
            <option value='timed'>{t('ics.mode_timed', { defaultValue: 'Franja horària' })}</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize='sm'>{t('ics.alarm', { defaultValue: 'Alarma' })}</FormLabel>
          <Select
            size='sm'
            borderRadius='md'
            value={options.alarm}
            onChange={(e) => set({ alarm: e.target.value as IcsOptions['alarm'] })}
          >
            <option value='none'>{t('ics.alarm_none', { defaultValue: 'Sense alarma' })}</option>
            <option value='same_day_9'>{t('ics.alarm_9', { defaultValue: 'A les 9:00 del mateix dia' })}</option>
            <option value='before_15'>{t('ics.alarm_15', { defaultValue: '15 minuts abans' })}</option>
          </Select>
        </FormControl>
        {options.mode === 'timed' && (
          <>
            <FormControl>
              <FormLabel fontSize='sm'>{t('ics.start', { defaultValue: 'Hora d’inici' })}</FormLabel>
              <Input
                type='time'
                size='sm'
                borderRadius='md'
                value={options.start}
                onChange={(e) => e.target.value && set({ start: e.target.value })}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize='sm'>{t('ics.duration', { defaultValue: 'Durada (minuts)' })}</FormLabel>
              <Input
                type='number'
                min={5}
                step={5}
                size='sm'
                borderRadius='md'
                value={options.duration_min}
                onChange={(e) => Number(e.target.value) > 0 && set({ duration_min: Number(e.target.value) })}
              />
            </FormControl>
          </>
        )}
        <FormControl>
          <FormLabel fontSize='sm'>{t('ics.range', { defaultValue: 'Rang' })}</FormLabel>
          <Select
            size='sm'
            borderRadius='md'
            value={options.range}
            onChange={(e) => set({ range: e.target.value as IcsOptions['range'] })}
          >
            <option value='from_today'>{t('ics.range_today', { defaultValue: 'Des d’avui' })}</option>
            <option value='all'>{t('ics.range_all', { defaultValue: 'Tot' })}</option>
          </Select>
        </FormControl>
      </SimpleGrid>
      <Stack spacing={2}>
        <Flex as='label' align='center' justify='space-between' gap={3} fontSize='sm'>
          {t('ics.include_done', { defaultValue: 'Incloure els repassos ja fets' })}
          <Switch
            colorScheme='primary'
            isChecked={options.include_done}
            onChange={(e) => set({ include_done: e.target.checked })}
          />
        </Flex>
        <Flex as='label' align='center' justify='space-between' gap={3} fontSize='sm'>
          {t('ics.include_estudis', { defaultValue: 'Incloure les sessions d’estudi' })}
          <Switch
            colorScheme='primary'
            isChecked={options.include_estudis}
            onChange={(e) => set({ include_estudis: e.target.checked })}
          />
        </Flex>
        <Flex as='label' align='center' justify='space-between' gap={3} fontSize='sm'>
          {t('ics.include_tests', { defaultValue: 'Incloure els tests del paquet' })}
          <Switch
            colorScheme='primary'
            isChecked={options.include_tests}
            onChange={(e) => set({ include_tests: e.target.checked })}
          />
        </Flex>
      </Stack>
    </Stack>
  )
}
