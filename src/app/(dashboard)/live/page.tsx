'use client'

import { useEffect, useState } from 'react'

interface LiveSession {
  id: string
  title: string
  description: string
  instructor: string
  date: string
  time: string
  status: string
  meetingLink: string
  class: { name: string; color: string }
}

// Status config — completed is handled separately to preserve existing faded style
const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string; bg: string }> = {
  live:        { label: 'LIVE',        color: '#16a34a', dotColor: '#16a34a', bg: 'rgba(22,163,74,0.10)' },
  cancelled:   { label: 'CANCELLED',   color: '#ef4444', dotColor: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  rescheduled: { label: 'RESCHEDULED', color: '#d97706', dotColor: '#d97706', bg: 'rgba(217,119,6,0.10)' },
  scheduled:   { label: 'UPCOMING',    color: '#6b6b8a', dotColor: '#c5c7cf', bg: 'transparent' },
  completed:   { label: 'COMPLETED',   color: '#9999b0', dotColor: '#c5c7cf', bg: 'transparent' },
}

export default function LivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/live-sessions')
      .then(r => r.json())
      .then(data => setSessions(data.sessions || data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (loading) {
    return (
      <div className="page-container">
        {[1,2,3].map(i => (
          <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '50px', marginBottom: '12px' }} />
        ))}
      </div>
    )
  }

  // Find the first "next upcoming" session (first non-completed, non-cancelled session that isn't live)
  const nextUpcomingIdx = sessions.findIndex(s => s.status === 'scheduled')

  return (
    <div className="page-container fade-in">
      {/* Header row — date and actions */}
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
            <span style={{
              position: 'absolute', top: '8px', right: '9px',
              width: '7px', height: '7px', borderRadius: '50%',
              background: '#3636e8', border: '1.5px solid #e8eaf0',
            }} />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: '48px' }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: '15px', top: '24px', bottom: '24px',
          width: '2px', background: 'linear-gradient(to bottom, #c5c7cf 0%, #3636e8 40%, #c5c7cf 100%)',
          borderRadius: '2px',
        }} />

        {sessions.map((session, idx) => {
          const isLive = session.status === 'live'
          const isCompleted = session.status === 'completed'
          const isCancelled = session.status === 'cancelled'
          const isRescheduled = session.status === 'rescheduled'
          const isNextUpcoming = idx === nextUpcomingIdx

          const statusCfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.scheduled

          // Timeline dot styling
          const dotColor = isLive ? '#16a34a' : isCancelled ? '#ef4444' : isRescheduled ? '#d97706' : isCompleted ? '#c5c7cf' : '#c5c7cf'
          const dotFill = isLive ? '#16a34a' : '#e8eaf0'
          const dotGlow = isLive
            ? '0 0 0 4px rgba(22,163,74,0.18)'
            : isNextUpcoming
            ? '0 0 0 4px rgba(54,54,232,0.12)'
            : '2px 2px 4px #c5c7cf, -2px -2px 4px #ffffff'

          // Row box shadow
          const rowShadow = isCompleted || isCancelled
            ? 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff'
            : isLive
            ? '6px 6px 14px #b8e8c8, -6px -6px 14px #ffffff'
            : isNextUpcoming
            ? '6px 6px 14px #c0c2d8, -6px -6px 14px #ffffff'
            : '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff'

          return (
            <div key={session.id} style={{ position: 'relative', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Timeline dot */}
              <div style={{
                position: 'absolute', left: '-41px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: dotFill,
                border: `2px solid ${dotColor}`,
                boxShadow: dotGlow,
                zIndex: 1,
                flexShrink: 0,
              }} />

              {/* Session row */}
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '18px 24px',
                borderRadius: '50px',
                background: '#e8eaf0',
                boxShadow: rowShadow,
                opacity: isCompleted ? 0.65 : isCancelled ? 0.55 : 1,
                transition: 'all 0.2s ease',
              }}>
                {/* Time block */}
                <div style={{ minWidth: '120px', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: isLive ? '#16a34a' : isCompleted || isCancelled ? '#9999b0' : '#6b6b8a' }}>
                    {session.time}
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '3px' }}>
                    <span style={{ color: '#9999b0' }}>{session.class?.name || ''}</span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '36px', background: '#d0d2d9', flexShrink: 0 }} />

                {/* Title + instructor + status badge */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontSize: '15px', fontWeight: '600',
                      color: isCompleted || isCancelled ? '#9999b0' : '#1e1e3a',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {session.title}
                    </span>

                    {/* Status badge — not shown for plain completed (kept faded/subdued) */}
                    {!isCompleted && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 10px', borderRadius: '50px',
                        background: statusCfg.bg,
                        fontSize: '10px', fontWeight: '700', letterSpacing: '0.04em',
                        color: statusCfg.color,
                        flexShrink: 0,
                        ...(isLive ? { boxShadow: '0 0 8px rgba(22,163,74,0.2)' } : {}),
                      }}>
                        <span style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: statusCfg.dotColor,
                          display: 'inline-block',
                          ...(isLive ? { boxShadow: '0 0 4px rgba(22,163,74,0.6)', animation: 'livePulse 1.5s infinite' } : {}),
                        }} />
                        {statusCfg.label}
                      </span>
                    )}

                    {/* "NEXT" accent for next upcoming */}
                    {isNextUpcoming && !isLive && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '2px 8px', borderRadius: '50px',
                        background: 'rgba(54,54,232,0.08)', color: '#3636e8',
                        fontSize: '10px', fontWeight: '700', letterSpacing: '0.04em',
                        flexShrink: 0,
                      }}>
                        UP NEXT
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: '#9999b0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    {session.instructor}
                  </div>
                </div>

                {/* Action button */}
                {isCompleted ? (
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                    background: '#e8eaf0', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9999b0" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                ) : isCancelled ? (
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                    background: '#e8eaf0', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </div>
                ) : isRescheduled ? (
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                    background: '#e8eaf0', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
                    </svg>
                  </div>
                ) : isLive ? (
                  <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '10px 20px', borderRadius: '50px', flexShrink: 0,
                    background: '#16a34a', color: 'white', fontWeight: '600', fontSize: '14px',
                    textDecoration: 'none',
                    boxShadow: '4px 4px 10px rgba(22,163,74,0.4), -2px -2px 6px rgba(255,255,255,0.8)',
                  }}>
                    Join
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </a>
                ) : (
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                    background: '#e8eaf0',
                    boxShadow: isNextUpcoming
                      ? '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff, 0 0 0 2px rgba(54,54,232,0.15)'
                      : '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isNextUpcoming ? '#3636e8' : '#9999b0'} strokeWidth="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* End of schedule */}
        {sessions.length > 0 && (
          <div style={{ paddingLeft: '4px', paddingTop: '8px' }}>
            <p style={{ fontSize: '13px', color: '#9999b0' }}>End of scheduled classes for today.</p>
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
