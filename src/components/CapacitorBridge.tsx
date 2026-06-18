'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CapacitorBridge() {
  const router = useRouter()
  const lastBackPressRef = useRef(0)
  const [showBlockedModal, setShowBlockedModal] = useState(false)

  useEffect(() => {
    let cleanup: (() => void) | undefined

    ;(async () => {
      const { Capacitor } = await import('@capacitor/core')
      if (!Capacitor.isNativePlatform()) return

      const platform = Capacitor.getPlatform()
      document.documentElement.classList.add('is-native')
      document.documentElement.classList.add(`platform-${platform}`)

      const [{ App }, { StatusBar, Style }, { SplashScreen }, { Keyboard, KeyboardResize, KeyboardStyle }, { PushNotifications }] = await Promise.all([
        import('@capacitor/app'),
        import('@capacitor/status-bar'),
        import('@capacitor/splash-screen'),
        import('@capacitor/keyboard'),
        import('@capacitor/push-notifications'),
      ])

      // Status bar follows the app theme (data-theme is set by ThemeProvider /
      // the anti-FOUC script). Style.Dark = light text (for dark bg), Style.Light
      // = dark text (for light bg).
      const applyStatusBarStyles = async () => {
        try {
          const dark = document.documentElement.getAttribute('data-theme') === 'dark'
          await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
          await StatusBar.setBackgroundColor({ color: dark ? '#161a23' : '#e8eaf0' })
          try { await Keyboard.setStyle({ style: dark ? KeyboardStyle.Dark : KeyboardStyle.Light }) } catch {}
        } catch (e) { console.warn('StatusBar style application failed', e) }
      }

      await applyStatusBarStyles()

      // Re-skin the status bar whenever the user switches theme.
      const onThemeChange = () => { applyStatusBarStyles() }
      window.addEventListener('themechange', onThemeChange)

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

      // 🔑 Token refresh listener — FCM periodically rotates device tokens.
      // If we don't catch this, the old token stays in DB and notifications fail silently.
      const registrationHandle = await PushNotifications.addListener('registration', async (token) => {
        console.log('[CapacitorBridge] FCM token (re)issued:', token.value)
        try {
          const saved = localStorage.getItem('last_fcm_token')
          if (saved === token.value) {
            console.log('[CapacitorBridge] Token unchanged — skipping re-registration')
            return
          }
          await fetch('/api/fcm/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.value, platform: 'ANDROID' }),
          })
          localStorage.setItem('last_fcm_token', token.value)
          console.log('[CapacitorBridge] FCM token refreshed & saved to backend')
        } catch (err) {
          console.error('[CapacitorBridge] Failed to refresh FCM token:', err)
        }
      })

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

      const handleGlobalClick = (e: MouseEvent) => {
        let target = e.target as HTMLElement | null
        while (target && target !== document.body) {
          if (target.tagName === 'A' || target.getAttribute('href')) {
            const href = target.getAttribute('href')
            if (href && href.includes('/lectures/')) {
              e.preventDefault()
              e.stopPropagation()
              setShowBlockedModal(true)
              return
            }
          }
          target = target.parentElement
        }
      }

      window.addEventListener('click', handleGlobalClick, true)

      cleanup = () => {
        window.removeEventListener('themechange', onThemeChange)
        window.removeEventListener('click', handleGlobalClick, true)
        backHandle.remove()
        stateHandle.remove()
        registrationHandle.remove()
        receivedHandle.remove()
        actionHandle.remove()
      }
    })().catch(e => console.warn('CapacitorBridge init failed', e))

    return () => { cleanup?.() }
  }, [router])

  return (
    <>
      {showBlockedModal && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.75)' }} onClick={() => setShowBlockedModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px', borderRadius: '24px', overflow: 'hidden' }}>
            <div className="modal-body" style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'var(--warning-light)', color: 'var(--warning)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '10px', color: 'var(--text-primary)' }}>
                App Player Offline
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
                video player is not working in app Please use laptop
              </p>
              <button
                onClick={() => setShowBlockedModal(false)}
                className="btn btn-primary"
                style={{ width: '100%', borderRadius: '50px', padding: '12px 20px', fontWeight: 700 }}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
