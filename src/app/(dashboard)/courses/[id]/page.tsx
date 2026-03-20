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
  createdBy: { name: string }
  instructorAssignments?: { instructor: { id: string; name: string } }[]
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

  const fetchData = useCallback(async () => {
    try {
      const [courseRes, topicsRes, sessionRes] = await Promise.all([
        fetch(`/api/courses/${params.id}`),
        fetch(`/api/courses/${params.id}/topics`),
        fetch('/api/auth/me'),
      ])
      const courseData = await courseRes.json()
      const topicsData = await topicsRes.json()
      const sessionData = await sessionRes.json()

      setCourse(courseData.course || courseData)
      setTopics(Array.isArray(topicsData) ? topicsData : [])
      setRole(sessionData.user?.role || '')
      setUserId(sessionData.user?.id || '')
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

  const toggleTopic = (id: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getEmbedUrl = (url: string) => {
    if (!url) return url
    // YouTube
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\s]+)/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`
    return url
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

  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER'
  const canManage = isAdminOrManager

  return (
    <div className="page-container fade-in">
      {/* Course Header Banner */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${course.color}, ${course.color}cc)`,
          padding: '28px 24px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', top: '-60px', right: '40px' }} />
          <div style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', bottom: '-30px', right: '200px' }} />

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
                  {topics.length} topic{topics.length !== 1 ? 's' : ''} &middot; {topics.reduce((acc, t) => acc + t.content.length, 0)} lectures
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
                    Created By: {course.createdBy.name}
                  </span>
              </div>
            </div>

              {isAdminOrManager && (
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

      {/* Topics + Content */}
      {topics.length === 0 ? (
        <div className="card empty-state" style={{ padding: '48px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
          </svg>
          <p style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>No content yet</p>
          <p style={{ fontSize: '13px', color: '#9999b0' }}>
            {isAdminOrManager ? 'Go to Manage Course to add topics and lectures.' : 'Content will appear here once the teacher adds it.'}
          </p>
          {isAdminOrManager && (
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
              <button
                onClick={() => toggleTopic(topic.id)}
                style={{
                  width: '100%', padding: '16px 20px', background: 'none', border: 'none',
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

              {/* Topic Content */}
              {expandedTopics.has(topic.id) && (
                <div style={{ borderTop: '1px solid #d8dae3', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {topic.content.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>
                      No lectures in this topic yet
                    </div>
                  ) : (
                    topic.content.map((item) => (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '12px 20px',
                        borderRadius: '50px',
                        background: '#e8eaf0',
                        boxShadow: '5px 5px 10px #c5c7cf, -5px -5px 10px #ffffff',
                        transition: 'box-shadow 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '7px 7px 14px #c2c4cc, -7px -7px 14px #ffffff')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = '5px 5px 10px #c5c7cf, -5px -5px 10px #ffffff')}
                      >
                        {/* Lecture number */}
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

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          {item.pptUrl && (
                            <a href={item.pptUrl} download target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              PPT
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
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
