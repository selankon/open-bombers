import { Badge, Box, Checkbox, Flex, Text } from '@chakra-ui/react'
import { motion, useReducedMotion } from 'framer-motion'
import { memo, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { LevelBadge } from '~components/Planificacio/LevelBadge'
import { temaShortCode } from '~components/Planificacio/structure'
import { spring } from '~theme/motion'
import { formatShort } from '~utils/dates'
import { Instance } from './types'

/**
 * `T10 · 2. Estructura de la matèria`
 */
export const useApartatLabel = () => {
  const { rowToTema, apartatOf } = useStudyData()
  return (rowId: string) => {
    const tema = rowToTema[rowId]
    const apartat = apartatOf(rowId)
    if (!tema || !apartat) return { code: '', text: rowId }
    return { code: temaShortCode(tema), text: `${apartat.num} ${apartat.titol}` }
  }
}

type ApartatItemProps = {
  instance: Instance
  onToggle: (instance: Instance, done: boolean) => void
  showDate?: boolean
  right?: ReactNode
}

/**
 * One apartat of a review session with its "Fet" checkbox and level
 */
export const ApartatItem = memo(({ instance, onToggle, showDate, right }: ApartatItemProps) => {
  const { t } = useTranslation()
  const { levelOf } = useStudyData()
  const labelOf = useApartatLabel()
  const reduce = useReducedMotion()
  const level = levelOf(instance.rowId)
  const { code, text } = labelOf(instance.rowId)
  const isNB = level === 'NB' && !instance.isDone

  return (
    <Flex
      align='center'
      gap={3}
      px={3}
      py={2}
      borderRadius='10px'
      bg={isNB ? 'nb.bg' : 'transparent'}
      borderLeftWidth='3px'
      borderLeftColor={isNB ? 'nb.border' : 'transparent'}
      _hover={{ bg: isNB ? 'nb.bg' : 'rowHover' }}
    >
      <Box
        as={motion.div}
        animate={instance.isDone && !reduce ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        // @ts-ignore framer-motion transition prop through Chakra
        transition={spring.bouncy}
        display='flex'
      >
        <Checkbox
          isChecked={instance.isDone}
          onChange={(e) => onToggle(instance, e.target.checked)}
          colorScheme='green'
          size='lg'
          aria-label={t('repassos.mark_done', { defaultValue: 'Fet' })}
        />
      </Box>
      <Box flex={1} minW={0} opacity={instance.isDone ? 0.55 : 1}>
        <Text fontSize='sm' noOfLines={2} textDecoration={instance.isDone ? 'line-through' : 'none'}>
          <Text as='span' fontWeight={800} color='accent'>
            {code}
          </Text>
          <Text as='span' color='textMuted'>
            {' · '}
          </Text>
          {text}
        </Text>
        <Flex gap={2} mt={0.5} wrap='wrap'>
          {instance.status === 'endarrerit' && (
            <Text fontSize='xs' color='nb.fg' fontWeight={600}>
              {t('repassos.overdue_since', {
                defaultValue: 'Endarrerit · {{ date }}',
                date: formatShort(instance.date),
              })}
            </Text>
          )}
          {showDate && instance.status !== 'endarrerit' && (
            <Text fontSize='xs' color='textMuted'>
              {formatShort(instance.date)}
            </Text>
          )}
          {instance.isMoved && (
            <Badge fontSize='2xs' colorScheme='purple' variant='subtle' borderRadius='full'>
              {t('repassos.moved', { defaultValue: 'mogut' })}
            </Badge>
          )}
          {instance.hasWarning && (
            <Text fontSize='xs' color='nm.fg'>
              ⚠ {t('repassos.week_blocked', { defaultValue: 'Setmana bloquejada' })}
            </Text>
          )}
        </Flex>
      </Box>
      <LevelBadge level={level} />
      {right}
    </Flex>
  )
})
ApartatItem.displayName = 'ApartatItem'
