'use client'

import { useEffect, useState } from 'react'

interface Material {
  id: string
  title: string
  description: string
  fileUrl: string
  fileType: string
  fileSize: string
  uploadedAt: string
  class: { id: string; name: string; color: string }
  uploadedBy: { name: string }
}

const FILE_ICONS: Record<string, { color: string; bg: string }> = {
  PDF: { color: '#EF4444', bg: '#fee2e2' },
  PPTX: { color: '#F59E0B', bg: '#fef3c7' },
  PPT: { color: '#F59E0B', bg: '#fef3c7' },
  DOC: { color: '#3B82F6', bg: '#dbeafe' },
  DOCX: { color: '#3B82F6', bg: '#dbeafe' },
  XLS: { color: '#10B981', bg: '#d1fae5' },
  XLSX: { color: '#10B981', bg: '#d1fae5' },
  ZIP: { color: '#8B5CF6', bg: '#ede9fe' },
  IMG: { color: '#EC4899', bg: '#fce7f3' },
  PNG: { color: '#EC4899', bg: '#fce7f3' },
  JPG: { color: '#EC4899', bg: '#fce7f3' },
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    fetch('/api/materials')
      .then(r => r.json())
      .then(data => setMaterials(data.materials || data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const fileTypes = ['all', ...Array.from(new Set(materials.map(m => m.fileType?.toUpperCase()).filter(Boolean)))]

  const filtered = materials.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.class?.name?.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || m.fileType?.toUpperCase() === typeFilter
    return matchSearch && matchType
  })

  if (loading) {
    return (
      <div className="page-container">
        {[1,2,3,4].map(i => (
          <div key={i} className="card skeleton" style={{ height: '72px', marginBottom: '10px' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Study Materials</h2>
          <p className="page-subtitle">{materials.length} resources available for download</p>
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
            placeholder="Search materials..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {fileTypes.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-ghost'}`}
            >
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Materials List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 150px 100px 100px 90px',
          padding: '12px 20px',
          background: '#f8f9fc',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '11px',
          fontWeight: '600',
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          <span>Name</span>
          <span>Class</span>
          <span>Type</span>
          <span>Size</span>
          <span style={{ textAlign: 'right' }}>Action</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
            No materials found
          </div>
        ) : (
          filtered.map((mat) => {
            const ft = FILE_ICONS[mat.fileType?.toUpperCase()] || { color: '#64748b', bg: '#f1f5f9' }
            return (
              <div key={mat.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 150px 100px 100px 90px',
                padding: '13px 20px',
                alignItems: 'center',
                borderBottom: '1px solid #f8fafc',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: ft.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: ft.color,
                    fontSize: '10px',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}>
                    {mat.fileType?.toUpperCase()?.slice(0, 4) || 'FILE'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {mat.title}
                    </div>
                    {mat.description && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {mat.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Class */}
                <span style={{
                  fontSize: '12px',
                  color: mat.class?.color || '#6366f1',
                  fontWeight: '500',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {mat.class?.name}
                </span>

                {/* Type */}
                <span className="badge" style={{
                  background: ft.bg,
                  color: ft.color,
                  width: 'fit-content',
                }}>
                  {mat.fileType?.toUpperCase()}
                </span>

                {/* Size */}
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {mat.fileSize || '—'}
                </span>

                {/* Download */}
                <div style={{ textAlign: 'right' }}>
                  <button className="btn btn-primary btn-sm">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
