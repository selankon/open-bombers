import { Box } from '@chakra-ui/react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import { duration, spring } from '~theme/motion'

/**
 * Route transitions: the only place where pages are animated
 */
export const AnimatedOutlet = () => {
  const location = useLocation()
  const outlet = useOutlet()
  const reduce = useReducedMotion()
  // Animate only between top level sections, not between tabs of the same section
  const section = location.pathname.split('/')[1]

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Box
        as={motion.div}
        key={section}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        // @ts-ignore framer-motion transition prop through Chakra
        transition={reduce ? { duration: duration.fast } : spring.smooth}
      >
        {outlet}
      </Box>
    </AnimatePresence>
  )
}
