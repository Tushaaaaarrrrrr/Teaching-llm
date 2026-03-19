'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface CourseEvent {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  meetLink: string | null
  type: string
  status: string
  manualStatus: string
  courseId: string | null
  course: { id: string; name: string; color: string } | null
  instructor: { id: string; name: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string; bg: string }> = {
  live:        { label: 'LIVE',        color: '#16a34a', dotColor: '#16a34a', bg: 'rgba(22,163,74,0.10)' },
  upcoming:    { label: 'UPCOMING',    color: '#6b6b8a', dotColor: '#c5c7cf', bg: 'transparent' },
  completed:   { label: 'COMPLETED',   color: '#9999b0', dotColor: '#c5c7cf', bg: 'transparent' },
  cancelled:   { label: 'CANCELLED',   color: '#ef4444', dotColor: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  rescheduled: { label: 'RESCHEDULED', color: '#d97706', dotColor: '#d97706', bg: 'rgba(217,119,6,0.10)' },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function LivePage() {
  const { data, isLoading } = useSWR<CourseEvent[]>('/api/course-events?type=class', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30000, // Auto-refresh every 30s to update live statuses
    dedupingInterval: 10000,
  })
  const sessions = Array.isArray(data) ? data : []

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (isLoading) {
    return (
      <div className="page-container">
        {[1,2,3].map(i => (
          <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '50px', marginBottom: '12px' }} />
        ))}
      </div>
    )
  }

  const liveSessions = sessions.filter(s => s.status === 'live')
  const upcomingSessions = sessions.filter(s => s.status === 'upcoming' || s.status === 'rescheduled')
  const recentSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled')

  const nextUpcomingSessionId = upcomingSessions.length > 0 ? upcomingSessions[0].id : null

  const renderSessionBlock = (session: CourseEvent, isNextUpcoming: boolean) => {
    const isLive = session.status === 'live'
    const isCompleted = session.status === 'completed'
    const isCancelled = session.status === 'cancelled'
    const isRescheduled = session.status === 'rescheduled'

    const statusCfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.upcoming

    const dotColor = isLive ? '#16a34a' : isCancelled ? '#ef4444' : isRescheduled ? '#d97706' : '#c5c7cf'
    const dotFill = isLive ? '#16a34a' : '#e8eaf0'
    const dotGlow = isLive
      ? '0 0 0 4px rgba(22,163,74,0.18)'
      : isNextUpcoming
      ? '0 0 0 4px rgba(54,54,232,0.12)'
      : '2px 2px 4px #c5c7cf, -2px -2px 4px #ffffff'

    const rowShadow = isCompleted || isCancelled
      ? 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff'
      : isLive
      ? '6px 6px 14px #b8e8c8, -6px -6px 14px #ffffff'
      : isNextUpcoming
      ? '6px 6px 14px #c0c2d8, -6px -6px 14px #ffffff'
      : '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff'

    return (
      <div key={session.id} style={{ position: 'relative', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{
          position: 'absolute', left: '-41px',
          width: '16px', height: '16px', borderRadius: '50%',
          background: dotFill, border: `2px solid ${dotColor}`, boxShadow: dotGlow, zIndex: 1, flexShrink: 0,
        }} />

        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '20px',
          padding: '18px 24px', borderRadius: '50px', background: '#e8eaf0',
          boxShadow: rowShadow, opacity: isCompleted ? 0.65 : isCancelled ? 0.55 : 1,
          transition: 'all 0.2s ease',
        }}>
          {/* Time block */}
          <div style={{ width: '120px', flexShrink: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: isLive ? '#16a34a' : isCompleted || isCancelled ? '#9999b0' : '#6b6b8a', whiteSpace: 'nowrap' }}>
              {formatTime(session.startTime)}
            </div>
            <div style={{ fontSize: '11px', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ color: '#9999b0' }}>{formatDate(session.startTime)} · {session.course?.name || 'General'}</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '36px', background: '#d0d2d9', flexShrink: 0 }} />

          {/* Title + Status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'nowrap', overflow: 'hidden' }}>
              <span style={{
                fontSize: '15px', fontWeight: '600',
                color: isCompleted || isCancelled ? '#9999b0' : '#1e1e3a',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                textDecoration: isCancelled ? 'line-through' : 'none',
              }}>
                {session.title}
              </span>

              {!isCompleted && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '2px 10px', borderRadius: '50px',
                  background: statusCfg.bg, fontSize: '10px', fontWeight: '700', letterSpacing: '0.04em',
                  color: statusCfg.color, flexShrink: 0,
                  ...(isLive ? { boxShadow: `0 0 8px ${statusCfg.color}33` } : {}),
                }}>
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%', background: statusCfg.dotColor, display: 'inline-block',
                    ...(isLive ? { boxShadow: `0 0 4px ${statusCfg.color}99`, animation: 'livePulse 1.5s infinite' } : {}),
                  }} />
                  {statusCfg.label}
                </span>
              )}

              {isNextUpcoming && !isLive && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '50px',
                  background: 'rgba(54,54,232,0.08)', color: '#3636e8', fontSize: '10px', fontWeight: '700', letterSpacing: '0.04em', flexShrink: 0,
                }}>
                  UP NEXT
                </span>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#9999b0', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {session.instructor?.name || 'No instructor'}
            </div>
          </div>

          {/* Action button */}
          {isCompleted ? (
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, background: '#e8eaf0', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9999b0" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          ) : isCancelled ? (
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, background: '#e8eaf0', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
          ) : isRescheduled ? (
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, background: '#e8eaf0', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
            </div>
          ) : isLive && session.meetLink ? (
            <a href={session.meetLink} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '50px', flexShrink: 0,
              background: '#16a34a', color: 'white', fontWeight: '600', fontSize: '14px', textDecoration: 'none',
              boxShadow: '4px 4px 10px rgba(22,163,74,0.4), -2px -2px 6px rgba(255,255,255,0.8)',
            }}>
              Join
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          ) : (
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, background: '#e8eaf0',
              boxShadow: isNextUpcoming ? '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff, 0 0 0 2px rgba(54,54,232,0.15)' : '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isNextUpcoming ? '#3636e8' : '#9999b0'} strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <p style={{ fontSize: '13px', color: '#9999b0' }}>Today&apos;s Schedule &bull; {today}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{
            width: '44px', height: '44px', borderRadius: '50%', border: 'none',
            background: '#e8eaf0', boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b6b8a',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
          </button>
          <button style={{
            width: '44px', height: '44px', borderRadius: '50%', border: 'none',
            background: '#e8eaf0', boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b6b8a',
            position: 'relative',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {liveSessions.length > 0 && (
              <span style={{
                position: 'absolute', top: '8px', right: '9px',
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#16a34a', border: '1.5px solid #e8eaf0',
              }} />
            )}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Category: Live */}
        {liveSessions.length > 0 && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#1e1e3a', marginBottom: '16px', paddingLeft: '8px' }}>Live Sessions</h2>
            <div style={{ position: 'relative', paddingLeft: '48px' }}>
              <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '24px', width: '2px', background: '#16a34a', borderRadius: '2px' }} />
              {liveSessions.map(session => renderSessionBlock(session, false))}
            </div>
          </div>
        )}

        {/* Category: Upcoming */}
        {upcomingSessions.length > 0 && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#1e1e3a', marginBottom: '16px', paddingLeft: '8px' }}>Upcoming Sessions</h2>
            <div style={{ position: 'relative', paddingLeft: '48px' }}>
              <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '24px', width: '2px', background: '#c5c7cf', borderRadius: '2px' }} />
              {upcomingSessions.map(session => renderSessionBlock(session, session.id === nextUpcomingSessionId))}
            </div>
          </div>
        )}

        {/* Category: Recent */}
        {recentSessions.length > 0 && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#1e1e3a', marginBottom: '16px', paddingLeft: '8px' }}>Recent Sessions</h2>
            <div style={{ position: 'relative', paddingLeft: '48px' }}>
              <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '24px', width: '2px', background: '#e8eaf0', borderRadius: '2px' }} />
              {recentSessions.map(session => renderSessionBlock(session, false))}
            </div>
          </div>
        )}
        {sessions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9999b0' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c5c7cf" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            <p style={{ fontWeight: '500' }}>No sessions scheduled</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}
