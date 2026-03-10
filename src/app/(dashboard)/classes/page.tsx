'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ClassItem {
  id: string
  name: string
  description: string
  subject: string
  color: string
  icon: string
  createdBy: { name: string }
  _count: { lectures: number; materials: number; liveSessions: number }
}

const CLASS_ICONS: Record<string, React.ReactNode> = {
  BookOpen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  Brain: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20"/><path d="M2 12h20"/></svg>,
  Globe: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  Database: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Monitor: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Wifi: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1"/></svg>,
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/classes')
      .then(r => r.json())
      .then(data => setClasses(data.classes || data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.subject?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="page-container">
        <div className="grid-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card" style={{ height: '200px' }}>
              <div className="skeleton" style={{ height: '80px', borderRadius: '12px 12px 0 0' }} />
              <div style={{ padding: '16px' }}>
                <div className="skeleton" style={{ height: '16px', width: '70%', marginBottom: '8px' }} />
                <div className="skeleton" style={{ height: '12px', width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">All Classes</h2>
          <p className="page-subtitle">{classes.length} courses available</p>
        </div>
        <div style={{ position: 'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search classes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
            style={{ width: '260px' }}
          />
        </div>
      </div>

      <div className="grid-3">
        {filtered.map((cls) => (
          <Link key={cls.id} href={`/classes/${cls.id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid #f1f5f9',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
            }}
            >
              {/* Color header */}
              <div style={{
                height: '80px',
                background: `linear-gradient(135deg, ${cls.color}, ${cls.color}dd)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', top: '-40px', right: '-20px' }} />
                <div style={{ position: 'absolute', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', bottom: '-10px', left: '20px' }} />
                <div style={{ color: 'white', opacity: 0.9 }}>
                  {CLASS_ICONS[cls.icon] || CLASS_ICONS.BookOpen}
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '16px 18px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{cls.name}</h3>
                </div>
                {cls.subject && (
                  <span className="badge badge-gray" style={{ marginBottom: '8px', display: 'inline-block' }}>
                    {cls.subject}
                  </span>
                )}
                {cls.description && (
                  <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.5', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {cls.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    {cls._count?.lectures || 0} lectures
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {cls._count?.materials || 0} materials
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>No classes found</p>
          <p style={{ fontSize: '13px' }}>Try a different search term</p>
        </div>
      )}
    </div>
  )
}
