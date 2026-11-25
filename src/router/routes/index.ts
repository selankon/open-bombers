export const ROUTES = {
  HOME: '/',
  PLANIFICACIO: '/planificacio',
  REPASSOS: {
    TODAY: '/repassos',
    CALENDAR: '/repassos/calendari',
  },
  TEMARI: '/temari',
  MAPES: {
    LIST: '/mapes',
    EDITOR: '/mapes/:id',
  },
  SETTINGS: '/ajustos',
  HELP: {
    CALENDAR: '/ajuda/calendari',
  },
} as const

// Path of one mind map in the editor
export const mapaPath = (id: string) => ROUTES.MAPES.EDITOR.replace(':id', encodeURIComponent(id))
