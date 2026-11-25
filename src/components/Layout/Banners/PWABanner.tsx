import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  ListItem,
  OrderedList,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePWAUpdate } from '~components/Layout/Contexts/PWAUpdateProvider'
import { STORAGE_KEYS } from '~utils/constants'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isFirefoxAndroid = () => /android/i.test(navigator.userAgent) && /firefox/i.test(navigator.userAgent)

/**
 * Install prompt: native prompt on Chromium, manual steps on iOS Safari / Firefox Android
 */
export const PWABanner = () => {
  const { t } = useTranslation()
  const { isUpdateAvailable } = usePWAUpdate()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.PWA_BANNER_DISMISSED) === 'true'
    } catch {
      return false
    }
  })

  // Capture the native install prompt (Chromium)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const canManual = isIOS() || isFirefoxAndroid()
  if (isStandalone() || isDismissed || isUpdateAvailable || (!deferredPrompt && !canManual)) return null

  const dismiss = () => {
    setIsDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEYS.PWA_BANNER_DISMISSED, 'true')
    } catch {
      // ignore
    }
  }

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') dismiss()
      setDeferredPrompt(null)
    } else {
      onOpen()
    }
  }

  return (
    <>
      <Flex
        bg='primary.50'
        _dark={{ bg: 'primary.900' }}
        px={4}
        py={2}
        gap={3}
        align='center'
        justify='center'
        fontSize='sm'
        wrap='wrap'
      >
        <Text>
          {t('pwa.install_text', { defaultValue: "Instal·la l'aplicació per fer-la servir sense connexió." })}
        </Text>
        <Flex gap={2}>
          <Button size='xs' onClick={install}>
            {t('pwa.install', { defaultValue: 'Instal·lar' })}
          </Button>
          <Button size='xs' variant='ghost' onClick={dismiss}>
            {t('pwa.not_now', { defaultValue: 'Ara no' })}
          </Button>
        </Flex>
      </Flex>
      <Drawer isOpen={isOpen} placement='bottom' onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent borderTopRadius='sheet' pb='env(safe-area-inset-bottom)'>
          <DrawerHeader>{t('pwa.install_title', { defaultValue: "Instal·lar l'aplicació" })}</DrawerHeader>
          <DrawerBody pb={8}>
            <OrderedList spacing={2}>
              {isIOS() ? (
                <>
                  <ListItem>{t('pwa.ios_step1', { defaultValue: 'Toca el botó Compartir del navegador.' })}</ListItem>
                  <ListItem>{t('pwa.ios_step2', { defaultValue: "Tria «Afegir a la pantalla d'inici»." })}</ListItem>
                </>
              ) : (
                <>
                  <ListItem>{t('pwa.ff_step1', { defaultValue: 'Obre el menú del navegador (⋮).' })}</ListItem>
                  <ListItem>{t('pwa.ff_step2', { defaultValue: 'Tria «Instal·lar».' })}</ListItem>
                </>
              )}
            </OrderedList>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}
