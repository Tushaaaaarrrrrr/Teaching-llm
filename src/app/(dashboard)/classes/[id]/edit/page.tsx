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
}

interface ContentForm {
  title: string
  description: string
  videoUrl: string
  pptUrl: string
}

const emptyForm: ContentForm = { title: '', description: '', videoUrl: '', pptUrl: '' }

export default function ClassEditPage() {
  const params = useParams()
  const router = useRouter()
  const [cls, setCls] = useState<ClassDetail | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Topic form
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [addingTopic, setAddingTopic] = useState(false)

  // Edit topic inline
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [editingTopicTitle, setEditingTopicTitle] = useState('')

  // Content modals
  const [contentModal, setContentModal] = useState<{
    mode: 'add' | 'edit'
    topicId: string
    content?: ContentItem
  } | null>(null)
  const [contentForm, setContentForm] = useState<ContentForm>(emptyForm)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      const [clsRes, topicsRes, meRes] = await Promise.all([
        fetch(`/api/classes/${params.id}`),
        fetch(`/api/classes/${params.id}/topics`),
        fetch('/api/auth/me'),
      ])
      const clsData = await clsRes.json()
      const topicsData = await topicsRes.json()
      const meData = await meRes.json()

      const role = meData.user?.role
      if (role !== 'ADMIN' && role !== 'MANAGER') {
        router.replace(`/classes/${params.id}`)
        return
      }

      setCls(clsData.class || clsData)
      setTopics(Array.isArray(topicsData) ? topicsData : [])
      if (Array.isArray(topicsData) && topicsData.length > 0) {
        setExpanded(new Set(topicsData.map((t: Topic) => t.id)))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => { fetchData() }, [fetchData])

  const refreshTopics = async () => {
    const res = await fetch(`/api/classes/${params.id}/topics`)
    const data = await res.json()
    setTopics(Array.isArray(data) ? data : [])
  }

  // ── Topic CRUD ───────────────────────────────────────────────────────────────
  const createTopic = async () => {
    if (!newTopicTitle.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/classes/${params.id}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTopicTitle.trim() }),
      })
      setNewTopicTitle('')
      setAddingTopic(false)
      await refreshTopics()
    } finally {
      setSaving(false)
    }
  }

  const updateTopic = async (id: string) => {
    if (!editingTopicTitle.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTopicTitle.trim() }),
      })
      setEditingTopicId(null)
      await refreshTopics()
    } finally {
      setSaving(false)
    }
  }

  const deleteTopic = async (id: string) => {
    if (!confirm('Delete this topic and all its content?')) return
    setSaving(true)
    try {
      await fetch(`/api/topics/${id}`, { method: 'DELETE' })
      await refreshTopics()
    } finally {
      setSaving(false)
    }
  }

  const moveTopic = async (id: string, direction: 'up' | 'down') => {
    const idx = topics.findIndex(t => t.id === id)
    if (idx < 0) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === topics.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const current = topics[idx]
    const swap = topics[swapIdx]

    setSaving(true)
    try {
      await Promise.all([
        fetch(`/api/topics/${current.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: swap.order }),
        }),
        fetch(`/api/topics/${swap.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: current.order }),
        }),
      ])
      await refreshTopics()
    } finally {
      setSaving(false)
    }
  }

  // ── Content CRUD ─────────────────────────────────────────────────────────────
  const openAddContent = (topicId: string) => {
    setContentModal({ mode: 'add', topicId })
    setContentForm(emptyForm)
  }

  const openEditContent = (topicId: string, item: ContentItem) => {
    setContentModal({ mode: 'edit', topicId, content: item })
    setContentForm({
      title: item.title,
      description: item.description || '',
      videoUrl: item.videoUrl || '',
      pptUrl: item.pptUrl || '',
    })
  }

  const saveContent = async () => {
    if (!contentModal || !contentForm.title.trim()) return
    setSaving(true)
    try {
      if (contentModal.mode === 'add') {
        await fetch(`/api/topics/${contentModal.topicId}/content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contentForm),
        })
      } else if (contentModal.content) {
        await fetch(`/api/content/${contentModal.content.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contentForm),
        })
      }
      setContentModal(null)
      await refreshTopics()
    } finally {
      setSaving(false)
    }
  }

  const deleteContent = async (contentId: string) => {
    if (!confirm('Delete this lecture?')) return
    setSaving(true)
    try {
      await fetch(`/api/content/${contentId}`, { method: 'DELETE' })
      await refreshTopics()
    } finally {
      setSaving(false)
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

  return (
    <div className="page-container fade-in">
      {/* Content Form Modal */}
      {contentModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}
        onClick={() => setContentModal(null)}
        >
          <div style={{
            background: '#e8eaf0', borderRadius: '16px', width: '100%', maxWidth: '540px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          }}
          onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 20px', borderBottom: '1px solid #d0d2d9',
            }}>
              <span style={{ fontWeight: '700', color: '#1e1e3a', fontSize: '16px' }}>
                {contentModal.mode === 'add' ? 'Add Lecture' : 'Edit Lecture'}
              </span>
              <button onClick={() => setContentModal(null)} style={{
                width: '32px', height: '32px', borderRadius: '50%', background: '#e8eaf0',
                border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b6b8a',
                boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b6b8a', display: 'block', marginBottom: '6px' }}>
                  Lecture Title *
                </label>
                <input
                  value={contentForm.title}
                  onChange={e => setContentForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Introduction to Variables"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b6b8a', display: 'block', marginBottom: '6px' }}>
                  Video URL
                </label>
                <input
                  value={contentForm.videoUrl}
                  onChange={e => setContentForm(f => ({ ...f, videoUrl: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=... or direct video link"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b6b8a', display: 'block', marginBottom: '6px' }}>
                  PPT / File URL
                </label>
                <input
                  value={contentForm.pptUrl}
                  onChange={e => setContentForm(f => ({ ...f, pptUrl: e.target.value }))}
                  placeholder="https://... (link to PPT, PDF, or any file)"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b6b8a', display: 'block', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  value={contentForm.description}
                  onChange={e => setContentForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of what this lecture covers..."
                  rows={3}
                  className="form-input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => setContentModal(null)} className="btn btn-ghost">Cancel</button>
                <button
                  onClick={saveContent}
                  disabled={saving || !contentForm.title.trim()}
                  className="btn btn-primary"
                >
                  {saving ? 'Saving...' : contentModal.mode === 'add' ? 'Add Lecture' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${cls.color}, ${cls.color}cc)`,
          padding: '24px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', top: '-50px', right: '30px' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <Link href={`/classes/${params.id}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '10px', textDecoration: 'none',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Back to Subject
              </Link>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'white', marginBottom: '4px' }}>
                {cls.name} — Manage Content
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                {topics.length} topic{topics.length !== 1 ? 's' : ''} &middot; {topics.reduce((a, t) => a + t.content.length, 0)} lectures
              </p>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '10px 16px',
              border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)', fontSize: '12px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Admin / Manager View
            </div>
          </div>
        </div>
      </div>

      {/* Topics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {topics.map((topic, topicIdx) => (
          <div key={topic.id} className="card" style={{ overflow: 'hidden' }}>
            {/* Topic Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 20px', borderBottom: expanded.has(topic.id) ? '1px solid #d8dae3' : 'none',
              background: '#f0f1f5',
            }}>
              {/* Order controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                <button
                  onClick={() => moveTopic(topic.id, 'up')}
                  disabled={topicIdx === 0 || saving}
                  style={{
                    width: '20px', height: '20px', borderRadius: '4px', background: '#e8eaf0',
                    border: 'none', cursor: topicIdx === 0 ? 'not-allowed' : 'pointer',
                    opacity: topicIdx === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '2px 2px 4px #c5c7cf, -2px -2px 4px #ffffff',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <button
                  onClick={() => moveTopic(topic.id, 'down')}
                  disabled={topicIdx === topics.length - 1 || saving}
                  style={{
                    width: '20px', height: '20px', borderRadius: '4px', background: '#e8eaf0',
                    border: 'none', cursor: topicIdx === topics.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: topicIdx === topics.length - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '2px 2px 4px #c5c7cf, -2px -2px 4px #ffffff',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </div>

              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: cls.color + '18', color: cls.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '700', flexShrink: 0,
              }}>
                {String(topicIdx + 1).padStart(2, '0')}
              </div>

              {editingTopicId === topic.id ? (
                <input
                  value={editingTopicTitle}
                  onChange={e => setEditingTopicTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') updateTopic(topic.id); if (e.key === 'Escape') setEditingTopicId(null) }}
                  autoFocus
                  className="form-input"
                  style={{ flex: 1, padding: '6px 10px', fontSize: '14px' }}
                />
              ) : (
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e1e3a' }}>{topic.title}</span>
                  <span style={{ fontSize: '12px', color: '#9999b0', marginLeft: '8px' }}>
                    {topic.content.length} lecture{topic.content.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {editingTopicId === topic.id ? (
                  <>
                    <button onClick={() => updateTopic(topic.id)} disabled={saving} className="btn btn-primary btn-sm">Save</button>
                    <button onClick={() => setEditingTopicId(null)} className="btn btn-ghost btn-sm">Cancel</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setEditingTopicId(topic.id); setEditingTopicTitle(topic.title) }}
                      className="btn btn-ghost btn-sm"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Rename
                    </button>
                    <button onClick={() => openAddContent(topic.id)} className="btn btn-primary btn-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Lecture
                    </button>
                    <button
                      onClick={() => setExpanded(prev => { const n = new Set(prev); n.has(topic.id) ? n.delete(topic.id) : n.add(topic.id); return n })}
                      className="btn btn-ghost btn-sm"
                    >
                      {expanded.has(topic.id) ? 'Collapse' : 'Expand'}
                    </button>
                    <button onClick={() => deleteTopic(topic.id)} disabled={saving} style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                      color: '#ef4444', borderRadius: '6px', display: 'flex', alignItems: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content list */}
            {expanded.has(topic.id) && (
              <div>
                {topic.content.length === 0 ? (
                  <div style={{ padding: '16px 20px', color: '#9999b0', fontSize: '13px', textAlign: 'center' }}>
                    No lectures yet.{' '}
                    <button onClick={() => openAddContent(topic.id)} style={{ color: '#3636e8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                      Add the first one →
                    </button>
                  </div>
                ) : (
                  topic.content.map((item, itemIdx) => (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '12px 20px',
                      borderBottom: itemIdx < topic.content.length - 1 ? '1px solid #ebebf0' : 'none',
                    }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '8px',
                        background: item.videoUrl ? '#3636e818' : '#f0f0f5',
                        color: item.videoUrl ? '#3636e8' : '#9999b0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {item.videoUrl
                          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e1e3a' }}>{item.title}</div>
                        {item.description && (
                          <p style={{ fontSize: '12px', color: '#6b6b8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                            {item.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '3px' }}>
                          {item.videoUrl && <span style={{ fontSize: '11px', color: '#3636e8' }}>📹 Video linked</span>}
                          {item.pptUrl && <span style={{ fontSize: '11px', color: '#10b981' }}>📄 PPT linked</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => openEditContent(topic.id, item)} className="btn btn-ghost btn-sm">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Edit
                        </button>
                        <button onClick={() => deleteContent(item.id)} disabled={saving} style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                          color: '#ef4444', borderRadius: '6px', display: 'flex', alignItems: 'center',
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add New Topic */}
        {addingTopic ? (
          <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              value={newTopicTitle}
              onChange={e => setNewTopicTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createTopic(); if (e.key === 'Escape') { setAddingTopic(false); setNewTopicTitle('') } }}
              placeholder="Topic title (e.g. Chapter 1: Introduction)"
              autoFocus
              className="form-input"
              style={{ flex: 1 }}
            />
            <button onClick={createTopic} disabled={saving || !newTopicTitle.trim()} className="btn btn-primary">
              {saving ? 'Adding...' : 'Add Topic'}
            </button>
            <button onClick={() => { setAddingTopic(false); setNewTopicTitle('') }} className="btn btn-ghost">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setAddingTopic(true)}
            style={{
              padding: '14px 20px', borderRadius: '12px',
              border: '2px dashed #c5c7cf', background: 'transparent',
              cursor: 'pointer', color: '#6b6b8a', fontSize: '13.5px', fontWeight: '500',
              display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3636e8'; e.currentTarget.style.color = '#3636e8' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#c5c7cf'; e.currentTarget.style.color = '#6b6b8a' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add New Topic
          </button>
        )}
      </div>
    </div>
  )
}
