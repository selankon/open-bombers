import { Button } from '@chakra-ui/react'
import { Component, ReactNode } from 'react'
import { Trans } from 'react-i18next'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { icons } from '~theme/icons'
import { forceRefresh } from '~utils/refresh'

const CHUNK_ERROR =
  /loading dynamically imported module|loading chunk|failed to fetch dynamically imported module|ChunkLoadError/i

/**
 * After a deploy old lazy chunks 404: ask the user to reload
 */
export class ChunkErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (error && CHUNK_ERROR.test((error as Error).message)) {
      return (
        <ElementNotFound
          icon={icons.saving}
          title={<Trans i18nKey='error.update_title'>Hi ha una actualització disponible</Trans>}
          desc={
            <Trans i18nKey='error.update_desc'>
              Aquesta pàgina no es pot carregar per una actualització. Torna a carregar la pàgina.
            </Trans>
          }
          action={
            <Button onClick={forceRefresh}>
              <Trans i18nKey='error.reload'>Tornar a carregar</Trans>
            </Button>
          }
        />
      )
    }
    if (error) throw error
    return this.props.children
  }
}
