import { mutate } from 'swr'

export function clearSWRCache() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('app-swr-cache')
      // Clear in-memory SWR cache map globally
      mutate(() => true, undefined, { revalidate: false })
    } catch (e) {
      console.error('[clearSWRCache] Failed to clear local cache:', e)
    }
  }
}
