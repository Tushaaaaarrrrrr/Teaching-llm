'use client'

import { useEffect, useRef } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

/**
 * usePushNotifications
 *
 * Call this hook inside any authenticated layout component.
 * It will:
 *  1. Register the push service worker (/sw-push.js)
 *  2. Ask the user for notification permission (only once, non-intrusively)
 *  3. Save the push subscription token to the server DB
 */
export function usePushNotifications() {
  const asked = useRef(false)

  useEffect(() => {
    if (asked.current) return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!VAPID_PUBLIC_KEY) return

    asked.current = true

    async function setup() {
      try {
        // Register our dedicated push SW
        const reg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' })
        await navigator.serviceWorker.ready

        // Don't ask again if already granted or denied
        if (Notification.permission === 'denied') return

        // Request permission (browser shows native prompt)
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        // Subscribe to push service
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        const json   = subscription.toJSON()
        const p256dh = json.keys?.p256dh
        const auth   = json.keys?.auth

        if (!p256dh || !auth) return

        // Save to backend
        await fetch('/api/push/subscribe', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ endpoint: subscription.endpoint, p256dh, auth }),
        })
      } catch (err) {
        // Silently fail — push notifications are optional
        console.debug('Push setup skipped:', err)
      }
    }

    setup()
  }, [])
}
