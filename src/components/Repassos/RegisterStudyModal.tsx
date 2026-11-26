import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '~components/Layout/ConfirmDialog'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { formatShort, today } from '~utils/dates'
import { generarInstancies } from './logic'
import { useRegisterStudy } from './queries'
import { kindColors, kindLabel } from './SessionKindLabel'

export interface RegisterStudyInitial {
  date?: string
  temaId?: string
  rowIds?: string[]
}

type RegisterStudyModalProps = {
  isOpen: boolean
  onClose: () => void
  initial?: RegisterStudyInitial
}

/**
 * Register what was studied on a day, with a preview of the reviews that will be generated
 */
export const RegisterStudyModal = ({ isOpen, onClose, initial }: RegisterStudyModalProps) => {
  const { t } = useTranslation()
  const toast = useToast()
  const { structure, repassos, avui } = useStudyData()
  const { mutateAsync, isPending } = useRegisterStudy()

  const [date, setDate] = useState(today())
  const [temaId, setTemaId] = useState(structure.temes[0]?.id)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Reset the form every time the modal opens
  useEffect(() => {
    if (!isOpen) return
    setDate(initial?.date || today())
    setTemaId(initial?.temaId || structure.temes[0]?.id)
    setSelected(new Set(initial?.rowIds || []))
  }, [isOpen, initial, structure])

  const tema = structure.temes.find((t) => t.id === temaId)
  const allSelected = !!tema && tema.apartats.every((a) => selected.has(a.row_id))

  // Reviews that a study on `date` would generate
  const preview = useMemo(() => {
    if (!date) return null
    const instances = generarInstancies({
      estudis: { preview: date },
      config: repassos.config,
      setmanes: repassos.setmanes,
      overrides: {},
      fets: {},
      avui,
    })
    return {
      d1: instances.filter((i) => i.tipus === 'd1').map((i) => i.date),
      setmanal: instances.filter((i) => i.tipus === 'setmanal').map((i) => i.date),
      mensual: instances.filter((i) => i.tipus === 'mensual').map((i) => i.date),
    }
  }, [date, repassos.config, repassos.setmanes, avui])

  // Selected apartats that already have another study day (their cycle restarts)
  const restarting = [...selected].filter((r) => repassos.estudis[r] && repassos.estudis[r] !== date)

  const toggle = (rowId: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      tema?.apartats.forEach((a) => (allSelected ? next.delete(a.row_id) : next.add(a.row_id)))
      return next
    })

  const submit = async () => {
    setIsConfirmOpen(false)
    try {
      await mutateAsync({ rowIds: [...selected], date })
      toast({
        title: t('repassos.study_registered', {
          defaultValue: 'Estudi registrat ({{ count }} apartats)',
          count: selected.size,
        }),
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

  const onConfirm = () => (restarting.length ? setIsConfirmOpen(true) : submit())

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'lg' }} scrollBehavior='inside'>
        <ModalOverlay backdropFilter='blur(2px)' />
        <ModalContent borderRadius={{ base: 0, md: 'sheet' }}>
          <ModalHeader>{t('repassos.register_title', { defaultValue: 'Registrar estudi' })}</ModalHeader>
          <ModalCloseButton aria-label={t('common.close', { defaultValue: 'Tancar' })} />
          <ModalBody>
            <Stack spacing={4}>
              <Flex gap={3} direction={{ base: 'column', sm: 'row' }}>
                <FormControl flex={{ sm: '0 0 168px' }}>
                  <FormLabel fontSize='sm'>{t('repassos.study_date', { defaultValue: 'Data' })}</FormLabel>
                  <Input
                    type='date'
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    size='sm'
                    borderRadius='md'
                  />
                </FormControl>
                <FormControl flex={1} minW={0}>
                  <FormLabel fontSize='sm'>{t('repassos.tema', { defaultValue: 'Tema' })}</FormLabel>
                  <Select value={temaId} onChange={(e) => setTemaId(e.target.value)} size='sm' borderRadius='md'>
                    {structure.temes.map((tm) => (
                      <option key={tm.id} value={tm.id}>
                        {tm.codi} {tm.nom}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </Flex>

              {tema && (
                <Box borderWidth='1px' borderColor='border' borderRadius='12px' p={3}>
                  <Checkbox isChecked={allSelected} onChange={toggleAll} fontWeight={700} mb={2} colorScheme='primary'>
                    {t('repassos.all', { defaultValue: 'Tots' })}
                  </Checkbox>
                  <Stack spacing={1.5} pl={1}>
                    {tema.apartats.map((a) => {
                      const existing = repassos.estudis[a.row_id]
                      return (
                        <Checkbox
                          key={a.row_id}
                          isChecked={selected.has(a.row_id)}
                          onChange={() => toggle(a.row_id)}
                          colorScheme='primary'
                          alignItems='flex-start'
                        >
                          <Text fontSize='sm' lineHeight={1.3}>
                            <Text as='span' fontWeight={700} color='textMuted' mr={1}>
                              {a.num}
                            </Text>
                            {a.titol}
                            {existing && (
                              <Text as='span' fontSize='xs' color='accent' ml={2} whiteSpace='nowrap'>
                                {t('repassos.studied_on', {
                                  defaultValue: '(estudiat {{ date }})',
                                  date: formatShort(existing),
                                })}
                              </Text>
                            )}
                          </Text>
                        </Checkbox>
                      )
                    })}
                  </Stack>
                </Box>
              )}

              {preview && (
                <Box bg='surfaceMuted' borderRadius='12px' p={3}>
                  <Text
                    fontSize='xs'
                    fontWeight={800}
                    color='textMuted'
                    textTransform='uppercase'
                    letterSpacing='0.06em'
                    mb={2}
                  >
                    {t('repassos.preview', { defaultValue: 'Repassos que es generaran' })}
                  </Text>
                  <Stack spacing={1} fontSize='sm'>
                    {(['d1', 'setmanal', 'mensual'] as const).map((kind) => (
                      <Flex key={kind} gap={2}>
                        <Text fontWeight={700} color={kindColors(kind).fg} minW='72px'>
                          {kindLabel(t, kind)}:
                        </Text>
                        <Text>
                          {preview[kind].slice(0, 3).map(formatShort).join(', ')}
                          {preview[kind].length > 3 ? '…' : ''}
                          {!preview[kind].length && '—'}
                        </Text>
                      </Flex>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant='ghost' colorScheme='gray' onClick={onClose}>
              {t('common.cancel', { defaultValue: 'Cancel·lar' })}
            </Button>
            <Button onClick={onConfirm} isDisabled={!selected.size || !date} isLoading={isPending}>
              {t('repassos.register_confirm', { defaultValue: 'Registrar ({{ count }})', count: selected.size })}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={t('repassos.restart_title', { defaultValue: 'Tornar a estudiar?' })}
        body={t('repassos.restart_body', {
          defaultValue:
            '{{ count }} apartats ja tenien una data d’estudi. La nova data substituirà l’anterior: els repassos pendents es recalcularan i es perdran els moviments manuals. Els repassos ja fets es mantenen.',
          count: restarting.length,
        })}
        confirmLabel={t('repassos.restart_confirm', { defaultValue: 'Reiniciar cicle' })}
        onConfirm={submit}
      />
    </>
  )
}
