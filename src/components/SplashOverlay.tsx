'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useLocalCachedAsset } from '@/hooks/useLocalCachedAsset'
import { useLoadingFact } from '@/hooks/useLoadingFact'
import LoadingFactCard from '@/components/ui/LoadingFactCard'

export default function SplashOverlay() {
  const [mounted, setMounted] = useState(false)
  const [showLoader, setShowLoader] = useState(true)
  const [promoVisible, setPromoVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isNative, setIsNative] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [promo, setPromo] = useState({
    image: '/splash-screen.png',
    durationMs: 2500,
  })
  const pathname = usePathname()

  const hasHiddenRef = useRef(false)
  const claimedPagesRef = useRef(new Set<string>())
  const logoSrc = useLocalCachedAsset('/mobile-login-logo.png')
  const fact = useLoadingFact(showLoader)

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

  // Keep the same branded loading screen visible for the full splash duration.
  useEffect(() => {
    if (!mounted) return

    const startTime = Date.now()
    const duration = 1500

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const percent = Math.min((elapsed / duration) * 100, 100)
      setProgress(percent)

      if (percent >= 100) {
        clearInterval(interval)
        setShowLoader(false)
      }
    }, 30)

    return () => clearInterval(interval)
  }, [mounted])

  useEffect(() => {
    if (!mounted || showLoader || !pathname || claimedPagesRef.current.has(pathname)) return
    claimedPagesRef.current.add(pathname)
    const controller = new AbortController()
    fetch('/api/promo-splash/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pathname }),
      signal: controller.signal,
    })
      .then(response => response.ok ? response.json() : null)
      .then(result => {
        if (!result?.eligible || !result.image) return
        const durationMs = Math.min(10000, Math.max(1000, Number(result.durationMs) || 2500))
        setPromo({ image: result.image, durationMs })
        setPromoVisible(true)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [mounted, pathname, showLoader])

  useEffect(() => {
    if (!promoVisible) return
    const timer = window.setTimeout(() => setPromoVisible(false), promo.durationMs)
    return () => window.clearTimeout(timer)
  }, [promoVisible, promo.durationMs])

  if (!mounted || (!showLoader && !promoVisible)) return null

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
      {showLoader ? <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '380px',
            padding: '0 16px',
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
              width: '240px',
              maxWidth: '100%',
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

          {fact && (
            <div style={{ marginTop: '24px', width: '100%' }}>
              <LoadingFactCard fact={fact} />
            </div>
          )}
      </div> : (
        <img
          src={promo.image}
          alt="GenZ IITian promotion"
          style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#ffffff' }}
        />
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
