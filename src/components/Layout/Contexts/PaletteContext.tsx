import { ChakraProvider } from '@chakra-ui/react'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { STORAGE_KEYS } from '~utils/constants'
import { DEFAULT_PALETTE, isPaletteId, PALETTES, PaletteId } from '~theme/palettes'
import { makeTheme } from '~theme/theme'

type PaletteContextValue = { palette: PaletteId; setPalette: (p: PaletteId) => void }

const PaletteContext = createContext<PaletteContextValue | undefined>(undefined)

// Device preference (like color mode and language): it is not part of the backup
const readStoredPalette = (): PaletteId => {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.PALETTE)
    return isPaletteId(v) ? v : DEFAULT_PALETTE
  } catch {
    return DEFAULT_PALETTE
  }
}

/**
 * Holds the chosen accent palette and provides the Chakra theme built from it
 */
export const PaletteProvider = ({ children }: PropsWithChildren<{}>) => {
  const [palette, setPaletteState] = useState<PaletteId>(readStoredPalette)
  const theme = useMemo(() => makeTheme(palette), [palette])

  const setPalette = useCallback((p: PaletteId) => {
    setPaletteState(p)
    try {
      localStorage.setItem(STORAGE_KEYS.PALETTE, p)
    } catch {
      // Storage unavailable: the choice only lasts for this session
    }
  }, [])

  // Keep the browser / PWA title bar color in sync with the palette
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PALETTES[palette][500])
  }, [palette])

  // Follow palette changes made in another tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.PALETTE) setPaletteState(readStoredPalette())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(() => ({ palette, setPalette }), [palette, setPalette])

  return (
    <PaletteContext.Provider value={value}>
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </PaletteContext.Provider>
  )
}

export const usePalette = () => {
  const ctx = useContext(PaletteContext)
  if (!ctx) throw new Error('usePalette must be used within PaletteProvider')
  return ctx
}
