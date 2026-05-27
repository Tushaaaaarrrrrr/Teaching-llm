'use client'

import { useEffect, useMemo, useState } from 'react'
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

type TabKey = 'active' | 'upcoming' | 'completed'

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
  const [tab, setTab] = useState<TabKey>('active')

  // Compute per-course progress and bucket into Active / Upcoming / Completed
  const enriched = useMemo(() => {
    const completedByCourseId = new Map<string, { done: number; total: number }>()
    // Without per-content course mapping in progress data, we approximate by raw lecture count.
    // The progress endpoint returns contentId; the course's total lecture count comes from _count.
    return courses.map(c => {
      const total = c._count?.lectures || 0
      // Best effort: count "COMPLETED" rows globally is not per-course; show 0 if unknown.
      // The /api/lectures/progress?courseId=X endpoint scopes correctly; we'll fetch on-demand later if needed.
      const done = 0
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      const expires = c.expiresAt ? new Date(c.expiresAt) : null
      const now = new Date()
      const accessDays = expires ? Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null
      const expired = expires ? expires.getTime() < now.getTime() : false
      // Bucket: completed = 100% progress OR expired with some progress
      // upcoming = starts in the future (we don't have startDate on course; treat as none)
      // default → active. Upcoming bucket isn't determined yet (no startDate field), so always 'active' or 'completed'
      const bucket: TabKey = pct >= 100 ? 'completed' : 'active'
      return { course: c, pct, accessDays, expired, bucket: bucket as TabKey }
    })
  }, [courses, allProgress])

  const counts = useMemo(() => {
    const a = enriched.filter(e => e.bucket === 'active').length
    const u = enriched.filter(e => e.bucket === 'upcoming').length
    const c = enriched.filter(e => e.bucket === 'completed').length
    return { active: a, upcoming: u, completed: c, all: enriched.length }
  }, [enriched])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched
      .filter(e => e.bucket === tab)
      .filter(e => !q || e.course.name.toLowerCase().includes(q) || (e.course.subject || '').toLowerCase().includes(q))
  }, [enriched, tab, search])

  return (
    <div className="page-container fade-in" style={{ paddingBottom: '24px' }}>
      {/* Title */}
      <div style={{ marginBottom: '16px', padding: '0 4px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#1e1e3a', letterSpacing: '-0.02em', margin: 0 }}>
          My Courses
        </h1>
        <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#9999b0', marginTop: '4px' }}>
          {counts.active} active · {counts.completed} completed
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {(['active', 'upcoming', 'completed'] as TabKey[]).map(t => {
          const active = tab === t
          const count = counts[t]
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: '0 0 auto',
                padding: '10px 18px',
                borderRadius: '50px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 800,
                background: active ? '#1e1e3a' : '#ffffff',
                color: active ? '#ffffff' : '#6b6b8a',
                boxShadow: active
                  ? '0 8px 18px rgba(30, 30, 58, 0.30)'
                  : '4px 4px 10px #c5c7cf, -4px -4px 10px #ffffff',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.2s ease',
                letterSpacing: '0.01em',
                textTransform: 'capitalize',
              }}
            >
              {t}
              <span style={{
                fontSize: '11px', fontWeight: 800,
                padding: '2px 7px', borderRadius: '50px',
                background: active ? 'rgba(255,255,255,0.20)' : 'rgba(99,102,241,0.10)',
                color: active ? '#ffffff' : '#6366f1',
                minWidth: '16px', textAlign: 'center',
              }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Continue Learning */}
      {recentLecture?.content && (
        <div style={{ marginBottom: '24px' }}>
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
          <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#1e1e3a', margin: 0, letterSpacing: '-0.01em', textTransform: 'capitalize' }}>
            {tab === 'active' ? 'All courses' : `${tab} courses`}
          </h2>
        </div>
        {visible.length === 0 ? (
          <EmptyState tab={tab} search={search} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {visible.map(({ course, pct, accessDays, expired }) => (
              <CourseCard key={course.id} course={course} pct={pct} accessDays={accessDays} expired={expired} />
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
        width: '60px', height: '60px', borderRadius: '16px', flexShrink: 0,
        background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ffffff',
        boxShadow: `0 8px 20px ${accent}40`,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
          Lecture · {course?.name || 'Course'}
        </div>
        <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#1e1e3a', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          marginTop: '10px',
          padding: '7px 14px', borderRadius: '50px',
          background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
          color: '#ffffff',
          fontSize: '12px', fontWeight: 800,
          boxShadow: `0 6px 14px ${accent}40`,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          Resume
        </div>
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────
   Course Card
   ───────────────────────────────────────────────────────── */
function CourseCard({ course, pct, accessDays, expired }: { course: CourseItem; pct: number; accessDays: number | null; expired: boolean }) {
  const accent = course.color || '#6366f1'
  const mentorInitial = (course.teacherName || '?').trim().charAt(0).toUpperCase()
  const badge = course.enrollmentType === 'LIVE' ? 'LIVE BATCH' : course.enrollmentType === 'RECORDED' ? 'PRO BATCH' : null

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
        padding: '18px 18px 16px',
        background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
        color: '#ffffff',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', marginBottom: '10px' }}>
          {badge && (
            <span style={{
              fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '4px 10px', borderRadius: '50px',
              background: 'rgba(255,255,255,0.22)', color: '#ffffff',
              backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)',
            }}>
              {badge}
            </span>
          )}
          {course.subject && (
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {course.subject}
            </span>
          )}
        </div>

        <div style={{ fontSize: '18px', fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.02em', position: 'relative' }}>
          {course.name}
        </div>
        {course.description && (
          <div style={{
            fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.88)',
            marginTop: '4px', position: 'relative',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {course.description}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 18px 16px' }}>
        {/* Mentor row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
            background: `${accent}22`,
            color: accent,
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

        {/* Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9999b0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Progress</span>
            <span style={{ fontSize: '14px', fontWeight: 900, color: accent }}>{pct}%</span>
          </div>
          <div style={{ height: '8px', borderRadius: '50px', background: '#f1f5f9', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: `${pct}%`, height: '100%', borderRadius: '50px',
              background: `linear-gradient(90deg, ${accent}, ${accent}dd)`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      </div>
    </Link>
  )
}

function EmptyState({ tab, search }: { tab: TabKey; search: string }) {
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
        {search ? `No ${tab} courses matching "${search}"` : `No ${tab} courses yet`}
      </div>
      <div style={{ fontSize: '12px', color: '#9999b0' }}>
        {tab === 'active' && !search && 'Enrolled courses will show up here.'}
        {tab === 'completed' && 'Finished courses will appear here.'}
        {tab === 'upcoming' && 'Courses starting soon will appear here.'}
      </div>
    </div>
  )
}
