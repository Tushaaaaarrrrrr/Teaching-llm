'use client'

import { useEffect, useState } from 'react'

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
  const [classes, setClasses] = useState<Array<{ id: string; name: string; color: string }>>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/lectures').then(r => r.json()),
      fetch('/api/classes').then(r => r.json()),
    ]).then(([lecData, clsData]) => {
      setLectures(lecData.lectures || lecData || [])
      setClasses((clsData.classes || clsData || []).map((c: { id: string; name: string; color: string }) => ({ id: c.id, name: c.name, color: c.color })))
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

      {/* Search bar */}
      <div style={{ marginBottom: '16px', position: 'relative', maxWidth: '420px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
          style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search recordings..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '11px 16px 11px 44px',
            borderRadius: '50px',
            border: 'none',
            outline: 'none',
            background: '#e8eaf0',
            boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #ffffff',
            fontSize: '14.5px',
            color: '#1e1e3a',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Subject filter pill chips */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {/* All Subjects chip */}
        <button
          onClick={() => setClassFilter('all')}
          style={{
            padding: '8px 20px',
            borderRadius: '50px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '13.5px',
            fontWeight: '700',
            transition: 'all 0.2s ease',
            background: classFilter === 'all' ? '#3636e8' : '#e8eaf0',
            color: classFilter === 'all' ? '#ffffff' : '#6b6b8a',
            boxShadow: classFilter === 'all'
              ? '4px 4px 10px rgba(54,54,232,0.35), -2px -2px 6px rgba(255,255,255,0.7)'
              : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
          }}
        >
          All Subjects
        </button>

        {/* Individual subject chips */}
        {classes.map(cls => (
          <button
            key={cls.id}
            onClick={() => setClassFilter(cls.id)}
            style={{
              padding: '8px 20px',
              borderRadius: '50px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13.5px',
              fontWeight: '700',
              transition: 'all 0.2s ease',
              background: classFilter === cls.id ? cls.color : '#e8eaf0',
              color: classFilter === cls.id ? '#ffffff' : '#6b6b8a',
              boxShadow: classFilter === cls.id
                ? `4px 4px 10px ${cls.color}55, -2px -2px 6px rgba(255,255,255,0.7)`
                : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
            }}
          >
            {cls.name}
          </button>
        ))}
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
              width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
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
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e1e3a', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lec.title}
              </div>
              <div style={{ fontSize: '12.5px', color: '#9999b0', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  padding: '2px 10px', borderRadius: '50px',
                  background: (lec.class?.color || '#6366f1') + '18',
                  color: lec.class?.color || '#6366f1',
                  fontWeight: '700', fontSize: '12px',
                }}>
                  {lec.class?.name}
                </span>
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
          <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>No recordings found</p>
          <p style={{ fontSize: '13px' }}>Try adjusting your search or filter</p>
        </div>
      )}
    </div>
  )
}
