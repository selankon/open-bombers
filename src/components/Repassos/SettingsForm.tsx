import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  useToast,
  Wrap,
} from '@chakra-ui/react'
import { ReactNode, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { ISO_DAYS, isoDayShortName, IsoDay } from '~utils/dates'
import { DEFAULT_REPAS_CONFIG } from './config'
import { useUpdateRepasConfig } from './queries'
import { RepasConfig } from './types'

type SettingsFormData = Omit<RepasConfig, 'dies_bloquejats' | 'ics' | 'data_examen' | 'dies_test'> & {
  data_examen: string
  dies_test: string[]
}

type NumberField = {
  [K in keyof SettingsFormData]: SettingsFormData[K] extends number ? K : never
}[keyof SettingsFormData]

const NUMBER_FIELDS: NumberField[] = [
  'setmanes_fins_setmanal',
  'setmanes_fins_mensual',
  'dies_fins_diari',
  'horitzo_setmanes',
  'llindar_sobrecarrega',
  'setmanes_fins_llarg',
  'temes_per_test_max',
  'temes_per_test_min',
  'test_interval_inicial',
  'test_interval_maxim',
  'test_llindar_alt',
  'test_llindar_baix',
]

const toForm = (c: RepasConfig): SettingsFormData => ({
  dia_setmanal_defecte: c.dia_setmanal_defecte,
  dia_mensual_defecte: c.dia_mensual_defecte,
  setmanes_fins_setmanal: c.setmanes_fins_setmanal,
  setmanes_fins_mensual: c.setmanes_fins_mensual,
  dies_fins_diari: c.dies_fins_diari,
  data_examen: c.data_examen || '',
  horitzo_setmanes: c.horitzo_setmanes,
  llindar_sobrecarrega: c.llindar_sobrecarrega,
  sync_repas_seguent: c.sync_repas_seguent,
  llarg_actiu: c.llarg_actiu,
  setmanes_fins_llarg: c.setmanes_fins_llarg,
  tests_actius: c.tests_actius,
  dies_test: c.dies_test.map(String),
  temes_per_test_max: c.temes_per_test_max,
  temes_per_test_min: c.temes_per_test_min,
  test_interval_inicial: c.test_interval_inicial,
  test_interval_maxim: c.test_interval_maxim,
  test_llindar_alt: c.test_llindar_alt,
  test_llindar_baix: c.test_llindar_baix,
})

const Group = ({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) => (
  <Box>
    <Heading size='xs' mb={desc ? 1 : 3}>
      {title}
    </Heading>
    {desc && (
      <Text fontSize='xs' color='textMuted' mb={3}>
        {desc}
      </Text>
    )}
    {children}
  </Box>
)

/**
 * Review rules: default days, intervals, exam day, horizon, overload threshold, sync,
 * long-term reminders and the tests of the study package
 */
export const RepasSettingsForm = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const { repassos } = useStudyData()
  const { mutateAsync, isPending } = useUpdateRepasConfig()
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({ defaultValues: toForm(repassos.config) })

  // Reload the form when the stored configuration changes (e.g. after an import)
  useEffect(() => {
    reset(toForm(repassos.config))
  }, [repassos.config, reset])

  const llargActiu = watch('llarg_actiu')
  const testsActius = watch('tests_actius')

  const onSubmit = async (data: SettingsFormData) => {
    try {
      const numbers = Object.fromEntries(NUMBER_FIELDS.map((k) => [k, Number(data[k])]))
      await mutateAsync({
        ...data,
        ...numbers,
        dia_setmanal_defecte: Number(data.dia_setmanal_defecte) as IsoDay,
        dia_mensual_defecte: Number(data.dia_mensual_defecte) as IsoDay,
        dies_test: data.dies_test.map(Number).sort() as IsoDay[],
        data_examen: data.data_examen || null,
      })
      toast({ title: t('settings.saved', { defaultValue: 'Ajustos desats' }), status: 'success', duration: 3000 })
    } catch {
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
  }

  const rules = (min: number, max?: number, validate?: (v: number) => true | string) => ({
    valueAsNumber: true,
    required: t('validation.required', { defaultValue: 'Camp obligatori' }),
    min: { value: min, message: t('validation.min', { defaultValue: 'Mínim {{ min }}', min }) },
    ...(max !== undefined && {
      max: { value: max, message: t('validation.max', { defaultValue: 'Màxim {{ max }}', max }) },
    }),
    ...(validate && { validate }),
  })

  const numberField = (
    name: NumberField,
    label: string,
    min: number,
    help?: string,
    max?: number,
    validate?: (v: number) => true | string
  ) => (
    <FormControl isInvalid={!!errors[name]}>
      <FormLabel fontSize='sm'>{label}</FormLabel>
      <Input type='number' size='sm' borderRadius='md' {...register(name, rules(min, max, validate))} />
      {help && <FormHelperText fontSize='xs'>{help}</FormHelperText>}
      <FormErrorMessage>{errors[name]?.message as string}</FormErrorMessage>
    </FormControl>
  )

  const daySelect = (name: 'dia_setmanal_defecte' | 'dia_mensual_defecte', label: string, help?: string) => (
    <FormControl>
      <FormLabel fontSize='sm'>{label}</FormLabel>
      <Select size='sm' borderRadius='md' {...register(name)}>
        {ISO_DAYS.map((d) => (
          <option key={d} value={d}>
            {isoDayShortName(d)}
          </option>
        ))}
      </Select>
      {help && <FormHelperText fontSize='xs'>{help}</FormHelperText>}
    </FormControl>
  )

  const toggle = (name: 'sync_repas_seguent' | 'llarg_actiu' | 'tests_actius', label: string, help: string) => (
    <FormControl display='flex' alignItems='flex-start' justifyContent='space-between' gap={4}>
      <Box>
        <FormLabel fontSize='sm' mb={0} htmlFor={name}>
          {label}
        </FormLabel>
        <FormHelperText fontSize='xs' mt={0.5}>
          {help}
        </FormHelperText>
      </Box>
      <Switch id={name} colorScheme='primary' {...register(name)} />
    </FormControl>
  )

  return (
    <Box as='form' onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={8}>
        <Group title={t('settings.group_cicle', { defaultValue: 'Cicle de repassos' })}>
          <Stack spacing={5}>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
              {daySelect(
                'dia_setmanal_defecte',
                t('settings.dia_setmanal', { defaultValue: 'Dia del repàs setmanal' })
              )}
              {daySelect(
                'dia_mensual_defecte',
                t('settings.dia_mensual', { defaultValue: 'Dia del repàs mensual' }),
                t('settings.dia_mensual_help', { defaultValue: 'També el dels recordatoris a llarg termini.' })
              )}
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
                t('settings.setmanes_fins_mensual', { defaultValue: 'Repàs mensual: setmanes després' }),
                1,
                t('settings.setmanes_fins_mensual_help', {
                  defaultValue: 'Es fa una sola vegada. Després el tema queda aparcat i passa al paquet de tests.',
                })
              )}
              <FormControl>
                <FormLabel fontSize='sm'>{t('settings.data_examen', { defaultValue: "Data de l'examen" })}</FormLabel>
                <Input type='date' size='sm' borderRadius='md' {...register('data_examen')} />
                <FormHelperText fontSize='xs'>
                  {t('settings.data_examen_help', {
                    defaultValue: 'No es programa cap repàs ni test més enllà d’aquesta data.',
                  })}
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
            {toggle(
              'sync_repas_seguent',
              t('settings.sync', { defaultValue: 'Sincronitzar «Data següent repàs» de la Planificació' }),
              t('settings.sync_help', {
                defaultValue:
                  'La columna mostrarà el pròxim repàs pendent de qualsevol tipus. Desactiva-ho per omplir-la a mà.',
              })
            )}
          </Stack>
        </Group>

        <Group title={t('settings.group_llarg', { defaultValue: 'Recordatori a llarg termini' })}>
          <Stack spacing={4}>
            {toggle(
              'llarg_actiu',
              t('settings.llarg_actiu', { defaultValue: 'Avisar quan faci temps que vas estudiar un apartat' }),
              t('settings.llarg_actiu_help', {
                defaultValue:
                  'Un recordatori el dia del repàs mensual. El següent es compta des del dia que el facis. Si tornes a registrar l’estudi (segona volta), el compte torna a començar.',
              })
            )}
            {llargActiu && (
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
                {numberField(
                  'setmanes_fins_llarg',
                  t('settings.setmanes_fins_llarg', { defaultValue: 'Cada quantes setmanes' }),
                  4,
                  t('settings.setmanes_fins_llarg_help', { defaultValue: '26 setmanes ≈ 6 mesos.' })
                )}
              </SimpleGrid>
            )}
          </Stack>
        </Group>

        <Group
          title={t('settings.group_tests', { defaultValue: 'Tests del paquet d’estudi' })}
          desc={t('settings.group_tests_desc', {
            defaultValue:
              'Quan acabes el repàs mensual d’un tema, entra al paquet. El mantens viu fent tests a l’App: si et surt bé, es testeja menys sovint; si et surt fluix, torna a començar i pots programar un repàs dels apartats borrosos.',
          })}
        >
          <Stack spacing={4}>
            {toggle(
              'tests_actius',
              t('settings.tests_actius', { defaultValue: 'Programar tests del paquet' }),
              t('settings.tests_actius_help', {
                defaultValue: 'Els tests surten a Avui, al calendari i a l’exportació .ics.',
              })
            )}
            {testsActius && (
              <>
                <FormControl isInvalid={!!errors.dies_test}>
                  <FormLabel fontSize='sm'>{t('settings.dies_test', { defaultValue: 'Dies de test' })}</FormLabel>
                  <Controller
                    control={control}
                    name='dies_test'
                    rules={{
                      validate: (v) =>
                        v.length > 0 || t('settings.dies_test_required', { defaultValue: 'Tria almenys un dia' }),
                    }}
                    render={({ field }) => (
                      <CheckboxGroup value={field.value} onChange={(v) => field.onChange(v as string[])}>
                        <Wrap spacing={4}>
                          {ISO_DAYS.map((d) => (
                            <Checkbox key={d} value={String(d)} colorScheme='primary'>
                              <Text fontSize='sm'>{isoDayShortName(d)}</Text>
                            </Checkbox>
                          ))}
                        </Wrap>
                      </CheckboxGroup>
                    )}
                  />
                  <FormHelperText fontSize='xs'>
                    {t('settings.dies_test_help', {
                      defaultValue: 'Recomanat: 2 o 3 dies separats. Si un dia no el fas, els temes passen al següent.',
                    })}
                  </FormHelperText>
                  <FormErrorMessage>{errors.dies_test?.message as string}</FormErrorMessage>
                </FormControl>
                <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
                  {numberField(
                    'temes_per_test_max',
                    t('settings.temes_max', { defaultValue: 'Màxim de temes per test' }),
                    1,
                    t('settings.temes_max_help', { defaultValue: 'Si en toquen més, passen al test següent.' }),
                    34
                  )}
                  {numberField(
                    'temes_per_test_min',
                    t('settings.temes_min', { defaultValue: 'Mínim de temes per test' }),
                    0,
                    t('settings.temes_min_help', {
                      defaultValue: 'Si en toquen menys, se n’avancen per barrejar temes. 0 = no avançar-ne.',
                    }),
                    34,
                    (v) =>
                      Number(v) <= Number(getValues('temes_per_test_max')) ||
                      t('settings.temes_min_error', { defaultValue: 'Ha de ser com a molt el màxim' })
                  )}
                  {numberField(
                    'test_interval_inicial',
                    t('settings.interval_inicial', { defaultValue: 'Interval inicial (setmanes)' }),
                    1,
                    t('settings.interval_inicial_help', {
                      defaultValue: 'Cada encert alt el duplica: 1 → 2 → 4 → 8…',
                    }),
                    26
                  )}
                  {numberField(
                    'test_interval_maxim',
                    t('settings.interval_maxim', { defaultValue: 'Interval màxim (setmanes)' }),
                    1,
                    t('settings.interval_maxim_help', {
                      defaultValue: 'Un tema que domines es testeja almenys així de sovint.',
                    }),
                    52,
                    (v) =>
                      Number(v) >= Number(getValues('test_interval_inicial')) ||
                      t('settings.interval_maxim_error', { defaultValue: 'Ha de ser com a mínim l’inicial' })
                  )}
                  {numberField(
                    'test_llindar_alt',
                    t('settings.llindar_alt', { defaultValue: 'Bé a partir de (%)' }),
                    1,
                    t('settings.llindar_alt_help', { defaultValue: 'L’interval es duplica.' }),
                    100
                  )}
                  {numberField(
                    'test_llindar_baix',
                    t('settings.llindar_baix', { defaultValue: 'Fluix per sota de (%)' }),
                    0,
                    t('settings.llindar_baix_help', {
                      defaultValue: 'Torna a l’interval inicial i pots programar un repàs puntual. Entremig, es manté.',
                    }),
                    100,
                    (v) =>
                      Number(v) <= Number(getValues('test_llindar_alt')) ||
                      t('settings.llindar_baix_error', { defaultValue: 'Ha de ser com a molt el de «Bé»' })
                  )}
                </SimpleGrid>
              </>
            )}
          </Stack>
        </Group>

        <Flex gap={2} justify='flex-end' wrap='wrap'>
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
