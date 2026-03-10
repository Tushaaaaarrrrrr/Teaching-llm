'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  totalClasses: number
  totalLectures: number
  upcomingSessions: number
  totalMaterials: number
}

interface LiveSession {
  id: string
  title: string
  instructor: string
  date: string
  time: string
  status: string
  meetingLink: string
  class: { name: string }
}

interface Lecture {
  id: string
  title: string
  duration: string
  uploadedAt: string
  class: { name: string; color: string }
}

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  createdAt: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, sessionsRes, lecturesRes, announcementsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/live-sessions?status=scheduled'),
          fetch('/api/lectures'),
          fetch('/api/announcements'),
        ])
        const statsData = await statsRes.json()
        const sessionsData = await sessionsRes.json()
        const lecturesData = await lecturesRes.json()
        const announcementsData = await announcementsRes.json()

        setStats(statsData)
        setSessions((sessionsData.sessions || sessionsData || []).slice(0, 4))
        setLectures((lecturesData.lectures || lecturesData || []).slice(0, 5))
        setAnnouncements((announcementsData.announcements || announcementsData || []).slice(0, 3))
      } catch (e) {
        console.error('Failed to load dashboard data:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statCards = [
    { label: 'Total Classes', value: stats?.totalClasses ?? 0, color: '#6366f1', bg: '#e0e7ff', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
    )},
    { label: 'Lectures', value: stats?.totalLectures ?? 0, color: '#8b5cf6', bg: '#ede9fe', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
    )},
    { label: 'Upcoming Sessions', value: stats?.upcomingSessions ?? 0, color: '#f59e0b', bg: '#fef3c7', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
    )},
  ]

  if (loading) {
    return (
      <div className="page-container">
        <div className="grid-3">
          {[1,2,3].map(i => (
            <div key={i} className="card" style={{ padding: '24px' }}>
              <div className="skeleton" style={{ height: '14px', width: '80px', marginBottom: '12px' }} />
              <div className="skeleton" style={{ height: '28px', width: '48px' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      {/* Stats Grid */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        {statCards.map((card) => (
          <div key={card.label} className="card" style={{
            padding: '22px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: card.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9999b0', fontWeight: '500', marginBottom: '4px' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '26px', fontWeight: '700', color: '#1e1e3a', lineHeight: '1' }}>
                {card.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Upcoming Live Sessions */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 20px',
              borderBottom: '1px solid #d8dae3',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 8px rgba(239,68,68,0.5)',
                  animation: 'pulse 2s infinite',
                }} />
                <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Upcoming Live Sessions</h3>
              </div>
              <Link href="/live" className="btn btn-secondary btn-sm">View All</Link>
            </div>
            {sessions.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9999b0' }}>
                No upcoming sessions
              </div>
            ) : (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sessions.map((session) => (
                  <div key={session.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderRadius: '50px',
                    background: '#e8eaf0',
                    boxShadow: '5px 5px 10px #c5c7cf, -5px -5px 10px #ffffff',
                    transition: 'box-shadow 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '7px 7px 14px #c2c4cc, -7px -7px 14px #ffffff'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '5px 5px 10px #c5c7cf, -5px -5px 10px #ffffff'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: session.status === 'live' ? '#fee2e2' : '#e0e7ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={session.status === 'live' ? '#ef4444' : '#6366f1'} strokeWidth="2">
                          <polygon points="23 7 16 12 23 17 23 7"/>
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e1e3a', marginBottom: '2px' }}>
                          {session.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9999b0' }}>
                          {session.class?.name} &middot; {session.instructor} &middot; {session.date} at {session.time}
                        </div>
                      </div>
                    </div>
                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`btn btn-sm ${session.status === 'live' ? 'btn-danger' : 'btn-primary'}`}
                    >
                      {session.status === 'live' ? 'Join Now' : 'Details'}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Lectures */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 20px',
              borderBottom: '1px solid #d8dae3',
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Recent Lectures</h3>
              <Link href="/recordings" className="btn btn-secondary btn-sm">View All</Link>
            </div>
            {lectures.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9999b0' }}>
                No lectures uploaded yet
              </div>
            ) : (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lectures.map((lec) => (
                  <div key={lec.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderRadius: '50px',
                    background: '#e8eaf0',
                    boxShadow: '5px 5px 10px #c5c7cf, -5px -5px 10px #ffffff',
                    transition: 'box-shadow 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '7px 7px 14px #c2c4cc, -7px -7px 14px #ffffff'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '5px 5px 10px #c5c7cf, -5px -5px 10px #ffffff'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: (lec.class?.color || '#6366f1') + '18',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={lec.class?.color || '#6366f1'} strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e1e3a', marginBottom: '2px' }}>
                          {lec.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9999b0' }}>
                          {lec.class?.name} {lec.duration ? `· ${lec.duration}` : ''}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#9999b0' }}>
                      {new Date(lec.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Actions */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/classes" className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
                Browse Classes
              </Link>
              <Link href="/live" className="btn btn-ghost w-full" style={{ justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                Live Sessions
              </Link>
              <Link href="/materials" className="btn btn-ghost w-full" style={{ justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                Study Materials
              </Link>
            </div>
          </div>

          {/* Announcements */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid #d8dae3',
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Announcements</h3>
            </div>
            {announcements.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>
                No announcements
              </div>
            ) : (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {announcements.map((a) => {
                  const colors: Record<string, { bg: string; border: string; icon: string }> = {
                    info: { bg: '#dbeafe', border: '#3b82f6', icon: '#3b82f6' },
                    warning: { bg: '#fef3c7', border: '#f59e0b', icon: '#f59e0b' },
                    success: { bg: '#d1fae5', border: '#10b981', icon: '#10b981' },
                    error: { bg: '#fee2e2', border: '#ef4444', icon: '#ef4444' },
                  }
                  const c = colors[a.type] || colors.info
                  return (
                    <div key={a.id} style={{
                      padding: '14px 20px',
                      borderRadius: '16px',
                      background: '#e8eaf0',
                      boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                      borderLeft: `4px solid ${c.border}`,
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e1e3a', marginBottom: '4px' }}>
                        {a.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b6b8a', lineHeight: '1.5' }}>
                        {a.content}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9999b0', marginTop: '6px' }}>
                        {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 900px) {
          .page-container > div:last-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
