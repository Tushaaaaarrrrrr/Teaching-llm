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

      {/* Recordings list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map((lec) => (
          <div key={lec.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            padding: '16px 24px',
            borderRadius: '50px',
            background: '#e8eaf0',
            boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff',
            transition: 'box-shadow 0.2s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '8px 8px 16px #c2c4cc, -8px -8px 16px #ffffff')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff')}
          >
            {/* Play badge */}
            <div style={{
              width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
              background: '#e8eaf0',
              boxShadow: '3px 3px 7px #c5c7cf, -3px -3px 7px #ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={lec.class?.color || '#6366f1'} stroke="none">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e1e3a', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lec.title}
              </div>
              <div style={{ fontSize: '12px', color: '#9999b0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ color: lec.class?.color || '#6366f1', fontWeight: '500' }}>{lec.class?.name}</span>
                {lec.duration && <span>&bull; {lec.duration}</span>}
                <span>&bull; {new Date(lec.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                {lec.uploadedBy && <span>&bull; {lec.uploadedBy.name}</span>}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button className="btn btn-primary btn-sm">
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
