import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import { Layout } from '~src/pages/Layout'
import { ROUTES } from '~src/router/routes/index'
import { SuspenseLoader } from '~src/router/SuspenseLoader'

const PlanificacioPage = lazy(() => import('~src/pages/planificacio/view').then((m) => ({ default: m.View })))
const RepassosLayout = lazy(() =>
  import('~src/pages/repassos/RepassosLayout').then((m) => ({ default: m.RepassosLayout }))
)
const RepassosTodayPage = lazy(() => import('~src/pages/repassos/today').then((m) => ({ default: m.Today })))
const RepassosCalendarPage = lazy(() => import('~src/pages/repassos/calendar').then((m) => ({ default: m.Calendar })))
const RepassosPaquetPage = lazy(() => import('~src/pages/repassos/paquet').then((m) => ({ default: m.Paquet })))
const TemariPage = lazy(() => import('~src/pages/temari/view').then((m) => ({ default: m.View })))
const TemariPdfPage = lazy(() => import('~src/pages/temari/pdf').then((m) => ({ default: m.Pdf })))
const MapesPage = lazy(() => import('~src/pages/mapes/list').then((m) => ({ default: m.List })))
const MapaEditorPage = lazy(() => import('~src/pages/mapes/editor').then((m) => ({ default: m.Editor })))
const SettingsPage = lazy(() => import('~src/pages/settings/view').then((m) => ({ default: m.View })))
const HelpCalendarPage = lazy(() => import('~src/pages/help/calendar').then((m) => ({ default: m.CalendarHelp })))
const NotFoundPage = lazy(() => import('~src/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

const RootRoutesElements = [
  {
    index: true,
    element: <Navigate to={ROUTES.PLANIFICACIO} replace />,
  },
  {
    path: ROUTES.PLANIFICACIO,
    element: (
      <SuspenseLoader>
        <PlanificacioPage />
      </SuspenseLoader>
    ),
  },
  {
    element: (
      <SuspenseLoader>
        <RepassosLayout />
      </SuspenseLoader>
    ),
    children: [
      {
        path: ROUTES.REPASSOS.TODAY,
        element: (
          <SuspenseLoader>
            <RepassosTodayPage />
          </SuspenseLoader>
        ),
      },
      {
        path: ROUTES.REPASSOS.CALENDAR,
        element: (
          <SuspenseLoader>
            <RepassosCalendarPage />
          </SuspenseLoader>
        ),
      },
      {
        path: ROUTES.REPASSOS.PAQUET,
        element: (
          <SuspenseLoader>
            <RepassosPaquetPage />
          </SuspenseLoader>
        ),
      },
    ],
  },
  {
    path: ROUTES.TEMARI,
    element: (
      <SuspenseLoader>
        <TemariPage />
      </SuspenseLoader>
    ),
  },
  {
    path: ROUTES.TEMARI_PDF,
    element: (
      <SuspenseLoader>
        <TemariPdfPage />
      </SuspenseLoader>
    ),
  },
  {
    path: ROUTES.MAPES.LIST,
    element: (
      <SuspenseLoader>
        <MapesPage />
      </SuspenseLoader>
    ),
  },
  {
    path: ROUTES.MAPES.EDITOR,
    element: (
      <SuspenseLoader>
        <MapaEditorPage />
      </SuspenseLoader>
    ),
  },
  {
    path: ROUTES.SETTINGS,
    element: (
      <SuspenseLoader>
        <SettingsPage />
      </SuspenseLoader>
    ),
  },
  {
    path: ROUTES.HELP.CALENDAR,
    element: (
      <SuspenseLoader>
        <HelpCalendarPage />
      </SuspenseLoader>
    ),
  },
  {
    path: '*',
    element: (
      <SuspenseLoader>
        <NotFoundPage />
      </SuspenseLoader>
    ),
  },
]

export const useRootRoutes = () => ({
  path: ROUTES.HOME,
  element: <Layout />,
  children: RootRoutesElements,
})
