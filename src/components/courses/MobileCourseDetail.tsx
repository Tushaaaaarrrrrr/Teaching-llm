'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ContentItem {
  id: string
  title: string
  description?: string
  videoUrl?: string
  pptUrl?: string
  order: number
  durationMinutes?: number
}
interface Topic {
  id: string
  title: string
  order: number
  content: ContentItem[]
}
interface CourseDetail {
  id: string
  name: string
  description?: string
  subject?: string
  color?: string
  expiresAt?: string
  teacherName?: string
  enrollmentType?: string | null
  instructorAssignments?: { instructor: { id: string; name: string } }[]
  _count?: { topics?: number; lectures?: number; materials?: number; courseEvents?: number }
}

interface Props {
  course: CourseDetail
  topics: Topic[]
  expandedTopics: Set<string>
  toggleTopic: (id: string) => void
  progressMap: Record<string, string>
  updateProgress: (contentId: string, status: string) => void
  role: string
}

type TabKey = 'curriculum' | 'overview'

export default function MobileCourseDetail({
  course, topics, expandedTopics, toggleTopic, progressMap, updateProgress, role,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('curriculum')

  const accent = course.color || '#6366f1'
  const totalLectures = course._count?.lectures || topics.reduce((s, t) => s + (t.content?.length || 0), 0)

  const accessDays = useMemo(() => {
    if (!course.expiresAt) return null
    const exp = new Date(course.expiresAt)
    const now = new Date()
    return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }, [course.expiresAt])

  const expiresOnLabel = useMemo(() => {
    if (!course.expiresAt) return null
    return new Date(course.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }, [course.expiresAt])

  const badge = course.enrollmentType === 'LIVE' ? 'LIVE BATCH'
    : course.enrollmentType === 'RECORDED' ? 'PRO BATCH'
    : course.enrollmentType === 'FREE' ? 'FREE'
    : course.enrollmentType === 'DEMO' ? 'DEMO' : null

  const mentorName = course.teacherName || course.instructorAssignments?.[0]?.instructor?.name || 'Mentor'

  return (
    <div className="mobile-course-detail" style={{ paddingBottom: '24px', background: '#e8eaf0', minHeight: '100vh' }}>
      {/* ─────────── HERO (purple gradient) ─────────── */}
      <div style={{
        position: 'relative',
        padding: '20px 22px 24px',
        background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 60%, ${accent}aa 100%)`,
        color: '#ffffff',
        overflow: 'hidden',
        borderRadius: '0 0 26px 26px',
      }}>
        {/* Decorative blurs */}
        <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-50px', left: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.10), transparent 70%)', pointerEvents: 'none' }} />

        {/* Top bar — back button + bookmark + share */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginBottom: '14px' }}>
          <button
            onClick={() => router.push('/courses')}
            aria-label="Back to courses"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)',
              backdropFilter: 'blur(6px)',
              padding: '7px 14px', borderRadius: '50px', color: '#ffffff',
              fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Courses
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button aria-label="Save course" style={iconBtn}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button
              aria-label="Share course"
              onClick={() => {
                if (typeof navigator !== 'undefined' && (navigator as any).share) {
                  (navigator as any).share({ title: course.name, url: typeof window !== 'undefined' ? window.location.href : '' }).catch(() => {})
                }
              }}
              style={iconBtn}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>
          </div>
        </div>

        {/* Badge */}
        {badge && (
          <span style={{
            display: 'inline-block', position: 'relative',
            fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: '50px',
            background: 'rgba(255,255,255,0.22)', color: '#ffffff',
            backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.30)',
            marginBottom: '12px',
          }}>
            {badge}{course.subject ? ` · ${course.subject}` : ''}
          </span>
        )}

        {/* Title */}
        <h1 style={{
          fontSize: '24px', fontWeight: 900, color: '#ffffff', lineHeight: 1.15, letterSpacing: '-0.02em',
          margin: 0, position: 'relative',
        }}>
          {course.name}
        </h1>
        {course.description && (
          <p style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 500,
            marginTop: '6px', margin: 0, position: 'relative', lineHeight: 1.5,
          }}>
            {course.description}
          </p>
        )}

      </div>

      {/* ─────────── Card stack (overlaps hero) ─────────── */}
      <div style={{ padding: '0 14px', marginTop: '-12px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Access warning */}
        {accessDays !== null && accessDays <= 30 && accessDays > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 14px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
            border: '1px solid #fdba74',
            boxShadow: '0 8px 18px -10px rgba(249, 115, 22, 0.30)',
          }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
              boxShadow: '0 4px 10px rgba(249,115,22,0.40)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#9a3412', lineHeight: 1.3 }}>
                Course access ends in {accessDays} day{accessDays === 1 ? '' : 's'}
              </div>
              <div style={{ fontSize: '11px', color: '#c2410c', fontWeight: 600, marginTop: '2px' }}>
                Renew before {expiresOnLabel} to keep your progress
              </div>
            </div>
          </div>
        )}

        {/* Mentor card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
              background: `${accent}15`, color: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', fontWeight: 800,
            }}>
              {mentorName.trim().charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>
                Your Mentor
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#1e1e3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {mentorName}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────── Tabs ─────────── */}
      <div style={{ marginTop: '24px', padding: '0 14px' }}>
        <div style={{
          display: 'flex', gap: '6px',
          borderBottom: '1.5px solid #d8dae3',
          marginBottom: '14px',
        }}>
          {([
            { key: 'curriculum' as TabKey, label: 'Curriculum', count: topics.length },
            { key: 'overview' as TabKey, label: 'Overview' },
          ]).map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  padding: '10px 14px',
                  fontSize: '13.5px', fontWeight: active ? 900 : 700,
                  color: active ? '#1e1e3a' : '#9999b0',
                  position: 'relative',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  marginBottom: '-1.5px',
                  borderBottom: active ? `2.5px solid ${accent}` : '2.5px solid transparent',
                }}
              >
                {t.label}
                {typeof t.count === 'number' && (
                  <span style={{ fontSize: '10.5px', color: active ? accent : '#9999b0', fontWeight: 800 }}>
                    · {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {tab === 'curriculum' && (
          <CurriculumTab
            courseId={course.id}
            accent={accent}
            topics={topics}
            expandedTopics={expandedTopics}
            toggleTopic={toggleTopic}
            progressMap={progressMap}
            updateProgress={updateProgress}
            isStudent={role === 'STUDENT'}
          />
        )}

        {tab === 'overview' && <OverviewTab course={course} mentorName={mentorName} totalLectures={totalLectures} />}
      </div>
    </div>
  )
}

/* ───────── Helpers ───────── */
const iconBtn: React.CSSProperties = {
  width: '34px', height: '34px', borderRadius: '50%',
  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)',
  backdropFilter: 'blur(6px)', cursor: 'pointer', color: '#ffffff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '20px',
  padding: '14px 16px',
  border: '1px solid rgba(15,23,42,0.05)',
  boxShadow: '0 12px 28px -12px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04)',
}


/* ───────── Curriculum Tab ───────── */
function CurriculumTab({
  courseId, accent, topics, expandedTopics, toggleTopic, progressMap, updateProgress, isStudent,
}: {
  courseId: string
  accent: string
  topics: Topic[]
  expandedTopics: Set<string>
  toggleTopic: (id: string) => void
  progressMap: Record<string, string>
  updateProgress: (contentId: string, status: string) => void
  isStudent: boolean
}) {
  if (topics.length === 0) {
    return (
      <div style={{
        padding: '40px 20px', textAlign: 'center',
        background: '#ffffff', borderRadius: '20px',
        border: '1px solid rgba(15,23,42,0.05)',
        color: '#9999b0', fontSize: '13px',
      }}>
        <div style={{ fontWeight: 800, color: '#6b6b8a', marginBottom: '4px' }}>No content yet</div>
        <div>Topics and lectures will appear here once your instructor adds them.</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {topics.map((topic, idx) => {
        const open = expandedTopics.has(topic.id)
        const completed = topic.content.filter(c => progressMap[c.id] === 'COMPLETED').length
        const totalMinutes = topic.content.reduce((sum, c) => {
          const d = typeof c.durationMinutes === 'number' && c.durationMinutes > 0 ? c.durationMinutes : 14
          return sum + d
        }, 0)
        const durationLabel = totalMinutes > 0
          ? (Math.floor(totalMinutes / 60) > 0
              ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
              : `${totalMinutes}m`)
          : null
        return (
          <div key={topic.id} style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid rgba(15,23,42,0.05)',
            boxShadow: '0 10px 24px -12px rgba(15,23,42,0.10)',
            overflow: 'hidden',
          }}>
            <button
              onClick={() => toggleTopic(topic.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 16px',
                background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0,
                background: `${accent}15`, color: accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 800, letterSpacing: '-0.01em',
              }}>
                {String(idx + 1).padStart(2, '0')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#1e1e3a', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {topic.title}
                </div>
                <div style={{ fontSize: '11.5px', color: '#9999b0', fontWeight: 600, marginTop: '2px' }}>
                  {completed}/{topic.content.length} lectures{durationLabel ? ` · ${durationLabel}` : ''}
                </div>
              </div>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="2.4"
                style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {open && (
              <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topic.content.length === 0 ? (
                  <div style={{ padding: '14px', textAlign: 'center', color: '#9999b0', fontSize: '12.5px', background: '#f8fafc', borderRadius: '12px' }}>
                    No lectures in this topic yet
                  </div>
                ) : topic.content.map((item) => {
                  const isCompleted = progressMap[item.id] === 'COMPLETED'
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 12px',
                      borderRadius: '14px',
                      background: '#f8fafc',
                      border: '1px solid #f1f5f9',
                    }}>
                      {/* Status check */}
                      <button
                        onClick={() => isStudent && updateProgress(item.id, isCompleted ? 'NOT_STARTED' : 'COMPLETED')}
                        aria-label={isCompleted ? 'Mark not completed' : 'Mark completed'}
                        disabled={!isStudent}
                        style={{
                          width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0,
                          background: isCompleted ? '#22c55e' : '#ffffff',
                          color: isCompleted ? '#ffffff' : '#cbd5e1',
                          border: isCompleted ? 'none' : '2px solid #e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: isStudent ? 'pointer' : 'default',
                        }}
                      >
                        {isCompleted && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </button>
                      {/* Title + duration */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e1e3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </div>
                        {typeof item.durationMinutes === 'number' && item.durationMinutes > 0 && (
                          <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                            {Math.floor(item.durationMinutes / 60) > 0
                              ? `${Math.floor(item.durationMinutes / 60)}h ${item.durationMinutes % 60}m`
                              : `${item.durationMinutes}m`}
                          </div>
                        )}
                      </div>
                      {/* Action */}
                      {item.videoUrl ? (
                        <Link
                          href={`/courses/${courseId}/lectures/${item.id}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '7px 14px', borderRadius: '50px',
                            background: isCompleted ? '#ffffff' : accent,
                            color: isCompleted ? accent : '#ffffff',
                            border: isCompleted ? `1.5px solid ${accent}33` : 'none',
                            fontSize: '11.5px', fontWeight: 800,
                            textDecoration: 'none',
                            boxShadow: isCompleted ? 'none' : `0 4px 10px ${accent}40`,
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isCompleted ? (
                            <>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/></svg>
                              Rewatch
                            </>
                          ) : (
                            <>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              Watch
                            </>
                          )}
                        </Link>
                      ) : item.pptUrl ? (
                        <a
                          href={item.pptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '7px 14px', borderRadius: '50px',
                            background: '#ffffff', color: '#6b6b8a',
                            border: '1.5px solid #e2e8f0',
                            fontSize: '11.5px', fontWeight: 800,
                            textDecoration: 'none',
                            flexShrink: 0,
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Open
                        </a>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 700 }}>—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ───────── Overview Tab ───────── */
function OverviewTab({ course, mentorName, totalLectures }: { course: CourseDetail; mentorName: string; totalLectures: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={cardStyle}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
          About this course
        </div>
        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
          {course.description || 'No description provided yet. Check the curriculum tab for the full lecture list.'}
        </p>
      </div>
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <OverviewStat label="Subject" value={course.subject || '—'} />
          <OverviewStat label="Mentor" value={mentorName} />
          <OverviewStat label="Lectures" value={String(totalLectures)} />
          <OverviewStat label="Materials" value={String(course._count?.materials || 0)} />
        </div>
      </div>
    </div>
  )
}

function OverviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 800, color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e1e3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  )
}
