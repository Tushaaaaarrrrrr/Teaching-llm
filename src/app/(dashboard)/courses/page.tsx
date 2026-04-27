'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || `Request failed for ${url}`)
  }
  return data
}

interface CourseItem {
  id: string
  name: string
  description: string
  subject: string
  color: string
  icon: string
  teacherName: string
  enrollmentType?: string
  liveUpgradePrice?: number | null
  _count: { lectures: number; materials: number; topics: number; courseEvents: number }
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
  const { data, error, isLoading } = useSWR<CourseItem[]>('/api/courses', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })
  const { data: helpCard } = useSWR('/api/support/help-card', fetcher)
  const courses = Array.isArray(data) ? data : (data as any)?.courses || []
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [infoModalCourse, setInfoModalCourse] = useState<CourseItem | null>(null)
  const [upgradeModalCourse, setUpgradeModalCourse] = useState<CourseItem | null>(null)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(handler)
  }, [search])

  const filtered = courses.filter((c: CourseItem) =>
    c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    c.subject?.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  async function handleUpgrade(courseId: string) {
    setUpgrading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/upgrade`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upgrade failed')
      setUpgradeModalCourse(null)
      mutate('/api/courses')
    } catch (e: any) {
      alert(e.message || 'Something went wrong')
    }
    setUpgrading(false)
  }

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
      {error ? (
        <div
          className="card"
          style={{
            marginBottom: '16px',
            padding: '14px 18px',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            background: '#fff5f5',
          }}
        >
          Failed to load courses. {error.message}
        </div>
      ) : null}
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
        {filtered.map((course: CourseItem) => {
          const isRecorded = course.enrollmentType === 'RECORDED'
          const isLive = course.enrollmentType === 'LIVE'
          const hasUpgradePrice = isRecorded && course.liveUpgradePrice != null && course.liveUpgradePrice > 0

          return (
          <Link key={course.id} href={`/courses/${course.id}`} style={{ textDecoration: 'none', display: 'flex' }}>
            <div
              style={{
                background: '#e8eaf0',
                borderRadius: '28px',
                boxShadow: isLive
                  ? `8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff, 0 0 0 2px ${course.color}40`
                  : '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = isLive
                  ? `12px 12px 24px #bdbfc7, -12px -12px 24px #ffffff, 0 0 0 2px ${course.color}60`
                  : '12px 12px 24px #bdbfc7, -12px -12px 24px #ffffff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = isLive
                  ? `8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff, 0 0 0 2px ${course.color}40`
                  : '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff'
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

                {/* Live badge on banner */}
                {isLive && (
                  <div style={{
                    position: 'absolute', top: '10px', left: '12px',
                    padding: '3px 10px', borderRadius: '20px',
                    background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)',
                    fontSize: '10px', fontWeight: '800', color: '#fff',
                    letterSpacing: '0.06em',
                  }}>
                    🟢 LIVE ACCESS
                  </div>
                )}

                {/* Recording badge on banner */}
                {isRecorded && (
                  <div style={{
                    position: 'absolute', top: '10px', left: '12px',
                    padding: '3px 10px', borderRadius: '20px',
                    background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
                    fontSize: '10px', fontWeight: '800', color: '#fde68a',
                    letterSpacing: '0.06em',
                  }}>
                    🟡 RECORDING
                  </div>
                )}

                {/* Info button for recorded users */}
                {isRecorded && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInfoModalCourse(course) }}
                    style={{
                      position: 'absolute', top: '10px', right: '12px',
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '14px', fontWeight: '800',
                    }}
                    title="Compare Live vs Recording batch"
                  >
                    i
                  </button>
                )}
              </div>

              {/* Card Body */}
              <div style={{ padding: '18px 20px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: '#1e1e3a', 
                  marginBottom: '4px', 
                  lineHeight: '1.3',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
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

                {/* Show description only for LIVE users */}
                {!isRecorded && course.description && (
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

                {/* Show teacher only for LIVE users */}
                {!isRecorded && course.teacherName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: course.color + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: '700', color: course.color,
                    }}>
                      {course.teacherName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12.5px', color: '#9999b0', fontWeight: '500' }}>
                      {course.teacherName}
                    </span>
                  </div>
                )}

                {/* Upgrade button for RECORDED users */}
                {hasUpgradePrice && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setUpgradeModalCourse(course) }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      marginBottom: '14px',
                      boxShadow: '4px 4px 12px rgba(99,102,241,0.3)',
                      transition: 'all 0.2s',
                      letterSpacing: '0.02em',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    ⚡ Upgrade to Live — ₹{course.liveUpgradePrice}
                  </button>
                )}

                {/* Stats row */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  paddingTop: '12px',
                  borderTop: '1.5px solid rgba(0,0,0,0.06)',
                  marginTop: 'auto',
                }}>
                  <div style={{
                    flex: 1, padding: '8px 10px', borderRadius: '14px',
                    background: '#e8eaf0', boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>{course._count?.topics || 0}</div>
                    <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600' }}>Topics</div>
                  </div>
                  <div style={{
                    flex: 1, padding: '8px 10px', borderRadius: '14px',
                    background: '#e8eaf0', boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>{course._count?.lectures || 0}</div>
                    <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600' }}>Lectures</div>
                  </div>
                  <div style={{
                    flex: 1, padding: '8px 10px', borderRadius: '14px',
                    background: '#e8eaf0', boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>{course._count?.materials || 0}</div>
                    <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600' }}>Materials</div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
          )
        })}

        {helpCard && helpCard.isEnabled && (
          <a href={helpCard.redirectUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex' }}>
            <div
              style={{
                background: '#e8eaf0',
                borderRadius: '28px',
                boxShadow: '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
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
              {/* Simple Gradient Banner */}
              <div style={{
                height: '100px',
                background: `linear-gradient(135deg, #6366f1ee, #6366f199)`,
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
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '800', 
                  color: '#1e1e3a', 
                  marginBottom: '20px', 
                  lineHeight: '1.3',
                }}>
                  {helpCard.title}
                </h3>

                <button style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '16px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '700',
                  boxShadow: '4px 4px 8px rgba(99, 102, 241, 0.3)',
                  cursor: 'pointer'
                }}>
                  {helpCard.buttonText || 'Enroll in More'}
                </button>
              </div>
            </div>
          </a>
        )}
      </div>

      {filtered.length === 0 && (!helpCard || !helpCard.isEnabled) && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>No courses found</p>
          <p style={{ fontSize: '13px' }}>Try a different search term</p>
        </div>
      )}

      {/* ── Info / Comparison Modal ── */}
      {infoModalCourse && (
        <div
          onClick={() => setInfoModalCourse(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(10,10,30,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#f0f2f8', borderRadius: '28px', width: '100%', maxWidth: '600px',
              boxShadow: '20px 20px 40px #c5c7cf, -20px -20px 40px #ffffff',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div style={{
              background: `linear-gradient(135deg, ${infoModalCourse.color}dd, ${infoModalCourse.color}99)`,
              padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.1em', marginBottom: '4px' }}>BATCH COMPARISON</p>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: 0 }}>{infoModalCourse.name}</h2>
              </div>
              <button onClick={() => setInfoModalCourse(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Comparison Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', padding: '0' }}>
              {/* Recording Column */}
              <div style={{ padding: '24px 24px 28px', borderRight: '1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '18px' }}>🟡</span>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a', margin: 0 }}>Recording Batch</h3>
                </div>
                <p style={{ fontSize: '12px', color: '#6b6b8a', marginBottom: '16px', lineHeight: '1.5' }}>
                  A more affordable option for self-paced learners.
                </p>
                {[
                  'Full course content access',
                  'Latest recorded lectures & updates',
                  'Study materials & notes',
                  'Community doubt support',
                  'Best for: College students, dual-degree & working professionals',
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span style={{ color: '#22c55e', fontSize: '14px', marginTop: '1px', flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: '12.5px', color: '#4b4b6b', lineHeight: '1.45' }}>{f}</span>
                  </div>
                ))}
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#ef4444', fontSize: '14px', marginTop: '1px', flexShrink: 0 }}>✗</span>
                  <span style={{ fontSize: '12.5px', color: '#9999b0', lineHeight: '1.45' }}>No live class access</span>
                </div>
              </div>

              {/* Live Column */}
              <div style={{ padding: '24px 24px 28px', background: 'rgba(99,102,241,0.04)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', fontSize: '9px', fontWeight: '800', padding: '3px 8px', borderRadius: '20px', letterSpacing: '0.06em' }}>
                  BESTSELLER
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '18px' }}>🟢</span>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#6366f1', margin: 0 }}>Live Batch</h3>
                </div>
                <p style={{ fontSize: '12px', color: '#6b6b8a', marginBottom: '16px', lineHeight: '1.5' }}>
                  Everything in Recording, plus live access.
                </p>
                {[
                  'Everything in Recording Batch',
                  'Access to live classes with mentors',
                  'Real-time doubt solving in class',
                  'Direct mentorship & interaction',
                  'Best for: Standalone learners & those who need extra guidance',
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span style={{ color: '#6366f1', fontSize: '14px', marginTop: '1px', flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: '12.5px', color: '#4b4b6b', lineHeight: '1.45' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            {infoModalCourse.liveUpgradePrice && (
              <div style={{ padding: '16px 28px 24px', borderTop: '1px solid rgba(0,0,0,0.07)', textAlign: 'center' }}>
                <button
                  onClick={() => { setInfoModalCourse(null); setUpgradeModalCourse(infoModalCourse) }}
                  style={{
                    padding: '13px 32px', borderRadius: '16px', border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', fontSize: '14px', fontWeight: '800', cursor: 'pointer',
                    boxShadow: '4px 4px 16px rgba(99,102,241,0.35)', letterSpacing: '0.02em',
                  }}
                >
                  ⚡ Upgrade to Live — ₹{infoModalCourse.liveUpgradePrice}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Upgrade Confirmation Modal ── */}
      {upgradeModalCourse && (
        <div
          onClick={() => !upgrading && setUpgradeModalCourse(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1001,
            background: 'rgba(10,10,30,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#f0f2f8', borderRadius: '28px', width: '100%', maxWidth: '420px',
              boxShadow: '20px 20px 40px #c5c7cf, -20px -20px 40px #ffffff',
              padding: '32px 32px 28px', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e1e3a', marginBottom: '8px' }}>
              Upgrade to Live Batch
            </h2>
            <p style={{ fontSize: '13px', color: '#6b6b8a', lineHeight: '1.6', marginBottom: '8px' }}>
              <strong style={{ color: '#1e1e3a' }}>{upgradeModalCourse.name}</strong>
            </p>
            <p style={{ fontSize: '13px', color: '#6b6b8a', lineHeight: '1.6', marginBottom: '24px' }}>
              You will get access to <strong>live classes, real-time mentorship,</strong> and everything in your current plan.
            </p>

            <div style={{
              background: 'linear-gradient(135deg, #6366f108, #8b5cf608)',
              border: '1.5px solid #6366f130',
              borderRadius: '16px', padding: '16px', marginBottom: '24px',
            }}>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#6366f1' }}>
                ₹{upgradeModalCourse.liveUpgradePrice}
              </div>
              <div style={{ fontSize: '12px', color: '#9999b0', fontWeight: '600' }}>One-time upgrade fee</div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setUpgradeModalCourse(null)}
                disabled={upgrading}
                style={{
                  flex: 1, padding: '12px', borderRadius: '14px',
                  border: '1.5px solid #d1d9e6', background: '#e8eaf0',
                  boxShadow: '4px 4px 8px #d1d9e6, -4px -4px 8px #ffffff',
                  fontSize: '13px', fontWeight: '700', color: '#6b6b8a', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpgrade(upgradeModalCourse.id)}
                disabled={upgrading}
                style={{
                  flex: 2, padding: '12px', borderRadius: '14px', border: 'none',
                  background: upgrading ? '#9ca3af' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff', fontSize: '13px', fontWeight: '800', cursor: upgrading ? 'not-allowed' : 'pointer',
                  boxShadow: upgrading ? 'none' : '4px 4px 16px rgba(99,102,241,0.35)',
                  transition: 'all 0.2s',
                }}
              >
                {upgrading ? '⏳ Processing...' : '✓ Confirm Upgrade'}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: '#9999b0', marginTop: '14px' }}>
              Your class type will be updated automatically after confirmation.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
