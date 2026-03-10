'use client'

import { useRouter, usePathname } from 'next/navigation'

interface HeaderProps {
  userName: string
  userRole: string
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Welcome back to your learning hub' },
  '/classes': { title: 'Classes', subtitle: 'Browse all your courses' },
  '/live': { title: 'Live Classes', subtitle: 'Join ongoing and upcoming sessions' },
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

  return (
    <header style={{
      height: '64px',
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Page title */}
      <div>
        <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', lineHeight: '1.2' }}>
          {pageInfo.title}
        </h1>
        {pageInfo.subtitle && (
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '1px' }}>
            {pageInfo.subtitle}
          </p>
        )}
      </div>

      {/* Right side actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Notifications */}
        <button style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fc')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span style={{
            position: 'absolute',
            top: '6px',
            right: '7px',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#ef4444',
            border: '1.5px solid white',
          }} />
        </button>

        {/* User menu */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px 4px 4px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onClick={handleLogout}
        onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fc')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        title="Click to sign out"
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '11px',
            fontWeight: '600',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a', lineHeight: '1.2' }}>
              {userName}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {userRole.charAt(0) + userRole.slice(1).toLowerCase()}
            </div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ marginLeft: '2px' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
    </header>
  )
}
