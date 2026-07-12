'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isCapacitorNative } from '@/lib/capacitor-push'

export default function PwaInstallBanner() {
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isCapacitorNative()) return // No PWA banner inside Capacitor native apps

    // 1. Check if the user is already running the installed standalone app
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true

    if (isStandalone) {
      console.log('[PWA Banner] Suppressed: User is already using the installed PWA app.')
      return
    }

    // 2. Set listener to grab the native beforeinstallprompt event when browser fires it
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 3. Immediately show the banner when landing on the dashboard, once per session
    const alreadyShown = sessionStorage.getItem('has_shown_install_banner')
    if (pathname === '/dashboard' && !alreadyShown) {
      setIsVisible(true)
      
      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        setIsVisible(false)
        sessionStorage.setItem('has_shown_install_banner', 'true')
      }, 10000)

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        clearTimeout(timer)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [pathname])

  // Immediately close if the user navigates away from the dashboard page
  useEffect(() => {
    if (pathname !== '/dashboard') {
      setIsVisible(false)
    }
  }, [pathname])

  const handleDownload = async () => {
    // If the browser natively fired the event, trigger it
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log(`PWA install prompt outcome: ${outcome}`)
      setDeferredPrompt(null)
      setIsVisible(false)
      sessionStorage.setItem('has_shown_install_banner', 'true')
      return
    }

    // Fallback: Custom browser guides when event is not ready/supported
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent
      const isSafari = ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Edg')
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

      if (isSafari || isIOS) {
        alert(
          'To install: Tap the "Share" button at the top or bottom of Safari, then select "Add to Home Screen" 📥'
        )
      } else {
        alert(
          'To install: Look for the install icon (a computer with a down arrow, or three dots -> Install) in your browser address bar at the top right 📥'
        )
      }
    }

    setIsVisible(false)
    sessionStorage.setItem('has_shown_install_banner', 'true')
  }

  const handleLater = () => {
    setIsVisible(false)
    sessionStorage.setItem('has_shown_install_banner', 'true')
  }

  if (!mounted) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: isVisible ? 'translate(-50%, 0)' : 'translate(-50%, 150px)',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        width: 'min(460px, calc(100vw - 32px))',
        borderRadius: '20px',
        background: 'var(--surface-2)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.18), inset 0 1px 0 var(--neu-glow)',
        border: '1px solid var(--border)',
        padding: '16px 20px',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
      }}
    >
      {/* Left App Icon & Text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
          border: '1.5px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <img src="/logo.png" alt="GENz IITIAN" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '14.5px', fontWeight: '850', color: 'var(--text-primary)', fontFamily: "'Outfit', 'Nunito', sans-serif" }}>
            Study in Full Screen
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3, fontFamily: "'Outfit', 'Nunito', sans-serif" }}>
            Add to your home screen for quick access and app like experience
          </div>
        </div>
      </div>

      {/* Right Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleDownload}
          style={{
            background: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '12.5px',
            fontWeight: '700',
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 4px 10px rgba(54, 54, 232, 0.2)'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>
        <button
          onClick={handleLater}
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            padding: '7px 12px',
            fontSize: '12.5px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          Later
        </button>
      </div>
    </div>
  )
}
