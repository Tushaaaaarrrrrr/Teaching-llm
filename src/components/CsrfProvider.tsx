'use client'

import { useEffect } from 'react'

/**
 * Global fetch interceptor that automatically adds the X-Requested-With header
 * to all same-origin write requests (POST, PUT, PATCH, DELETE).
 * This satisfies the CSRF protection in middleware without modifying every fetch call.
 */
export default function CsrfProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const originalFetch = window.fetch

    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const method = (init?.method || 'GET').toUpperCase()
      const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

      if (writeMethods.includes(method)) {
        const headers = new Headers(init?.headers || {})
        // Only add to same-origin requests (not to external APIs like Google)
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
        const isSameOrigin = url.startsWith('/') || url.startsWith(window.location.origin)

        if (isSameOrigin && !headers.has('X-Requested-With')) {
          headers.set('X-Requested-With', 'XMLHttpRequest')
        }

        return originalFetch.call(this, input, { ...init, headers })
      }

      return originalFetch.call(this, input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return <>{children}</>
}
