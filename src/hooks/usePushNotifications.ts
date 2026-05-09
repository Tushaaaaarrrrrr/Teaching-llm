'use client'

import { useEffect, useState } from 'react'

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

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription().then((hasSub) => {
        // Automatically ask for permission if not already answered
        if (!hasSub && Notification.permission === 'default') {
          // Timeout to avoid blocking immediate render
          setTimeout(() => subscribe(), 2000)
        }
      })
    }
  }, [])

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' })
      await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
      return !!subscription
    } catch (err) {
      console.error('Error checking push subscription:', err)
      return false
    }
  }

  async function subscribe() {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false

    try {
      // Must be called immediately on click for Safari to recognize the user gesture
      const permission = await Notification.requestPermission()
      
      if (permission !== 'granted') {
        console.warn('Push permission denied.')
        return false
      }

      // Ensure SW is registered before subscribing
      const reg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' })
      await navigator.serviceWorker.ready

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
  }

  async function unsubscribe() {
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
  }

  return { isSupported, isSubscribed, subscribe, unsubscribe }
}
