import { Box, Flex, HStack, Icon, Text } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, matchPath, useLocation } from 'react-router-dom'
import { AppLogo } from '~components/Layout/AppLogo'
import { GlassSurface } from '~components/Layout/Glass/GlassSurface'
import { ROUTES } from '~src/router/routes'
import { spring } from '~theme/motion'
import { ColorModeSwitcher } from './ColorModeSwitcher'
import { NAV_ITEMS } from './navItems'

export const Navbar = () => {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <GlassSurface
      as='header'
      position='sticky'
      top={0}
      zIndex={20}
      borderBottomWidth='1px'
      borderColor='border'
      pt='env(safe-area-inset-top)'
    >
      <Flex h={14} px={{ base: 4, md: 6 }} align='center' justify='space-between' maxW='container.2xl' mx='auto'>
        <HStack as={RouterLink} to={ROUTES.HOME} spacing={2.5}>
          <AppLogo boxSize={8} />
          <Text fontWeight={700} letterSpacing='-0.01em'>
            {t('app.name', { defaultValue: 'Open Bombers' })}
          </Text>
        </HStack>

        <HStack as='nav' spacing={1} display={{ base: 'none', md: 'flex' }} position='relative'>
          {NAV_ITEMS.map((item) => {
            const isActive = item.match.some((p) => matchPath(p, location.pathname))
            return (
              <Box
                key={item.path}
                as={RouterLink}
                to={item.path}
                position='relative'
                px={4}
                py={2}
                borderRadius='full'
                fontSize='sm'
                fontWeight={600}
                color={isActive ? 'textPrimary' : 'textMuted'}
                _hover={{ color: 'textPrimary' }}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <Box
                    as={motion.div}
                    layoutId='nav-pill'
                    position='absolute'
                    inset={0}
                    borderRadius='full'
                    bg='primary.100'
                    _dark={{ bg: 'whiteAlpha.200' }}
                    // @ts-ignore framer-motion transition prop through Chakra
                    transition={spring.smooth}
                  />
                )}
                <HStack position='relative' spacing={2}>
                  <Icon as={item.icon} boxSize={4} />
                  <Text>{t(item.labelKey, { defaultValue: item.defaultLabel })}</Text>
                </HStack>
              </Box>
            )
          })}
        </HStack>

        <ColorModeSwitcher />
      </Flex>
    </GlassSurface>
  )
}
