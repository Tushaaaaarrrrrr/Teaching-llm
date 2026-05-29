'use client'

/**
 * Capacitor Push Notification helpers.
 * Only runs inside a Capacitor native app (Android/iOS).
 * In the browser, these functions are no-ops.
 */

/** Detect if we're running inside a Capacitor native shell */
export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.()
  console.log(`[CapacitorPush] isCapacitorNative check: ${isNative} (window.Capacitor exists: ${!!(window as any).Capacitor})`)
  return isNative
}

/**
 * Register for FCM push notifications via Capacitor.
 * - Requests permission from the OS
 * - Gets the FCM device token
 * - Sends it to the backend for storage
 *
 * This function dynamically imports @capacitor/push-notifications
 * so it doesn't break in browser builds where the plugin isn't available.
 */
export async function registerCapacitorPush(): Promise<boolean> {
  console.log('[CapacitorPush] Entering registerCapacitorPush()')
  if (!isCapacitorNative()) {
    console.warn('[CapacitorPush] Skipped registerCapacitorPush: Not in native environment')
    return false
  }

  try {
    console.log('[CapacitorPush] Dynamically importing @capacitor/push-notifications...')
    const { PushNotifications } = await import('@capacitor/push-notifications')
    console.log('[CapacitorPush] @capacitor/push-notifications imported successfully')

    // Check permission
    console.log('[CapacitorPush] Calling PushNotifications.checkPermissions()...')
    let permStatus = await PushNotifications.checkPermissions()
    console.log('[CapacitorPush] PushNotifications.checkPermissions() result:', JSON.stringify(permStatus))

    if (permStatus.receive !== 'granted') {
      console.log(`[CapacitorPush] Permission receive status is '${permStatus.receive}' (not granted). Requesting permission...`)
      console.log('[CapacitorPush] Calling PushNotifications.requestPermissions()...')
      permStatus = await PushNotifications.requestPermissions()
      console.log('[CapacitorPush] PushNotifications.requestPermissions() result:', JSON.stringify(permStatus))
    } else {
      console.log('[CapacitorPush] Permission already granted.')
    }

    if (permStatus.receive !== 'granted') {
      console.warn(`[CapacitorPush] Push notification permission not granted after request. Status: ${permStatus.receive}`)
      return false
    }

    // Register with FCM
    console.log('[CapacitorPush] Calling PushNotifications.register()...')
    await PushNotifications.register()
    console.log('[CapacitorPush] PushNotifications.register() completed successfully')

    // Listen for the registration token
    console.log('[CapacitorPush] Registering "registration" listener...')
    PushNotifications.addListener('registration', async (token) => {
      console.log('[CapacitorPush] "registration" listener fired. FCM Token received:', token.value)
      
      // Save token in localStorage for logout cleanup reference
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_fcm_token', token.value)
        console.log('[CapacitorPush] Saved last_fcm_token to localStorage')
      }

      // Send token to our backend
      try {
        console.log('[CapacitorPush] Sending FCM token to backend API: POST /api/fcm/register...')
        const response = await fetch('/api/fcm/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.value,
            platform: 'ANDROID',
          }),
        })
        console.log('[CapacitorPush] POST /api/fcm/register response status:', response.status)
        if (response.ok) {
          console.log('[CapacitorPush] FCM token registered successfully with backend')
        } else {
          console.error('[CapacitorPush] Backend registration failed with status:', response.status)
        }
      } catch (err) {
        console.error('[CapacitorPush] Failed to register FCM token with backend fetch:', err)
      }
    })

    // Handle registration errors
    console.log('[CapacitorPush] Registering "registrationError" listener...')
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[CapacitorPush] "registrationError" listener fired. Error details:', JSON.stringify(error))
    })

    // Handle notification received while app is in foreground
    console.log('[CapacitorPush] Registering "pushNotificationReceived" listener...')
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[CapacitorPush] "pushNotificationReceived" listener fired. Foreground notification:', JSON.stringify(notification))
    })

    // Handle notification tap (app opened from notification)
    console.log('[CapacitorPush] Registering "pushNotificationActionPerformed" listener...')
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[CapacitorPush] "pushNotificationActionPerformed" listener fired. Tap action:', JSON.stringify(action))
      const url = action.notification.data?.url
      if (url && typeof window !== 'undefined') {
        console.log('[CapacitorPush] Redirecting user to deep link url:', url)
        window.location.href = url
      } else {
        console.log('[CapacitorPush] No redirect URL found in action notification data')
      }
    })

    return true
  } catch (err) {
    console.error('[CapacitorPush] registerCapacitorPush failed with catch exception:', err)
    return false
  }
}

/**
 * Unregister FCM token from the backend (e.g. on logout).
 */
export async function unregisterCapacitorPush(): Promise<void> {
  console.log('[CapacitorPush] Entering unregisterCapacitorPush()')
  if (!isCapacitorNative()) {
    console.log('[CapacitorPush] Skipped unregisterCapacitorPush: Not in native environment')
    return
  }

  try {
    const token = localStorage.getItem('last_fcm_token')
    if (token) {
      console.log('[CapacitorPush] Found last_fcm_token in localStorage. Deleting from backend DB...')
      const response = await fetch('/api/fcm/register', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      console.log('[CapacitorPush] DELETE /api/fcm/register response status:', response.status)
      localStorage.removeItem('last_fcm_token')
    } else {
      console.log('[CapacitorPush] No last_fcm_token found in localStorage to delete.')
    }

    console.log('[CapacitorPush] Removing all Capacitor Push Notification listeners...')
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.removeAllListeners()
    console.log('[CapacitorPush] unregisterCapacitorPush completed successfully')
  } catch (err) {
    console.error('[CapacitorPush] Capacitor push unregistration failed:', err)
  }
}

/**
 * Check FCM push notifications permission state.
 */
export async function checkCapacitorPermission(): Promise<any> {
  console.log('[CapacitorPush] Entering checkCapacitorPermission()')
  if (!isCapacitorNative()) {
    console.log('[CapacitorPush] checkCapacitorPermission: Not native. Returning "denied".')
    return 'denied'
  }
  try {
    console.log('[CapacitorPush] Dynamically importing @capacitor/push-notifications for permission check...')
    const { PushNotifications } = await import('@capacitor/push-notifications')
    console.log('[CapacitorPush] Calling PushNotifications.checkPermissions() inside checkCapacitorPermission...')
    const permStatus = await PushNotifications.checkPermissions()
    console.log('[CapacitorPush] checkCapacitorPermission result:', JSON.stringify(permStatus))
    return permStatus.receive
  } catch (err) {
    console.error('[CapacitorPush] Failed to check Capacitor permission inside checkCapacitorPermission:', err)
    return 'denied'
  }
}

