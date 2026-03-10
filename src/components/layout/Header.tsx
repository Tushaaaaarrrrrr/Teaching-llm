'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

interface HeaderProps {
  userName: string
  userRole: string
}

interface Notification {
  id: string
  title: string
  content: string
  type: string
  isRead: boolean
  createdAt: string
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':  { title: 'Dashboard',        subtitle: 'Welcome back to your learning hub' },
  '/classes':    { title: 'Classes',           subtitle: 'Manage your enrolled subjects and lectures' },
  '/live':       { title: 'Live Classes',      subtitle: "Today's schedule" },
  '/calendar':   { title: 'Calendar',          subtitle: 'Your schedule and upcoming events' },
  '/recordings': { title: 'Recordings',        subtitle: 'Browse lecture recordings' },
  '/materials':  { title: 'Study Materials',   subtitle: 'Download notes and resources' },
  '/community':  { title: 'Community',         subtitle: 'Connect with your classmates' },
  '/support':    { title: 'Contact & Support', subtitle: 'Raise a ticket or chat with support' },
  '/manage':     { title: 'Manage Content',    subtitle: 'Create and edit classes, lectures, and sessions' },
  '/admin':      { title: 'User Management',   subtitle: 'Manage platform accounts and permissions' },
}

const TYPE_COLORS: Record<string, string> = {
  INFO: '#3b82f6', SUCCESS: '#10b981', WARNING: '#f59e0b', ERROR: '#ef4444',
  info: '#3b82f6', success: '#10b981', warning: '#f59e0b', error: '#ef4444',
}

export default function Header({ userName, userRole }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotif, setShowNotif] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.isRead).length

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

  function loadNotifications() {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  useEffect(() => {
    loadNotifications()
    const t = setInterval(loadNotifications, 15000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PUT' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  async function markAllRead() {
    await Promise.all(
      notifications.filter(n => !n.isRead).map(n =>
        fetch(`/api/notifications/${n.id}`, { method: 'PUT' })
      )
    )
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const neuIconStyle = {
    width: '40px', height: '40px', borderRadius: '50%',
    background: '#e8eaf0',
    boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#6b6b8a', cursor: 'pointer',
    transition: 'box-shadow 0.2s ease', border: 'none', flexShrink: 0,
  } as React.CSSProperties

  return (
    <header style={{
      height: '72px', background: '#e8eaf0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1e1e3a', lineHeight: '1.2' }}>
          {pageInfo.title}
        </h1>
        {pageInfo.subtitle && (
          <p style={{ fontSize: '13px', color: '#9999b0', marginTop: '2px' }}>{pageInfo.subtitle}</p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Notification bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            style={{ ...neuIconStyle, position: 'relative' }}
            onClick={() => setShowNotif(v => !v)}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '6px', right: '6px',
                minWidth: '16px', height: '16px', borderRadius: '50%',
                background: '#ef4444', border: '2px solid #e8eaf0',
                fontSize: '9px', fontWeight: '800', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 10px)',
              width: '340px', borderRadius: '20px',
              background: '#e8eaf0', boxShadow: '10px 10px 20px #bdbfc7, -10px -10px 20px #ffffff',
              zIndex: 200, overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 18px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid rgba(0,0,0,0.06)' }}>
                <span style={{ fontWeight: '800', fontSize: '14px', color: '#1e1e3a' }}>
                  Notifications {unreadCount > 0 && <span style={{ color: '#3636e8' }}>({unreadCount})</span>}
                </span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#3636e8', fontWeight: '700', fontFamily: 'inherit' }}>
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>
                    No notifications yet
                  </div>
                ) : notifications.slice(0, 15).map(n => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{
                      padding: '12px 18px', cursor: 'pointer',
                      borderBottom: '1px solid rgba(0,0,0,0.04)',
                      background: n.isRead ? 'transparent' : 'rgba(54,54,232,0.04)',
                      transition: 'background 0.15s',
                      display: 'flex', gap: '12px', alignItems: 'flex-start',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(54,54,232,0.04)')}
                  >
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%', marginTop: '5px', flexShrink: 0,
                      background: n.isRead ? '#c5c7cf' : (TYPE_COLORS[n.type] || '#3b82f6'),
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: n.isRead ? '500' : '700', color: '#1e1e3a', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9999b0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.content.length > 60 ? n.content.slice(0, 57) + '…' : n.content}
                      </div>
                      <div style={{ fontSize: '11px', color: '#b0b2ba', marginTop: '3px' }}>
                        {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User pill */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 16px 6px 6px', borderRadius: '50px', background: '#e8eaf0', boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff', cursor: 'pointer', transition: 'box-shadow 0.2s ease' }}
          onClick={handleLogout}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff')}
          title="Click to sign out"
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e8eaf0', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3636e8', fontSize: '12px', fontWeight: '800' }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e1e3a', lineHeight: '1.2' }}>{userName}</div>
            <div style={{ fontSize: '11px', color: '#9999b0' }}>{userRole.charAt(0) + userRole.slice(1).toLowerCase()}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
