import { Button, Code } from '@chakra-ui/react'
import { Component, ReactNode } from 'react'
import { Trans } from 'react-i18next'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { icons } from '~theme/icons'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error(error)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <ElementNotFound
        icon={icons.warning}
        title={<Trans i18nKey='error.title'>Ho sentim, alguna cosa ha fallat</Trans>}
        desc={
          <>
            <Trans i18nKey='error.desc'>
              Les teves dades són segures al dispositiu. Torna a carregar la pàgina per continuar.
            </Trans>
            {import.meta.env.DEV && (
              <Code display='block' mt={4} whiteSpace='pre-wrap' textAlign='left'>
                {(error as Error).message}
              </Code>
            )}
          </>
        }
        action={
          <Button onClick={() => window.location.reload()}>
            <Trans i18nKey='error.reload'>Tornar a carregar</Trans>
          </Button>
        }
      />
    )
  }
}

export const ErrorBoundaries = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary>
    <ChunkErrorBoundary>{children}</ChunkErrorBoundary>
  </ErrorBoundary>
)
