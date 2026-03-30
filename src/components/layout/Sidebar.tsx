'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import useSWR from 'swr'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
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
    roles: ['MANAGER'],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        <path d="M9 14l2 2 4-4"/>
      </svg>
    ),
  },
  {
    href: '/exams',
    label: 'Exams',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
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
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
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
    href: '/feedback',
    label: 'Course Feedback',
    roles: ['STUDENT', 'MANAGER'],
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
    href: '/admin',
    label: 'User Admin',
    roles: ['MANAGER'],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },

]

export default function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

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

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

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

  return (
    <nav style={{
      width: '215px',
      minHeight: '100vh',
      background: '#e8eaf0',
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 16px 24px',
      flexShrink: 0,
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 100,
    }}>
      {/* Logo & Portal Label */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', padding: '4px 8px', marginBottom: '36px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexShrink: 0,
          overflow: 'hidden',
          width: '100%',
          maxWidth: '175px',
          minHeight: '72px',
          padding: '10px 14px',
          borderRadius: '20px',
          background: '#e8eaf0',
          boxShadow: '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff',
        }}>
          <img 
            src="/logo.png" 
            alt="GENz IITIAN Logo" 
            style={{ 
              width: '100%',
              maxWidth: '150px',
              height: 'auto', 
              maxHeight: '48px',
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', paddingRight: '4px' }}>
        {visibleItems.map((item, idx) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          // Add Section Headers
          const showGeneralHeader = idx === 0
          const showResourcesHeader = item.href === '/materials'
          const showCommunityHeader = item.href === '/community'
          const showAdminHeader = item.href === '/manage'
          
          const hasRedDot = (
            (item.href === '/community' && unread?.community) ||
            (item.href === '/support' && unread?.support) ||
            (item.href === '/announcements' && unread?.announcements)
          )

          return (
            <div key={item.href}>
              {showGeneralHeader && (
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '4px', paddingLeft: '12px' }}>
                  General
                </div>
              )}
              {showResourcesHeader && (
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '16px', paddingLeft: '12px' }}>
                  Resources
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 18px',
                  borderRadius: '50px',
                  color: isActive ? '#ffffff' : '#6b6b8a',
                  background: isActive ? '#3636e8' : '#e8eaf0',
                  boxShadow: isActive
                    ? '4px 4px 10px rgba(54,54,232,0.35), -2px -2px 6px rgba(255,255,255,0.7)'
                    : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? '700' : '500',
                  transition: 'all 0.2s ease',
                  marginBottom: '4px',
                  position: 'relative'
                }}
              >
                <span style={{
                  color: isActive ? '#ffffff' : '#6b6b8a',
                  flexShrink: 0,
                  display: 'flex',
                  position: 'relative'
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
                      border: `2px solid ${isActive ? '#3636e8' : '#e8eaf0'}`,
                      boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)'
                    }} />
                  )}
                </span>
                {item.label}
              </Link>
            </div>
          )
        })}
      </div>

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
  )
}
