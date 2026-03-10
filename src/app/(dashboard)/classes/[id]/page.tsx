'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface ClassDetail {
  id: string
  name: string
  description: string
  subject: string
  color: string
  icon: string
  createdBy: { name: string }
  lectures: Array<{
    id: string
    title: string
    description: string
    videoUrl: string
    notesUrl: string
    duration: string
    uploadedAt: string
    uploadedBy: { name: string }
  }>
  liveSessions: Array<{
    id: string
    title: string
    instructor: string
    date: string
    time: string
    status: string
    meetingLink: string
  }>
  materials: Array<{
    id: string
    title: string
    fileUrl: string
    fileType: string
    fileSize: string
    uploadedAt: string
  }>
}

export default function ClassDetailPage() {
  const params = useParams()
  const [cls, setCls] = useState<ClassDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'lectures' | 'materials' | 'live'>('lectures')

  useEffect(() => {
    fetch(`/api/classes/${params.id}`)
      .then(r => r.json())
      .then(data => setCls(data.class || data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: '120px', borderRadius: '12px', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '300px', borderRadius: '12px' }} />
      </div>
    )
  }

  if (!cls) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p style={{ fontSize: '16px', fontWeight: '500' }}>Class not found</p>
          <Link href="/classes" className="btn btn-primary" style={{ marginTop: '16px' }}>Back to Classes</Link>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'lectures' as const, label: 'Lectures', count: cls.lectures?.length || 0 },
    { key: 'materials' as const, label: 'Materials', count: cls.materials?.length || 0 },
    { key: 'live' as const, label: 'Live Sessions', count: cls.liveSessions?.length || 0 },
  ]

  return (
    <div className="page-container fade-in">
      {/* Class Header Banner */}
      <div className="card" style={{
        overflow: 'hidden',
        marginBottom: '20px',
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${cls.color}, ${cls.color}cc)`,
          padding: '28px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', width: '180px', height: '180px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', top: '-60px', right: '40px',
          }} />
          <div style={{
            position: 'absolute', width: '100px', height: '100px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', bottom: '-30px', right: '200px',
          }} />

          <Link href="/classes" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '12px',
            textDecoration: 'none',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back to Classes
          </Link>

          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'white', marginBottom: '6px', position: 'relative' }}>
            {cls.name}
          </h1>
          {cls.description && (
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', maxWidth: '600px', lineHeight: '1.5', position: 'relative' }}>
              {cls.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '16px', marginTop: '14px', position: 'relative' }}>
            {cls.subject && (
              <span style={{
                background: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 12px',
                borderRadius: '20px', fontSize: '12px', fontWeight: '500',
              }}>
                {cls.subject}
              </span>
            )}
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Created by {cls.createdBy?.name}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '14px 20px',
                fontSize: '13.5px',
                fontWeight: '500',
                color: tab === t.key ? cls.color : '#64748b',
                borderBottom: tab === t.key ? `2px solid ${cls.color}` : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {t.label}
              <span style={{
                background: tab === t.key ? cls.color + '18' : '#f1f5f9',
                color: tab === t.key ? cls.color : '#94a3b8',
                padding: '1px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600',
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'lectures' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cls.lectures?.length === 0 ? (
            <div className="card empty-state">
              <p style={{ fontSize: '14px' }}>No lectures uploaded yet</p>
            </div>
          ) : (
            cls.lectures?.map((lec, i) => (
              <div key={lec.id} className="card" style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px 20px',
                gap: '16px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: cls.color + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: cls.color,
                  fontWeight: '700',
                  fontSize: '14px',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '3px' }}>
                    {lec.title}
                  </div>
                  {lec.description && (
                    <p style={{ fontSize: '12.5px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lec.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                    {lec.duration && (
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {lec.duration}
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {new Date(lec.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {lec.uploadedBy && (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        by {lec.uploadedBy.name}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {lec.videoUrl && (
                    <button className="btn btn-primary btn-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      Watch
                    </button>
                  )}
                  {lec.notesUrl && (
                    <button className="btn btn-ghost btn-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Notes
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'materials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cls.materials?.length === 0 ? (
            <div className="card empty-state">
              <p style={{ fontSize: '14px' }}>No materials uploaded yet</p>
            </div>
          ) : (
            cls.materials?.map((mat) => {
              const iconColor: Record<string, string> = { PDF: '#EF4444', PPTX: '#F59E0B', DOC: '#3B82F6', DOCX: '#3B82F6' }
              return (
                <div key={mat.id} className="card" style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 20px',
                  gap: '14px',
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '8px',
                    background: (iconColor[mat.fileType?.toUpperCase()] || '#6366f1') + '15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: iconColor[mat.fileType?.toUpperCase()] || '#6366f1',
                    fontSize: '11px',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}>
                    {mat.fileType?.toUpperCase()?.slice(0, 4) || 'FILE'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0f172a' }}>{mat.title}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      {mat.fileSize || 'Unknown size'} &middot; {new Date(mat.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'live' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cls.liveSessions?.length === 0 ? (
            <div className="card empty-state">
              <p style={{ fontSize: '14px' }}>No live sessions scheduled</p>
            </div>
          ) : (
            cls.liveSessions?.map((session) => {
              const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
                live: { bg: '#fee2e2', color: '#ef4444', label: 'LIVE' },
                scheduled: { bg: '#dbeafe', color: '#3b82f6', label: 'Scheduled' },
                completed: { bg: '#d1fae5', color: '#10b981', label: 'Completed' },
              }
              const s = statusStyles[session.status] || statusStyles.scheduled
              return (
                <div key={session.id} className="card" style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px 20px',
                  gap: '14px',
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: s.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{session.title}</span>
                      <span style={{
                        padding: '1px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '600',
                        background: s.bg, color: s.color,
                      }}>
                        {s.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {session.instructor} &middot; {session.date} at {session.time}
                    </div>
                  </div>
                  {session.status !== 'completed' && (
                    <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
                      className={`btn btn-sm ${session.status === 'live' ? 'btn-danger' : 'btn-primary'}`}>
                      {session.status === 'live' ? 'Join Now' : 'Join'}
                    </a>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
