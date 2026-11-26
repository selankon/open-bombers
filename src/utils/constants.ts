// App slug used to namespace storage keys and custom events
export const APP_SLUG = 'bombers'

// localStorage keys. Every persisted slice of data has its own key (see services/storage.ts)
export const STORAGE_KEYS = {
  STRUCTURE: `${APP_SLUG}_structure`,
  CELLS: `${APP_SLUG}_cells`,
  REPASSOS: `${APP_SLUG}_repassos`,
  ICS: `${APP_SLUG}_ics`,
  PWA_BANNER_DISMISSED: 'pwaBannerDismissed',
  LANGUAGE: `${APP_SLUG}_lang`,
  PALETTE: `${APP_SLUG}_palette`,
} as const

// Current version of the backup file format
export const BACKUP_VERSION = 4

// Prefix of the compressed text code used to move data between devices
export const BACKUP_CODE_PREFIX = 'BMB2:'

export const BACKUP_FILE_NAME = 'bombers_copia_seguretat.json'
export const CSV_FILE_NAME = 'planificacio_optim_bombers.csv'
export const CSV_FLAT_FILE_NAME = 'planificacio_pla.csv'
export const ICS_FILE_NAME = 'repassos_bombers.ics'

// MS interval to check for a new PWA version
export const UPDATE_PWA_INTERVAL = 1000 * 60 * 2 // 2 minutes

// Fired when local data changes from outside React Query (e.g. another tab)
export const DATA_CHANGED_EVENT = `${APP_SLUG}:data-changed`

// Score inputs
export const SCORE = { MIN: 0, MAX: 10 }

// Average thresholds for the apartat level (0-10 scale)
export const APARTAT_LEVEL_THRESHOLDS = { NM: 5, NA: 7.5 }

// Average thresholds for the tema level (NB=1, NM=2, NA=3)
export const TEMA_LEVEL_THRESHOLDS = { NM: 1.67, NA: 2.34 }

// How many latest scores are averaged to get the apartat level
export const LEVEL_LAST_SCORES = 3

// Days shown in the "next days" preview of the today view
export const TODAY_PREVIEW_DAYS = 7

// Official server of the syllabus PDFs (convocatòria ACCÉS 81/26). It sends CORS headers, so the app can fetch them
export const TEMARI_BASE_URL =
  'https://interior.gencat.cat/web/.content/home/030_arees_dactuacio/bombers/acces_al_cos_de_bombers/convocatories/convocatories_de_bombers/ACCES-81_26'

// Cache Storage bucket holding the PDFs saved for offline reading
export const TEMARI_CACHE_NAME = `${APP_SLUG}_temari_v1`

// Pause between files on "download all", so browsers don't drop downloads
export const TEMARI_DOWNLOAD_DELAY = 400

// IndexedDB database for the data too big for localStorage (mind maps, PDF annotations)
export const IDB_NAME = `${APP_SLUG}_db`
export const IDB_VERSION = 2
export const IDB_STORES = { MAPES: 'mapes', ANOTACIONS: 'anotacions' } as const

// BroadcastChannel used to tell other tabs that IndexedDB data changed
export const IDB_CHANNEL = `${APP_SLUG}:idb`

// Mind map editor
export const MAPA = {
  // Debounce of the autosave while editing (ms)
  SAVE_DELAY: 600,
  // Max undo steps kept in memory
  HISTORY_LIMIT: 100,
  // Zoom limits
  ZOOM_MIN: 0.2,
  ZOOM_MAX: 2.5,
  // Zoom step of the +/- buttons and keyboard
  ZOOM_STEP: 1.2,
  // Opening a map never starts below this zoom (small screens center the main idea instead)
  READABLE_ZOOM: 0.6,
  // Spacing of the background dots (world px) and their minimum on screen
  GRID: 24,
  GRID_MIN: 12,
  // Distance between a node and a new child / sibling (world px)
  CHILD_GAP_X: 240,
  SIBLING_GAP_Y: 64,
  // Approximate node box used to avoid overlaps and to fit the view
  NODE_W: 180,
  NODE_H: 48,
  // Padding around the content when fitting the view (screen px)
  FIT_PADDING: 48,
  // Pointer movement (px) before a press becomes a drag
  DRAG_THRESHOLD: 4,
  // Pasted pictures: longest side kept (px) and widest size placed on the map (world px)
  IMAGE_MAX_PX: 1600,
  IMAGE_QUALITY: 0.85,
  IMAGE_WORLD_W: 360,
  // Stroke widths offered for each tool (world px)
  GRUIX: {
    ploma: [2, 4, 7],
    subratllador: [12, 20, 30],
    forma: [2, 4, 7],
  },
  // Eraser reach (screen px)
  ERASER_RADIUS: 10,
  // Export: margin around the content (world px), PNG scale, PDF longest side (px)
  EXPORT_PADDING: 40,
  EXPORT_PNG_SCALE: 2,
  EXPORT_MAX_PX: 8000,
  EXPORT_PDF_PX: 2400,
}

export const MAPA_PNG_EXT = '.png'
export const MAPA_PDF_EXT = '.pdf'

// PDF reader with annotations
export const PDF = {
  // Zoom limits (1 = page fits the width of the screen)
  ZOOM_MIN: 0.5,
  ZOOM_MAX: 4,
  ZOOM_STEP: 1.25,
  // Widest a page gets at zoom 1 (px), and the space around pages
  FIT_MAX_W: 960,
  GUTTER: 16,
  PAGE_GAP: 16,
  // Pages closer than this to the screen (in screen heights) are rendered
  RENDER_MARGIN: 1,
  // Wait after a zoom before re-rendering the pages sharper (ms)
  RERENDER_DELAY: 180,
  // Most pixels of one page canvas (iOS refuses bigger canvases)
  MAX_CANVAS_PX: 16_000_000,
  // Autosave debounce (ms)
  SAVE_DELAY: 600,
  // Wait after the text selection changes before the toolbar follows it (ms)
  SELECTION_DEBOUNCE: 150,
  // Stroke widths for each tool (PDF points)
  GRUIX: {
    ploma: [1.5, 2.5, 4],
    subratllador: [8, 12, 18],
    forma: [1.5, 2.5, 4],
  },
  // Eraser reach (screen px)
  ERASER_RADIUS: 10,
  // Pasted pictures: widest share of the page they take when placed
  IMAGE_PAGE_SHARE: 0.6,
  // Size of a note pin (screen px)
  NOTE_PIN: 28,
}
