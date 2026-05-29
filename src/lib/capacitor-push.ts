'use client'

/**
 * Capacitor Push Notification helpers.
 * Only runs inside a Capacitor native app (Android/iOS).
 * In the browser, these functions are no-ops.
 */

/** Detect if we're running inside a Capacitor native shell */
export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).Capacitor?.isNativePlatform?.()
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
  if (!isCapacitorNative()) return false

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    // Check / request permission
    let permStatus = await PushNotifications.checkPermissions()

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions()
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission not granted')
      return false
    }

    // Register with FCM
    await PushNotifications.register()

    // Listen for the registration token
    PushNotifications.addListener('registration', async (token) => {
      console.log('FCM Token received:', token.value)

      // Send token to our backend
      try {
        await fetch('/api/fcm/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.value,
            platform: 'ANDROID',
          }),
        })
      } catch (err) {
        console.error('Failed to register FCM token with backend:', err)
      }
    })

    // Handle registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error)
    })

    // Handle notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received in foreground:', notification)
      // The notification is shown automatically by Android when app is in background.
      // In foreground, we can show a custom in-app alert or just let it go to the tray.
    })

    // Handle notification tap (app opened from notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action.notification.data?.url
      if (url && typeof window !== 'undefined') {
        window.location.href = url
      }
    })

    return true
  } catch (err) {
    console.error('Capacitor push registration failed:', err)
    return false
  }
}

/**
 * Unregister FCM token from the backend (e.g. on logout).
 */
export async function unregisterCapacitorPush(): Promise<void> {
  if (!isCapacitorNative()) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    // Note: We can't easily get the current token to delete it from backend
    // The cleanup will happen naturally when FCM reports the token as stale
    await PushNotifications.removeAllListeners()
  } catch (err) {
    console.error('Capacitor push unregistration failed:', err)
  }
}

/**
 * Check FCM push notifications permission state.
 */
export async function checkCapacitorPermission(): Promise<any> {
  if (!isCapacitorNative()) return 'denied'
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const permStatus = await PushNotifications.checkPermissions()
    return permStatus.receive
  } catch (err) {
    console.error('Failed to check Capacitor permission:', err)
    return 'denied'
  }
}

