'use client'

import { useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

/**
 * Automatically triggers the native browser "Allow Notifications?" prompt
 * when the user logs in. If they dismiss or block, they can still enable
 * from Settings → Notifications → Browser Push Alerts.
 */
export default function PushNotificationSetup() {
  const { isSupported, isSubscribed, permissionState, subscribe } = usePushNotifications()

  useEffect(() => {
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
