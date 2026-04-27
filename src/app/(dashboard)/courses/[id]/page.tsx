'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface ContentItem {
  id: string
  title: string
  description?: string
  videoUrl?: string
  pptUrl?: string
  order: number
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
  description: string
  subject: string
  color: string
  expiresAt?: string
  teacherName: string
  enrollmentType?: 'LIVE' | 'RECORDED' | null
  liveUpgradePrice?: number | null
  instructorAssignments?: { instructor: { id: string; name: string } }[]
  _count?: { topics: number; lectures: number; materials: number; courseEvents: number }
  courseEvents?: {
    id: string
    title: string
    description: string | null
    startTime: string
    endTime: string
    meetLink: string | null
    type: string
    status: string
    instructor?: { name: string } | null
  }[]
}

interface Exam {
  id: string
  title: string
  description: string | null
  expiresAt: string
  startDate: string | null
  isPublished: boolean
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [activeExam, setActiveExam] = useState<Exam | null>(null)
  const [progressMap, setProgressMap] = useState<Record<string, string>>({})
  const [infoModalCourse, setInfoModalCourse] = useState<CourseDetail | null>(null)
  const [upgradeModalCourse, setUpgradeModalCourse] = useState<CourseDetail | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [showUpgradeHint, setShowUpgradeHint] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [courseRes, topicsRes, sessionRes, progressRes] = await Promise.all([
        fetch(`/api/courses/${params.id}`),
        fetch(`/api/courses/${params.id}/topics`),
        fetch('/api/auth/me'),
        fetch(`/api/lectures/progress?courseId=${params.id}`),
      ])
      const courseData = await courseRes.json()
      const topicsData = await topicsRes.json()
      const sessionData = await sessionRes.json()
      const progressData = progressRes.ok ? await progressRes.json() : []

      if (Array.isArray(progressData)) {
        const pMap = progressData.reduce((acc: any, curr: any) => {
          acc[curr.contentId] = curr.status
          return acc
        }, {})
        setProgressMap(pMap)
      }

      setCourse(courseData.course || courseData)
      setTopics(Array.isArray(topicsData) ? topicsData : [])
      setRole(sessionData.user?.role || '')
      setUserId(sessionData.user?.id || '')
      
      // Fetch exams for this course
      const examsRes = await fetch(`/api/exams?courseId=${params.id}`)
      const examsData = await examsRes.json()
      if (Array.isArray(examsData)) {
        const now = new Date()
        const active = examsData
          .filter(e => {
            if (!e.isPublished) return false
            const start = e.startDate ? new Date(e.startDate) : null
            const end = new Date(e.expiresAt)
            return (!start || start <= now) && end > now
          })
          .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0]
        setActiveExam(active || null)
      }

      // Expand all topics by default
      if (Array.isArray(topicsData) && topicsData.length > 0) {
        setExpandedTopics(new Set(topicsData.map((t: Topic) => t.id)))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => { fetchData() }, [fetchData])

  const updateProgress = async (contentId: string, status: string) => {
    setProgressMap(prev => ({ ...prev, [contentId]: status })) // Optimistic UI update
    try {
      await fetch('/api/lectures/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, status })
      })
    } catch (e) {
      console.error("Failed to update progress", e)
    }
  }

  const toggleTopic = (id: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  
  const handleUpgrade = async (courseId: string) => {
    setUpgrading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/upgrade`, { method: 'POST' })
      if (res.ok) {
        setUpgradeModalCourse(null)
        fetchData() // Refresh to reflect new batch status
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to upgrade')
      }
    } catch (e) {
      alert('Something went wrong')
    } finally {
      setUpgrading(false)
    }
  }



  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: '120px', borderRadius: '12px', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '300px', borderRadius: '12px' }} />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p style={{ fontSize: '16px', fontWeight: '500' }}>Course not found</p>
          <Link href="/courses" className="btn btn-primary" style={{ marginTop: '16px' }}>Back to Courses</Link>
        </div>
      </div>
    )
  }

  const isManager = role === 'MANAGER'
  const canManage = isManager

  return (
    <div className="page-container fade-in">
      {/* Course Header Banner */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{
          background: ['RECORDED', 'FREE', 'DEMO'].includes(course.enrollmentType || '') ? 'linear-gradient(135deg, #6b7280, #9ca3af)' : `linear-gradient(135deg, ${course.color}, ${course.color}cc)`,
          padding: '28px 24px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', top: '-60px', right: '40px' }} />
          <div style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', bottom: '-30px', right: '200px' }} />

          {/* Info Button for Recorded users (Top Right) */}
          {['RECORDED', 'FREE', 'DEMO'].includes(course.enrollmentType || '') && course.liveUpgradePrice && (
            <button
              onClick={() => setInfoModalCourse(course)}
              style={{
                position: 'absolute', top: '24px', right: '24px', zIndex: 10,
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
                color: '#fff', fontSize: '16px', fontWeight: '800', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
              }}
              title="Compare PRO vs General Batch"
            >
              i
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <Link href="/courses" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '12px', textDecoration: 'none',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Back to Courses
              </Link>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'white', marginBottom: '6px' }}>{course.name}</h1>
              {course.description && (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', maxWidth: '600px', lineHeight: '1.5' }}>{course.description}</p>
              )}
              <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                {course.subject && (
                  <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                    {course.subject}
                  </span>
                )}
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {course._count?.topics || 0} topic{(course._count?.topics !== 1) ? 's' : ''} &middot; {course._count?.lectures || 0} lecture{(course._count?.lectures !== 1) ? 's' : ''} &middot; {course._count?.materials || 0} material{(course._count?.materials !== 1) ? 's' : ''}
                </span>
                {course.expiresAt && (
                  <span style={{ 
                    background: 'rgba(255,165,0,0.2)', 
                    color: '#ffa500', 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    border: '1px solid rgba(255,165,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {(() => {
                      const expiry = new Date(course.expiresAt || '')
                      const diff = expiry.getTime() - new Date().getTime()
                      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
                      return days > 0 ? `Course Access Ends In: ${days} Day${days !== 1 ? 's' : ''}` : 'Course Access Ending Soon'
                    })()}
                  </span>
                )}
                  <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Teacher Name: {course.teacherName}
                  </span>

                {/* Upgrade Button for Recorded users perfectly inline */}
                {['RECORDED', 'FREE', 'DEMO'].includes(course.enrollmentType || '') && course.liveUpgradePrice && (
                  <div style={{ position: 'relative' }}>
                    {showUpgradeHint && (
                      <div style={{
                        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                        background: '#1e1e3a', color: '#fff', padding: '8px 12px', borderRadius: '12px',
                        fontSize: '11px', fontWeight: '600', width: '200px', textAlign: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)', marginBottom: '12px', zIndex: 10,
                      }}>
                        Click the "i" button in the top right to see batch differences
                        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '6px solid transparent', borderTopColor: '#1e1e3a' }} />
                      </div>
                    )}
                    <button
                      onClick={() => setUpgradeModalCourse(course)}
                      onMouseEnter={() => setShowUpgradeHint(true)}
                      onMouseLeave={() => setShowUpgradeHint(false)}
                      style={{
                        background: '#fff', color: '#1e1e3a', padding: '6px 16px', borderRadius: '50px',
                        fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ fontSize: '8px', background: '#f3f4f6', padding: '1px 6px', borderRadius: '10px', color: '#6b6b8a' }}>OPTIONAL</span>
                      ⚡ Upgrade to PRO
                    </button>
                  </div>
                )}
              </div>
            </div>

              {isManager && (
                <button
                  onClick={() => router.push(`/courses/${params.id}/edit`)}
                  style={{
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white', padding: '8px 16px', borderRadius: '20px',
                    fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(4px)',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Manage Course
                </button>
              )}
          </div>
        </div>
      </div>


      {/* Active Exam Alert */}
      {activeExam && (
        <div 
          className="fade-in"
          style={{ 
            background: 'linear-gradient(135deg, #fff9e6, #fff4d1)',
            borderLeft: `4px solid #f59e0b`,
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '12px', 
              background: '#f59e0b15', color: '#f59e0b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#92400e', marginBottom: '2px' }}>Exam is Live</h3>
              <p style={{ fontSize: '13px', color: '#b45309', opacity: 0.9 }}>
                You have an active exam for this course: <strong>{activeExam.title}</strong>
              </p>
            </div>
          </div>
          <Link 
            href={`/exams/${activeExam.id}`}
            style={{ 
              background: '#f59e0b', color: 'white', padding: '10px 24px', 
              borderRadius: '12px', fontSize: '14px', fontWeight: '600',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
              transition: 'all 0.2s',
              textDecoration: 'none'
            }}
          >
            Attend Exam
          </Link>
        </div>
      )}

      {/* Topics + Content */}
      {topics.length === 0 ? (
        <div className="card empty-state" style={{ padding: '48px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
          </svg>
          <p style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>No content yet</p>
          <p style={{ fontSize: '13px', color: '#9999b0' }}>
            {isManager ? 'Go to Manage Course to add topics and lectures.' : 'Content will appear here once the teacher adds it.'}
          </p>
          {isManager && (
            <button onClick={() => router.push(`/courses/${params.id}/edit`)} className="btn btn-primary" style={{ marginTop: '16px' }}>
              Add Content
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {topics.map((topic, topicIdx) => (
            <div key={topic.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Topic Header */}
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <button
                  onClick={() => toggleTopic(topic.id)}
                  style={{
                    flex: 1, padding: '16px 20px', background: 'none', border: 'none',
                    display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: course.color + '18', color: course.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: '700', flexShrink: 0,
                  }}>
                    {String(topicIdx + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e1e3a' }}>{topic.title}</div>
                    <div style={{ fontSize: '12px', color: '#9999b0', marginTop: '2px' }}>
                      {topic.content.length} lecture{topic.content.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="2"
                    style={{ transition: 'transform 0.2s', transform: expandedTopics.has(topic.id) ? 'rotate(180deg)' : 'none' }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>

              {/* Topic Content */}
              {expandedTopics.has(topic.id) && (
                <div style={{ borderTop: '1px solid #d8dae3', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '60px' }}>
                  {topic.content.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>
                      No lectures in this topic yet
                    </div>
                  ) : (
                    topic.content.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px',
                          padding: '12px 20px',
                          borderRadius: '50px',
                          background: '#e8eaf0',
                          boxShadow: '5px 5px 10px #c5c7cf, -5px -5px 10px #ffffff',
                          transition: 'box-shadow 0.2s',
                        }}
                      >
                        {/* Lecture icon */}
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          background: item.videoUrl ? course.color + '12' : '#f0f0f5',
                          color: item.videoUrl ? course.color : '#9999b0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {item.videoUrl ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          )}
                        </div>

                        {/* Title + description */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e1e3a', marginBottom: '2px' }}>
                            {item.title}
                          </div>
                          {item.description && (
                            <p style={{ fontSize: '12px', color: '#6b6b8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons Group */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: 'auto' }}>
                          {/* Progress actions for students */}
                          {role === 'STUDENT' && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginRight: '6px', paddingRight: '12px', borderRight: '1px solid #d8dae3' }}>
                              <button
                                onClick={() => updateProgress(item.id, progressMap[item.id] === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED')}
                                style={{
                                  background: progressMap[item.id] === 'COMPLETED' ? '#22c55e20' : 'transparent',
                                  color: progressMap[item.id] === 'COMPLETED' ? '#16a34a' : '#94a3b8',
                                  border: `1px solid ${progressMap[item.id] === 'COMPLETED' ? '#22c55e' : '#cbd5e1'}`,
                                  padding: '6px 12px', borderRadius: '50px', fontSize: '11px', fontWeight: '700',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                Completed
                              </button>
                              <button
                                onClick={() => updateProgress(item.id, progressMap[item.id] === 'REWATCH' ? 'NOT_STARTED' : 'REWATCH')}
                                style={{
                                  background: progressMap[item.id] === 'REWATCH' ? '#eab30820' : 'transparent',
                                  color: progressMap[item.id] === 'REWATCH' ? '#ca8a04' : '#94a3b8',
                                  border: `1px solid ${progressMap[item.id] === 'REWATCH' ? '#eab308' : '#cbd5e1'}`,
                                  padding: '6px 12px', borderRadius: '50px', fontSize: '11px', fontWeight: '700',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/></svg>
                                Rewatch
                              </button>
                            </div>
                          )}

                          {/* Watch / Material buttons */}
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            {item.pptUrl && (
                              <a
                                href={item.pptUrl}
                                download={item.pptUrl.startsWith('/api/files/materials/') ? true : undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-sm"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                View Material
                              </a>
                            )}
                            {item.videoUrl && (
                              <Link
                                href={`/courses/${params.id}/lectures/${item.id}`}
                                className="btn btn-primary btn-sm"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                Watch
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Info Modal */}
      {infoModalCourse && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }} onClick={() => setInfoModalCourse(null)}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '750px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
            animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '30px 40px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderBottom: '1.5px solid #e2e8f0', position: 'relative' }}>
              <button onClick={() => setInfoModalCourse(null)} style={{ position: 'absolute', top: '25px', right: '30px', background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Batch Comparison</h2>
              <p style={{ fontSize: '15px', color: '#64748b', fontWeight: '500' }}>Choose the experience that fits your learning style</p>
            </div>

            {/* Comparison Table */}
            <div style={{ padding: '30px 40px' }}>
              <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1.5px solid #e2e8f0', background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '18px 24px', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Features</th>
                      <th style={{ padding: '18px 24px', fontSize: '13px', color: '#92400e', fontWeight: '800', background: '#fffbeb', textAlign: 'center' }}>General Batch</th>
                      <th style={{ padding: '18px 24px', fontSize: '13px', color: '#4338ca', fontWeight: '800', background: '#eef2ff', textAlign: 'center' }}>PRO Batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { f: 'Course Lectures', g: '✅ Full Access', p: '✅ Full Access' },
                      { f: 'Course Materials', g: '✅ Full Access', p: '✅ Full Access' },
                      { f: 'Live Classes', g: '❌ No Access', p: '✅ Direct Entry' },
                      { f: 'Direct Q&A with Teacher', g: '❌ No', p: '✅ Yes (Live)' },
                      { f: 'Weekly Mentorship', g: '❌ No', p: '✅ Every Sunday' },
                      { f: 'Priority Support', g: '❌ Standard', p: '✅ 24/7 Priority' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155', fontWeight: '600' }}>{row.f}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#92400e', textAlign: 'center', background: '#fffdf5' }}>{row.g}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#4338ca', fontWeight: '700', textAlign: 'center', background: '#f5f7ff' }}>{row.p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ padding: '0 40px 40px', textAlign: 'center' }}>
              <button onClick={() => setInfoModalCourse(null)} style={{ background: '#1e293b', color: 'white', padding: '14px 40px', borderRadius: '16px', fontSize: '15px', fontWeight: '700', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Confirmation Modal */}
      {upgradeModalCourse && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001,
          padding: '20px'
        }} onClick={() => !upgrading && setUpgradeModalCourse(null)}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '480px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden',
            animation: 'modalSlideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>Upgrade to PRO Batch?</h2>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: '32px' }}>
                Get instant access to live classes, direct teacher interaction, and weekly mentorship for <strong>{upgradeModalCourse.name}</strong>.
              </p>
              
              <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '20px', marginBottom: '32px', border: '1.5px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Upgrade Price</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b' }}>₹{upgradeModalCourse.liveUpgradePrice}</div>
              </div>

              <div style={{ display: 'flex', gap: '14px' }}>
                <button 
                  disabled={upgrading}
                  onClick={() => setUpgradeModalCourse(null)} 
                  style={{ flex: 1, padding: '16px', borderRadius: '18px', border: '2px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '700', cursor: upgrading ? 'not-allowed' : 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  disabled={upgrading}
                  onClick={() => handleUpgrade(upgradeModalCourse.id)}
                  style={{ 
                    flex: 1.5, padding: '16px', borderRadius: '18px', border: 'none', 
                    background: upgrading ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #4f46e5)', 
                    color: 'white', fontWeight: '700', cursor: upgrading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  {upgrading ? 'Processing...' : 'Confirm Upgrade'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  )
}
