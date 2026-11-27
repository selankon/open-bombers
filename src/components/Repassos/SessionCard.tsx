import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { Card } from '~components/Layout/LayoutComponents'
import { icons } from '~theme/icons'
import { ApartatItem } from './ApartatItem'
import { kindColors, sessionTitle } from './SessionKindLabel'
import { Instance, Session } from './types'
import { useDoneToggle } from './useDoneToggle'

type SessionCardProps = {
  session: Session
  // only show these instances (e.g. the overdue ones)
  instances?: Instance[]
  showDate?: boolean
}

/**
 * A review session: kind, count, "mark all as done" and its apartats (NB first)
 */
export const SessionCard = ({ session, instances, showDate }: SessionCardProps) => {
  const { t } = useTranslation()
  const { levelOf, rowIndex } = useStudyData()
  const { setDone, toggleOne } = useDoneToggle()
  const list = [...(instances || session.instances)].sort((a, b) => {
    const nbA = levelOf(a.rowId) === 'NB' ? 0 : 1
    const nbB = levelOf(b.rowId) === 'NB' ? 0 : 1
    return nbA - nbB || (rowIndex[a.rowId] ?? 0) - (rowIndex[b.rowId] ?? 0)
  })
  const pending = list.filter((i) => !i.isDone)
  const colors = kindColors(session.kind)

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
          {sessionTitle(t, session.kind)}
          <Text as='span' color='textMuted' fontWeight={500}>
            {' · '}
            {list.length}
          </Text>
        </Text>
        {pending.length > 0 ? (
          <Button size='xs' variant='ghost' leftIcon={<icons.done />} onClick={() => setDone(pending, true)}>
            {t('repassos.mark_session_done', { defaultValue: 'Marcar tota la sessió com a feta' })}
          </Button>
        ) : (
          <Text fontSize='xs' color='na.fg' fontWeight={700}>
            ✔ {t('repassos.session_done', { defaultValue: 'Sessió feta' })}
          </Text>
        )}
      </Flex>
      <Stack spacing={0.5} p={2}>
        {list.map((inst) => (
          <ApartatItem key={inst.id} instance={inst} onToggle={toggleOne} showDate={showDate} />
        ))}
      </Stack>
    </Card>
  )
}
