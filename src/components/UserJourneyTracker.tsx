'use client'

import { useEffect } from 'react'

export default function UserJourneyTracker({ enableDetailedLogs = false }: { enableDetailedLogs?: boolean }) {
  useEffect(() => {
    // If stealth tracking is off, do not track any clicks to save DB load
    if (!enableDetailedLogs) return

    const handleClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null
      
      // Bubble up to find a meaningful clickable element (link or button)
      while (target && target !== document.body) {
        const tagName = target.tagName.toLowerCase()
        const isClickable = tagName === 'a' || tagName === 'button' || target.getAttribute('role') === 'button' || target.getAttribute('role') === 'link'
        
        if (isClickable) {
          let description = target.innerText?.trim() || target.getAttribute('aria-label') || target.getAttribute('title') || target.id || tagName
          
          if (tagName === 'a') {
            const href = target.getAttribute('href')
            if (href) description = `${description} (Navigated to ${href})`
          }

          if (description && description.length > 0) {
            description = description.substring(0, 150) // truncate to avoid massive logs

            // Send to backend non-blocking
            fetch('/api/track-action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'Clicked: ' + description.replace(/\s+/g, ' ') })
            }).catch(() => {}) // Ignore errors to keep it lightweight

            break // We only want to track the most specific clickable parent
          }
        }
        target = target.parentElement
      }
    }

    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [enableDetailedLogs])

  return null
}
