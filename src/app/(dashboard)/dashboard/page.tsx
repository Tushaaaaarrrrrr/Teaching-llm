'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function DashboardPage() {
  const { data: dashboardData, error, isLoading: loading, mutate } = useSWR('/api/dashboard', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true
  })

  const [activeCard, setActiveCard] = useState(0)
  const [sliding, setSliding] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [wasWelcomeShownInSession, setWasWelcomeShownInSession] = useState(false)

  useEffect(() => {
    const welcomeKey = `welcome_shown_${dashboardData?.user?.userId}`
    const hasAlreadyShownLocal = localStorage.getItem(welcomeKey)

    if (
      dashboardData?.user && 
      dashboardData.user.hasSeenWelcome === false && 
      !showWelcome && 
      !wasWelcomeShownInSession &&
      !hasAlreadyShownLocal
    ) {
      setShowWelcome(true)
      setWasWelcomeShownInSession(true)
      localStorage.setItem(welcomeKey, 'true')
      fetch('/api/users/welcome', { method: 'POST' })
        .then(() => mutate())
        .catch(console.error)
    }
  }, [dashboardData, showWelcome, wasWelcomeShownInSession, mutate])

  const handleNextLive = () => {
    if (!dashboardData?.liveSessions?.length) return
    setSliding(true)
    setTimeout(() => {
      setActiveCard(prev => (prev + 1) % dashboardData.liveSessions.length)
      setSliding(false)
    }, 180)
  }

  // Map data from SWR response
  const stats = dashboardData?.stats || null
  const role = dashboardData?.user?.role || ''
  const isManager = role === 'MANAGER'

  const liveSessions = dashboardData?.liveSessions || []
  const liveNow = liveSessions.filter((s: any) => s.status === 'live').slice(0, 3)
  const upNextSessions = liveSessions.filter((s: any) => s.status === 'scheduled' || s.status === 'upcoming').slice(0, 2)

  const lectures = (dashboardData?.lectures || []).slice(0, 3)
  const announcements = (dashboardData?.announcements || []).slice(0, 3)

  const statCards = [
    { label: 'Total Courses', value: stats?.totalCourses ?? 0, color: '#6366f1', bg: '#e0e7ff', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
    )},
    { label: 'Lectures', value: stats?.totalLectures ?? 0, color: '#8b5cf6', bg: '#ede9fe', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
    )},
    ...(isManager ? [{
      label: 'Students Enrolled', value: stats?.totalStudents ?? 0, color: '#10b981', bg: '#d1fae5', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      ),
    }] : [
      { label: 'Upcoming Sessions', value: stats?.upcomingSessions ?? 0, color: '#f59e0b', bg: '#fef3c7', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      )},
    ]),
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

      {!isManager && (
        <>
          {/* ── Row 1: Active Now + Up Next ── */}
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
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

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
                        {frontSession.instructor}{frontSession.course?.name ? ` · ${frontSession.course.name}` : ''}
                      </span>
                    </div>
                  </div>

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
                    Join Live Course
                  </a>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '10px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f3f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c5c7cf" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '13px', color: '#9999b0', fontWeight: '500', textAlign: 'center' }}>No active courses right now</div>
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

          {/* ── Row 2: Recent Lectures ── */}
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
                  const accent = lec.course?.color || '#6366f1'
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
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '13px',
                        background: accent + '20',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '13px', fontWeight: '700', color: '#1e1e3a',
                          lineHeight: '1.35', marginBottom: '5px',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {lec.title}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#9999b0', fontWeight: '500' }}>
                          {lec.course?.name}
                          {lec.duration ? ` · ${lec.duration}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: '#b0b2c0' }}>
                          {new Date(lec.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <Link href="/recordings" style={{ fontSize: '11.5px', fontWeight: '600', color: accent, textDecoration: 'none' }}>
                          Watch →
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

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
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.85); }
          70% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
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
      {/* Welcome Popup */}
      {showWelcome && (
        <div className="modal-overlay" style={{ zIndex: 9999, backdropFilter: 'blur(8px)', background: 'rgba(15,23,42,0.6)' }} onClick={() => setShowWelcome(false)}>
          <div 
            className="modal" 
            style={{ 
              maxWidth: '560px', 
              padding: '0', 
              overflow: 'hidden', 
              borderRadius: '24px', 
              background: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              animation: 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              padding: '52px 32px 36px',
              textAlign: 'center',
              position: 'relative'
            }}>
              <button 
                onClick={() => setShowWelcome(false)} 
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              
              <div style={{ 
                width: '84px', height: '84px', borderRadius: '50%', background: '#ffffff', 
                margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)' 
              }}>
                <span style={{ fontSize: '38px', lineHeight: '1' }}>👋</span>
              </div>
              <h2 style={{ fontSize: '34px', fontWeight: '800', color: '#ffffff', marginBottom: '10px', lineHeight: '1.2' }}>
                Welcome, {dashboardData?.user?.name?.split(' ')[0] || 'Student'}!
              </h2>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
                We're excited to have you on board.
              </p>
            </div>
            <div style={{ padding: '36px', textAlign: 'center', background: '#f8fafc' }}>
              <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '36px', lineHeight: '1.6' }}>
                Dive into your courses, join live sessions, and start your learning journey today. Your central learning workspace is ready.
              </p>
              <button 
                onClick={() => setShowWelcome(false)}
                style={{
                  background: '#1e293b', color: '#ffffff', border: 'none', padding: '16px 44px',
                  borderRadius: '50px', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(30,41,59,0.25)', transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(30,41,59,0.35)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(30,41,59,0.25)' }}
              >
                Let's Get Started
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
