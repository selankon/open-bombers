import { Box, Flex } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { Link as RouterLink, matchPath, useLocation } from 'react-router-dom'
import { spring } from '~theme/motion'

export interface RoutedTab {
  path: string
  label: string
}

/**
 * Segmented tabs mapped to routes (linkable)
 */
export const RoutedTabs = ({ tabs, id }: { tabs: RoutedTab[]; id: string }) => {
  const location = useLocation()
  return (
    <Flex
      as='nav'
      bg='surfaceMuted'
      borderWidth='1px'
      borderColor='border'
      borderRadius='full'
      p={1}
      gap={1}
      w='fit-content'
    >
      {tabs.map((tab) => {
        const isActive = !!matchPath(tab.path, location.pathname)
        return (
          <Box
            key={tab.path}
            as={RouterLink}
            to={tab.path}
            position='relative'
            px={4}
            py={1.5}
            borderRadius='full'
            fontSize='sm'
            fontWeight={600}
            color={isActive ? 'textPrimary' : 'textMuted'}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <Box
                as={motion.div}
                layoutId={`tab-${id}`}
                position='absolute'
                inset={0}
                borderRadius='full'
                bg='surface'
                boxShadow='card'
                // @ts-ignore framer-motion transition prop through Chakra
                transition={spring.smooth}
              />
            )}
            <Box position='relative'>{tab.label}</Box>
          </Box>
        )
      })}
    </Flex>
  )
}
