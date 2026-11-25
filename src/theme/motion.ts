import { Transition } from 'framer-motion'

/**
 * The only source of motion values of the app
 */
export const spring: Record<'snappy' | 'bouncy' | 'smooth', Transition> = {
  snappy: { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 },
  bouncy: { type: 'spring', stiffness: 380, damping: 18, mass: 0.8 },
  smooth: { type: 'spring', stiffness: 260, damping: 32, mass: 1 },
}

export const duration = {
  fast: 0.12,
  base: 0.22,
  slow: 0.4,
}

// Scale applied to tappable elements while pressed
export const PRESS_SCALE = 0.97

// Max items that get a staggered entrance
export const STAGGER_MAX = 8
export const STAGGER_STEP = 0.03
