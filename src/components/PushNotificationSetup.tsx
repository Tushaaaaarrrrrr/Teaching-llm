'use client'

import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

const DISMISSED_KEY = 'push-banner-dismissed'

/**
 * PushNotificationSetup
 * 
 * Shows a sleek banner on first login asking user to enable notifications.
 * When they click "Enable", the browser shows the native prompt.
 * If they dismiss it, they can always enable from Settings.
 * 
 * The banner only shows if:
 *  - Browser supports push
 *  - User hasn't already subscribed
 *  - User hasn't already dismissed the banner
 *  - User hasn't already blocked notifications
 */
export default function PushNotificationSetup() {
  const { isSupported, isSubscribed, permissionState, subscribe } = usePushNotifications()
  const [showBanner, setShowBanner] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (!isSupported) return
    if (isSubscribed) return
    if (permissionState === 'denied') return

    // Don't show if user already dismissed this session
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      if (dismissed) return
    } catch {}

    // Small delay so the page feels loaded first
    const timer = setTimeout(() => setShowBanner(true), 3000)
    return () => clearTimeout(timer)
  }, [isSupported, isSubscribed, permissionState])

  // Hide banner after subscription completes
  useEffect(() => {
    if (isSubscribed && showBanner) {
      hideBanner()
    }
  }, [isSubscribed])

  function hideBanner() {
    setAnimating(true)
    setTimeout(() => {
      setShowBanner(false)
      setAnimating(false)
    }, 300)
  }

  function handleDismiss() {
    try { localStorage.setItem(DISMISSED_KEY, 'true') } catch {}
    hideBanner()
  }

  async function handleEnable() {
    const success = await subscribe()
    if (success) {
      hideBanner()
    } else {
      // User blocked it — dismiss banner
      handleDismiss()
    }
  }

  if (!showBanner) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        maxWidth: '380px',
        width: '90vw',
        borderRadius: '18px',
        background: '#e8eaf0',
        boxShadow: '10px 10px 25px #bdbfc7, -10px -10px 25px #ffffff, 0 8px 32px rgba(54,54,232,0.12)',
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(20px)' : 'translateY(0)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        animation: 'slideUp 0.4s ease-out',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #3636e8, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '4px 4px 10px rgba(54,54,232,0.25)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '20px' }}>🔔</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#1e1e3a', lineHeight: '1.3' }}>
            Stay Updated!
          </div>
          <div style={{ fontSize: '12.5px', color: '#6b6b8a', marginTop: '2px', lineHeight: '1.4' }}>
            Get instant alerts for announcements, deadlines & more.
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          onClick={handleDismiss}
          style={{
            padding: '9px 18px', borderRadius: '50px', border: 'none',
            background: '#e8eaf0', cursor: 'pointer',
            fontSize: '12.5px', fontWeight: '600', color: '#9999b0',
            boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
            transition: 'all 0.2s ease', fontFamily: 'inherit',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#6b6b8a' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#9999b0' }}
        >
          Not now
        </button>
        <button
          onClick={handleEnable}
          style={{
            padding: '9px 20px', borderRadius: '50px', border: 'none',
            background: 'linear-gradient(135deg, #3636e8, #6366f1)',
            cursor: 'pointer', fontSize: '12.5px', fontWeight: '700',
            color: '#ffffff', fontFamily: 'inherit',
            boxShadow: '4px 4px 10px rgba(54,54,232,0.3), -2px -2px 6px #ffffff',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          Enable Alerts
        </button>
      </div>
    </div>
  )
}
