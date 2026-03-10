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

interface ClassDetail {
  id: string
  name: string
  description: string
  subject: string
  color: string
  createdBy: { name: string }
}

export default function ClassDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [cls, setCls] = useState<ClassDetail | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string>('')
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [videoModal, setVideoModal] = useState<{ url: string; title: string } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [clsRes, topicsRes, sessionRes] = await Promise.all([
        fetch(`/api/classes/${params.id}`),
        fetch(`/api/classes/${params.id}/topics`),
        fetch('/api/auth/me'),
      ])
      const clsData = await clsRes.json()
      const topicsData = await topicsRes.json()
      const sessionData = await sessionRes.json()

      setCls(clsData.class || clsData)
      setTopics(Array.isArray(topicsData) ? topicsData : [])
      setRole(sessionData.user?.role || '')
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

  if (!cls) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p style={{ fontSize: '16px', fontWeight: '500' }}>Class not found</p>
          <Link href="/classes" className="btn btn-primary" style={{ marginTop: '16px' }}>Back to Classes</Link>
        </div>
      </div>
    )
  }

  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER'

  return (
    <div className="page-container fade-in">
      {/* Video Modal */}
      {videoModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}
        onClick={() => setVideoModal(null)}
        >
          <div style={{
            background: '#e8eaf0', borderRadius: '16px', overflow: 'hidden',
            width: '100%', maxWidth: '880px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          }}
          onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderBottom: '1px solid #d0d2d9',
            }}>
              <span style={{ fontWeight: '600', color: '#1e1e3a', fontSize: '15px' }}>{videoModal.title}</span>
              <button onClick={() => setVideoModal(null)} style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#e8eaf0', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b6b8a',
                boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
            <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
              <iframe
                src={getEmbedUrl(videoModal.url)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Class Header Banner */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${cls.color}, ${cls.color}cc)`,
          padding: '28px 24px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', top: '-60px', right: '40px' }} />
          <div style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', bottom: '-30px', right: '200px' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <Link href="/classes" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '12px', textDecoration: 'none',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Back to Classes
              </Link>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'white', marginBottom: '6px' }}>{cls.name}</h1>
              {cls.description && (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', maxWidth: '600px', lineHeight: '1.5' }}>{cls.description}</p>
              )}
              <div style={{ display: 'flex', gap: '16px', marginTop: '14px' }}>
                {cls.subject && (
                  <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                    {cls.subject}
                  </span>
                )}
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {topics.length} topic{topics.length !== 1 ? 's' : ''} &middot; {topics.reduce((acc, t) => acc + t.content.length, 0)} lectures
                </span>
              </div>
            </div>

            {isAdminOrManager && (
              <button
                onClick={() => router.push(`/classes/${params.id}/edit`)}
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
                Manage Subject
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
            {isAdminOrManager ? 'Go to Manage Subject to add topics and lectures.' : 'Content will appear here once the instructor adds it.'}
          </p>
          {isAdminOrManager && (
            <button onClick={() => router.push(`/classes/${params.id}/edit`)} className="btn btn-primary" style={{ marginTop: '16px' }}>
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
                  background: cls.color + '18', color: cls.color,
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
                <div style={{ borderTop: '1px solid #d8dae3', padding: '8px 0' }}>
                  {topic.content.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>
                      No lectures in this topic yet
                    </div>
                  ) : (
                    topic.content.map((item, contentIdx) => (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '12px 20px',
                        borderBottom: contentIdx < topic.content.length - 1 ? '1px solid #e8eaf0' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f4f5f8'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Lecture number */}
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          background: item.videoUrl ? cls.color + '12' : '#f0f0f5',
                          color: item.videoUrl ? cls.color : '#9999b0',
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
                          {item.videoUrl && (
                            <button
                              onClick={() => setVideoModal({ url: item.videoUrl!, title: item.title })}
                              className="btn btn-primary btn-sm"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              Watch
                            </button>
                          )}
                          {item.pptUrl && (
                            <a href={item.pptUrl} download target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              PPT
                            </a>
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
