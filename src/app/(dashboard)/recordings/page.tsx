'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Lecture {
  id: string
  title: string
  description: string
  videoUrl: string
  notesUrl: string
  duration: string
  thumbnail: string
  uploadedAt: string
  class: { id: string; name: string; color: string }
  uploadedBy: { name: string }
}

export default function RecordingsPage() {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/lectures').then(r => r.json()),
      fetch('/api/classes').then(r => r.json()),
    ]).then(([lecData, clsData]) => {
      setLectures(lecData.lectures || lecData || [])
      setClasses((clsData.classes || clsData || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = lectures.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.class?.name?.toLowerCase().includes(search.toLowerCase())
    const matchClass = classFilter === 'all' || l.class?.id === classFilter
    return matchSearch && matchClass
  })

  if (loading) {
    return (
      <div className="page-container">
        <div className="grid-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card skeleton" style={{ height: '200px' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Recordings</h2>
          <p className="page-subtitle">{lectures.length} lecture recordings available</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: '1', maxWidth: '320px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search recordings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="form-input"
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="all">All Classes</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Recordings grid */}
      <div className="grid-3">
        {filtered.map((lec) => (
          <div key={lec.id} className="card" style={{
            overflow: 'hidden',
            transition: 'all 0.2s',
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
          }}
          >
            {/* Thumbnail */}
            <div style={{
              height: '130px',
              background: `linear-gradient(135deg, ${lec.class?.color || '#6366f1'}40, ${lec.class?.color || '#6366f1'}20)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={lec.class?.color || '#6366f1'} stroke="none">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
              {lec.duration && (
                <span style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '500',
                }}>
                  {lec.duration}
                </span>
              )}
            </div>

            {/* Body */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#0f172a',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {lec.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{
                  background: (lec.class?.color || '#6366f1') + '18',
                  color: lec.class?.color || '#6366f1',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                }}>
                  {lec.class?.name}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {new Date(lec.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Watch
                </button>
                {lec.notesUrl && (
                  <button className="btn btn-ghost btn-sm">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Notes
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
          </svg>
          <p style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>No recordings found</p>
          <p style={{ fontSize: '13px' }}>Try adjusting your search or filter</p>
        </div>
      )}
    </div>
  )
}
