'use client'

import { useEffect, useState } from 'react'

interface ContentItem {
  id: string
  title: string
  description?: string
  pptUrl: string
  videoUrl?: string
  createdAt: string
  topicId: string
  topic: {
    id: string
    title: string
    courseId: string
    course: { id: string; name: string; color: string }
  }
}

const FILE_STYLES: Record<string, { color: string }> = {
  PDF:  { color: '#EF4444' },
  PPTX: { color: '#F59E0B' },
  PPT:  { color: '#F59E0B' },
  DOC:  { color: '#3B82F6' },
  DOCX: { color: '#3B82F6' },
  XLS:  { color: '#10B981' },
  XLSX: { color: '#10B981' },
  ZIP:  { color: '#8B5CF6' },
  PNG:  { color: '#EC4899' },
  JPG:  { color: '#EC4899' },
}

function getFileType(url: string): string {
  const ext = url?.split('.').pop()?.split('?')[0]?.toUpperCase() || ''
  return Object.keys(FILE_STYLES).includes(ext) ? ext : 'FILE'
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    // Fetch user role
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUserRole(data.user?.role || ''))
      .catch(console.error)

    fetch('/api/content?hasPpt=true')
      .then(r => r.json())
      .then(data => setMaterials(data.content || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = materials.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.topic?.course?.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.topic?.title?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="page-container">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '50px', marginBottom: '10px' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {(userRole === 'MANAGER' || userRole === 'ADMIN') && (
            <button 
              onClick={() => window.location.href = '/study/content-bank'}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '11px 20px', borderRadius: '50px',
                background: '#e8eaf0', color: '#3636e8',
                boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Content Bank
            </button>
          )}
          
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9999b0" strokeWidth="2"
              style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search materials…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '11px 18px 11px 42px',
                border: 'none', borderRadius: '50px',
                background: '#e8eaf0',
                boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                color: '#1e1e3a', fontSize: '13px', outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Materials list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9999b0' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c5c7cf" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <p style={{ fontWeight: '500' }}>No materials found</p>
          </div>
        ) : (
          filtered.map((mat) => {
            const ft    = getFileType(mat.pptUrl)
            const style = FILE_STYLES[ft] || { color: '#6b6b8a' }
            const course = mat.topic?.course
            const dateStr = new Date(mat.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

            return (
              <div key={mat.id} style={{
                display: 'flex', alignItems: 'center', gap: '18px',
                padding: '16px 24px', borderRadius: '50px',
                background: '#e8eaf0',
                boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff',
                transition: 'box-shadow 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '8px 8px 16px #c2c4cc, -8px -8px 16px #ffffff')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff')}
              >
                {/* File type badge */}
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
                  background: '#e8eaf0', boxShadow: '3px 3px 7px #c5c7cf, -3px -3px 7px #ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: '700', color: style.color, letterSpacing: '0.03em',
                }}>
                  {ft.slice(0, 4)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e1e3a', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mat.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9999b0' }}>
                    {course && (
                      <span style={{
                        padding: '1px 8px', borderRadius: '50px', marginRight: '6px',
                        background: (course.color || '#6366f1') + '18',
                        color: course.color || '#6366f1',
                        fontWeight: '700', fontSize: '11px',
                      }}>
                        {course.name}
                      </span>
                    )}
                    {mat.topic?.title && <span>{mat.topic.title}</span>}
                    {dateStr && <span> &bull; {dateStr}</span>}
                  </div>
                </div>

                {/* Download button */}
                <a
                  href={mat.pptUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '42px', height: '42px', borderRadius: '50%', border: 'none',
                    background: '#e8eaf0', boxShadow: '3px 3px 7px #c5c7cf, -3px -3px 7px #ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#6b6b8a', flexShrink: 0, transition: 'all 0.15s',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#3636e8'; el.style.boxShadow = '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#6b6b8a'; el.style.boxShadow = '3px 3px 7px #c5c7cf, -3px -3px 7px #ffffff' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </a>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
