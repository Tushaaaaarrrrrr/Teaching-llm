'use client'

import { useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { isCapacitorNative, registerCapacitorPush } from '@/lib/capacitor-push'

/**
 * Handles push notification setup for BOTH platforms:
 * - Capacitor (Android/iOS) → FCM via @capacitor/push-notifications
 * - Browser → Web Push via VAPID (existing behaviour)
 *
 * Automatically triggers the appropriate registration flow
 * when the user logs in.
 */
export default function PushNotificationSetup() {
  const { isSupported, isSubscribed, permissionState, subscribe } = usePushNotifications()

  useEffect(() => {
    // --- Capacitor Native App ---
    if (isCapacitorNative()) {
      registerCapacitorPush().then((success) => {
        if (success) {
          console.log('Capacitor FCM push registered successfully')
        }
      })
      return // Don't also try browser push
    }

    // --- Browser Web Push (existing logic) ---
    if (!isSupported) return
    if (isSubscribed) return
    if (permissionState === 'denied' || permissionState === 'granted') return

    // Short delay so page feels loaded first, then show native prompt
    const timer = setTimeout(() => {
      subscribe()
    }, 2000)

    return () => clearTimeout(timer)
  }, [isSupported, isSubscribed, permissionState, subscribe])

  return null
}
