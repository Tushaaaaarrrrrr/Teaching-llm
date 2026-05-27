'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab {
  href: string
  label: string
  match: (path: string) => boolean
  icon: React.ReactNode
}

const TABS: Tab[] = [
  {
    href: '/dashboard',
    label: 'Home',
    match: p => p === '/dashboard',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/courses',
    label: 'Courses',
    match: p => p === '/courses' || (p.startsWith('/courses/') && !p.startsWith('/courses/explore')),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    href: '/exams',
    label: 'Academics',
    match: p => p.startsWith('/exams') || p.startsWith('/calendar') || p.startsWith('/live') || p.startsWith('/free-resources'),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
      </svg>
    ),
  },
  {
    href: '/support',
    label: 'Support',
    match: p => p.startsWith('/support'),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    match: p => p === '/profile' || p === '/menu' || p.startsWith('/profile'),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

export default function MobileBottomNav() {
  const pathname = usePathname() || ''
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollTop, setLastScrollTop] = useState(0)

  // Reset visibility on page navigation
  useEffect(() => {
    setIsVisible(true)
  }, [pathname])

  // Determine if this route should completely hide the bottom nav
  const isCommunity = pathname.startsWith('/community')
  const isLecture = pathname.includes('/lectures/')
  const isSettingsOrProfile = pathname.startsWith('/settings') || pathname.startsWith('/profile')
  const shouldHideCompletely = isCommunity || isLecture || isSettingsOrProfile

  useEffect(() => {
    if (shouldHideCompletely) return

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement
      if (!target) return

      // Read scroll top from target (e.g. <main>), window, or document element
      const currentScrollTop = 
        (typeof target.scrollTop === 'number' ? target.scrollTop : null) ?? 
        window.pageYOffset ?? 
        document.documentElement.scrollTop ?? 
        document.body.scrollTop ?? 
        0
      
      // If we scroll down even a tiny bit, hide immediately
      if (currentScrollTop < 10) {
        setIsVisible(true)
      } else if (currentScrollTop > lastScrollTop) {
        // Scrolling down
        setIsVisible(false)
      } else {
        // Scrolling up
        setIsVisible(true)
      }
      
      setLastScrollTop(currentScrollTop)
    }

    // Capture scroll events from any element (e.g. <main>)
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [lastScrollTop, shouldHideCompletely])

  if (shouldHideCompletely) {
    return null
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .dashboard-main-container main {
            padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
      `}} />
      <nav 
        className={`mobile-bottom-nav ${isVisible ? 'visible' : 'hidden'}`} 
        aria-label="Primary mobile navigation"
      >
        {TABS.map(tab => {
          const active = tab.match(pathname)
          return (
            <Link key={tab.href} href={tab.href} className={`mobile-bottom-tab ${active ? 'active' : ''}`}>
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
