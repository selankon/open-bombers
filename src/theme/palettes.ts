/**
 * Accent palettes the user can pick in Ajustes. Each one replaces the `primary` scale of the theme.
 * Surfaces with white text use the 600 shade, which stays above WCAG AA in every palette.
 */
export type PaletteScale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>

export const PALETTES = {
  // Ember orange
  brasa: {
    50: '#FFF4EE',
    100: '#FFE4D4',
    200: '#FFC6A6',
    300: '#F7915E',
    400: '#EE7036',
    500: '#E5531A',
    600: '#C24212',
    700: '#9A3410',
    800: '#74280E',
    900: '#4A1A09',
  },
  // Fire red
  vermell: {
    50: '#FEF2F1',
    100: '#FDE2DF',
    200: '#FAC5BF',
    300: '#EE7A6F',
    400: '#E2574C',
    500: '#D0342C',
    600: '#B02822',
    700: '#8E201C',
    800: '#6B1916',
    900: '#45100E',
  },
  // Navy blue
  blau: {
    50: '#EFF4FE',
    100: '#DCE6FC',
    200: '#BCCFF8',
    300: '#7DA2EC',
    400: '#4D7DDB',
    500: '#2457C5',
    600: '#1D47A3',
    700: '#183A84',
    800: '#142E66',
    900: '#0E1F45',
  },
  // Petrol teal
  petroli: {
    50: '#EDF8F8',
    100: '#D2EEEF',
    200: '#A6DCDE',
    300: '#5FBFC4',
    400: '#2A9EA6',
    500: '#0E7C86',
    600: '#0B6670',
    700: '#0A525A',
    800: '#093F45',
    900: '#062A2E',
  },
  // Original brand gold. 600 is a touch darker than the original #9E7429 to keep white text above WCAG AA
  or: {
    50: '#FAF6EE',
    100: '#F2E7CF',
    200: '#E8C882',
    300: '#D9B565',
    400: '#C39B4B',
    500: '#B48733',
    600: '#956D26',
    700: '#7E5C20',
    800: '#5C4318',
    900: '#3A2A0F',
  },
  // Indigo
  indi: {
    50: '#EEF0FE',
    100: '#DDE1FC',
    200: '#BCC3F8',
    300: '#8E98F0',
    400: '#6670E4',
    500: '#4A4FD1',
    600: '#3B3EB0',
    700: '#30328C',
    800: '#25276A',
    900: '#181945',
  },
} satisfies Record<string, PaletteScale>

export type PaletteId = keyof typeof PALETTES

export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[]

export const DEFAULT_PALETTE: PaletteId = 'petroli'

export const isPaletteId = (v: unknown): v is PaletteId => typeof v === 'string' && v in PALETTES
