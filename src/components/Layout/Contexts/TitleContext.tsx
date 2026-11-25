import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { matchPath, useLocation } from 'react-router-dom'
import { ROUTES } from '~src/router/routes'

type TitleContextType = {
  setCustomTitle: (title: string | null) => void
}

const TitleContext = createContext<TitleContextType | undefined>(undefined)

export const useTitle = () => {
  const context = useContext(TitleContext)
  if (!context) {
    throw new Error('useTitle must be used within a TitleProvider')
  }
  return context
}

/**
 * Sets a custom document title while the calling component is mounted
 */
export const useCustomPageTitle = (title?: string | null) => {
  const { setCustomTitle } = useTitle()
  // Set and clear the custom title
  useEffect(() => {
    setCustomTitle(title || null)
    return () => setCustomTitle(null)
  }, [title, setCustomTitle])
}

export const TitleProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation()
  const location = useLocation()
  const [customTitle, setCustomTitle] = useState<string | null>(null)

  // Update document.title from the current route
  useEffect(() => {
    const titles: [string, string][] = [
      [ROUTES.PLANIFICACIO, t('pages.planificacio', { defaultValue: 'Planificació' })],
      [ROUTES.REPASSOS.TODAY, t('pages.repassos', { defaultValue: 'Repassos' })],
      [ROUTES.REPASSOS.CALENDAR, t('pages.calendari', { defaultValue: 'Calendari de repassos' })],
      [ROUTES.SETTINGS, t('pages.settings', { defaultValue: 'Ajustos' })],
      [ROUTES.HELP.CALENDAR, t('pages.help_calendar', { defaultValue: 'Com afegir-ho al meu calendari' })],
    ]
    const match = titles.find(([path]) => matchPath(path, location.pathname))
    const page = customTitle || match?.[1]
    document.title = page ? `${page} · ${import.meta.env.title}` : import.meta.env.title
  }, [location.pathname, customTitle, t])

  return <TitleContext.Provider value={{ setCustomTitle }}>{children}</TitleContext.Provider>
}
