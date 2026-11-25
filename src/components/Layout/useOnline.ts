import { useEffect, useState } from 'react'

/**
 * Browser connectivity, updated live
 */
export const useOnline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Track the online / offline events
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return isOnline
}
