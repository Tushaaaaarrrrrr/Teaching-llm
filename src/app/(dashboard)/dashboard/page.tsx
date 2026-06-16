'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { formatISTDate, getEventStatus } from '@/lib/date-utils'
import { normalizeMeetLink } from '@/lib/meet-link'
import HomeHeroSlider, { HeroSlide } from '@/components/home/HomeHeroSlider'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function DashboardPage() {
  const { data: dashboardData, error, isLoading: loading, mutate } = useSWR('/api/dashboard', fetcher, {
    revalidateOnFocus: false
  })
  const { data: featuredOfferings } = useSWR('/api/course-offerings', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })
  const { data: homeSlidesData } = useSWR('/api/admin/home-slides', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })
  const homeSlides = Array.isArray(homeSlidesData) && homeSlidesData.length > 0 ? homeSlidesData : [
    { image: '/images/qualifier-session.png', alt: 'Qualifier Session', href: 'https://www.youtube.com/@Gen-ZIITian/videos' },
    { image: '/images/level-up.png',          alt: 'Level Up',          href: 'https://genziitian.in/courses' },
    { image: '/images/join-community.png',    alt: 'Join Community',    href: 'https://genziitian.in/newsletter' },
  ]

  // Move declarations up to avoid Temporal Dead Zone (TDZ)
  const stats = dashboardData?.stats || null
  const examCountdown = dashboardData?.examCountdown || null
  const role = dashboardData?.user?.role || ''
  const isManager = role === 'MANAGER'
  const isStudentView = role === 'STUDENT' || role === 'ADMIN'

  const liveSessions = dashboardData?.liveSessions || []
  const liveNow = liveSessions.filter((s: any) => 
    getEventStatus(s.startTime, s.endTime, s.manualStatus || s.status) === 'live'
  )
  const liveNowCount = liveNow.length
  const upNextSessions = liveSessions.filter((s: any) => 
    getEventStatus(s.startTime, s.endTime, s.manualStatus || s.status) === 'upcoming'
  ).slice(0, 2)
  const upNextCount = liveSessions.filter((s: any) =>
    getEventStatus(s.startTime, s.endTime, s.manualStatus || s.status) === 'upcoming'
  ).length

  const recentViewedLecture = dashboardData?.recentViewedLecture || null
  const announcements = (dashboardData?.announcements || []).slice(0, 3)

  const [activeCard, setActiveCard] = useState(0)
  const [sliding, setSliding] = useState(false)
  const [nowTick, setNowTick] = useState(Date.now())
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768)
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTick(Date.now()), 30000)
    return () => window.clearInterval(intervalId)
  }, [])

  // Auto-refresh countdown timer at 12:01 AM each day
  useEffect(() => {
    const refreshAtMidnight = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 1, 0, 0) // 12:01 AM

      const timeUntilMidnight = tomorrow.getTime() - now.getTime()

      const timerId = window.setTimeout(() => {
        mutate() // Refresh data at 12:01 AM
        refreshAtMidnight() // Schedule next refresh
      }, timeUntilMidnight)

      return () => window.clearTimeout(timerId)
    }

    const cleanup = refreshAtMidnight()
    return cleanup
  }, [])

  // Auto-roll carousel every 10s if multiple sessions are active
  useEffect(() => {
    if (liveNow.length <= 1) {
      if (activeCard !== 0) setActiveCard(0)
      return
    }

    const rollInterval = setInterval(() => {
      handleNextLive(liveNow.length)
    }, 10000)

    return () => clearInterval(rollInterval)
  }, [liveNow.length])

  const handleNextLive = (count?: number | React.MouseEvent) => {
    const total = typeof count === 'number' ? count : liveNow.length
    if (total <= 1) return
    setSliding(true)
    setTimeout(() => {
      setActiveCard(prev => (prev + 1) % total)
      setSliding(false)
    }, 180)
  }


  const [isEditingTimer, setIsEditingTimer] = useState(false)
  const [timerTitle, setTimerTitle] = useState('')
  const [timerDays, setTimerDays] = useState(0)

  const handleUpdateTimer = async () => {
    try {
      const res = await fetch('/api/admin/dashboard/countdown', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: timerTitle, daysLeft: Number(timerDays) })
      })
      if (res.ok) {
        mutate()
        setIsEditingTimer(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getTimerColor = (days: number) => {
    if (days === 0) return '#ffffff'
    if (days <= 3) {
      // Transition from yellow (#fef3c7) to light red (#fee2e2)
      // For simplicity, we'll use solid colors or a gradient
      return 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' 
    }
    return '#fef3c7' // Soft yellow
  }


  const statCards = [
    { label: 'Total Courses', value: stats?.totalCourses ?? 0, color: '#6366f1', bg: '#e0e7ff', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
    )},
    { label: 'Lectures', value: stats?.totalLectures ?? 0, color: '#8b5cf6', bg: '#ede9fe', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
    )},
    ...(!isStudentView ? [{
      label: 'Students Enrolled', value: stats?.totalStudents ?? 0, color: '#10b981', bg: '#d1fae5', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      ),
    }] : [
      { label: 'Upcoming Sessions', value: upNextCount, color: '#f59e0b', bg: '#fef3c7', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      )},
    ]),
    { 
      label: examCountdown?.title || 'Exam Countdown', 
      value: `${examCountdown?.daysLeft ?? 0} Days`, 
      color: (examCountdown?.daysLeft ?? 0) <= 3 && (examCountdown?.daysLeft ?? 0) > 0 ? '#ef4444' : '#f59e0b', 
      bg: getTimerColor(examCountdown?.daysLeft ?? 0),
      isTimer: true,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      )
    },
    ...(!isStudentView ? [
      { 
        label: 'Active Sessions', 
        value: liveNowCount, 
        color: '#f43f5e', 
        bg: '#fff1f2', 
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        )
      },
      { 
        label: 'Support System', 
        value: dashboardData?.supportSummary?.isSupportActive ? 'Online' : 'Offline', 
        color: '#3636e8', 
        bg: '#ebebff', 
        isSupport: true,
        summary: dashboardData?.supportSummary,
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )
      }
    ] : [])
  ]

  if (loading) {
    return (
      <div className="page-container">
        <div className="dashboard-stats-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="stat-card" style={{ background: 'var(--surface)' }}>
              <div className="skeleton" style={{ height: '48px', width: '48px', borderRadius: '14px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: '14px', width: '80px', marginBottom: '8px' }} />
                <div className="skeleton" style={{ height: '28px', width: '48px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const frontSession = liveNow[activeCard] || liveNow[0]
  const hasLive = liveNow.length > 0

  return (
    <div className="page-container fade-in">
      <style>{`
        @media (max-width: 768px) {
          .dashboard-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
            margin-bottom: 16px !important;
            margin-top: 16px !important;
          }
          .stat-card {
            padding: 12px 14px !important;
            gap: 10px !important;
            border-radius: 16px !important;
          }
          .stat-card-icon {
            width: 36px !important;
            height: 36px !important;
            border-radius: 10px !important;
          }
          .stat-card-icon svg {
            width: 16px !important;
            height: 16px !important;
          }
          .stat-card-label {
            font-size: 9px !important;
            letter-spacing: 0.03em !important;
          }
          .stat-card-value {
            font-size: 18px !important;
          }
        }
        @media (max-width: 380px) {
          .dashboard-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .stat-card {
            padding: 8px 10px !important;
            gap: 6px !important;
            border-radius: 12px !important;
          }
          .stat-card-icon {
            width: 28px !important;
            height: 28px !important;
            border-radius: 8px !important;
          }
          .stat-card-icon svg {
            width: 14px !important;
            height: 14px !important;
          }
          .stat-card-value {
            font-size: 15px !important;
          }
        }
      `}</style>

      {/* Stats Grid */}
      <div
        className="dashboard-stats-grid"
        style={{
          marginBottom: isMobile ? '16px' : '24px',
          marginTop: isMobile ? '16px' : '24px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
          gap: isMobile ? '12px' : '20px'
        }}
      >
        {statCards.filter(c => !c.isSupport && c.label !== 'Active Sessions' && !isMobile).map((card) => {
          const mobileHero = isMobile && card.isTimer
          return (
          <div key={card.label} className="stat-card" style={{
            background: mobileHero
              ? 'linear-gradient(135deg, #ffffff 0%, #f8faff 60%, #eef2ff 100%)'
              : (card.isTimer ? card.bg : undefined),
            padding: mobileHero ? '22px 22px' : (isMobile ? '12px 14px' : '22px 24px'),
            gap: isMobile ? '14px' : '20px',
            borderRadius: mobileHero ? '22px' : (isMobile ? '16px' : '20px'),
            border: mobileHero ? '1px solid rgba(99, 102, 241, 0.10)' : undefined,
            boxShadow: mobileHero ? '0 12px 30px -10px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.04)' : undefined,
            position: 'relative', overflow: 'hidden',
          } as React.CSSProperties}>
            {mobileHero && (
              <span style={{ position: 'absolute', top: '-40px', right: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.10), transparent 70%)', pointerEvents: 'none' }} />
            )}
            <div className="stat-card-icon" style={{
              background: mobileHero ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : (card.isTimer ? 'rgba(255,255,255,0.4)' : card.bg),
              color: mobileHero ? '#ffffff' : card.color,
              width: mobileHero ? '48px' : (isMobile ? '36px' : '48px'),
              height: mobileHero ? '48px' : (isMobile ? '36px' : '48px'),
              borderRadius: mobileHero ? '14px' : (isMobile ? '10px' : '14px'),
              boxShadow: mobileHero ? '0 8px 18px rgba(99,102,241,0.35)' : undefined,
              flexShrink: 0,
            }}>
              {card.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              <div className="stat-card-label" style={{
                color: mobileHero ? '#6366f1' : (card.isTimer && (examCountdown?.daysLeft ?? 0) > 0 ? 'rgba(0,0,0,0.5)' : undefined),
                fontSize: mobileHero ? '10.5px' : undefined,
                fontWeight: mobileHero ? 800 : undefined,
                letterSpacing: mobileHero ? '0.08em' : undefined,
              }}>
                {card.label}
              </div>
              <div className="stat-card-value" style={{
                fontSize: mobileHero ? '26px' : undefined,
                fontWeight: mobileHero ? 900 : undefined,
                color: mobileHero ? '#1e1e3a' : undefined,
                marginTop: mobileHero ? '4px' : undefined,
                letterSpacing: mobileHero ? '-0.02em' : undefined,
              }}>
                {card.value}
              </div>
            </div>

            {card.isTimer && isManager && (
              <button
                onClick={() => {
                  setTimerTitle(examCountdown?.title || 'Exam Countdown')
                  setTimerDays(examCountdown?.daysLeft || 0)
                  setIsEditingTimer(true)
                }}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1e1e3a" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            )}
          </div>
          )
        })}
      </div>

      {/* Manager Specific Cards (Active Sessions & Support) */}
      {isManager && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 5fr) minmax(0, 2fr)',
          gap: isMobile ? '12px' : '20px',
          marginBottom: '24px'
        }}>
          {/* Active Sessions Card (Student UI Style) */}
          <div className="card" style={{
            padding: '24px',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {hasLive && frontSession ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    background: 'rgba(244,63,94,0.1)',
                    padding: '6px 14px', borderRadius: '20px',
                  }}>
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: '#f43f5e', flexShrink: 0,
                      animation: 'livePulse 1.5s infinite',
                    }} />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Active Sessions
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#9999b0', fontWeight: '600' }}>
                      {frontSession.time}
                    </span>
                    {liveSessions.length > 1 && (
                      <button
                        onClick={handleNextLive}
                        style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: '#e8eaf0',
                          boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: 'none', cursor: 'pointer', transition: 'box-shadow 0.2s',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5">
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
                    transition: 'all 0.2s ease',
                    flex: 1
                  }}
                >
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e1e3a', lineHeight: '1.2', marginBottom: '8px' }}>
                    {frontSession.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: '14px', color: '#6b6b8a', fontWeight: '600' }}>
                      {frontSession.instructor}{frontSession.course?.name ? ` · ${frontSession.course.name}` : ''}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  {liveSessions.length > 1 ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {liveSessions.map((_, i) => (
                        <div
                          key={i}
                          onClick={() => setActiveCard(i)}
                          style={{
                            width: i === activeCard ? '24px' : '8px',
                            height: '8px',
                            borderRadius: '4px',
                            background: i === activeCard ? '#f43f5e' : '#e2e8f0',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                  ) : <div />}

                  <a
                    href={normalizeMeetLink(frontSession.meetLink) ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      background: '#f43f5e',
                      boxShadow: '0 8px 20px rgba(244,63,94,0.3)',
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: '800'
                    }}
                  >
                    Join as Instructor
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', color: '#1e1e3a', fontWeight: '700' }}>No Active Sessions</div>
                  <div style={{ fontSize: '13px', color: '#9999b0', marginTop: '4px' }}>All live courses are currently offline</div>
                </div>
              </div>
            )}
          </div>

          {/* Support System Card (Refined) */}
          <div className="card" style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #ebebff 0%, #e0e0ff 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3636e8',
                boxShadow: '0 4px 12px rgba(54,54,232,0.1)'
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div style={{
                padding: '6px 12px',
                borderRadius: '50px',
                background: dashboardData?.supportSummary?.isSupportActive ? '#dcfce7' : '#fee2e2',
                color: dashboardData?.supportSummary?.isSupportActive ? '#15803d' : '#b91c1c',
                fontSize: '11px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {dashboardData?.supportSummary?.isSupportActive ? 'Online' : 'Offline'}
              </div>
            </div>

            <div style={{ margin: '20px 0' }}>
              <div style={{ fontSize: '12px', color: '#6b6b8a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Support System
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e1e3a' }}>
                {dashboardData?.supportSummary?.openTickets ?? 0}
              </div>
              <div style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: '600' }}>
                Open Support Tickets
              </div>
            </div>

            <Link href="/support" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
              background: '#3636e8',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '800',
              borderRadius: '12px',
              boxShadow: '0 8px 20px rgba(54,54,232,0.3)',
              textDecoration: 'none',
              transition: 'transform 0.2s'
            }}>
              Go to Support
            </Link>
          </div>
        </div>
      )}

      {/* Timer Edit Modal */}
      {isEditingTimer && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 800 }}>Edit Exam Timer</h3>
              <button onClick={() => setIsEditingTimer(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Headline / Title</label>
                <input 
                  className="form-input"
                  value={timerTitle}
                  onChange={e => setTimerTitle(e.target.value)}
                  placeholder="e.g., JEE Advanced 2026"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Days Remaining</label>
                <input 
                  className="form-input"
                  type="number"
                  value={timerDays}
                  onChange={e => setTimerDays(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setIsEditingTimer(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateTimer}>Update Timer</button>
            </div>
          </div>
        </div>
      )}

      {!isManager && (
        <>
          <HomeHeroSlider slides={homeSlides} />
          {/* ── Row 1: Active Now + Up Next (desktop only on mobile they're replaced by Featured Courses) ── */}
          {!isMobile && (
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '20px',
                      marginTop: '8px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e1e3a', lineHeight: '1.2', marginBottom: '2px' }}>
                        {frontSession.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: '600' }}>
                        {frontSession.instructor}{frontSession.course?.name ? ` · ${frontSession.course.name}` : ''}
                      </div>
                    </div>

                    <a
                      href={normalizeMeetLink(frontSession.meetLink) ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '14px 32px',
                        borderRadius: '14px',
                        background: '#ef4444',
                        color: '#ffffff', fontSize: '15px', fontWeight: '800',
                        textDecoration: 'none', letterSpacing: '0.01em',
                        animation: 'joinPulse 2s ease-in-out infinite, joinGlow 2.5s ease-in-out infinite',
                        transition: 'transform 0.2s, background 0.18s',
                        boxShadow: '0 8px 20px rgba(239,68,68,0.3)',
                        whiteSpace: 'nowrap',
                        marginLeft: '10px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '6px',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                        </svg>
                      </div>
                      Join Live
                    </a>
                  </div>

                  {liveSessions.length > 1 && (
                    <div style={{ display: 'flex', gap: '5px', marginTop: '12px' }}>
                      {liveSessions.map((_, i) => (
                        <div
                          key={i}
                          onClick={() => setActiveCard(i)}
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
                  )}
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
                      href={normalizeMeetLink(session.meetLink) ?? '#'}
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

          )}


          {/* Categories: temporarily hidden — will be re-enabled later. */}

          {/* ── Mobile-only: Upcoming Session (compact) ── */}
          {isMobile && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px', padding: '0 4px', gap: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#1e1e3a', letterSpacing: '-0.02em', margin: 0 }}>
                    Upcoming Session
                  </h3>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#9999b0', marginTop: '2px' }}>
                    Your next live class
                  </div>
                </div>
                <Link href="/live" style={{ fontSize: '12px', color: '#6366f1', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  View All →
                </Link>
              </div>
              {hasLive && frontSession ? (
                <a
                  href={normalizeMeetLink(frontSession.meetLink) ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '18px',
                    borderRadius: '20px',
                    background: '#ffffff',
                    border: '1px solid rgba(15, 23, 42, 0.05)',
                    boxShadow: '0 14px 30px -12px rgba(15, 23, 42, 0.15), 0 4px 8px -2px rgba(15, 23, 42, 0.04)',
                    textDecoration: 'none', color: 'inherit',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  <span style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(180deg, #ef4444, #f97316)' }} />
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #ef4444, #f97316)', color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 18px rgba(239,68,68,0.4)',
                    animation: 'redLivePulse 2s ease-in-out infinite',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'redLivePulse 1.4s infinite' }} />
                      LIVE NOW · {frontSession.time}
                    </div>
                    <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#1e1e3a', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {frontSession.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {frontSession.instructor}{frontSession.course?.name ? ` · ${frontSession.course.name}` : ''}
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    fontSize: '12px', fontWeight: 800, color: '#ffffff',
                    padding: '8px 14px', borderRadius: '50px',
                    background: 'linear-gradient(135deg, #ef4444, #f97316)',
                    boxShadow: '0 6px 14px rgba(239,68,68,0.4)',
                    flexShrink: 0,
                  }}>
                    Join
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                </a>
              ) : upNextSessions.length > 0 ? (
                <a
                  href={normalizeMeetLink(upNextSessions[0].meetLink) ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '18px',
                    borderRadius: '20px',
                    background: '#ffffff',
                    border: '1px solid rgba(15, 23, 42, 0.05)',
                    boxShadow: '0 14px 30px -12px rgba(15, 23, 42, 0.15), 0 4px 8px -2px rgba(15, 23, 42, 0.04)',
                    textDecoration: 'none', color: 'inherit',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  <span style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(180deg, #6366f1, #4f46e5)' }} />
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 18px rgba(99,102,241,0.40)',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
                      UP NEXT · {upNextSessions[0].time}
                    </div>
                    <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#1e1e3a', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {upNextSessions[0].title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {upNextSessions[0].date}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9999b0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </a>
              ) : (
                <div style={{
                  padding: '32px 16px', textAlign: 'center', color: '#9999b0', fontSize: '13px',
                  background: '#ffffff', borderRadius: '20px',
                  border: '1px solid rgba(15, 23, 42, 0.05)',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.8" style={{ marginBottom: '8px' }}>
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                  <div style={{ fontWeight: 700, color: '#6b6b8a' }}>No upcoming sessions</div>
                  <div style={{ fontSize: '11px', marginTop: '2px' }}>Check back later for live classes</div>
                </div>
              )}
            </div>
          )}

          {/* ── Row 2: Recent Lecture Viewed ── */}
          <div className={isMobile ? '' : 'card'} style={isMobile ? { marginBottom: '24px' } : { padding: '22px 20px', borderRadius: '22px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: isMobile ? '14px' : '18px', padding: isMobile ? '0 4px' : '0', gap: '12px' }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: isMobile ? '18px' : '16px', fontWeight: isMobile ? 900 : 700, color: '#1e1e3a', letterSpacing: isMobile ? '-0.02em' : 'normal', margin: 0 }}>
                  Recent Lecture
                </h3>
                {isMobile && (
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#9999b0', marginTop: '2px' }}>
                    Pick up where you left off
                  </div>
                )}
              </div>
              {recentViewedLecture && (
                <Link href="/materials/recordings" style={{ fontSize: '12px', color: '#6366f1', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  View All →
                </Link>
              )}
            </div>
            {!recentViewedLecture ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center', color: '#9999b0', fontSize: '13px',
                background: '#ffffff', borderRadius: '20px',
                border: '1px solid rgba(15, 23, 42, 0.05)',
              }}>
                No recent lectures
              </div>
            ) : (
              <div style={{ display: 'flex' }}>
                {(() => {
                  const lec = recentViewedLecture.content
                  const accent = lec.topic?.course?.color || '#6366f1'
                  return (
                    <div
                      key={lec.id}
                      style={{
                        padding: isMobile ? '18px' : '24px',
                        borderRadius: isMobile ? '20px' : '24px',
                        background: isMobile ? '#ffffff' : '#e8eaf0',
                        boxShadow: isMobile
                          ? '0 14px 30px -12px rgba(15, 23, 42, 0.15), 0 4px 8px -2px rgba(15, 23, 42, 0.04)'
                          : '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff',
                        border: isMobile ? '1px solid rgba(15, 23, 42, 0.05)' : undefined,
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'stretch' : 'center',
                        gap: isMobile ? '16px' : '24px',
                        width: '100%',
                        transition: 'all 0.2s',
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      {isMobile && (
                        <span style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: `linear-gradient(180deg, ${accent}, ${accent}88)`, borderRadius: '4px 0 0 4px' }} />
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
                        <div style={{
                          width: isMobile ? '48px' : '56px', height: isMobile ? '48px' : '56px', borderRadius: isMobile ? '14px' : '16px',
                          background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                          color: '#ffffff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: isMobile ? `0 8px 18px ${accent}40` : undefined,
                        }}>
                          <svg width={isMobile ? '22' : '24'} height={isMobile ? '22' : '24'} viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: isMobile ? '10px' : '11px', color: accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
                            {lec.topic?.course?.name || 'Course Lecture'}
                          </div>
                          <div style={{
                            fontSize: isMobile ? '15.5px' : '18px', fontWeight: 800, color: '#1e1e3a',
                            lineHeight: '1.25', marginBottom: '4px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {lec.title}
                          </div>
                          <div style={{ fontSize: isMobile ? '11px' : '12px', color: '#94a3b8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            Last viewed on {formatISTDate(recentViewedLecture.updatedAt)}
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/courses/${lec.topic?.courseId}/lectures/${lec.id}`}
                        className="btn btn-primary"
                        style={{
                          background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
                          boxShadow: `0 8px 18px ${accent}40`,
                          padding: isMobile ? '12px 22px' : '12px 28px',
                          fontSize: isMobile ? '13.5px' : '14px',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          width: isMobile ? '100%' : 'auto',
                          justifyContent: 'center',
                          letterSpacing: '0.01em',
                        }}
                      >
                        Continue Watching
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><polyline points="9 18 15 12 9 6"/></svg>
                      </Link>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* ── Row 3: Upcoming Assessments ── */}
          <div className={isMobile ? '' : 'card'} style={isMobile ? { marginBottom: '24px' } : { padding: '22px 20px', borderRadius: '22px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: isMobile ? '14px' : '18px', padding: isMobile ? '0 4px' : '0', gap: '12px' }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: isMobile ? '18px' : '16px', fontWeight: isMobile ? 900 : 700, color: '#1e1e3a', letterSpacing: isMobile ? '-0.02em' : 'normal', margin: 0 }}>
                  Upcoming Assessments
                </h3>
                {isMobile && (
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#9999b0', marginTop: '2px' }}>
                    Tests scheduled for you
                  </div>
                )}
              </div>
              <Link href="/exams" style={{ fontSize: '12px', color: '#6366f1', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                View All →
              </Link>
            </div>
            {!dashboardData?.upcomingExams?.length ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center', color: '#9999b0', fontSize: '13px',
                background: isMobile ? '#ffffff' : 'transparent', borderRadius: '20px',
                border: isMobile ? '1px solid rgba(15, 23, 42, 0.05)' : 'none',
              }}>
                No upcoming exams or tests
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? '12px' : '14px' }}>
                {dashboardData.upcomingExams.map((exam: any) => {
                  const accent = exam.course?.color || '#6366f1'
                  return (
                    <div
                      key={exam.id}
                      style={{
                        padding: isMobile ? '18px' : '18px',
                        borderRadius: isMobile ? '20px' : '18px',
                        background: isMobile ? '#ffffff' : '#e8eaf0',
                        boxShadow: isMobile
                          ? '0 14px 30px -12px rgba(15, 23, 42, 0.15), 0 4px 8px -2px rgba(15, 23, 42, 0.04)'
                          : '5px 5px 10px #c5c7cf, -5px -5px 10px #ffffff',
                        border: isMobile ? '1px solid rgba(15, 23, 42, 0.05)' : undefined,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        transition: 'all 0.2s',
                        borderTop: `4px solid ${accent}`,
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          background: accent + '15',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: '800', color: accent, background: accent + '10', padding: '2px 8px', borderRadius: '6px' }}>
                          {exam.examType === 'FINAL_TEST' ? 'FINAL' : 'PRACTICE'}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px', fontWeight: '800', color: '#1e1e3a',
                          lineHeight: '1.3', marginBottom: '4px',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {exam.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b6b8a', fontWeight: '600' }}>
                          {exam.course?.name}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9999b0" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                           <span style={{ fontSize: '10px', color: '#9999b0', fontWeight: '600' }}>
                             {new Date(exam.startDate || exam.createdAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                           </span>
                         </div>
                        <Link href={`/exams`} style={{ fontSize: '11px', fontWeight: '700', color: '#3636e8', textDecoration: 'none' }}>
                          View Details
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
                    {new Date(a.createdAt).toLocaleDateString('en-GB', { month: '2-digit', day: '2-digit', year: 'numeric' })}
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
        @keyframes redirectFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes redirectSpin { to { transform: rotate(360deg); } }
        @keyframes redLivePulse { 0%, 100% { box-shadow: 0 8px 18px rgba(239,68,68,0.40); } 50% { box-shadow: 0 8px 24px rgba(239,68,68,0.65); } }
      `}</style>

    </div>
  )
}
