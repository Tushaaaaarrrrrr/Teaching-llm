'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface CourseItem {
  id: string
  name: string
  description: string
  subject: string
  color: string
  icon: string
  createdBy: { name: string }
  _count: { lectures: number; materials: number; liveSessions: number }
}

const COURSE_ICONS: Record<string, React.ReactNode> = {
  BookOpen: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  Brain: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20"/><path d="M2 12h20"/></svg>,
  Globe: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  Database: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Monitor: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Wifi: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1"/></svg>,
}

export default function CoursesPage() {
  const { data, isLoading } = useSWR<CourseItem[]>('/api/courses', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })
  const courses = Array.isArray(data) ? data : (data as any)?.courses || []
  const [search, setSearch] = useState('')

  const filtered = courses.filter((c: CourseItem) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.subject?.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="grid-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card skeleton" style={{ height: '260px', borderRadius: '28px' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <p style={{ fontSize: '13px', color: '#9999b0', margin: 0 }}>{courses.length} courses available</p>
        <div style={{ position: 'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
            style={{ width: '260px', borderRadius: '50px', paddingLeft: '40px' }}
          />
        </div>
      </div>

      <div className="grid-3">
        {filtered.map((course: CourseItem) => (
          <Link key={course.id} href={`/courses/${course.id}`} style={{ textDecoration: 'none' }}>
            <div
              style={{
                background: '#e8eaf0',
                borderRadius: '28px',
                boxShadow: '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '12px 12px 24px #bdbfc7, -12px -12px 24px #ffffff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff'
              }}
            >
              {/* Gradient Banner */}
              <div style={{
                height: '100px',
                background: `linear-gradient(135deg, ${course.color}ee, ${course.color}99)`,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ position: 'absolute', width: '130px', height: '130px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', top: '-50px', right: '-30px' }} />
                <div style={{ position: 'absolute', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', bottom: '-20px', left: '24px' }} />
                <div style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1,
                }}>
                  {COURSE_ICONS[course.icon] || COURSE_ICONS.BookOpen}
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '18px 20px 16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e1e3a', marginBottom: '4px', lineHeight: '1.3' }}>
                  {course.name}
                </h3>

                {course.subject && (
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 12px',
                    borderRadius: '50px',
                    background: course.color + '18',
                    color: course.color,
                    fontSize: '12px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    letterSpacing: '0.02em',
                  }}>
                    {course.subject}
                  </span>
                )}

                {course.description && (
                  <p style={{
                    fontSize: '13px',
                    color: '#6b6b8a',
                    lineHeight: '1.55',
                    marginBottom: '14px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {course.description}
                  </p>
                )}

                {course.createdBy?.name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: course.color + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: '700', color: course.color,
                    }}>
                      {course.createdBy.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12.5px', color: '#9999b0', fontWeight: '500' }}>
                      {course.createdBy.name}
                    </span>
                  </div>
                )}

                {/* Stats row */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  paddingTop: '12px',
                  borderTop: '1.5px solid rgba(0,0,0,0.06)',
                }}>
                  <div style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '14px',
                    background: '#e8eaf0',
                    boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>
                      {course._count?.lectures || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600' }}>Lectures</div>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '14px',
                    background: '#e8eaf0',
                    boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>
                      {course._count?.materials || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600' }}>Materials</div>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '14px',
                    background: '#e8eaf0',
                    boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>
                      {course._count?.liveSessions || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600' }}>Sessions</div>
                  </div>
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
          <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>No courses found</p>
          <p style={{ fontSize: '13px' }}>Try a different search term</p>
        </div>
      )}
    </div>
  )
}
