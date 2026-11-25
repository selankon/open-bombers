import { Box } from '@chakra-ui/react'
import { AnimatedOutlet } from '~components/Layout/AnimatedOutlet'
import { BOTTOM_NAV_HEIGHT, BottomNav, useHidesBottomNav } from '~components/Layout/BottomNav'
import { StudyDataProvider } from '~components/Layout/Contexts/StudyDataContext'
import { LoadingSpinner } from '~components/Layout/LoadingSpinner'
import { OfflineBanner } from '~components/Layout/Banners/OfflineBanner'
import { PWABanner } from '~components/Layout/Banners/PWABanner'
import { PWAUpdateBanner } from '~components/Layout/Banners/PWAUpdateBanner'
import { Navbar } from '~components/Navbar/Navbar'

export const Layout = () => {
  const hidesBottomNav = useHidesBottomNav()
  return (
    <Box minH='100dvh' display='flex' flexDirection='column' bg='pageBg'>
      <PWABanner />
      <OfflineBanner />
      <PWAUpdateBanner />
      <Navbar />
      <Box
        as='main'
        flex={1}
        pb={{ base: hidesBottomNav ? 0 : `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`, md: 0 }}
      >
        <StudyDataProvider fallback={<LoadingSpinner />}>
          <AnimatedOutlet />
        </StudyDataProvider>
      </Box>
      <BottomNav />
    </Box>
  )
}
