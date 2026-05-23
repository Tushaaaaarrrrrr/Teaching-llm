'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
  desktopOnly?: boolean
}

interface SidebarProps {
  userRole: string
  userName: string
  userEmail: string
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/courses',
    label: 'Courses',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
  {
    href: '/courses/explore',
    label: 'Store',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    ),
  },
  {
    href: '/live',
    label: 'Live Sessions',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
    ),
  },
  {
    href: '/calendar',
    label: 'Calendar',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/materials',
    label: 'Study Materials',
    roles: ['MANAGER'],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: '/free-resources',
    label: 'Free Resources',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    ),
  },
  {
    href: '/community',
    label: 'Community',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/activity-logs',
    label: 'Activity Log',
    roles: ['MANAGER', 'SUPER_ADMIN'],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        <path d="M9 14l2 2 4-4"/>
      </svg>
    ),
  },
  {
    href: '/data-analysis',
    label: 'Data Analysis',
    roles: ['MANAGER'],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
        <path d="M22 12A10 10 0 0 0 12 2v10z"/>
      </svg>
    ),
  },
  {
    href: '/exams',
    label: 'Exams',
    desktopOnly: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      </svg>
    ),
  },
  {
    href: '/support',
    label: 'Support',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: '/study/content-bank',
    label: 'Content Bank',
    roles: ['MANAGER', 'ADMIN'],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
  {
    href: '/announcements',
    label: 'Announcements',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  {
    href: '/reports',
    label: 'Analytics & Performance',
    roles: ['MANAGER', 'STUDENT'],
    desktopOnly: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  
  {
    href: '/feedback',
    label: 'Course Feedback',
    roles: ['STUDENT', 'MANAGER'],
    desktopOnly: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        <circle cx="12" cy="12" r="10"/>
      </svg>
    ),
  },
  {
    href: '/manage',
    label: 'Manage',
    roles: ['MANAGER'],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  {
    href: '/transactions',
    label: 'Transactions',
    roles: ['MANAGER', 'SUPER_ADMIN'],
    desktopOnly: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" ry="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/my-transactions',
    label: 'Transactions',
    roles: ['STUDENT'],
    desktopOnly: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    href: '/manage/updates',
    label: 'Updates',
    roles: ['MANAGER'],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
    ),
  },
  {
    href: '/manage/prompts',
    label: 'User Prompts',
    roles: ['MANAGER', 'SUPER_ADMIN'],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
      </svg>
    ),
  },
  {
    href: '/manage/coupons',
    label: 'Coupons',
    roles: ['MANAGER'],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4"/>
        <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/>
        <path d="M18 12a2 2 0 000 4h4v-4z"/>
      </svg>
    ),
  },
  {
    href: '/admin',
    label: 'User Admin',
    roles: ['MANAGER', 'SUPER_ADMIN'],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/google-sync',
    label: 'Google Sync',
    roles: ['MANAGER'],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
    ),
  },
  {
    href: '/company/about-us',
    label: 'About Us',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
  },
]

export default function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const navRef = useRef<HTMLDivElement>(null)
  const [canScrollMore, setCanScrollMore] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Listen for custom toggle events from the mobile header
  useEffect(() => {
    const handleToggle = () => setIsOpen(v => !v)
    const handleClose = () => setIsOpen(false)

    window.addEventListener('toggle-sidebar', handleToggle)
    window.addEventListener('close-sidebar', handleClose)

    return () => {
      window.removeEventListener('toggle-sidebar', handleToggle)
      window.removeEventListener('close-sidebar', handleClose)
    }
  }, [])

  // Auto-close sidebar on screen transition (navigation click)
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const { data: userData } = useSWR('/api/auth/me', (url) => fetch(url).then(r => r.json()), {
    revalidateOnFocus: true
  })

  // Use SWR data if available, otherwise fall back to props
  const currentUserName = userData?.user?.name || userName
  const currentUserRole = userData?.user?.role || userRole

  const { data: unread, mutate: mutateUnread } = useSWR('/api/unread', (url) => fetch(url).then(r => r.json()), {
    revalidateOnFocus: true
  })

  // Listen for real-time ping to invalidate unread counts SWR cache
  useEffect(() => {
    const es = new EventSource('/api/user/stream')
    es.addEventListener('invalidate', (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.target === 'all' || payload.target === 'unread') {
          mutateUnread()
        }
      } catch (err) {}
    })
    return () => es.close()
  }, [mutateUnread])

  const visibleItems = NAV_ITEMS.filter(
    item => !item.roles || item.roles.includes(currentUserRole)
  )

  const initials = currentUserName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const roleLabel = currentUserRole.charAt(0) + currentUserRole.slice(1).toLowerCase()

  // Scroll indicator
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const check = () => setCanScrollMore(el.scrollHeight > el.clientHeight + el.scrollTop + 4)
    check()
    el.addEventListener('scroll', check)
    window.addEventListener('resize', check)
    return () => {
      el.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [visibleItems])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(false)} 
      />
      <nav className={`sidebar-nav ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Logo & Portal Label */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', padding: '4px 8px', marginBottom: '22px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          width: '100%',
          maxWidth: '182px',
          minHeight: '82px',
          padding: '12px 16px',
          borderRadius: '999px',
          background: 'linear-gradient(145deg, #f6f7fb, #dde0e8)',
          boxShadow: '14px 14px 28px rgba(197, 199, 207, 0.85), -10px -10px 22px rgba(255, 255, 255, 0.95), inset 1px 1px 0 rgba(255, 255, 255, 0.7)',
        }}>
          <img 
            src="/logo.png" 
            alt="GENz IITIAN Logo" 
            style={{ 
              width: '100%',
              maxWidth: '148px',
              height: 'auto', 
              maxHeight: '52px',
              objectFit: 'contain',
              display: 'block',
            }} 
          />
        </div>
        <div style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: '800', letterSpacing: '0.01em', textTransform: 'uppercase', paddingLeft: '2px' }}>
          {roleLabel} Portal
        </div>
      </div>

      {/* Navigation items */}
      <div
        ref={navRef}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', paddingRight: '4px', position: 'relative' }}
      >
        {visibleItems.map((item, idx) => {
          // Check if pathname matches or starts with item href (with proper path boundary)
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/courses/explore' && pathname.startsWith(item.href) && 
             (pathname[item.href.length] === '/' || pathname[item.href.length] === undefined) && !pathname.startsWith('/courses/explore') &&
             !(item.href === '/manage' && (pathname.startsWith('/manage/prompts') || pathname.startsWith('/manage/updates') || pathname.startsWith('/manage/coupons'))))

          // Add Section Headers
          const showGeneralHeader = idx === 0
          
          const showCommunityHeader = item.href === '/community'
          const showAdminHeader = item.href === '/manage'
          
          const hasRedDot = (
            (item.href === '/community' && unread?.community) ||
            (item.href === '/support' && unread?.support) ||
            (item.href === '/announcements' && unread?.announcements)
          )

          const isStore = item.href === '/courses/explore'
          const getLinkStyle = () => {
            if (isStore) {
              return {
                display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 18px', borderRadius: '50px',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #4b5563, #1f2937)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255,255,255,0.2)',
                textDecoration: 'none', fontSize: '14px', fontWeight: '800', transition: 'all 0.2s ease',
                marginBottom: '4px', position: 'relative' as const, whiteSpace: 'nowrap' as const, overflow: 'hidden' as const
              }
            }
            return {
              display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 18px', borderRadius: '50px',
              color: isActive ? '#ffffff' : '#6b6b8a',
              background: isActive ? '#3636e8' : '#e8eaf0',
              boxShadow: isActive
                ? '4px 4px 10px rgba(54,54,232,0.35), -2px -2px 6px rgba(255,255,255,0.7)'
                : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
              textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? '700' : '500', transition: 'all 0.2s ease',
              marginBottom: '4px', position: 'relative' as const, whiteSpace: 'nowrap' as const
            }
          }

          return (
            <div key={item.href} className={item.desktopOnly ? 'desktop-only-nav-item' : undefined}>
              {showGeneralHeader && (
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '10px', paddingLeft: '12px' }}>
                  General
                </div>
              )}
              
              {showCommunityHeader && (
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '16px', paddingLeft: '12px' }}>
                  Engagement
                </div>
              )}
              {showAdminHeader && (
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '16px', paddingLeft: '12px' }}>
                  Administration
                </div>
              )}
              <Link
                href={item.href}
                style={getLinkStyle()}
                className={isStore ? 'store-link' : ''}
              >
                {isStore && (
                  <style dangerouslySetInnerHTML={{__html: `
                    .store-link::before {
                      content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
                      background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
                      transform: skewX(-25deg);
                      animation: shine 3s infinite;
                    }
                    @keyframes shine {
                      0% { left: -100%; }
                      20% { left: 200%; }
                      100% { left: 200%; }
                    }
                  `}} />
                )}
                <span style={{
                  color: isStore ? '#ffffff' : (isActive ? '#ffffff' : '#6b6b8a'),
                  flexShrink: 0,
                  display: 'flex',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {item.icon}
                  {hasRedDot && (
                    <div style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      border: `2px solid ${isStore ? '#64748b' : (isActive ? '#3636e8' : '#e8eaf0')}`,
                      boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)'
                    }} />
                  )}
                </span>
                {item.label === 'Analytics & Performance' ? (
                  <div style={{ lineHeight: '1.2', whiteSpace: 'normal', zIndex: 1, position: 'relative' }}>
                    {item.label}
                  </div>
                ) : (
                  <span style={{ zIndex: 1, position: 'relative' }}>{item.label}</span>
                )}
              </Link>
            </div>
          )
        })}
      </div>

      {/* Scroll More Indicator — sticky inside the scroll container, never overlaps items */}
      <style>{`
        @keyframes sidebarBounce {
          0%, 100% { transform: translateY(0); opacity: 0.45; }
          50% { transform: translateY(4px); opacity: 1; }
        }
      `}</style>
      {canScrollMore && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '4px 0 2px',
          pointerEvents: 'none',
          flexShrink: 0,
        }}>
          <svg
            width="18" height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#b0b0c8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'sidebarBounce 1.6s ease-in-out infinite' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      )}

      {/* Sign Out */}
      <button
        onClick={handleLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '11px 18px',
          borderRadius: '50px',
          color: '#ef4444',
          background: '#e8eaf0',
          boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14.5px',
          fontWeight: '500',
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
          marginTop: '12px',
          width: '100%',
        }}
      >
        <span style={{ color: '#ef4444', flexShrink: 0, display: 'flex' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </span>
        Sign Out
      </button>

    </nav>
    </>
  )
}
