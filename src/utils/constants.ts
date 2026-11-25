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
export const BACKUP_VERSION = 2

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
