import { DATA_CHANGED_EVENT } from '~utils/constants'

/**
 * Low level persistence. Everything is kept in localStorage as JSON, one key per "slice".
 *
 * Each slice is registered with its storage key and its default value. The backup module
 * serializes every registered slice, so future features only have to register their slice
 * here to be included in the export/import automatically.
 */
export interface StorageSlice<T> {
  // Name of the slice inside the backup file
  name: string
  // localStorage key
  key: string
  // Value when nothing is stored yet
  defaults: () => T
  // Optional migration applied to stored/imported values
  migrate?: (raw: any) => T
}

const slices = new Map<string, StorageSlice<any>>()

// In-memory copy of every slice, so unchanged parts keep their object identity between writes
const cache = new Map<string, any>()

export const registerSlice = <T>(slice: StorageSlice<T>): StorageSlice<T> => {
  slices.set(slice.name, slice)
  return slice
}

export const getSlices = () => Array.from(slices.values())

export class StorageError extends Error {
  constructor(message?: string) {
    super(message ? message : 'storage error')
    this.name = 'StorageError'
  }
}

export const readSlice = <T>(slice: StorageSlice<T>): T => {
  if (cache.has(slice.key)) return cache.get(slice.key)
  const value = readFromStorage(slice)
  cache.set(slice.key, value)
  return value
}

const readFromStorage = <T>(slice: StorageSlice<T>): T => {
  try {
    const raw = localStorage.getItem(slice.key)
    if (raw === null) return slice.defaults()
    const parsed = JSON.parse(raw)
    return slice.migrate ? slice.migrate(parsed) : parsed
  } catch (e) {
    console.error(`Error reading ${slice.key}`, e)
    return slice.defaults()
  }
}

export const writeSlice = <T>(slice: StorageSlice<T>, value: T) => {
  try {
    localStorage.setItem(slice.key, JSON.stringify(value))
    cache.set(slice.key, value)
  } catch (e) {
    throw new StorageError((e as Error)?.message)
  }
}

export const removeSlice = (slice: StorageSlice<any>) => {
  localStorage.removeItem(slice.key)
  cache.delete(slice.key)
}

/**
 * Asks the browser to keep our data even under storage pressure
 */
export const requestPersistentStorage = () => {
  if (navigator.storage?.persist) {
    navigator.storage.persist().catch(() => undefined)
  }
}

// Notify the app when another tab changes our data
window.addEventListener('storage', (e) => {
  if (e.key === null || Array.from(slices.values()).some((s) => s.key === e.key)) {
    if (e.key) cache.delete(e.key)
    else cache.clear()
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT))
  }
})
