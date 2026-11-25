import { Box, chakra, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { kindColors, kindLabel } from './SessionKindLabel'
import { Session } from './types'

export const DRAG_MIME = 'application/x-repas-session'

type SessionChipProps = {
  session: Session
  onOpen: (session: Session) => void
  compact?: boolean
  expanded?: boolean
  labels?: string[]
}

/**
 * Session chip of a calendar day. Draggable to another day (except study sessions).
 */
export const SessionChip = memo(({ session, onOpen, compact, expanded, labels }: SessionChipProps) => {
  const { t } = useTranslation()
  const colors = kindColors(session.kind)
  const count = session.kind === 'estudi' ? session.rowIds.length : session.instances.length
  const isDone = session.kind !== 'estudi' && session.pending === 0
  const isOverdue = session.overdue > 0
  const isDraggable = session.kind !== 'estudi' && !isDone

  return (
    <chakra.button
      type='button'
      draggable={isDraggable}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, session.key)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(session)
      }}
      display='flex'
      flexDirection='column'
      alignItems='stretch'
      w='full'
      textAlign='left'
      px={compact ? 1 : 2}
      py={compact ? 0.5 : 1}
      borderRadius='7px'
      bg={colors.bg}
      color={colors.fg}
      borderWidth='1px'
      borderColor={isOverdue ? 'nb.border' : 'transparent'}
      borderStyle={session.isManual ? 'dashed' : 'solid'}
      opacity={isDone ? 0.55 : 1}
      fontSize={compact ? '10px' : 'xs'}
      fontWeight={700}
      lineHeight={1.25}
      cursor={isDraggable ? 'grab' : 'pointer'}
      transition='transform 120ms, box-shadow 120ms'
      _hover={{ transform: 'translateY(-1px)', boxShadow: 'card' }}
      _active={{ transform: 'scale(0.97)' }}
      aria-label={`${kindLabel(t, session.kind)} · ${count}`}
    >
      <Box as='span' noOfLines={1}>
        {isDone && '✔ '}
        {compact ? `${kindLabel(t, session.kind)[0]}·${count}` : `${kindLabel(t, session.kind)} · ${count}`}
      </Box>
      {expanded && labels && (
        <Box mt={1}>
          {labels.slice(0, 6).map((l) => (
            <Text key={l} fontSize='10px' fontWeight={500} color='textPrimary' noOfLines={1}>
              {l}
            </Text>
          ))}
          {labels.length > 6 && (
            <Text fontSize='10px' color='textMuted'>
              +{labels.length - 6}
            </Text>
          )}
        </Box>
      )}
    </chakra.button>
  )
})
SessionChip.displayName = 'SessionChip'
