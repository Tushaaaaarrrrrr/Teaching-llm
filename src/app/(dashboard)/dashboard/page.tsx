'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  totalClasses: number
  totalLectures: number
  totalStudents: number
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
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([])
  const [upNextSessions, setUpNextSessions] = useState<LiveSession[]>([])
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string>('')
  const [activeCard, setActiveCard] = useState(0)
  const [sliding, setSliding] = useState(false)

  const handleNextLive = () => {
    setSliding(true)
    setTimeout(() => {
      setActiveCard(prev => (prev + 1) % liveSessions.length)
      setSliding(false)
    }, 180)
  }

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, sessionsRes, lecturesRes, announcementsRes, meRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/live-sessions'),
          fetch('/api/lectures'),
          fetch('/api/announcements'),
          fetch('/api/auth/me'),
        ])
        const statsData         = await statsRes.json()
        const sessionsData      = await sessionsRes.json()
        const lecturesData      = await lecturesRes.json()
        const announcementsData = await announcementsRes.json()
        const meData            = await meRes.json()

        const allSessions: LiveSession[] = (sessionsData.sessions || sessionsData || [])
        const liveNow = allSessions.filter(s => s.status === 'live').slice(0, 3)
        const upcoming = allSessions.filter(s => s.status === 'scheduled' || s.status === 'upcoming').slice(0, 2)

        setStats(statsData)
        setRole(meData.user?.role || '')
        setLiveSessions(liveNow)
        setUpNextSessions(upcoming)
        setLectures((lecturesData.lectures || lecturesData || []).slice(0, 3))
        setAnnouncements((announcementsData.announcements || announcementsData || []).slice(0, 3))
      } catch (e) {
        console.error('Failed to load dashboard data:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const isManager = role === 'MANAGER'

  const statCards = [
    { label: 'Total Classes', value: stats?.totalClasses ?? 0, color: '#6366f1', bg: '#e0e7ff', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
    )},
    { label: 'Lectures', value: stats?.totalLectures ?? 0, color: '#8b5cf6', bg: '#ede9fe', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
    )},
    ...(isManager ? [{
      label: 'Students Enrolled', value: stats?.totalStudents ?? 0, color: '#10b981', bg: '#d1fae5', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      ),
    }] : []),
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

  const frontSession = liveSessions[activeCard]
  const hasLive = liveSessions.length > 0

  return (
    <div className="page-container fade-in">
      {/* Stats Grid — untouched */}
      <div className={isManager ? 'grid-4' : 'grid-3'} style={{ marginBottom: '24px' }}>
        {statCards.map((card) => (
          <div key={card.label} className="card" style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <div style={{
              width: '44px',
              height: '44px',
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
              <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e1e3a', lineHeight: '1' }}>
                {card.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Active Now + Up Next — equal columns ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px',
        alignItems: 'stretch',
      }}>
        {/* Active Now card */}
        <div className="card" style={{
          padding: '20px',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}>
          {hasLive && frontSession ? (
            <>
              {/* Top row: ACTIVE NOW badge + time + nav button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '7px',
                  background: 'rgba(16,185,129,0.12)',
                  padding: '5px 12px', borderRadius: '20px',
                  animation: 'badgeGlow 2s ease-in-out infinite',
                }}>
                  <div style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: '#10b981', flexShrink: 0,
                    animation: 'greenPulse 1.5s infinite',
                  }} />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Active Now
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#9999b0', fontWeight: '500' }}>
                    {frontSession.time}
                  </span>
                  {liveSessions.length > 1 && (
                    <button
                      onClick={handleNextLive}
                      style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: '#e8eaf0',
                        boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'box-shadow 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '5px 5px 9px #c2c4cc, -5px -5px 9px #ffffff')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff')}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Animated session content — key swap triggers slideInRight */}
              <div
                key={activeCard}
                style={{
                  opacity: sliding ? 0 : 1,
                  transform: sliding ? 'translateX(-16px)' : 'translateX(0)',
                  transition: 'opacity 0.18s ease, transform 0.18s ease',
                  animation: sliding ? 'none' : 'slideInRight 0.32s ease',
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e1e3a', lineHeight: '1.3', marginBottom: '8px' }}>
                  {frontSession.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: '#e0e7ff', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: '12.5px', color: '#6b6b8a', fontWeight: '500' }}>
                    {frontSession.instructor}{frontSession.class?.name ? ` · ${frontSession.class.name}` : ''}
                  </span>
                </div>
              </div>

              {/* Dot indicators (only when multiple live sessions) */}
              {liveSessions.length > 1 ? (
                <div style={{ display: 'flex', gap: '5px' }}>
                  {liveSessions.map((_, i) => (
                    <div
                      key={i}
                      onClick={handleNextLive}
                      style={{
                        width: i === activeCard ? '18px' : '6px',
                        height: '6px',
                        borderRadius: '3px',
                        background: i === activeCard ? '#10b981' : '#c5c7cf',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              ) : <div />}

              {/* Join button */}
              <a
                href={frontSession.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  padding: '13px 20px',
                  borderRadius: '12px',
                  background: '#ef4444',
                  color: '#ffffff', fontSize: '13.5px', fontWeight: '700',
                  textDecoration: 'none', letterSpacing: '0.01em',
                  animation: 'joinGlow 2.5s ease-in-out infinite',
                  transition: 'background 0.18s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.animation = 'none'
                  e.currentTarget.style.background = '#dc2626'
                  e.currentTarget.style.boxShadow = '0 4px 28px rgba(239,68,68,0.7)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.animation = 'joinGlow 2.5s ease-in-out infinite'
                  e.currentTarget.style.background = '#ef4444'
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                <div style={{
                  width: '28px', height: '28px', borderRadius: '7px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </div>
                Join Live Class
              </a>
            </>
          ) : (
            /* No live session placeholder — centred, fills full height */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '10px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f3f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c5c7cf" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              </div>
              <div style={{ fontSize: '13px', color: '#9999b0', fontWeight: '500', textAlign: 'center' }}>No active classes right now</div>
              <Link href="/live" style={{ fontSize: '12px', color: '#6366f1', fontWeight: '600', textDecoration: 'none' }}>View schedule →</Link>
            </div>
          )}
        </div>

        {/* Up Next panel */}
        <div className="card" style={{ padding: '20px', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e1e3a' }}>Up Next</h3>
            <Link href="/live" style={{ fontSize: '12px', color: '#6366f1', fontWeight: '600', textDecoration: 'none' }}>
              View All →
            </Link>
          </div>
          {upNextSessions.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>
              No upcoming sessions
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upNextSessions.map((session, idx) => (
                <a
                  key={session.id}
                  href={session.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '13px 14px',
                      borderRadius: '14px',
                      background: '#e8eaf0',
                      boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                      transition: 'box-shadow 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '6px 6px 12px #c2c4cc, -6px -6px 12px #ffffff')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff')}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0,
                      background: idx === 0 ? '#e0e7ff' : '#f3f4f8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={idx === 0 ? '#6366f1' : '#9999b0'} strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {idx === 0 && (
                        <div style={{
                          display: 'inline-block', fontSize: '9.5px', fontWeight: '700', color: '#6366f1',
                          background: '#e0e7ff', padding: '1px 7px', borderRadius: '20px',
                          textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px',
                        }}>
                          Up Next
                        </div>
                      )}
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e1e3a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {session.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9999b0', marginTop: '2px' }}>
                        {session.date} · {session.time}
                      </div>
                    </div>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c5c7cf" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Recent Lectures — 3-column grid ── */}
      <div className="card" style={{ padding: '22px 20px', borderRadius: '22px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e1e3a' }}>Recent Lectures</h3>
          <Link href="/recordings" style={{ fontSize: '12px', color: '#6366f1', fontWeight: '600', textDecoration: 'none' }}>
            View All →
          </Link>
        </div>
        {lectures.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>
            No lectures uploaded yet
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {lectures.map((lec) => {
              const accent = lec.class?.color || '#6366f1'
              return (
                <div
                  key={lec.id}
                  style={{
                    padding: '18px',
                    borderRadius: '18px',
                    background: '#e8eaf0',
                    boxShadow: '5px 5px 10px #c5c7cf, -5px -5px 10px #ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'box-shadow 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '7px 7px 14px #c2c4cc, -7px -7px 14px #ffffff')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '5px 5px 10px #c5c7cf, -5px -5px 10px #ffffff')}
                >
                  {/* Icon */}
                  <div style={{
                    width: '46px', height: '46px', borderRadius: '13px',
                    background: accent + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
                    </svg>
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '13px', fontWeight: '700', color: '#1e1e3a',
                      lineHeight: '1.35', marginBottom: '5px',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {lec.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#9999b0', fontWeight: '500' }}>
                      {lec.class?.name}
                      {lec.duration ? ` · ${lec.duration}` : ''}
                    </div>
                  </div>
                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#b0b2c0' }}>
                      {new Date(lec.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <Link
                      href="/recordings"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '11.5px', fontWeight: '600', color: accent, textDecoration: 'none',
                      }}
                    >
                      Watch
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Row 3: Announcements ── */}
      {announcements.length > 0 && (
        <div className="card" style={{ padding: '22px 20px', borderRadius: '22px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e1e3a', marginBottom: '16px' }}>Announcements</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {announcements.map((a) => {
              const colors: Record<string, { border: string }> = {
                info:    { border: '#3b82f6' },
                warning: { border: '#f59e0b' },
                success: { border: '#10b981' },
                error:   { border: '#ef4444' },
              }
              const c = colors[a.type] || colors.info
              return (
                <div key={a.id} style={{
                  padding: '14px 18px',
                  borderRadius: '14px',
                  background: '#e8eaf0',
                  boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                  borderLeft: `4px solid ${c.border}`,
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e1e3a', marginBottom: '4px' }}>
                    {a.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b6b8a', lineHeight: '1.55' }}>
                    {a.content}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9999b0', marginTop: '6px' }}>
                    {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes badgeGlow {
          0%, 100% { box-shadow: 0 0 6px rgba(16,185,129,0.25); }
          50%       { box-shadow: 0 0 14px rgba(16,185,129,0.55); }
        }
        @keyframes joinGlow {
          0%, 100% { box-shadow: 0 4px 15px rgba(239,68,68,0.4); }
          50%       { box-shadow: 0 4px 28px rgba(239,68,68,0.7); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes greenPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(16,185,129,0.6); }
          50%       { opacity: 0.55; box-shadow: 0 0 3px rgba(16,185,129,0.15); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(239,68,68,0.7); }
          50%       { opacity: 0.5; box-shadow: 0 0 4px rgba(239,68,68,0.2); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @media (max-width: 900px) {
          .page-container > div[style*='grid-template-columns'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
