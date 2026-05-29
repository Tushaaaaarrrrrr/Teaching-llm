'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function CapacitorBridge() {
  const router = useRouter()
  const lastBackPressRef = useRef(0)

  useEffect(() => {
    let cleanup: (() => void) | undefined

    ;(async () => {
      const { Capacitor } = await import('@capacitor/core')
      if (!Capacitor.isNativePlatform()) return

      const [{ App }, { StatusBar, Style }, { SplashScreen }, { Keyboard, KeyboardResize }, { PushNotifications }] = await Promise.all([
        import('@capacitor/app'),
        import('@capacitor/status-bar'),
        import('@capacitor/splash-screen'),
        import('@capacitor/keyboard'),
        import('@capacitor/push-notifications'),
      ])

      const applyStatusBarStyles = async () => {
        try {
          await StatusBar.setStyle({ style: Style.Default })
          await StatusBar.setBackgroundColor({ color: '#e8eaf0' })
        } catch (e) { console.warn('StatusBar style application failed', e) }
      }

      await applyStatusBarStyles()

      try {
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body })
      } catch (e) { console.warn('Keyboard setup failed', e) }

      try {
        await SplashScreen.hide({ fadeOutDuration: 400 })
      } catch (e) { console.warn('SplashScreen.hide failed', e) }

      const backHandle = await App.addListener('backButton', () => {
        if (window.history.length > 1) {
          router.back()
          return
        }
        const now = Date.now()
        if (now - lastBackPressRef.current < 2000) {
          App.exitApp()
        } else {
          lastBackPressRef.current = now
        }
      })

      const stateHandle = await App.addListener('appStateChange', async (state) => {
        if (state.isActive) {
          await applyStatusBarStyles()
        }
      })

      // Early global push listeners to capture cold boots & foreground alerts
      console.log('[CapacitorBridge] Registering persistent PushNotification listeners...')
      const receivedHandle = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[CapacitorBridge] "pushNotificationReceived" listener fired in foreground:', JSON.stringify(notification))
      })

      const actionHandle = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[CapacitorBridge] "pushNotificationActionPerformed" listener fired. Action:', JSON.stringify(action))
        let url = action.notification.data?.url
        
        // Handle custom Android CTA button action click
        if (action.actionId === 'open_cta' && action.notification.data?.ctaLink) {
          url = action.notification.data.ctaLink
          console.log('[CapacitorBridge] Custom CTA button clicked. Overriding redirect URL to ctaLink:', url)
        }

        if (url && typeof window !== 'undefined') {
          const baseUrl = 'https://teaching-llm.onrender.com'
          if (url.startsWith(baseUrl)) {
            url = url.substring(baseUrl.length)
          }
          console.log('[CapacitorBridge] Redirecting user to deep link url:', url)
          window.location.href = url
        } else {
          console.log('[CapacitorBridge] No valid redirect URL found in action notification data')
        }
      })

      cleanup = () => {
        backHandle.remove()
        stateHandle.remove()
        receivedHandle.remove()
        actionHandle.remove()
      }
    })().catch(e => console.warn('CapacitorBridge init failed', e))

    return () => { cleanup?.() }
  }, [router])

  return null
}
