import { IconType } from 'react-icons'
import { ROUTES } from '~src/router/routes'
import { icons } from '~theme/icons'

export interface NavItem {
  path: string
  // paths that also mark the item as selected
  match: string[]
  icon: IconType
  labelKey: string
  defaultLabel: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    path: ROUTES.PLANIFICACIO,
    match: [ROUTES.PLANIFICACIO],
    icon: icons.planificacio,
    labelKey: 'nav.planificacio',
    defaultLabel: 'Planificació',
  },
  {
    path: ROUTES.REPASSOS.TODAY,
    match: [ROUTES.REPASSOS.TODAY, ROUTES.REPASSOS.CALENDAR],
    icon: icons.repassos,
    labelKey: 'nav.repassos',
    defaultLabel: 'Repassos',
  },
  {
    path: ROUTES.TEMARI,
    match: [ROUTES.TEMARI],
    icon: icons.temari,
    labelKey: 'nav.temari',
    defaultLabel: 'Temari',
  },
  {
    path: ROUTES.MAPES.LIST,
    match: [ROUTES.MAPES.LIST, ROUTES.MAPES.EDITOR],
    icon: icons.mapes,
    labelKey: 'nav.mapes',
    defaultLabel: 'Mapes',
  },
  {
    path: ROUTES.SETTINGS,
    match: [ROUTES.SETTINGS, ROUTES.HELP.CALENDAR],
    icon: icons.settings,
    labelKey: 'nav.settings',
    defaultLabel: 'Ajustos',
  },
]
