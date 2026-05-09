'use client'

import { useEffect, useState, useCallback } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState<'default' | 'granted' | 'denied'>('default')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
    if (!VAPID_PUBLIC_KEY) return

    setIsSupported(true)
    setPermissionState(Notification.permission as any)

    // Check if user already has an active subscription
    navigator.serviceWorker.ready.then(async (reg) => {
      try {
        const sub = await reg.pushManager.getSubscription()
        setIsSubscribed(!!sub)
      } catch (err) {
        console.error('Error checking push subscription:', err)
      }
    })
  }, [])

  const subscribe = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false

    try {
      // This MUST be called directly from a user click handler
      const permission = await Notification.requestPermission()
      setPermissionState(permission as any)

      if (permission !== 'granted') {
        return false
      }

      // Use the already-registered PWA service worker (from next-pwa)
      const reg = await navigator.serviceWorker.ready

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
      })

      const json = subscription.toJSON()
      const p256dh = json.keys?.p256dh
      const auth = json.keys?.auth

      if (!p256dh || !auth) return false

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint, p256dh, auth }),
      })

      setIsSubscribed(true)
      return true
    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err)
      return false
    }
  }, [isSupported])

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false

    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      }
      setIsSubscribed(false)
      return true
    } catch (err) {
      console.error('Failed to unsubscribe from push notifications:', err)
      return false
    }
  }, [isSupported])

  return { isSupported, isSubscribed, permissionState, subscribe, unsubscribe }
}
