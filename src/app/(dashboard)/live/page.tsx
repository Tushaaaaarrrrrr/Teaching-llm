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

export default function LivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/live-sessions')
      .then(r => r.json())
      .then(data => setSessions(data.sessions || data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all'
    ? sessions
    : sessions.filter(s => s.status === filter)

  const statusConfig: Record<string, { bg: string; color: string; label: string; dot?: string }> = {
    live: { bg: '#fee2e2', color: '#ef4444', label: 'LIVE NOW', dot: '#ef4444' },
    scheduled: { bg: '#dbeafe', color: '#3b82f6', label: 'Scheduled' },
    completed: { bg: '#d1fae5', color: '#10b981', label: 'Completed' },
  }

  if (loading) {
    return (
      <div className="page-container">
        {[1,2,3].map(i => (
          <div key={i} className="card skeleton" style={{ height: '100px', marginBottom: '12px' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Live Classes</h2>
          <p className="page-subtitle">{sessions.filter(s => s.status === 'live').length} live now &middot; {sessions.filter(s => s.status === 'scheduled').length} upcoming</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'live', label: 'Live' },
            { key: 'scheduled', label: 'Scheduled' },
            { key: 'completed', label: 'Completed' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live sessions cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map((session) => {
          const sc = statusConfig[session.status] || statusConfig.scheduled
          return (
            <div key={session.id} className="card" style={{
              display: 'flex',
              alignItems: 'center',
              padding: '20px 24px',
              gap: '18px',
              borderLeft: `4px solid ${sc.color}`,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'}
            >
              {/* Icon */}
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: sc.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                position: 'relative',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={sc.color} strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                {session.status === 'live' && (
                  <div style={{
                    position: 'absolute', top: '-2px', right: '-2px',
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: '#ef4444', border: '2px solid white',
                    animation: 'pulse 2s infinite',
                  }} />
                )}
              </div>

              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{session.title}</h3>
                  <span style={{
                    padding: '2px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '700',
                    background: sc.bg, color: sc.color, letterSpacing: '0.03em',
                  }}>
                    {sc.label}
                  </span>
                </div>
                {session.description && (
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                    {session.class?.name}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {session.instructor}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {session.date}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {session.time}
                  </span>
                </div>
              </div>

              {/* Action */}
              {session.status === 'live' ? (
                <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
                  className="btn btn-danger btn-lg" style={{ flexShrink: 0, animation: 'pulse 2s infinite' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                  Join Now
                </a>
              ) : session.status === 'scheduled' ? (
                <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
                  className="btn btn-primary" style={{ flexShrink: 0 }}>
                  Join
                </a>
              ) : (
                <span className="badge badge-success">Ended</span>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
          <p style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>No sessions found</p>
          <p style={{ fontSize: '13px' }}>Try a different filter</p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
