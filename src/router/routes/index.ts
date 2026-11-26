export const ROUTES = {
  HOME: '/',
  PLANIFICACIO: '/planificacio',
  REPASSOS: {
    TODAY: '/repassos',
    CALENDAR: '/repassos/calendari',
  },
  TEMARI: '/temari',
  TEMARI_PDF: '/temari/:id',
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

// Path of one syllabus PDF in the reader
export const temariPdfPath = (id: string) => ROUTES.TEMARI_PDF.replace(':id', encodeURIComponent(id))
