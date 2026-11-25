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
export const BACKUP_VERSION = 3

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

// IndexedDB database for the data too big for localStorage (mind maps)
export const IDB_NAME = `${APP_SLUG}_db`
export const IDB_VERSION = 1
export const IDB_STORES = { MAPES: 'mapes' } as const

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
}
