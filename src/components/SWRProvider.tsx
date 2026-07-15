'use client'

import React, { useEffect, useState } from 'react'
import { SWRConfig } from 'swr'

function shouldCache(key: string): boolean {
  if (typeof key !== 'string') return false
  return key.startsWith('/api/') || key.includes('/api/')
}

export default function SWRProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<any>(null)

  useEffect(() => {
    let initialData = []
    try {
      const stored = localStorage.getItem('app-swr-cache')
      if (stored) {
        initialData = JSON.parse(stored)
      }
    } catch (e) {
      console.error('[SWRProvider] Failed to load initial cache:', e)
    }

    const map = new Map<string, any>(initialData)

    let timeoutId: any = null
    const saveCache = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        try {
          const persistentItems = Array.from(map.entries()).filter(([key]) => shouldCache(key))
          localStorage.setItem('app-swr-cache', JSON.stringify(persistentItems))
        } catch (e) {
          console.error('[SWRProvider] Failed to save cache:', e)
        }
      }, 300)
    }

    const customCache = {
      get: (key: string) => map.get(key),
      set: (key: string, value: any) => {
        map.set(key, value)
        if (shouldCache(key)) {
          saveCache()
        }
      },
      delete: (key: string) => {
        const result = map.delete(key)
        if (shouldCache(key)) {
          saveCache()
        }
        return result
      },
      keys: () => map.keys(),
      clear: () => {
        map.clear()
        saveCache()
      },
    }

    setProvider(() => () => customCache)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  if (!provider) {
    return <>{children}</>
  }

  return (
    <SWRConfig value={{ provider }}>
      {children}
    </SWRConfig>
  )
}
