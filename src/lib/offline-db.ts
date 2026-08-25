/**
 * GenZ IITIAN Offline Storage Manager (IndexedDB)
 *
 * Manages user-scoped downloaded PDFs (Blobs) and lightweight student dashboard
 * cache snapshots. All queries are strictly scoped to `userId` to prevent
 * cross-account leaks on shared browsers.
 */

const DB_NAME = 'genz_offline_db'
const DB_VERSION = 1
const STORE_NOTES = 'notes'
const STORE_DASHBOARD = 'dashboard_cache'

export interface OfflineNoteRecord {
  id: string // `${userId}_${contentId}`
  userId: string
  contentId: string
  contentType: 'LECTURE_NOTE' | 'STUDY_MATERIAL'
  courseId?: string | null
  courseName?: string | null
  title: string
  fileBlob: Blob
  fileSize: number
  downloadedAt: string
  version?: string
}

export interface DashboardCacheRecord {
  userId: string
  data: any
  cachedAt: string
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

/**
 * Opens or upgrades the IndexedDB instance.
 */
function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      return reject(new Error('IndexedDB is only available in the browser.'))
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // 1. Notes Store (Offline PDF Blobs + Metadata)
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        const notesStore = db.createObjectStore(STORE_NOTES, { keyPath: 'id' })
        notesStore.createIndex('userId', 'userId', { unique: false })
        notesStore.createIndex('courseId', 'courseId', { unique: false })
        notesStore.createIndex('downloadedAt', 'downloadedAt', { unique: false })
      }

      // 2. Dashboard Cache Store (Student Snapshot)
      if (!db.objectStoreNames.contains(STORE_DASHBOARD)) {
        db.createObjectStore(STORE_DASHBOARD, { keyPath: 'userId' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Saves or updates a downloaded note with its binary PDF Blob.
 */
export async function saveDownloadedNote(note: OfflineNoteRecord): Promise<void> {
  const db = await openOfflineDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NOTES], 'readwrite')
    const store = tx.objectStore(STORE_NOTES)
    const request = store.put(note)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Retrieves all downloaded notes for a specific user, sorted newest first.
 */
export async function getDownloadedNotes(userId: string): Promise<OfflineNoteRecord[]> {
  if (!userId) return []
  const db = await openOfflineDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NOTES], 'readonly')
    const store = tx.objectStore(STORE_NOTES)
    const index = store.index('userId')
    const request = index.getAll(userId)

    request.onsuccess = () => {
      const results: OfflineNoteRecord[] = request.result || []
      // Sort newest first
      results.sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime())
      resolve(results)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Checks if a specific content note is downloaded for the user.
 */
export async function getDownloadedNote(userId: string, contentId: string): Promise<OfflineNoteRecord | null> {
  if (!userId || !contentId) return null
  const db = await openOfflineDb()
  const key = `${userId}_${contentId}`
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NOTES], 'readonly')
    const store = tx.objectStore(STORE_NOTES)
    const request = store.get(key)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Deletes a single downloaded note for a user.
 */
export async function deleteDownloadedNote(userId: string, contentId: string): Promise<void> {
  if (!userId || !contentId) return
  const db = await openOfflineDb()
  const key = `${userId}_${contentId}`
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NOTES], 'readwrite')
    const store = tx.objectStore(STORE_NOTES)
    const request = store.delete(key)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Deletes all downloaded notes for a user (used on clear data or account purge).
 */
export async function deleteAllDownloadedNotes(userId: string): Promise<void> {
  if (!userId) return
  const notes = await getDownloadedNotes(userId)
  if (notes.length === 0) return

  const db = await openOfflineDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NOTES], 'readwrite')
    const store = tx.objectStore(STORE_NOTES)

    for (const note of notes) {
      store.delete(note.id)
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Returns total storage bytes used by downloaded notes for a user.
 */
export async function getTotalDownloadSize(userId: string): Promise<number> {
  const notes = await getDownloadedNotes(userId)
  return notes.reduce((sum, n) => sum + (n.fileSize || 0), 0)
}

/**
 * Saves a lightweight student dashboard snapshot for offline display.
 */
export async function saveDashboardSnapshot(userId: string, data: any): Promise<void> {
  if (!userId || !data) return
  const db = await openOfflineDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_DASHBOARD], 'readwrite')
    const store = tx.objectStore(STORE_DASHBOARD)
    const record: DashboardCacheRecord = {
      userId,
      data,
      cachedAt: new Date().toISOString(),
    }
    const request = store.put(record)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Retrieves the cached dashboard snapshot for a user.
 */
export async function getDashboardSnapshot(userId: string): Promise<DashboardCacheRecord | null> {
  if (!userId) return null
  const db = await openOfflineDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_DASHBOARD], 'readonly')
    const store = tx.objectStore(STORE_DASHBOARD)
    const request = store.get(userId)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Requests persistent storage from the browser to prevent eviction under disk pressure.
 */
export async function requestStoragePersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist()
      return isPersisted
    } catch {
      return false
    }
  }
  return false
}
