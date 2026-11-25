import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { forceRefresh } from '~utils/refresh'

type PWAUpdateContextType = {
  isUpdateAvailable: boolean
  isUpdating: boolean
  triggerUpdate: () => void
}

const PWAUpdateContext = createContext<PWAUpdateContextType | undefined>(undefined)

export const usePWAUpdate = () => {
  const context = useContext(PWAUpdateContext)
  if (!context) {
    throw new Error('usePWAUpdate must be used within a PWAUpdateProvider')
  }
  return context
}

export const PWAUpdateProvider = ({ children }: { children: ReactNode }) => {
  const value = usePWAUpdateProvider()
  return <PWAUpdateContext.Provider value={value}>{children}</PWAUpdateContext.Provider>
}

const usePWAUpdateProvider = (): PWAUpdateContextType => {
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Listen to the event dispatched by registerSW when a new version is waiting
  useEffect(() => {
    const handler = (e: Event) => setUpdateSW(() => (e as CustomEvent).detail.updateSW)
    window.addEventListener('pwa-update-available', handler)
    return () => window.removeEventListener('pwa-update-available', handler)
  }, [])

  const triggerUpdate = useCallback(() => {
    if (!updateSW) return
    setIsUpdating(true)
    updateSW(true)
    // Safety net if the new service worker doesn't take control
    setTimeout(() => forceRefresh(), 3000)
  }, [updateSW])

  return { isUpdateAvailable: !!updateSW, isUpdating, triggerUpdate }
}
