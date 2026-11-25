import {
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  IconButton,
  Input,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Stack,
  Text,
  useBreakpointValue,
  useToast,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '~components/Layout/ConfirmDialog'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { LevelBadge } from '~components/Planificacio/LevelBadge'
import { icons } from '~theme/icons'
import { formatLong, formatShort, weekIdOf } from '~utils/dates'
import { ApartatItem, useApartatLabel } from './ApartatItem'
import { useMoveInstance, useMoveSession, useRemoveStudy } from './queries'
import { kindColors, kindLabel } from './SessionKindLabel'
import { Instance, Session } from './types'
import { useDoneToggle } from './useDoneToggle'

const InstanceMoveButton = ({ instance }: { instance: Instance }) => {
  const { t } = useTranslation()
  const { mutate } = useMoveInstance()
  if (instance.isDone) return null
  return (
    <Popover placement='bottom-end' isLazy>
      <PopoverTrigger>
        <IconButton
          aria-label={t('repassos.move_apartat', { defaultValue: 'Moure aquest apartat' })}
          icon={<icons.calendar />}
          size='sm'
          variant='ghost'
          colorScheme='gray'
        />
      </PopoverTrigger>
      <PopoverContent w='240px' borderRadius='14px'>
        <PopoverArrow />
        <PopoverBody>
          <Stack spacing={2}>
            <Text fontSize='xs' fontWeight={700}>
              {t('repassos.move_to', { defaultValue: 'Moure a…' })}
            </Text>
            <Input
              type='date'
              size='sm'
              borderRadius='md'
              value={instance.date}
              onChange={(e) => e.target.value && mutate({ id: instance.id, date: e.target.value })}
            />
            {instance.isMoved && (
              <Button
                size='xs'
                variant='ghost'
                leftIcon={<icons.reset />}
                onClick={() => mutate({ id: instance.id, date: null })}
              >
                {t('repassos.reset_date', {
                  defaultValue: 'Restablir data calculada ({{ date }})',
                  date: formatShort(instance.calcDate),
                })}
              </Button>
            )}
          </Stack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}

type SessionDrawerProps = {
  session: Session | null
  onClose: () => void
}

/**
 * Side panel with the apartats of a session: done marks, moves and resets
 */
export const SessionDrawer = ({ session, onClose }: SessionDrawerProps) => {
  const { t } = useTranslation()
  const toast = useToast()
  const { levelOf, rowIndex } = useStudyData()
  const labelOf = useApartatLabel()
  const { setDone, toggleOne } = useDoneToggle()
  const { mutateAsync: moveSession, isPending: isMoving } = useMoveSession()
  const { mutate: removeStudy } = useRemoveStudy()
  const placement = useBreakpointValue<'right' | 'bottom'>({ base: 'bottom', md: 'right' }, { ssr: false })
  const [moveDate, setMoveDate] = useState('')
  const [confirmStudyMove, setConfirmStudyMove] = useState(false)

  // Prefill the move date with the session day
  useEffect(() => {
    if (session) setMoveDate(session.date)
  }, [session])

  if (!session) return null

  const colors = kindColors(session.kind)
  const isStudy = session.kind === 'estudi'
  const count = isStudy ? session.rowIds.length : session.instances.length
  const pending = session.instances.filter((i) => !i.isDone)
  const sorted = [...session.instances].sort(
    (a, b) =>
      (levelOf(a.rowId) === 'NB' ? 0 : 1) - (levelOf(b.rowId) === 'NB' ? 0 : 1) ||
      (rowIndex[a.rowId] ?? 0) - (rowIndex[b.rowId] ?? 0)
  )
  const isWeekMove =
    (session.kind === 'setmanal' || session.kind === 'mensual') &&
    !session.isManual &&
    moveDate &&
    weekIdOf(moveDate) === session.anchor

  const doMove = async () => {
    setConfirmStudyMove(false)
    try {
      await moveSession({ session, date: moveDate })
      toast({
        title: t('repassos.session_moved', {
          defaultValue: 'Sessió moguda al {{ date }}',
          date: formatShort(moveDate),
        }),
        status: 'success',
        duration: 3000,
      })
      onClose()
    } catch {
      toast({ title: t('common.error', { defaultValue: 'Error' }), status: 'error', duration: 5000 })
    }
  }

  return (
    <>
      <Drawer isOpen={!!session} onClose={onClose} placement={placement} size='md'>
        <DrawerOverlay />
        <DrawerContent
          borderTopRadius={{ base: 'sheet', md: 0 }}
          maxH={{ base: '88dvh', md: 'none' }}
          pb='env(safe-area-inset-bottom)'
        >
          <DrawerCloseButton aria-label={t('common.close', { defaultValue: 'Tancar' })} />
          <DrawerHeader pb={2}>
            <Flex align='center' gap={2}>
              <Box w={3} h={3} borderRadius='full' bg={colors.fg} />
              <Text>
                {isStudy
                  ? kindLabel(t, 'estudi')
                  : t('repassos.session_title', {
                      defaultValue: 'Repàs {{ kind }}',
                      kind: kindLabel(t, session.kind).toLowerCase(),
                    })}{' '}
                <Text as='span' color='textMuted' fontWeight={500}>
                  · {count}
                </Text>
              </Text>
              {session.isManual && (
                <Badge colorScheme='purple' borderRadius='full' fontSize='2xs'>
                  {t('repassos.moved', { defaultValue: 'mogut' })}
                </Badge>
              )}
            </Flex>
            <Text
              fontSize='sm'
              color='textMuted'
              fontWeight={500}
              sx={{ '&::first-letter': { textTransform: 'uppercase' } }}
            >
              {formatLong(session.date)}
            </Text>
          </DrawerHeader>
          <DrawerBody>
            <Stack spacing={5}>
              {!isStudy && pending.length > 0 && (
                <Button leftIcon={<icons.done />} onClick={() => setDone(pending, true)} alignSelf='flex-start'>
                  {t('repassos.mark_session_done', { defaultValue: 'Marcar tota la sessió com a feta' })}
                </Button>
              )}

              <Stack spacing={0.5} mx={-2}>
                {isStudy
                  ? [...session.rowIds]
                      .sort((a, b) => (rowIndex[a] ?? 0) - (rowIndex[b] ?? 0))
                      .map((rowId) => {
                        const { code, text } = labelOf(rowId)
                        return (
                          <Flex
                            key={rowId}
                            align='center'
                            gap={3}
                            px={3}
                            py={2}
                            borderRadius='10px'
                            _hover={{ bg: 'rowHover' }}
                          >
                            <Text flex={1} fontSize='sm'>
                              <Text as='span' fontWeight={800} color='accent'>
                                {code}
                              </Text>
                              {' · '}
                              {text}
                            </Text>
                            <LevelBadge level={levelOf(rowId)} />
                            <IconButton
                              aria-label={t('repassos.remove_study', { defaultValue: "Esborrar l'estudi" })}
                              title={t('repassos.remove_study', { defaultValue: "Esborrar l'estudi" })}
                              icon={<icons.delete />}
                              size='sm'
                              variant='ghost'
                              colorScheme='red'
                              onClick={() => removeStudy([rowId])}
                            />
                          </Flex>
                        )
                      })
                  : sorted.map((inst) => (
                      <ApartatItem
                        key={inst.id}
                        instance={inst}
                        onToggle={toggleOne}
                        right={<InstanceMoveButton instance={inst} />}
                      />
                    ))}
              </Stack>

              {(isStudy || pending.length > 0) && (
                <Box bg='surfaceMuted' borderRadius='14px' p={3}>
                  <Text fontSize='sm' fontWeight={700} mb={2}>
                    {isStudy
                      ? t('repassos.move_study', { defaultValue: "Canviar el dia d'estudi" })
                      : t('repassos.move_session', { defaultValue: 'Moure la sessió a…' })}
                  </Text>
                  <Flex gap={2}>
                    <Input
                      type='date'
                      size='sm'
                      borderRadius='md'
                      bg='surface'
                      value={moveDate}
                      onChange={(e) => setMoveDate(e.target.value)}
                    />
                    <Button
                      size='sm'
                      onClick={() => (isStudy ? setConfirmStudyMove(true) : doMove())}
                      isDisabled={!moveDate || moveDate === session.date}
                      isLoading={isMoving}
                    >
                      {t('repassos.move', { defaultValue: 'Moure' })}
                    </Button>
                  </Flex>
                  {!isStudy && (
                    <Text fontSize='xs' color='textMuted' mt={2}>
                      {isWeekMove
                        ? t('repassos.move_week_hint', {
                            defaultValue:
                              "Dins la mateixa setmana: canvia el dia de repàs {{ kind }} d'aquesta setmana per a tots els apartats.",
                            kind: kindLabel(t, session.kind).toLowerCase(),
                          })
                        : t('repassos.move_manual_hint', {
                            defaultValue:
                              'Fora de la setmana: cada apartat queda mogut manualment i no el canviaran els ajustos.',
                          })}
                    </Text>
                  )}
                </Box>
              )}
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      <ConfirmDialog
        isOpen={confirmStudyMove}
        onClose={() => setConfirmStudyMove(false)}
        title={t('repassos.restart_title', { defaultValue: 'Tornar a estudiar?' })}
        body={t('repassos.move_study_body', {
          defaultValue:
            'Canviar el dia d’estudi recalcularà els repassos pendents d’aquests apartats i esborrarà els seus moviments manuals.',
        })}
        confirmLabel={t('repassos.restart_confirm', { defaultValue: 'Reiniciar cicle' })}
        onConfirm={doMove}
      />
    </>
  )
}
