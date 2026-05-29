'use client'

import { useEffect, useState } from 'react'
import { isCapacitorNative, registerCapacitorPush, checkCapacitorPermission } from '@/lib/capacitor-push'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PushNotificationSetup() {
  const { isSupported, isSubscribed, permissionState, subscribe } = usePushNotifications()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // --- Capacitor Native App ---
    if (isCapacitorNative()) {
      checkCapacitorPermission().then((status) => {
        if (status === 'granted') {
          // Silent refresh/sync FCM token on boot
          registerCapacitorPush().then((success) => {
            if (success) console.log('Capacitor FCM silent sync successful')
          })
        } else {
          // If not granted yet, check if the user has already interacted with the custom modal
          const interacted = localStorage.getItem('push_permission_modal_interacted')
          if (interacted !== 'true') {
            // Short delay for standard app load feel
            const timer = setTimeout(() => {
              setShowModal(true)
            }, 1200)
            return () => clearTimeout(timer)
          }
        }
      })
      return // Don't do browser push
    }

    // --- Browser Web Push ---
    if (!isSupported) return
    if (isSubscribed) return
    if (permissionState === 'denied' || permissionState === 'granted') return

    // Short delay so page feels loaded first, then show native prompt
    const timer = setTimeout(() => {
      subscribe()
    }, 2000)

    return () => clearTimeout(timer)
  }, [isSupported, isSubscribed, permissionState, subscribe])

  const handleEnableNow = async () => {
    setShowModal(false)
    localStorage.setItem('push_permission_modal_interacted', 'true')
    localStorage.setItem('push_enabled', 'true')
    const success = await registerCapacitorPush()
    if (success) {
      console.log('Capacitor FCM push registered successfully after modal accept')
    }
  }

  const handleMaybeLater = () => {
    setShowModal(false)
    localStorage.setItem('push_permission_modal_interacted', 'true')
    localStorage.setItem('push_enabled', 'false')
  }

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
