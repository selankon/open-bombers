import { DATA_CHANGED_EVENT, IDB_CHANNEL, IDB_NAME, IDB_STORES, IDB_VERSION } from '~utils/constants'

/**
 * Minimal IndexedDB wrapper for data too big for localStorage (mind maps with ink).
 * Every store is keyed by the `id` property of its records.
 */

export type StoreName = (typeof IDB_STORES)[keyof typeof IDB_STORES]

export class DbError extends Error {
  constructor(message?: string) {
    super(message ? message : 'database error')
    this.name = 'DbError'
  }
}

let dbPromise: Promise<IDBDatabase> | null = null

const openDb = () => {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new DbError('indexedDB not supported'))
      return
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of Object.values(IDB_STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => {
      const db = req.result
      // Another tab upgraded the database: close so it can proceed, reopen on next use
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    req.onerror = () => reject(new DbError(req.error?.message))
  })
  dbPromise.catch(() => (dbPromise = null))
  return dbPromise
}

const run = async <T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> => {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode)
    let result: T
    const req = fn(tx.objectStore(store))
    if (req) req.onsuccess = () => (result = req.result)
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(new DbError(tx.error?.message))
    tx.onabort = () => reject(new DbError(tx.error?.message || 'aborted'))
  })
}

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(IDB_CHANNEL) : null

// Another tab wrote to the database: reload the data like with localStorage changes
if (channel) channel.onmessage = () => window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT))

const notify = () => channel?.postMessage('changed')

export const db = {
  getAll: <T>(store: StoreName) => run<T[]>(store, 'readonly', (s) => s.getAll()),
  get: async <T>(store: StoreName, id: string) =>
    (await run<T | undefined>(store, 'readonly', (s) => s.get(id))) ?? null,
  put: async <T>(store: StoreName, value: T) => {
    await run(store, 'readwrite', (s) => s.put(value))
    notify()
    return value
  },
  delete: async (store: StoreName, id: string) => {
    await run(store, 'readwrite', (s) => s.delete(id))
    notify()
  },
  // Replaces every record of a store in one transaction
  replaceAll: async <T>(store: StoreName, values: T[]) => {
    await run(store, 'readwrite', (s) => {
      s.clear()
      values.forEach((v) => s.put(v))
    })
    notify()
  },
  clear: async (store: StoreName) => {
    await run(store, 'readwrite', (s) => s.clear())
    notify()
  },
}
