'use client'

import { useRouter, usePathname } from 'next/navigation'

interface HeaderProps {
  userName: string
  userRole: string
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Welcome back to your learning hub' },
  '/classes': { title: 'Classes', subtitle: 'Manage your enrolled subjects and lectures' },
  '/live': { title: 'Live Classes', subtitle: "Today's Schedule" },
  '/calendar': { title: 'Calendar', subtitle: 'Your schedule and upcoming events' },
  '/recordings': { title: 'Recordings', subtitle: 'Browse lecture recordings' },
  '/materials': { title: 'Study Materials', subtitle: 'Download notes and resources' },
  '/manage': { title: 'Manage Content', subtitle: 'Create and edit classes, lectures, and sessions' },
  '/admin': { title: 'User Management', subtitle: 'Manage platform accounts and permissions' },
}

export default function Header({ userName, userRole }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const matchedKey = Object.keys(PAGE_TITLES).find(key =>
    key === pathname || (key !== '/dashboard' && pathname.startsWith(key))
  )
  const pageInfo = matchedKey ? PAGE_TITLES[matchedKey] : { title: 'Teaching LLM', subtitle: '' }

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const neuIconStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#e8eaf0',
    boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b6b8a',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease',
    border: 'none',
    flexShrink: 0,
  } as React.CSSProperties

  return (
    <header style={{
      height: '72px',
      background: '#e8eaf0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Page title */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e1e3a', lineHeight: '1.2' }}>
          {pageInfo.title}
        </h1>
        {pageInfo.subtitle && (
          <p style={{ fontSize: '13px', color: '#9999b0', marginTop: '2px' }}>
            {pageInfo.subtitle}
          </p>
        )}
      </div>

      {/* Right side actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Search */}
        <button
          style={neuIconStyle}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>

        {/* Notifications */}
        <button
          style={{ ...neuIconStyle, position: 'relative' }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span style={{
            position: 'absolute',
            top: '8px',
            right: '9px',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#ef4444',
            border: '1.5px solid #e8eaf0',
          }} />
        </button>

        {/* User menu */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 16px 6px 6px',
            borderRadius: '50px',
            background: '#e8eaf0',
            boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s ease',
          }}
          onClick={handleLogout}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff')}
          title="Click to sign out"
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#e8eaf0',
            boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3636e8',
            fontSize: '12px',
            fontWeight: '700',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e1e3a', lineHeight: '1.2' }}>
              {userName}
            </div>
            <div style={{ fontSize: '11px', color: '#9999b0' }}>
              {userRole.charAt(0) + userRole.slice(1).toLowerCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

