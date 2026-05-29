'use client'

import { useEffect, useState } from 'react'
import { isCapacitorNative, registerCapacitorPush, checkCapacitorPermission } from '@/lib/capacitor-push'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PushNotificationSetup() {
  const { isSupported, isSubscribed, permissionState, subscribe } = usePushNotifications()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    console.log('[PushNotificationSetup] useEffect triggered')

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('reset_push') === 'true') {
        console.log('[PushNotificationSetup] Found reset_push=true in URL. Clearing localStorage push keys...')
        localStorage.removeItem('push_permission_modal_interacted')
        localStorage.removeItem('push_enabled')
        localStorage.removeItem('last_fcm_token')
      }
    }

    const interacted = localStorage.getItem('push_permission_modal_interacted')
    const lastDeclined = localStorage.getItem('push_permission_last_declined_time')
    const pushEnabled = localStorage.getItem('push_enabled')
    
    let shouldPrompt = false
    if (interacted !== 'true') {
      shouldPrompt = true
    } else if (lastDeclined) {
      const elapsed = Date.now() - Number(lastDeclined)
      const sevenDays = 7 * 24 * 60 * 60 * 1000 // 7 days in ms
      if (elapsed > sevenDays) {
        console.log('[PushNotificationSetup] More than 7 days since last decline. Allowing modal re-prompt.')
        shouldPrompt = true
      }
    }

    console.log('[PushNotificationSetup] Current localStorage keys:', {
      push_permission_modal_interacted: interacted,
      push_permission_last_declined_time: lastDeclined,
      push_enabled: pushEnabled,
      shouldPrompt,
    })

    // --- Capacitor Native App ---
    if (isCapacitorNative()) {
      console.log('[PushNotificationSetup] Running inside Capacitor Native App')
      
      checkCapacitorPermission().then((status) => {
        console.log('[PushNotificationSetup] checkCapacitorPermission status callback:', status)
        
        if (status === 'granted') {
          console.log('[PushNotificationSetup] Permission is already granted. Proceeding to silent registration sync...')
          registerCapacitorPush().then((success) => {
            if (success) {
              console.log('[PushNotificationSetup] Capacitor FCM silent sync successful')
            } else {
              console.warn('[PushNotificationSetup] Capacitor FCM silent sync returned false')
            }
          })
        } else {
          console.log(`[PushNotificationSetup] Permission status is '${status}' (not granted). Check if user should be prompted...`)
          if (shouldPrompt) {
            console.log('[PushNotificationSetup] User qualifies for prompt. Setting timer to display modal (1200ms)...')
            const timer = setTimeout(() => {
              console.log('[PushNotificationSetup] 1200ms timer fired. Setting showModal = true')
              setShowModal(true)
            }, 1200)
            return () => {
              console.log('[PushNotificationSetup] Cleaning up 1200ms modal timer')
              clearTimeout(timer)
            }
          } else {
            console.log('[PushNotificationSetup] Modal will NOT display: user was prompted recently or has notifications enabled.')
          }
        }
      })
      return // Don't do browser push
    }

    // --- Browser Web Push ---
    console.log('[PushNotificationSetup] Running inside Web Browser (non-native)')
    console.log('[PushNotificationSetup] Browser support check:', { isSupported, isSubscribed, permissionState })
    
    if (!isSupported) {
      console.log('[PushNotificationSetup] Web Push is not supported by this browser')
      return
    }
    if (isSubscribed) {
      console.log('[PushNotificationSetup] Web Push is already subscribed')
      return
    }
    if (permissionState === 'denied' || permissionState === 'granted') {
      console.log(`[PushNotificationSetup] Web Push permission is already '${permissionState}'. Skipping prompt.`)
      return
    }

    console.log('[PushNotificationSetup] Web Push eligible. Setting timer to auto-subscribe (2000ms)...')
    const timer = setTimeout(() => {
      console.log('[PushNotificationSetup] 2000ms timer fired. Calling subscribe() for Web Push...')
      subscribe()
    }, 2000)

    return () => {
      console.log('[PushNotificationSetup] Cleaning up 2000ms Web Push timer')
      clearTimeout(timer)
    }
  }, [isSupported, isSubscribed, permissionState, subscribe])

  const handleEnableNow = async () => {
    console.log('[PushNotificationSetup] User clicked "Enable Now"')
    setShowModal(false)
    console.log('[PushNotificationSetup] Setting push_permission_modal_interacted = true')
    localStorage.setItem('push_permission_modal_interacted', 'true')
    
    console.log('[PushNotificationSetup] Calling registerCapacitorPush()...')
    const success = await registerCapacitorPush()
    if (success) {
      console.log('[PushNotificationSetup] registerCapacitorPush returned success')
      localStorage.setItem('push_enabled', 'true')
      localStorage.removeItem('push_permission_last_declined_time')
    } else {
      console.error('[PushNotificationSetup] registerCapacitorPush returned failure (permission denied)')
      localStorage.setItem('push_enabled', 'false')
      localStorage.setItem('push_permission_last_declined_time', Date.now().toString())
      alert("Notification permissions are disabled. To receive class updates, please enable notifications in your Android System Settings (Apps -> Teaching LMS -> Notifications).")
    }
  }

  const handleMaybeLater = () => {
    console.log('[PushNotificationSetup] User clicked "Maybe Later"')
    setShowModal(false)
    console.log('[PushNotificationSetup] Setting push_permission_modal_interacted = true and throttle timer')
    localStorage.setItem('push_permission_modal_interacted', 'true')
    localStorage.setItem('push_enabled', 'false')
    localStorage.setItem('push_permission_last_declined_time', Date.now().toString())
  }

  console.log('[PushNotificationSetup] Rendering render-check. showModal:', showModal)
  if (!showModal) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={handleMaybeLater}
    >
      <style>{`
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.3;
          }
          100% {
            transform: scale(0.95);
            opacity: 0.8;
          }
        }
      `}</style>
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#e8eaf0',
          borderRadius: '28px',
          padding: '28px',
          boxShadow: '10px 10px 24px #c5c7cf, -10px -10px 24px #ffffff, inset 1px 1px 0px rgba(255,255,255,0.7)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'modalSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Pulse Icon */}
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <div
            style={{
              position: 'absolute',
              inset: '-8px',
              borderRadius: '50%',
              background: 'rgba(54, 54, 232, 0.15)',
              animation: 'pulse 2.2s infinite',
            }}
          />
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3636e8, #6366f1)',
              boxShadow: '0 8px 16px rgba(54, 54, 232, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
        </div>

        {/* Modal Texts */}
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e1e3a', marginBottom: '10px', fontFamily: "'Outfit', sans-serif" }}>
          Enable Live Alerts
        </div>
        <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#6b6b8a', marginBottom: '24px', padding: '0 6px' }}>
          Get instant updates for live sessions, subject blueprints, announcements, and study notes so you never miss a class.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px' }}>
          <button
            type="button"
            onClick={handleEnableNow}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: '50px',
              padding: '14px 20px',
              fontFamily: 'inherit',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #3636e8, #6366f1)',
              boxShadow: '4px 4px 10px rgba(54,54,232,0.25), inset 1px 1px 0 rgba(255,255,255,0.2)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '6px 6px 14px rgba(54,54,232,0.3)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'none'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 10px rgba(54,54,232,0.25)'
            }}
          >
            Enable Now
          </button>
          <button
            type="button"
            onClick={handleMaybeLater}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              padding: '10px 20px',
              fontFamily: 'inherit',
              fontSize: '13.5px',
              fontWeight: '600',
              color: '#9999b0',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = '#3636e8'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = '#9999b0'
            }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}
