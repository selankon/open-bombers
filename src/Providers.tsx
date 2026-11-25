import { ColorModeScript } from '@chakra-ui/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren } from 'react'
import { PaletteProvider } from '~components/Layout/Contexts/PaletteContext'
import { PWAUpdateProvider } from '~components/Layout/Contexts/PWAUpdateProvider'
import { TitleProvider } from '~components/Layout/Contexts/TitleContext'
import { ErrorBoundaries } from '~src/pages/ErrorBoundary'
import theme from '~theme/theme'
import { AppRoutes } from './router/router'
import queryClient from './services/queryClient'

export const Providers = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <PaletteProvider>
        {/* Top level error boundaries to catch errors in the whole app */}
        <ErrorBoundaries>
          <AppProviders />
        </ErrorBoundaries>
      </PaletteProvider>
    </QueryClientProvider>
  )
}

const AppProviders = () => (
  <PWAUpdateProvider>
    <AppRoutes />
  </PWAUpdateProvider>
)

/**
 * These providers depend on the navigation, so it should be placed inside the router
 */
export const NavigationDependingProviders = ({ children }: PropsWithChildren<{}>) => (
  <TitleProvider>{children}</TitleProvider>
)
