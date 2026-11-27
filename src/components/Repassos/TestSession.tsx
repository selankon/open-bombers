import {
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  InputGroup,
  InputRightElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { Card } from '~components/Layout/LayoutComponents'
import { LevelBadge } from '~components/Planificacio/LevelBadge'
import { temaShortCode } from '~components/Planificacio/structure'
import { Tema } from '~components/Planificacio/types'
import { spring } from '~theme/motion'
import { formatShort } from '~utils/dates'
import { isFluix } from './paquet'
import { useAddPuntuals, useSaveTestResult } from './queries'
import { kindColors, sessionTitle } from './SessionKindLabel'
import { Session, TestItem } from './types'

/** Tema of a test item */
export const useTemaById = () => {
  const { structure } = useStudyData()
  return useMemo(() => new Map<string, Tema>(structure.temes.map((t) => [t.id, t])), [structure])
}

const parsePercent = (value: string): number | null => {
  if (value.trim() === '') return null
  const n = Number(value.replace(',', '.'))
  return Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n))) : null
}

type FluixModalProps = {
  tema: Tema | null
  onClose: () => void
}

/**
 * After a weak test: pick the blurry apartats to review them today
 */
export const FluixModal = ({ tema, onClose }: FluixModalProps) => {
  const { t } = useTranslation()
  const toast = useToast()
  const { avui, levelOf } = useStudyData()
  const { mutateAsync, isPending } = useAddPuntuals()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Focus the text, not a button: the Enter that saved the result must not close or confirm the dialog
  const introRef = useRef<HTMLParagraphElement>(null)

  // Start with nothing selected every time it opens
  useEffect(() => {
    setSelected(new Set())
  }, [tema])

  const toggle = (rowId: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })

  const onConfirm = async () => {
    try {
      await mutateAsync({ rowIds: [...selected], date: avui })
      toast({
        title: t('repassos.puntual_added', { defaultValue: 'Repàs puntual afegit a avui' }),
        status: 'success',
        duration: 3000,
      })
      onClose()
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

  return (
    <Modal isOpen={!!tema} onClose={onClose} size='lg' scrollBehavior='inside' initialFocusRef={introRef}>
      <ModalOverlay />
      <ModalContent borderRadius='sheet' mx={4}>
        <ModalHeader pb={1}>{t('repassos.fluix_title', { defaultValue: 'Quins apartats tens borrosos?' })}</ModalHeader>
        <ModalCloseButton aria-label={t('common.close', { defaultValue: 'Tancar' })} />
        <ModalBody>
          <Text ref={introRef} tabIndex={-1} fontSize='sm' color='textMuted' mb={4} _focus={{ outline: 'none' }}>
            {t('repassos.fluix_desc', {
              defaultValue:
                'El test d’aquest tema ha sortit fluix. Tria els apartats que vols repassar als apunts i els afegirem als repassos d’avui.',
            })}
          </Text>
          {tema && (
            <Stack spacing={0.5} mx={-2}>
              {tema.apartats.map((a) => (
                <Flex
                  key={a.row_id}
                  as='label'
                  align='center'
                  gap={3}
                  px={3}
                  py={2}
                  borderRadius='sm'
                  cursor='pointer'
                  _hover={{ bg: 'rowHover' }}
                >
                  <Checkbox
                    isChecked={selected.has(a.row_id)}
                    onChange={() => toggle(a.row_id)}
                    colorScheme='primary'
                  />
                  <Text flex={1} fontSize='sm'>
                    <Text as='span' fontWeight={800} color='accent'>
                      {temaShortCode(tema)}
                    </Text>
                    {' · '}
                    {a.num} {a.titol}
                  </Text>
                  <LevelBadge level={levelOf(a.row_id)} />
                </Flex>
              ))}
            </Stack>
          )}
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant='ghost' colorScheme='gray' onClick={onClose}>
            {t('repassos.fluix_skip', { defaultValue: 'Ara no' })}
          </Button>
          <Button onClick={onConfirm} isDisabled={!selected.size} isLoading={isPending}>
            {t('repassos.fluix_confirm', { defaultValue: 'Repassar avui ({{ count }})', count: selected.size })}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

type TestItemRowProps = {
  item: TestItem
  tema?: Tema
  // day of the session (the result of a done item is stored on it)
  date: string
  onWeak: (tema: Tema) => void
}

/**
 * One tema of a test session: "Fet" checkbox and the optional % of right answers
 */
const TestItemRow = ({ item, tema, date, onWeak }: TestItemRowProps) => {
  const { t } = useTranslation()
  const toast = useToast()
  const reduce = useReducedMotion()
  const { avui, repassos, paquet } = useStudyData()
  const { mutate } = useSaveTestResult()
  const [value, setValue] = useState(item.percent === null ? '' : String(item.percent))
  const config = repassos.config
  const darrer = paquet.find((p) => p.temaId === item.temaId)?.darrer

  // Show the stored percentage when it changes
  useEffect(() => {
    setValue(item.percent === null ? '' : String(item.percent))
  }, [item.percent])

  const save = (resultat: { percent: number | null } | undefined, day: string) => {
    if (resultat && navigator.vibrate) navigator.vibrate(8)
    mutate(
      { temaId: item.temaId, data: day, resultat },
      {
        onSuccess: () => {
          if (resultat && tema && isFluix(resultat.percent, config)) onWeak(tema)
          else if (resultat && day !== date)
            toast({
              title: t('repassos.test_saved_today', { defaultValue: 'Test desat avui' }),
              status: 'success',
              duration: 3000,
            })
        },
        onError: () =>
          toast({
            title: t('common.error', { defaultValue: 'Error' }),
            description: t('common.save_error_desc', {
              defaultValue: "No s'ha pogut desar al dispositiu. Torna-ho a provar.",
            }),
            status: 'error',
            duration: 5000,
            isClosable: true,
          }),
      }
    )
  }

  // A pending test is saved today (even from a future session); a done one keeps its day
  const toggle = (checked: boolean) =>
    save(checked ? { percent: parsePercent(value) } : undefined, checked ? avui : date)
  const commitPercent = () => {
    const percent = parsePercent(value)
    if (item.isDone && percent !== item.percent) save({ percent }, date)
  }

  const percentColor =
    item.percent === null
      ? 'textMuted'
      : item.percent >= config.test_llindar_alt
        ? 'na.fg'
        : isFluix(item.percent, config)
          ? 'nb.fg'
          : 'nm.fg'

  return (
    <Flex align='center' gap={3} px={3} py={2} borderRadius='sm' _hover={{ bg: 'rowHover' }}>
      <Box
        as={motion.div}
        animate={item.isDone && !reduce ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        // @ts-ignore framer-motion transition prop through Chakra
        transition={spring.bouncy}
        display='flex'
      >
        <Checkbox
          isChecked={item.isDone}
          onChange={(e) => toggle(e.target.checked)}
          colorScheme='green'
          size='lg'
          aria-label={t('repassos.mark_done', { defaultValue: 'Fet' })}
        />
      </Box>
      <Box flex={1} minW={0} opacity={item.isDone ? 0.7 : 1}>
        <Text fontSize='sm' noOfLines={2}>
          <Text as='span' fontWeight={800} color='accent'>
            {tema ? temaShortCode(tema) : item.temaId}
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
        <Text fontSize='xs' color='textMuted' mt={0.5} sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {t('repassos.test_interval', { defaultValue: 'Cada {{ count }} setm.', count: item.interval })}
          {!item.isDone &&
            darrer &&
            ` · ${t('repassos.test_last', {
              defaultValue: 'darrer {{ date }}',
              date: formatShort(darrer.data),
            })}${darrer.percent !== null ? ` (${darrer.percent} %)` : ''}`}
          {item.isDone && item.percent !== null && (
            <Text as='span' color={percentColor} fontWeight={700}>
              {` · ${item.percent} %`}
            </Text>
          )}
        </Text>
      </Box>
      <InputGroup size='sm' w='84px' flexShrink={0}>
        <Input
          type='number'
          inputMode='numeric'
          min={0}
          max={100}
          borderRadius='md'
          placeholder='—'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commitPercent}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            if (item.isDone) commitPercent()
            else toggle(true)
          }}
          sx={{ fontVariantNumeric: 'tabular-nums' }}
          aria-label={t('repassos.test_percent', { defaultValue: 'Percentatge d’encerts' })}
        />
        <InputRightElement color='textMuted' fontSize='xs' pointerEvents='none'>
          %
        </InputRightElement>
      </InputGroup>
    </Flex>
  )
}

/**
 * The temes of a test session, with the dialog for the blurry apartats
 */
export const TestItemsList = ({ session }: { session: Session }) => {
  const temaById = useTemaById()
  const [weak, setWeak] = useState<Tema | null>(null)
  return (
    <>
      <Stack spacing={0.5}>
        {session.tests.map((item) => (
          <TestItemRow
            key={item.temaId}
            item={item}
            tema={temaById.get(item.temaId)}
            date={session.date}
            onWeak={setWeak}
          />
        ))}
      </Stack>
      <FluixModal tema={weak} onClose={() => setWeak(null)} />
    </>
  )
}

/** "Do a test in the App with these temes and write down your %" */
export const TestHint = () => {
  const { t } = useTranslation()
  const { repassos } = useStudyData()
  return (
    <Text fontSize='xs' color='textMuted'>
      {t('repassos.test_hint', {
        defaultValue:
          'Fes un test a l’App amb aquests temes i apunta el % d’encerts (opcional). Bé (≥ {{ alt }} %): s’espaia més. Fluix (< {{ baix }} %): torna a començar.',
        alt: repassos.config.test_llindar_alt,
        baix: repassos.config.test_llindar_baix,
      })}
    </Text>
  )
}

/**
 * A test session card for the "Avui" view
 */
export const TestSessionCard = ({ session }: { session: Session }) => {
  const { t } = useTranslation()
  const colors = kindColors('test')
  return (
    <Card overflow='hidden'>
      <Flex
        align='center'
        columnGap={3}
        rowGap={1}
        px={4}
        py={3}
        borderBottomWidth='1px'
        borderColor='border'
        wrap='wrap'
      >
        <Box w={2.5} h={2.5} borderRadius='full' bg={colors.fg} />
        <Text fontWeight={700} whiteSpace='nowrap' mr='auto'>
          {sessionTitle(t, 'test')}
          <Text as='span' color='textMuted' fontWeight={500}>
            {' · '}
            {t('repassos.temes_count', { defaultValue: '{{ count }} temes', count: session.tests.length })}
          </Text>
        </Text>
        {session.pending === 0 && (
          <Text fontSize='xs' color='na.fg' fontWeight={700}>
            ✔ {t('repassos.session_done', { defaultValue: 'Sessió feta' })}
          </Text>
        )}
      </Flex>
      <Box px={4} pt={3}>
        <TestHint />
      </Box>
      <Box p={2}>
        <TestItemsList session={session} />
      </Box>
    </Card>
  )
}
