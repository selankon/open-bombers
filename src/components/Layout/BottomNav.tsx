import { Flex, Icon, Text } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, matchPath, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '~components/Navbar/navItems'
import { PRESS_SCALE, spring } from '~theme/motion'
import { GlassSurface } from './Glass/GlassSurface'

export const BOTTOM_NAV_HEIGHT = 60

const MotionLink = motion(RouterLink)

/**
 * Fixed bottom navigation for mobile
 */
export const BottomNav = () => {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <GlassSurface
      as='nav'
      position='fixed'
      bottom={0}
      left={0}
      right={0}
      zIndex={20}
      display={{ base: 'block', md: 'none' }}
      borderTopWidth='1px'
      borderColor='border'
      pb='env(safe-area-inset-bottom)'
    >
      <Flex h={`${BOTTOM_NAV_HEIGHT}px`} align='stretch' justify='space-around'>
        {NAV_ITEMS.map((item) => {
          const isActive = item.match.some((p) => matchPath(p, location.pathname))
          return (
            <Flex
              key={item.path}
              as={MotionLink}
              to={item.path}
              whileTap={{ scale: PRESS_SCALE }}
              // @ts-ignore framer-motion transition prop through Chakra
              transition={spring.snappy}
              flex={1}
              direction='column'
              align='center'
              justify='center'
              gap={0.5}
              color={isActive ? 'accent' : 'textMuted'}
              aria-current={isActive ? 'page' : undefined}
              userSelect='none'
            >
              <Icon as={item.icon} boxSize={6} />
              <Text fontSize='2xs' fontWeight={600}>
                {t(item.labelKey, { defaultValue: item.defaultLabel })}
              </Text>
            </Flex>
          )
        })}
      </Flex>
    </GlassSurface>
  )
}
