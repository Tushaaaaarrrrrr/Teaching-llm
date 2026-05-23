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

      const [{ App }, { StatusBar, Style }, { SplashScreen }, { Keyboard, KeyboardResize }] = await Promise.all([
        import('@capacitor/app'),
        import('@capacitor/status-bar'),
        import('@capacitor/splash-screen'),
        import('@capacitor/keyboard'),
      ])

      try {
        await StatusBar.setStyle({ style: Style.Light })
        await StatusBar.setBackgroundColor({ color: '#e8eaf0' })
      } catch (e) { console.warn('StatusBar setup failed', e) }

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

      cleanup = () => {
        backHandle.remove()
      }
    })().catch(e => console.warn('CapacitorBridge init failed', e))

    return () => { cleanup?.() }
  }, [router])

  return null
}
