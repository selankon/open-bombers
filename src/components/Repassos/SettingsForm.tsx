import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  useToast,
} from '@chakra-ui/react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { ISO_DAYS, isoDayShortName, IsoDay } from '~utils/dates'
import { DEFAULT_REPAS_CONFIG } from './config'
import { useUpdateRepasConfig } from './queries'
import { RepasConfig } from './types'

type SettingsFormData = Omit<RepasConfig, 'dies_bloquejats' | 'ics' | 'data_examen'> & { data_examen: string }

const toForm = (c: RepasConfig): SettingsFormData => ({
  dia_setmanal_defecte: c.dia_setmanal_defecte,
  dia_mensual_defecte: c.dia_mensual_defecte,
  setmanes_fins_setmanal: c.setmanes_fins_setmanal,
  setmanes_fins_mensual: c.setmanes_fins_mensual,
  setmanes_entre_mensuals: c.setmanes_entre_mensuals,
  dies_fins_diari: c.dies_fins_diari,
  data_examen: c.data_examen || '',
  horitzo_setmanes: c.horitzo_setmanes,
  llindar_sobrecarrega: c.llindar_sobrecarrega,
  sync_repas_seguent: c.sync_repas_seguent,
})

/**
 * Review rules: default days, intervals, exam day, horizon, overload threshold, sync
 */
export const RepasSettingsForm = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const { repassos } = useStudyData()
  const { mutateAsync, isPending } = useUpdateRepasConfig()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({ defaultValues: toForm(repassos.config) })

  // Reload the form when the stored configuration changes (e.g. after an import)
  useEffect(() => {
    reset(toForm(repassos.config))
  }, [repassos.config, reset])

  const onSubmit = async (data: SettingsFormData) => {
    try {
      await mutateAsync({
        ...data,
        dia_setmanal_defecte: Number(data.dia_setmanal_defecte) as IsoDay,
        dia_mensual_defecte: Number(data.dia_mensual_defecte) as IsoDay,
        setmanes_fins_setmanal: Number(data.setmanes_fins_setmanal),
        setmanes_fins_mensual: Number(data.setmanes_fins_mensual),
        setmanes_entre_mensuals: Number(data.setmanes_entre_mensuals),
        dies_fins_diari: Number(data.dies_fins_diari),
        horitzo_setmanes: Number(data.horitzo_setmanes),
        llindar_sobrecarrega: Number(data.llindar_sobrecarrega),
        data_examen: data.data_examen || null,
      })
      toast({ title: t('settings.saved', { defaultValue: 'Ajustos desats' }), status: 'success', duration: 3000 })
    } catch {
      toast({ title: t('common.error', { defaultValue: 'Error' }), status: 'error', duration: 5000 })
    }
  }

  const positive = (min: number) => ({
    valueAsNumber: true,
    required: t('validation.required', { defaultValue: 'Camp obligatori' }),
    min: { value: min, message: t('validation.min', { defaultValue: 'Mínim {{ min }}', min }) },
  })

  const numberField = (name: keyof SettingsFormData, label: string, min: number, help?: string) => (
    <FormControl isInvalid={!!errors[name]}>
      <FormLabel fontSize='sm'>{label}</FormLabel>
      <Input type='number' size='sm' borderRadius='md' {...register(name, positive(min))} />
      {help && <FormHelperText fontSize='xs'>{help}</FormHelperText>}
      <FormErrorMessage>{errors[name]?.message as string}</FormErrorMessage>
    </FormControl>
  )

  const daySelect = (name: 'dia_setmanal_defecte' | 'dia_mensual_defecte', label: string) => (
    <FormControl>
      <FormLabel fontSize='sm'>{label}</FormLabel>
      <Select size='sm' borderRadius='md' {...register(name)}>
        {ISO_DAYS.map((d) => (
          <option key={d} value={d}>
            {isoDayShortName(d)}
          </option>
        ))}
      </Select>
    </FormControl>
  )

  return (
    <Box as='form' onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={5}>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
          {daySelect('dia_setmanal_defecte', t('settings.dia_setmanal', { defaultValue: 'Dia del repàs setmanal' }))}
          {daySelect('dia_mensual_defecte', t('settings.dia_mensual', { defaultValue: 'Dia del repàs mensual' }))}
          {numberField(
            'dies_fins_diari',
            t('settings.dies_fins_diari', { defaultValue: 'Repàs diari: dies després' }),
            1
          )}
          {numberField(
            'setmanes_fins_setmanal',
            t('settings.setmanes_fins_setmanal', { defaultValue: 'Repàs setmanal: setmanes després' }),
            1
          )}
          {numberField(
            'setmanes_fins_mensual',
            t('settings.setmanes_fins_mensual', { defaultValue: 'Primer mensual: setmanes després' }),
            1
          )}
          {numberField(
            'setmanes_entre_mensuals',
            t('settings.setmanes_entre_mensuals', { defaultValue: 'Setmanes entre mensuals' }),
            1
          )}
          <FormControl>
            <FormLabel fontSize='sm'>{t('settings.data_examen', { defaultValue: "Data de l'examen" })}</FormLabel>
            <Input type='date' size='sm' borderRadius='md' {...register('data_examen')} />
            <FormHelperText fontSize='xs'>
              {t('settings.data_examen_help', { defaultValue: 'Els mensuals es generen fins a aquesta data.' })}
            </FormHelperText>
          </FormControl>
          {numberField(
            'horitzo_setmanes',
            t('settings.horitzo', { defaultValue: 'Horitzó (setmanes)' }),
            1,
            t('settings.horitzo_help', { defaultValue: "Si no hi ha data d'examen." })
          )}
          {numberField(
            'llindar_sobrecarrega',
            t('settings.llindar', { defaultValue: 'Avís de sobrecàrrega (apartats/dia)' }),
            1
          )}
        </SimpleGrid>
        <FormControl display='flex' alignItems='flex-start' justifyContent='space-between' gap={4}>
          <Box>
            <FormLabel fontSize='sm' mb={0} htmlFor='sync_repas_seguent'>
              {t('settings.sync', { defaultValue: 'Sincronitzar «Data següent repàs» de la Planificació' })}
            </FormLabel>
            <FormHelperText fontSize='xs' mt={0.5}>
              {t('settings.sync_help', {
                defaultValue:
                  'La columna mostrarà el pròxim repàs pendent de qualsevol tipus. Desactiva-ho per omplir-la a mà.',
              })}
            </FormHelperText>
          </Box>
          <Switch id='sync_repas_seguent' colorScheme='primary' {...register('sync_repas_seguent')} />
        </FormControl>
        <Flex gap={2} justify='flex-end'>
          <Button
            variant='ghost'
            colorScheme='gray'
            onClick={() =>
              reset(toForm({ ...DEFAULT_REPAS_CONFIG, dies_bloquejats: [], ics: repassos.config.ics }), {
                keepDefaultValues: true,
              })
            }
          >
            {t('settings.defaults', { defaultValue: 'Valors per defecte' })}
          </Button>
          <Button type='submit' isLoading={isPending} isDisabled={!isDirty}>
            {t('common.save', { defaultValue: 'Desar' })}
          </Button>
        </Flex>
      </Stack>
    </Box>
  )
}
