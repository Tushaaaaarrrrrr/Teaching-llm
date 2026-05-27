'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'

interface CourseItem {
  id: string
  name: string
  description?: string
  subject?: string
  color?: string
  teacherName?: string
  enrollmentType?: string
  expiresAt?: string | null
  _count?: { lectures?: number; materials?: number; topics?: number }
}

interface ProgressRow { contentId: string; status: string }

const fetcher = async (url: string) => {
  const res = await fetch(url)
  return res.json().catch(() => ({}))
}

export default function MyCoursesMobile() {
  const { data: rawCourses } = useSWR('/api/courses', fetcher, { revalidateOnFocus: false })
  const { data: rawProgress } = useSWR('/api/lectures/progress', fetcher, { revalidateOnFocus: false })
  const { data: dashData } = useSWR('/api/dashboard', fetcher, { revalidateOnFocus: false })

  const courses: CourseItem[] = useMemo(() => {
    if (Array.isArray(rawCourses)) return rawCourses
    return rawCourses?.courses || []
  }, [rawCourses])

  const allProgress: ProgressRow[] = useMemo(() => {
    if (Array.isArray(rawProgress)) return rawProgress
    return rawProgress?.progress || []
  }, [rawProgress])

  const recentLecture = dashData?.recentViewedLecture

  const [search, setSearch] = useState('')

  // Per-course progress and access metadata
  const enriched = useMemo(() => {
    return courses.map(c => {
      const total = c._count?.lectures || 0
      const done = 0 // global progress map; per-course breakdown is fetched on detail page
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      const expires = c.expiresAt ? new Date(c.expiresAt) : null
      const now = new Date()
      const accessDays = expires ? Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null
      const expired = expires ? expires.getTime() < now.getTime() : false
      return { course: c, pct, accessDays, expired }
    })
  }, [courses, allProgress])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter(e => !q || e.course.name.toLowerCase().includes(q) || (e.course.subject || '').toLowerCase().includes(q))
  }, [enriched, search])

  const enrolledCount = enriched.length

  return (
    <div className="page-container fade-in" style={{ paddingBottom: '24px' }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', padding: '0 4px' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#1e1e3a', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.05 }}>
            My Courses
          </h1>
          <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#9999b0', marginTop: '4px' }}>
            {enrolledCount} enrolled · pick up where you left off
          </p>
        </div>
        <button
          aria-label="Filter"
          style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: '#ffffff', border: 'none', cursor: 'pointer', flexShrink: 0,
            boxShadow: '4px 4px 10px #c5c7cf, -4px -4px 10px #ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e1e3a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="7" y1="12" x2="17" y2="12"/>
            <line x1="10" y1="18" x2="14" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '22px' }}>
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9999b0" strokeWidth="2.2"
          style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)' }}
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your courses..."
          style={{
            width: '100%',
            padding: '12px 18px 12px 44px',
            borderRadius: '50px',
            border: 'none',
            background: '#ffffff',
            boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #ffffff',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: '13.5px',
            color: '#1e1e3a',
          }}
        />
      </div>

      {/* Continue learning */}
      {recentLecture?.content && (
        <div style={{ marginBottom: '26px' }}>
          <div style={{ padding: '0 4px', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#1e1e3a', margin: 0, letterSpacing: '-0.01em' }}>
              Continue learning
            </h2>
            <p style={{ fontSize: '11.5px', color: '#9999b0', fontWeight: 600, marginTop: '2px' }}>
              Pick up where you left off
            </p>
          </div>
          <ContinueLearningCard lecture={recentLecture} />
        </div>
      )}

      {/* All courses */}
      <div>
        <div style={{ padding: '0 4px', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#1e1e3a', margin: 0, letterSpacing: '-0.01em' }}>
            All courses
          </h2>
          <p style={{ fontSize: '11.5px', color: '#9999b0', fontWeight: 600, marginTop: '2px' }}>
            {enrolledCount} enrolled course{enrolledCount === 1 ? '' : 's'}
          </p>
        </div>
        {visible.length === 0 ? (
          <EmptyState search={search} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {visible.map(({ course, pct, accessDays, expired }) => (
              <CourseCard key={course.id} course={course} accessDays={accessDays} expired={expired} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Continue Learning Card
   ───────────────────────────────────────────────────────── */
function ContinueLearningCard({ lecture }: { lecture: any }) {
  const content = lecture?.content || {}
  const course = content?.topic?.course
  const accent = course?.color || '#6366f1'
  const courseId = content?.topic?.courseId
  const lectureId = content?.id
  const title: string = content?.title || 'Lecture'
  const subject: string | undefined = course?.subject
  const courseName: string | undefined = course?.name
  const subtitleParts = [subject, courseName].filter(Boolean) as string[]

  // Position label "LECTURE N OF M" if we can compute it from progress + topics
  const position = lecture?.position
  const totalCount = lecture?.totalCount
  const positionLabel = (position && totalCount)
    ? `Lecture ${String(position).padStart(2, '0')} of ${totalCount}`
    : (courseName ? `Lecture · ${courseName}` : 'Continue learning')

  return (
    <Link
      href={courseId && lectureId ? `/courses/${courseId}/lectures/${lectureId}` : '#'}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '16px',
        borderRadius: '22px',
        background: '#ffffff',
        boxShadow: '0 14px 30px -12px rgba(15, 23, 42, 0.15), 0 4px 8px -2px rgba(15, 23, 42, 0.04)',
        border: '1px solid rgba(15, 23, 42, 0.05)',
        textDecoration: 'none', color: 'inherit',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        width: '64px', height: '64px', borderRadius: '18px', flexShrink: 0,
        background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ffffff',
        boxShadow: `0 8px 20px ${accent}40`,
        position: 'relative',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
          {positionLabel}
        </div>
        <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#1e1e3a', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
          {title}
        </div>
        {subtitleParts.length > 0 && (
          <div style={{ fontSize: '11.5px', color: '#9999b0', fontWeight: 600, marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtitleParts.join(' · ')}
          </div>
        )}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '7px 14px', borderRadius: '50px',
          background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
          color: '#ffffff',
          fontSize: '12px', fontWeight: 800,
          boxShadow: `0 6px 14px ${accent}40`,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          Resume
        </span>
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────
   Course Card — purple gradient header + progress
   ───────────────────────────────────────────────────────── */
function CourseCard({ course, accessDays, expired }: { course: CourseItem; accessDays: number | null; expired: boolean }) {
  const accent = course.color || '#6366f1'
  const mentorInitial = (course.teacherName || '?').trim().charAt(0).toUpperCase()
  const enrollmentBadge = course.enrollmentType === 'LIVE' ? 'LIVE BATCH'
    : course.enrollmentType === 'RECORDED' ? 'PRO BATCH'
    : course.enrollmentType === 'FREE' ? 'FREE'
    : course.enrollmentType === 'DEMO' ? 'DEMO'
    : null
  const termLabel = course.subject || null

  return (
    <Link
      href={`/courses/${course.id}`}
      style={{
        display: 'block',
        borderRadius: '22px',
        background: '#ffffff',
        boxShadow: '0 14px 30px -12px rgba(15, 23, 42, 0.15), 0 4px 8px -2px rgba(15, 23, 42, 0.04)',
        border: '1px solid rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
        textDecoration: 'none', color: 'inherit',
      }}
    >
      {/* Gradient header band */}
      <div style={{
        position: 'relative',
        padding: '18px 18px 20px',
        background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 60%, ${accent}aa 100%)`,
        color: '#ffffff',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '12px', position: 'relative' }}>
          {enrollmentBadge && (
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: '10px', fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase',
              padding: '4px 10px', borderRadius: '50px',
              background: 'rgba(255,255,255,0.22)',
              backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.30)',
            }}>
              {enrollmentBadge}
            </span>
          )}
          {termLabel && (
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.02em' }}>
              {termLabel}
            </span>
          )}
        </div>

        <div style={{ fontSize: '20px', fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.01em', position: 'relative' }}>
          {course.name}
        </div>
        {course.description && (
          <div style={{
            fontSize: '12.5px', fontWeight: 500, color: 'rgba(255,255,255,0.88)',
            marginTop: '4px', position: 'relative', lineHeight: 1.45,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {course.description}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
            background: `${accent}1F`, color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 800,
          }}>
            {mentorInitial}
          </div>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e1e3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {course.teacherName || 'Mentor'}
          </span>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1', flexShrink: 0 }} />
          <span style={{
            fontSize: '11px', fontWeight: 700,
            color: expired ? '#ef4444' : accessDays !== null && accessDays <= 7 ? '#f59e0b' : '#94a3b8',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {accessDays !== null
              ? (expired ? 'Access expired' : `access ends in ${accessDays} day${accessDays === 1 ? '' : 's'}`)
              : 'Active enrollment'}
          </span>
        </div>

        {/* Stat tiles: Topics · Lectures · Materials */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { value: course._count?.topics ?? 0,    label: 'Topics' },
            { value: course._count?.lectures ?? 0,  label: 'Lectures' },
            { value: course._count?.materials ?? 0, label: 'Materials' },
          ].map(s => (
            <div
              key={s.label}
              style={{
                padding: '12px 8px',
                borderRadius: '16px',
                background: '#e8eaf0',
                boxShadow: '5px 5px 12px #c5c7cf, -5px -5px 12px #ffffff',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#1e1e3a', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#9999b0', marginTop: '5px', letterSpacing: '0.04em' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  )
}

function EmptyState({ search }: { search: string }) {
  return (
    <div style={{
      padding: '40px 20px', textAlign: 'center',
      background: '#ffffff', borderRadius: '20px',
      border: '1px solid rgba(15, 23, 42, 0.05)',
    }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.6" style={{ marginBottom: '10px' }}>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
      <div style={{ fontSize: '14px', fontWeight: 800, color: '#6b6b8a', marginBottom: '4px' }}>
        {search ? `No courses matching "${search}"` : 'No courses enrolled yet'}
      </div>
      <div style={{ fontSize: '12px', color: '#9999b0' }}>
        {search ? 'Try a different keyword.' : 'Enrolled courses will show up here.'}
      </div>
    </div>
  )
}
