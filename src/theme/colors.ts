import { DEFAULT_PALETTE, PALETTES } from '~theme/palettes'

export const colors = {
  // Default accent; the active one is set by makeTheme (see palettes.ts)
  primary: PALETTES[DEFAULT_PALETTE],
  // Slate neutrals of the original UI
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  score: {
    text: '#6D28D9',
    focus: '#7C3AED',
    fill: '#F5F3FF',
  },
}
