'use client'

import { useState, useEffect, useRef } from 'react'
import { useLocalCachedAsset } from '@/hooks/useLocalCachedAsset'

export default function SplashOverlay() {
  const [mounted, setMounted] = useState(false)
  const [show, setShow] = useState(true)
  const [step, setStep] = useState(1) // 1 = Logo & Progress Bar, 2 = Mascot Image & Skip Button (native only)
  const [progress, setProgress] = useState(0)
  const [isNative, setIsNative] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const hasHiddenRef = useRef(false)
  const logoSrc = useLocalCachedAsset('/mobile-login-logo.png')
  const splashSrc = useLocalCachedAsset('/splash-screen.png')

  // Avoid hydration mismatch by waiting until client mount
  useEffect(() => {
    setMounted(true)
    const w = window as any
    setIsNative(!!(w?.Capacitor?.isNativePlatform?.() || w?.Capacitor?.isNative))
  }, [])

  // Safely check image loading completion (including cache hits)
  useEffect(() => {
    if (!mounted) return
    const img = new Image()
    img.src = logoSrc
    if (img.complete) {
      setImageLoaded(true)
    } else {
      img.onload = () => setImageLoaded(true)
      img.onerror = () => setImageLoaded(true) // Proceed if load fails to prevent freeze
    }
  }, [mounted, logoSrc])

  // Failsafe timer: Force loading state to true after 5 seconds to prevent app lockups
  useEffect(() => {
    if (!mounted) return
    const timer = setTimeout(() => {
      console.warn('[SplashOverlay] Failsafe timer reached. Forcing imageLoaded state.')
      setImageLoaded(true)
    }, 5000)

    return () => clearTimeout(timer)
  }, [mounted])

  // Synchronized Handoff: Dismiss native splash screen once React first frame is painted
  useEffect(() => {
    if (!mounted || !imageLoaded) return
    if (!isNative) return

    if (hasHiddenRef.current) return
    hasHiddenRef.current = true

    // Double requestAnimationFrame ensures that the React DOM elements (logo + loader)
    // are fully layouted and painted to the Chromium view buffer before dismissing the native dialog.
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        try {
          const { SplashScreen } = await import('@capacitor/splash-screen')
          await SplashScreen.hide({ fadeOutDuration: 400 })
          console.log('[SplashOverlay] Native splash screen dismissed successfully.')
        } catch (err) {
          console.warn('[SplashOverlay] Failed to dismiss native splash screen:', err)
        }
      })
    })
  }, [mounted, imageLoaded, isNative])

  // Step 1: Loading Progress Bar (800ms for native to fit 1.5s total, 1500ms for web)
  useEffect(() => {
    if (!mounted || step !== 1) return

    const startTime = Date.now()
    const duration = isNative ? 800 : 1500

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const percent = Math.min((elapsed / duration) * 100, 100)
      setProgress(percent)

      if (percent >= 100) {
        clearInterval(interval)
        // On native: show Step 2 (mascot image). On web: close immediately.
        if (isNative) {
          setStep(2)
        } else {
          setShow(false)
        }
      }
    }, 30)

    return () => clearInterval(interval)
  }, [mounted, step, isNative])

  // Step 2: Auto-close after 700ms (to fit 1.5s total on native)
  useEffect(() => {
    if (!mounted || step !== 2) return

    const timer = setTimeout(() => {
      handleClose()
    }, 700)

    return () => clearTimeout(timer)
  }, [mounted, step])

  const handleClose = () => {
    setShow(false)
  }

  if (!mounted || !show) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999, // Render on top of everything
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
      }}
    >
      {step === 1 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '280px',
            animation: 'splashFadeIn 0.3s ease-out',
            textAlign: 'center',
          }}
        >
          {/* GenZ IITIAN Logo */}
          <img
            src={logoSrc}
            alt="GenZ IITIAN"
            onLoad={() => setImageLoaded(true)}
            style={{
              width: '160px',
              height: 'auto',
              marginBottom: '32px',
            }}
          />

          {/* Loading Bar Container */}
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#f1f5f9',
              borderRadius: '999px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Dynamic Loading progress */}
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#dc2626', // Red branding color
                borderRadius: '999px',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
          <span
            style={{
              marginTop: '12px',
              fontSize: '13px',
              color: '#64748b',
              fontWeight: '600',
              letterSpacing: '0.05em',
            }}
          >
            LOADING...
          </span>
        </div>
      )}

      {step === 2 && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            animation: 'splashFadeIn 0.4s ease-out',
          }}
        >
          {/* Skip Button in Top-Right Corner */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 'calc(20px + env(safe-area-inset-top, 0px))', // Safe area aware for mobile screens
              right: '20px',
              zIndex: 10,
              padding: '8px 16px',
              borderRadius: '20px',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'background-color 0.2s',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.85)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.7)')}
          >
            Skip
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Full Screen Responsive Mascot Image */}
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src={splashSrc}
              alt="Welcome Splash"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain', // Keep aspect ratio without stretching, fitting screen height/width
                maxHeight: '100vh',
                maxWidth: '100vw',
              }}
            />
          </div>
        </div>
      )}

      {/* Embedded keyframe styles for smooth load transitions */}
      <style>{`
        @keyframes splashFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
