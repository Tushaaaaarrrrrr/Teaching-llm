'use client'

import { useEffect, useState, useCallback } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || ''
const KEY_PUSH_ENABLED = 'push_enabled'

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
    const permission = Notification.permission
    setPermissionState(permission as any)

    const explicitlyDisabled = localStorage.getItem(KEY_PUSH_ENABLED) === 'false'

    // If notifications are already allowed in browser and not explicitly toggled OFF by user
    if (permission === 'granted' && !explicitlyDisabled) {
      setIsSubscribed(true)
      localStorage.setItem(KEY_PUSH_ENABLED, 'true')
      
      // Silently sync the subscription in the background
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          let sub = await reg.pushManager.getSubscription()
          if (!sub) {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
            })
          }
          const json = sub.toJSON()
          const p256dh = json.keys?.p256dh
          const auth = json.keys?.auth
          if (p256dh && auth) {
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: sub.endpoint, p256dh, auth }),
            })
          }
        } catch (err) {
          console.error('[usePushNotifications] Silent background auto-subscribe failed:', err)
        }
      })
    } else {
      // Otherwise, query active subscription state
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          const sub = await reg.pushManager.getSubscription()
          setIsSubscribed(!!sub && !explicitlyDisabled)
        } catch (err) {
          console.error('[usePushNotifications] Error checking push subscription:', err)
        }
      })
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false

    // Optimistically set states
    if (Notification.permission === 'granted') {
      setIsSubscribed(true)
      localStorage.setItem(KEY_PUSH_ENABLED, 'true')
    }

    try {
      const permission = await Notification.requestPermission()
      setPermissionState(permission as any)

      if (permission !== 'granted') {
        setIsSubscribed(false)
        localStorage.setItem(KEY_PUSH_ENABLED, 'false')
        return false
      }

      setIsSubscribed(true)
      localStorage.setItem(KEY_PUSH_ENABLED, 'true')

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

      return true
    } catch (err) {
      console.error('[usePushNotifications] Failed to subscribe to push notifications:', err)
      if (Notification.permission === 'granted') {
        setIsSubscribed(true)
        localStorage.setItem(KEY_PUSH_ENABLED, 'true')
      } else {
        setIsSubscribed(false)
        localStorage.setItem(KEY_PUSH_ENABLED, 'false')
      }
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
      localStorage.setItem(KEY_PUSH_ENABLED, 'false')
      return true
    } catch (err) {
      console.error('[usePushNotifications] Failed to unsubscribe from push notifications:', err)
      return false
    }
  }, [isSupported])

  return { isSupported, isSubscribed, permissionState, subscribe, unsubscribe }
}
