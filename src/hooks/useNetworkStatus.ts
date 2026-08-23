'use client'

import { useState, useEffect, useCallback } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  isChecking: boolean
  checkRealConnectivity: () => Promise<boolean>
  retryOrRefresh: (targetUrl?: string) => Promise<boolean>
}

/**
 * Pings the server to verify actual internet and backend reachability,
 * instead of relying solely on `navigator.onLine` (which only checks local network interface).
 */
export async function checkRealConnectivity(timeoutMs = 4000): Promise<boolean> {
  if (typeof window === 'undefined') return true
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // Ping a lightweight public endpoint with a cache-buster
    const url = `/api/maintenance-status?_ping=${Date.now()}`
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    })
    clearTimeout(timeoutId)
    return response.ok
  } catch {
    clearTimeout(timeoutId)
    return false
  }
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine
    }
    return true
  })
  const [isChecking, setIsChecking] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = async () => {
      // Browser reports online event -> double check with real ping
      setIsChecking(true)
      const realOnline = await checkRealConnectivity()
      setIsChecking(false)
      setIsOnline(realOnline)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const retryOrRefresh = useCallback(async (targetUrl?: string): Promise<boolean> => {
    setIsChecking(true)
    const reachable = await checkRealConnectivity()
    setIsChecking(false)
    setIsOnline(reachable)

    if (reachable) {
      if (targetUrl) {
        window.location.href = targetUrl
      } else {
        window.location.reload()
      }
      return true
    }

    return false
  }, [])

  return {
    isOnline,
    isChecking,
    checkRealConnectivity,
    retryOrRefresh,
  }
}
