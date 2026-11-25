import { Box, Flex, HStack, SimpleGrid, Text } from '@chakra-ui/react'
import { motion, useReducedMotion } from 'framer-motion'
import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '~components/Layout/LayoutComponents'
import { spring } from '~theme/motion'
import { LevelBadge } from './LevelBadge'
import { PlanMetrics } from './types'

const MetricCard = ({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) => (
  <Card p={4}>
    <Text fontSize='xs' fontWeight={700} color='textMuted' textTransform='uppercase' letterSpacing='0.06em'>
      {title}
    </Text>
    <Box mt={2}>{children}</Box>
    {footer && <Box mt={3}>{footer}</Box>}
  </Card>
)

export const ProgressBar = ({ pct }: { pct: number }) => {
  const reduce = useReducedMotion()
  return (
    <Box h={2} bg='slate.100' _dark={{ bg: 'whiteAlpha.100' }} borderRadius='full' overflow='hidden'>
      <Box
        as={motion.div}
        h='full'
        w='full'
        bgGradient='linear(to-r, primary.600, primary.400)'
        borderRadius='full'
        style={{ transformOrigin: 'left' }}
        initial={false}
        animate={{ scaleX: pct / 100 }}
        // @ts-ignore framer-motion transition prop through Chakra
        transition={reduce ? { duration: 0 } : spring.smooth}
      />
    </Box>
  )
}

/**
 * Global metrics cards
 */
export const PlanMetricsCards = ({ metrics }: { metrics: PlanMetrics }) => {
  const { t } = useTranslation()
  return (
    <SimpleGrid minChildWidth='220px' spacing={3} mb={5}>
      <MetricCard
        title={t('plan.metric_tasks', { defaultValue: 'Tasques realitzades' })}
        footer={<ProgressBar pct={metrics.checksPct} />}
      >
        <Text fontSize='2xl' fontWeight={800} lineHeight={1}>
          {metrics.checksDone}
          <Text as='span' fontSize='md' color='textMuted' fontWeight={600}>
            {' '}
            / {metrics.checksTotal} ({metrics.checksPct}%)
          </Text>
        </Text>
      </MetricCard>
      <MetricCard
        title={t('plan.metric_weighted', { defaultValue: 'Progrés ponderat' })}
        footer={<ProgressBar pct={metrics.weightedPct} />}
      >
        <Text fontSize='2xl' fontWeight={800} lineHeight={1}>
          {metrics.weightedPct}%
        </Text>
        <Text fontSize='xs' color='textMuted' mt={1}>
          {t('plan.metric_weighted_desc', { defaultValue: 'Imprescindibles ×3 · Tasques 2 ×2 · Tasques 3 ×1' })}
        </Text>
      </MetricCard>
      <MetricCard title={t('plan.metric_scores', { defaultValue: 'Mitjana de notes' })}>
        <Text fontSize='2xl' fontWeight={800} lineHeight={1} color='score.fg'>
          {metrics.scoreAverage === null ? '—' : metrics.scoreAverage.toFixed(2)}
          <Text as='span' fontSize='md' color='textMuted' fontWeight={600}>
            {' '}
            / 10
          </Text>
        </Text>
        <Text fontSize='xs' color='textMuted' mt={1}>
          {t('plan.metric_scores_desc', { defaultValue: 'Puntuació global de tests (0-10)' })}
        </Text>
      </MetricCard>
      <MetricCard title={t('plan.metric_levels', { defaultValue: 'Domini per apartat' })}>
        <HStack spacing={2} mt={1}>
          {(['NA', 'NM', 'NB'] as const).map((l) => (
            <Flex key={l} align='center' gap={1.5}>
              <LevelBadge level={l} h={6} px={2} fontSize='xs' />
              <Text fontWeight={800} fontSize='lg'>
                {metrics.levels[l]}
              </Text>
            </Flex>
          ))}
        </HStack>
      </MetricCard>
    </SimpleGrid>
  )
}
