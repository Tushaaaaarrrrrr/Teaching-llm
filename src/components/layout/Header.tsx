'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import useSWR from 'swr'

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
  announcementId: string | null
  createdAt: string
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':  { title: 'Dashboard',        subtitle: 'Welcome back to your learning hub' },
  '/courses/explore': { title: '',            subtitle: '' },
  '/courses':    { title: 'Courses',          subtitle: 'Manage your enrolled subjects and lectures' },
  '/live':       { title: 'Live Sessions',     subtitle: "Today's schedule" },
  '/calendar':   { title: 'Calendar',          subtitle: 'Your schedule and upcoming events' },
  '/materials/recordings': { title: 'Recordings',        subtitle: 'Browse lecture recordings' },
  '/materials':  { title: 'Study Resources',   subtitle: 'Download notes and resources' },
    '/community':  { title: 'Community',         subtitle: 'Connect with your coursemates' },
  '/announcements': { title: 'Announcements',  subtitle: 'Stay updated with the latest news' },
  '/support':    { title: 'Contact & Support', subtitle: 'Raise a ticket or chat with support' },
  '/manage':     { title: 'Manage Content',    subtitle: 'Create and edit courses, lectures, and sessions' },
  '/manage/updates': { title: 'Update System', subtitle: 'Manage greetings, updates, and user messages' },
  '/admin':      { title: 'User Management',   subtitle: 'Manage platform accounts and permissions' },
  '/profile':    { title: 'My Profile',         subtitle: 'View and edit your personal information' },
  '/settings':   { title: 'Settings',          subtitle: 'Manage passwords, appearance, and notifications' },
  '/chat-transcripts': { title: 'Chat Transcripts', subtitle: 'View community chat transcripts' },
  '/activity-logs': { title: 'Activity Log',     subtitle: 'Monitor all platform activity and user actions' },
  '/reports':    { title: 'Analytics & Performance', subtitle: 'Comprehensive platform-wide metrics and student audits' },
  '/data-analysis': { title: 'Data Analysis',      subtitle: 'Production-level insights and student behavior metrics' },
  '/exams':      { title: 'Exams',             subtitle: 'Manage and participate in assessments' },
  '/study/content-bank': { title: 'Content Bank', subtitle: 'Global repository of exam questions and resources' },
  '/feedback':   { title: 'Course Feedback',    subtitle: 'Average ratings and student reviews.' },
  '/free-resources/courses': { title: 'Free Courses', subtitle: 'Browse and self-enroll in free courses' },
  '/free-resources/materials': { title: 'Free Materials', subtitle: 'Download study materials available for free' },
  '/free-resources': { title: 'Free Resources', subtitle: 'Access free courses and study materials' },
  '/transactions': { title: 'Upgrade Transactions', subtitle: 'Monitor student course upgrades and revenue' },
  '/my-transactions': { title: 'My Upgrade History', subtitle: 'View all your course upgrade transactions' },
}

const TYPE_COLORS: Record<string, string> = {
  INFO: '#3b82f6', SUCCESS: '#10b981', WARNING: '#f59e0b', ERROR: '#ef4444',
  info: '#3b82f6', success: '#10b981', warning: '#f59e0b', error: '#ef4444',
}

export default function Header({ userName, userRole }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  // const [notifications, setNotifications] = useState<Notification[]>([]) - Removed in favor of SWR
  const [showNotif, setShowNotif] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const fetcher = (url: string) => fetch(url).then(r => r.json())
  const { data: notificationsData, mutate: mutateNotifications } = useSWR('/api/notifications', fetcher, {
    revalidateOnFocus: true,
  })

  // Listen for real-time ping to invalidate notification SWR cache
  useEffect(() => {
    const es = new EventSource('/api/user/stream')
    es.addEventListener('invalidate', (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.target === 'all' || payload.target === 'notifications') {
          mutateNotifications()
        }
      } catch (err) {}
    })
    return () => es.close()
  }, [mutateNotifications])

  // Fetch current user info for real-time reactivity
  const { data: userData } = useSWR('/api/auth/me', fetcher, {
    revalidateOnFocus: true,
  })

  // Use SWR data if available, otherwise fall back to props
  const currentUserName = userData?.user?.name || userName
  const currentUserRole = userData?.user?.role || userRole
  const currentAvatar = userData?.user?.avatar || avatar

  const notifications = Array.isArray(notificationsData) ? notificationsData : []

  const unreadCount = notifications.filter(n => !n.isRead).length

  // Sort keys by length descending to match the most specific path first
  const matchedKey = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find(key => key === pathname || (key !== '/dashboard' && pathname.startsWith(key)))
    
  const pageInfo = matchedKey ? PAGE_TITLES[matchedKey] : { title: 'Dashboard', subtitle: '' }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      return {
        heading: 'Good Morning',
        subtext: 'Hope you’re ready for a productive day ahead.'
      }
    }
    if (hour >= 12 && hour < 17) {
      return {
        heading: 'Good Afternoon',
        subtext: 'Keep going strong, you’re making great progress.'
      }
    }
    if (hour >= 17 && hour < 21) {
      return {
        heading: 'Good Evening',
        subtext: 'Take a moment to relax and review your day.'
      }
    }
    return {
      heading: 'Good Night',
      subtext: 'You’ve done well today. Get some good rest.'
    }
  }

  // const [notifications, setNotifications] = useState<Notification[]>([]) - Removed

  const initials = currentUserName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Initials and other logic

  // Load user profile
  useEffect(() => {
    setMounted(true)
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (data.user?.avatar) setAvatar(data.user.avatar)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function markRead(id: string, announcementId?: string | null) {
    await fetch(`/api/notifications/${id}`, { method: 'PUT' })
    mutateNotifications() // Refresh SWR data
    if (announcementId) {
      setShowNotif(false)
      router.push(`/announcements?id=${announcementId}`)
    }
  }

  async function markAllRead() {
    await Promise.all(
      notifications.filter(n => !n.isRead).map(n =>
        fetch(`/api/notifications/${n.id}`, { method: 'PUT' })
      )
    )
    mutateNotifications()
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

  const firstName = currentUserName.split(' ')[0]

  return (
    <header style={{
      height: pathname === '/dashboard' ? '140px' : '96px', background: '#e8eaf0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', position: 'sticky', top: 0, zIndex: 50,
      transition: 'height 0.3s ease',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {matchedKey === '/dashboard' ? (
          <>
            <h1 style={{ 
              fontSize: '56px', 
              fontWeight: '900', 
              color: '#1e1e3a', 
              lineHeight: '1.0', 
              letterSpacing: '-1.5px', 
              display: 'flex', 
              alignItems: 'baseline', 
              gap: '12px', 
              flexWrap: 'wrap',
              fontFamily: "'Outfit', 'Nunito', sans-serif"
            }}>
              {mounted ? getGreeting().heading : 'Welcome'},
              <span style={{ 
                fontSize: '40px', 
                fontWeight: '700', 
                color: '#3636e8', 
                letterSpacing: '-0.8px',
                opacity: 0.9,
                fontFamily: "'Outfit', 'Nunito', sans-serif"
              }}>
                {firstName}
              </span>
            </h1>
            <p style={{ 
              fontSize: '16.5px', 
              color: '#6b6b8a', 
              marginTop: '6px', 
              fontWeight: '500', 
              letterSpacing: '0.01em',
              maxWidth: '600px',
              lineHeight: '1.5'
            }}>
              {mounted ? getGreeting().subtext : 'Loading your dashboard...'}
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1e1e3a', lineHeight: '1.2', letterSpacing: '-0.5px' }}>
              {pageInfo.title}
            </h1>
            {pageInfo.subtitle ? (
              <p style={{ fontSize: '13px', color: '#9999b0', marginTop: '2px' }}>{pageInfo.subtitle}</p>
            ) : null}
          </>
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
            title="Notifications & Announcements"
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
                    onClick={() => markRead(n.id, n.announcementId)}
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
                        {new Date(n.createdAt).toLocaleDateString('en-GB', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User pill with dropdown */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 16px 6px 6px', borderRadius: '50px', background: '#e8eaf0', boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff', cursor: 'pointer', transition: 'box-shadow 0.2s ease' }}
            onClick={() => setShowUserMenu(v => !v)}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff')}
            title="My Account & Profile"
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: currentAvatar ? 'transparent' : '#e8eaf0',
              boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#3636e8', fontSize: '12px', fontWeight: '800',
              overflow: 'hidden',
            }}>
              {currentAvatar ? (
                <img src={currentAvatar} alt={currentUserName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e1e3a', lineHeight: '1.2' }}>{currentUserName}</div>
              <div style={{ fontSize: '11px', color: '#9999b0' }}>{currentUserRole.charAt(0) + currentUserRole.slice(1).toLowerCase()}</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9999b0" strokeWidth="2" style={{ marginLeft: '4px' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          {/* User dropdown menu */}
          {showUserMenu && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 10px)',
              width: '200px', borderRadius: '16px',
              background: '#e8eaf0', boxShadow: '10px 10px 20px #bdbfc7, -10px -10px 20px #ffffff',
              zIndex: 200, overflow: 'hidden', padding: '6px',
            }}>
              <button
                onClick={() => { setShowUserMenu(false); router.push('/profile') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '10px 14px', borderRadius: '12px', border: 'none',
                  background: 'transparent', cursor: 'pointer', fontSize: '13px',
                  fontWeight: '500', color: '#1e1e3a', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(54,54,232,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                My Profile
              </button>
              <button
                onClick={() => { setShowUserMenu(false); router.push('/settings') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '10px 14px', borderRadius: '12px', border: 'none',
                  background: 'transparent', cursor: 'pointer', fontSize: '13px',
                  fontWeight: '500', color: '#1e1e3a', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(54,54,232,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Settings
              </button>
              <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '4px 10px' }} />
              <button
                onClick={() => { setShowUserMenu(false); handleLogout() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '10px 14px', borderRadius: '12px', border: 'none',
                  background: 'transparent', cursor: 'pointer', fontSize: '13px',
                  fontWeight: '500', color: '#ef4444', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
