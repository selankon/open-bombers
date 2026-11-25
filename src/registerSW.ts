import { registerSW } from 'virtual:pwa-register'
import { UPDATE_PWA_INTERVAL } from '~utils/constants'

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { updateSW } }))
      },
      onOfflineReady() {
        console.log('App ready to work offline')
      },
      onRegisteredSW(swScriptUrl, registration) {
        if (registration) {
          // Check for updates more frequently
          setInterval(() => {
            if (navigator.onLine) registration.update()
          }, UPDATE_PWA_INTERVAL)
        }
      },
      onRegisterError(error) {
        console.error('SW registration failed:', error)
      },
    })
  }
}
