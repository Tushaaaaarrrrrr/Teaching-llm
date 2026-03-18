'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import ImageCropper from '@/components/ui/ImageCropper'

interface AnnouncementCourse {
  id: string
  name: string
  color: string
}

interface AnnouncementAuthor {
  id: string
  name: string
  role: string
  avatar: string | null
}

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  courseId: string | null
  imageUrl: string | null
  pollId: string | null
  createdAt: string
  createdBy: AnnouncementAuthor
  course: AnnouncementCourse | null
  poll?: {
    id: string
    question: string
    expiresAt: string
    options: { id: string; text: string; order: number }[]
    responses: { optionId: string }[]
  }
}

interface CourseOption {
  id: string
  name: string
}

type FilterTab = 'all' | 'updates' | 'course'

const TYPE_OPTIONS = [
  { value: 'info',    label: 'Info',    color: '#3b82f6' },
  { value: 'success', label: 'Success', color: '#10b981' },
  { value: 'warning', label: 'Warning', color: '#f59e0b' },
  { value: 'error',   label: 'Urgent',  color: '#ef4444' },
]

const TYPE_COLORS: Record<string, string> = {
  info: '#3b82f6', success: '#10b981', warning: '#f59e0b', error: '#ef4444',
  INFO: '#3b82f6', SUCCESS: '#10b981', WARNING: '#f59e0b', ERROR: '#ef4444',
}

const TYPE_BG: Record<string, string> = {
  info:    'rgba(59,130,246,0.10)',
  success: 'rgba(16,185,129,0.10)',
  warning: 'rgba(245,158,11,0.10)',
  error:   'rgba(239,68,68,0.10)',
  INFO:    'rgba(59,130,246,0.10)',
  SUCCESS: 'rgba(16,185,129,0.10)',
  WARNING: 'rgba(245,158,11,0.10)',
  ERROR:   'rgba(239,68,68,0.10)',
}

const TYPE_LABELS: Record<string, string> = {
  info: 'Info', success: 'Success', warning: 'Warning', error: 'Urgent',
  INFO: 'Info', SUCCESS: 'Success', WARNING: 'Warning', ERROR: 'Urgent',
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'Just now'
  if (mins  < 60) return `${mins} minute${mins  !== 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  if (days  === 1) return 'Yesterday'
  if (days  < 7)  return `${days} days ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TypeIcon({ type }: { type: string }) {
  const color = TYPE_COLORS[type] || '#3b82f6'
  const bg    = TYPE_BG[type]    || TYPE_BG.info
  const icon  = (() => {
    const t = type.toLowerCase()
    if (t === 'success') return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    )
    if (t === 'warning') return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    )
    if (t === 'error') return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    )
    // info / default: megaphone
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
      </svg>
    )
  })()

  return (
    <div style={{
      width: '52px', height: '52px', borderRadius: '16px',
      background: bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </div>
  )
}

export default function AnnouncementsPage() {
  const searchParams = useSearchParams()
  const highlightId  = searchParams.get('id')
  const cardRefs     = useRef<Record<string, HTMLDivElement | null>>({})

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [courses,       setCourses]       = useState<CourseOption[]>([])
  const [loading,       setLoading]       = useState(true)
  const [userRole,      setUserRole]      = useState('')
  const [showForm,      setShowForm]      = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [expandedId,    setExpandedId]    = useState<string | null>(highlightId)
  const [activeTab,     setActiveTab]     = useState<FilterTab>('all')
  const [editId,        setEditId]        = useState<string | null>(null)

  // Form state
  const [title,   setTitle]   = useState('')
  const [content, setContent] = useState('')
  const [type,    setType]    = useState('info')
  const [courseId, setCourseId] = useState('')
  
  // Enhancement states
  const [contentType, setContentType] = useState<'post' | 'image' | 'poll'>('post')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [croppedImage, setCroppedImage] = useState<Blob | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [pollExpiry, setPollExpiry] = useState(24) // hours

  // Voting states
  const [votingId, setVotingId] = useState<string | null>(null)
  const [pollResults, setPollResults] = useState<Record<string, any>>({})

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!loading && highlightId && cardRefs.current[highlightId]) {
      cardRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [loading, highlightId])

  async function loadData() {
    try {
      const [annRes, meRes, courseRes] = await Promise.all([
        fetch('/api/announcements'),
        fetch('/api/auth/me'),
        fetch('/api/courses'),
      ])
      const annData    = await annRes.json()
      const meData     = await meRes.json()
      const courseData = await courseRes.json()
      setAnnouncements(Array.isArray(annData)   ? annData   : [])
      setUserRole(meData.user?.role || meData.role || '')
      setCourses(Array.isArray(courseData) ? courseData : [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAnnouncements(prev => prev.filter(a => a.id !== id))
      }
    } catch { /* ignore */ }
  }

  function handleEdit(a: Announcement) {
    setEditId(a.id)
    setTitle(a.title)
    setContent(a.content)
    setType(a.type)
    setCourseId(a.courseId || '')
    setContentType(a.imageUrl ? 'image' : a.poll ? 'poll' : 'post')
    setSelectedImage(a.imageUrl ? a.imageUrl : null)
    setCroppedImage(null)
    if (a.poll) {
      setPollQuestion(a.poll.question)
      setPollOptions(a.poll.options.map(o => o.text))
    } else {
      setPollQuestion('')
      setPollOptions(['', ''])
    }
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    
    try {
      let imageUrl = null
      if (contentType === 'image' && croppedImage) {
        const formData = new FormData()
        formData.append('file', croppedImage, 'announcement.jpg')
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        const upData = await uploadRes.json()
        imageUrl = upData.url
      }

      const pollData = contentType === 'poll' ? {
        question: pollQuestion,
        options: pollOptions.filter(o => o.trim() !== ''),
        expiresAt: new Date(Date.now() + pollExpiry * 60 * 60 * 1000).toISOString()
      } : null

      const url = editId ? `/api/announcements/${editId}` : '/api/announcements'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: title.trim(), 
          content: content.trim(), 
          type, 
          courseId: courseId || undefined,
          imageUrl,
          pollData
        }),
      })
      if (res.ok) {
        const newAnn = await res.json()
        if (editId) {
          setAnnouncements(prev => prev.map(a => a.id === editId ? newAnn : a))
        } else {
          setAnnouncements(prev => [newAnn, ...prev])
        }
        resetForm()
      }
    } catch { /* ignore */ } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setEditId(null)
    setTitle('')
    setContent('')
    setType('info')
    setCourseId('')
    setContentType('post')
    setSelectedImage(null)
    setCroppedImage(null)
    setPollQuestion('')
    setPollOptions(['', ''])
    setShowForm(false)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setSelectedImage(reader.result as string)
        setShowCropper(true)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleVote(pollId: string, optionId: string) {
    setVotingId(pollId)
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId }),
      })
      if (res.ok) {
        // Optimistic update or reload? Let's reload the announcements list
        const annRes = await fetch('/api/announcements')
        const annData = await annRes.json()
        setAnnouncements(annData)
      }
    } catch { /* ignore */ } finally {
      setVotingId(null)
    }
  }

  async function fetchResults(pollId: string) {
    try {
      const res = await fetch(`/api/polls/${pollId}/results`)
      if (res.ok) {
        const data = await res.json()
        setPollResults(prev => ({ ...prev, [pollId]: data }))
      }
    } catch { /* ignore */ }
  }

  const isManager = userRole === 'MANAGER'

  const filtered = announcements.filter(a => {
    if (activeTab === 'updates') return !a.courseId
    if (activeTab === 'course')   return !!a.courseId
    return true
  })

  // ── Shared styles ──────────────────────────────────────────────────────────
  const neuCard: React.CSSProperties = {
    borderRadius: '20px', background: '#e8eaf0',
    boxShadow: '6px 6px 14px #c5c7cf, -6px -6px 14px #ffffff',
    padding: '24px',
  }
  const neuInput: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: '14px', border: 'none',
    background: '#e8eaf0', boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
    fontSize: '14px', fontFamily: 'inherit', color: '#1e1e3a', outline: 'none',
  }
  const neuButton: React.CSSProperties = {
    padding: '12px 28px', borderRadius: '50px', border: 'none',
    background: '#3636e8', color: '#fff', fontSize: '14px', fontWeight: 700,
    fontFamily: 'inherit', cursor: 'pointer',
    boxShadow: '4px 4px 10px rgba(54,54,232,0.35), -2px -2px 6px rgba(255,255,255,0.7)',
    transition: 'all 0.2s ease',
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: '#9999b0', fontSize: '15px' }}>Loading announcements...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px 48px' }}>

      {/* ── Top bar: filter tabs + create button ────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>

        {/* Filter tabs */}
        <div style={{
          display: 'flex', gap: '6px', padding: '6px',
          borderRadius: '50px', background: '#e8eaf0',
          boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
        }}>
          {(['all', 'updates', 'course'] as FilterTab[]).map(tab => {
            const labels: Record<FilterTab, string> = { all: 'All', updates: 'Updates', course: 'Course' }
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 20px', borderRadius: '50px', border: 'none',
                  fontSize: '13px', fontWeight: isActive ? 700 : 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                  background:  isActive ? '#3636e8' : 'transparent',
                  color:       isActive ? '#fff'    : '#6b6b8a',
                  boxShadow:   isActive ? '3px 3px 8px rgba(54,54,232,0.35), -2px -2px 6px rgba(255,255,255,0.6)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {labels[tab]}
                {tab === 'all' && announcements.length > 0 && (
                  <span style={{
                    marginLeft: '6px', padding: '1px 7px', borderRadius: '50px',
                    background: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(54,54,232,0.1)',
                    color:      isActive ? '#fff' : '#3636e8',
                    fontSize: '11px', fontWeight: 700,
                  }}>
                    {announcements.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* New Announcement button (admin/manager only) */}
        {isManager && (
          <button
            onClick={() => { resetForm(); setShowForm(v => !v) }}
            style={{
              ...neuButton,
              background: showForm ? '#6b6b8a' : '#3636e8',
              boxShadow: showForm
                ? '4px 4px 10px rgba(107,107,138,0.35), -2px -2px 6px rgba(255,255,255,0.7)'
                : '4px 4px 10px rgba(54,54,232,0.35), -2px -2px 6px rgba(255,255,255,0.7)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {showForm
                ? (<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>)
                : (<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>)}
            </svg>
            {showForm ? 'Cancel' : 'New Announcement'}
          </button>
        )}
      </div>

      {/* ── Create form ─────────────────────────────────────────────────── */}
      {isManager && showForm && (
        <div style={{ ...neuCard, marginBottom: '28px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a', marginBottom: '20px' }}>
            {editId ? 'Edit Announcement' : 'Create Announcement'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Announcement title..." style={neuInput} required />
              </div>
              {/* Content Type Toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {(['post', 'image', 'poll'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setContentType(t)}
                    style={{
                      padding: '8px 16px', borderRadius: '50px', border: 'none',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      background: contentType === t ? '#3636e8' : '#e8eaf0',
                      color: contentType === t ? '#fff' : '#6b6b8a',
                      boxShadow: contentType === t ? '2px 2px 6px rgba(54,54,232,0.3)' : 'inset 2px 2px 4px #c5c7cf, inset -2px -2px 4px #fff',
                      transition: 'all 0.2s'
                    }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {contentType === 'image' && (
                <div style={{ ...neuInput, padding: '20px', textAlign: 'center', border: '2px dashed #c5c7cf', background: 'transparent' }}>
                  {croppedImage ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={URL.createObjectURL(croppedImage)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                      <button 
                        type="button"
                        onClick={() => setCroppedImage(null)}
                        style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>
                  ) : selectedImage ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={selectedImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                      <button 
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer' }}>
                      <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                      <div style={{ color: '#6b6b8a', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <span>Click to upload & crop image</span>
                      </div>
                    </label>
                  )}
                </div>
              )}

              {contentType === 'poll' && (
                <div style={{ ...neuCard, background: '#f0f2f7', boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #fff', padding: '16px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b6b8a', marginBottom: '4px' }}>Poll Question</label>
                    <input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="What is your question?" style={neuInput} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b6b8a', marginBottom: '4px' }}>Options</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {pollOptions.map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                          <input type="text" value={opt} onChange={e => {
                            const newOpts = [...pollOptions]
                            newOpts[idx] = e.target.value
                            setPollOptions(newOpts)
                          }} placeholder={`Option ${idx + 1}`} style={neuInput} />
                          {pollOptions.length > 2 && (
                            <button type="button" onClick={() => setPollOptions(p => p.filter((_, i) => i !== idx))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
                          )}
                        </div>
                      ))}
                      {pollOptions.length < 6 && (
                        <button type="button" onClick={() => setPollOptions(p => [...p, ''])} style={{ background: 'none', border: '1px dashed #3636e8', color: '#3636e8', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Add Option</button>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b6b8a', marginBottom: '4px' }}>Expires in (hours)</label>
                    <select value={pollExpiry} onChange={e => setPollExpiry(Number(e.target.value))} style={neuInput}>
                      <option value={1}>1 hour</option>
                      <option value={6}>6 hours</option>
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours (1 day)</option>
                      <option value={48}>48 hours (2 days)</option>
                      <option value={168}>168 hours (1 week)</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Announcement Body</label>
                <textarea value={content} onChange={e => setContent(e.target.value)}
                  placeholder="Write your announcement details here..." rows={3}
                  style={{ ...neuInput, resize: 'vertical', minHeight: '80px' }} required />
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Type</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {TYPE_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setType(opt.value)}
                        style={{
                          padding: '8px 16px', borderRadius: '50px', border: 'none',
                          fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                          background: type === opt.value ? opt.color : '#e8eaf0',
                          color:      type === opt.value ? '#fff'    : '#6b6b8a',
                          boxShadow:  type === opt.value
                            ? `3px 3px 8px ${opt.color}40, -2px -2px 6px rgba(255,255,255,0.7)`
                            : '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                          transition: 'all 0.2s',
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>
                    Target Course (optional)
                  </label>
                  <select value={courseId} onChange={e => setCourseId(e.target.value)}
                    style={{ ...neuInput, cursor: 'pointer', appearance: 'none' }}>
                    <option value="">All Students (Global)</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="submit" disabled={submitting || !title.trim() || !content.trim()}
                  style={{
                    ...neuButton,
                    opacity: submitting || !title.trim() || !content.trim() ? 0.6 : 1,
                    cursor:  submitting ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  {submitting ? 'Publishing...' : (editId ? 'Update Announcement' : 'Publish Announcement')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Announcement list ────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ ...neuCard, textAlign: 'center', padding: '60px 24px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c5c7cf" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 16px' }}>
            <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
          </svg>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#6b6b8a', marginBottom: '4px' }}>
            {activeTab === 'all' ? 'No announcements yet' : `No ${activeTab} announcements`}
          </div>
          <div style={{ fontSize: '13px', color: '#9999b0' }}>
            {isManager ? 'Create your first announcement using the button above.' : 'Check back later for updates.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map(a => {
            const isExpanded  = expandedId === a.id
            const isHighlight = highlightId === a.id
            const isNew       = Date.now() - new Date(a.createdAt).getTime() < 24 * 60 * 60 * 1000
            const typeColor   = TYPE_COLORS[a.type] || '#3b82f6'
            const typeBg      = TYPE_BG[a.type]    || TYPE_BG.info
            const typeLabel   = TYPE_LABELS[a.type] || 'Info'
            const tagLabel    = a.courseId ? 'Course Announcement' : 'System Update'

            return (
              <div
                key={a.id}
                ref={el => { cardRefs.current[a.id] = el }}
                style={{
                  ...neuCard,
                  padding: '20px 24px',
                  transition: 'box-shadow 0.2s',
                  ...(isHighlight ? { boxShadow: `6px 6px 14px #c5c7cf, -6px -6px 14px #ffffff, 0 0 0 2px ${typeColor}50` } : {}),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px' }}>

                  {/* Type icon */}
                  <TypeIcon type={a.type} />

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Tag row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '50px',
                        background: typeBg, color: typeColor,
                        fontSize: '11px', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        {tagLabel}
                      </span>

                      {/* Course badge */}
                      {a.course && (
                        <span style={{
                          padding: '3px 10px', borderRadius: '50px',
                          background: `${a.course.color}18`, color: a.course.color,
                          fontSize: '11px', fontWeight: 700,
                        }}>
                          {a.course.name}
                        </span>
                      )}

                      {/* NEW badge */}
                      {isNew && (
                        <span style={{
                          padding: '3px 9px', borderRadius: '50px',
                          background: 'rgba(54,54,232,0.12)', color: '#3636e8',
                          fontSize: '11px', fontWeight: 800,
                        }}>
                          NEW
                        </span>
                      )}

                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#b0b2ba' }}>
                          {relativeTime(a.createdAt)}
                        </span>
                        {isManager && (
                          <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                            <button onClick={() => handleEdit(a)} title="Edit" style={{ background: '#e8eaf0', border: 'none', cursor: 'pointer', color: '#6366f1', width: '26px', height: '26px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button onClick={() => handleDelete(a.id)} title="Delete" style={{ background: '#e8eaf0', border: 'none', cursor: 'pointer', color: '#ef4444', width: '26px', height: '26px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e1e3a', lineHeight: '1.35', marginBottom: '6px' }}>
                      {a.title}
                    </h3>

                    {/* Preview */}
                    <p style={{
                      fontSize: '14px', color: '#6b6b8a', lineHeight: '1.6', margin: 0,
                      wordBreak: 'break-word' as const,
                      ...(!isExpanded ? {
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      } : {
                        whiteSpace: 'pre-wrap' as const,
                      }),
                    }}>
                      {a.content}
                    </p>

                    {/* Image Placeholder */}
                    {a.imageUrl && isExpanded && (
                      <div style={{ marginTop: '16px', borderRadius: '12px', overflow: 'hidden', boxShadow: '4px 4px 10px #c5c7cf' }}>
                        <img src={a.imageUrl} alt="Announcement" style={{ width: '100%', display: 'block' }} />
                      </div>
                    )}

                    {/* Poll Rendering */}
                    {a.poll && isExpanded && (
                      <div style={{ marginTop: '20px', padding: '16px', background: '#f0f2f7', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1e1e3a', marginBottom: '12px' }}>{a.poll.question}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {a.poll.options.map(opt => {
                            const hasVoted = a.poll?.responses && a.poll.responses.length > 0
                            const isSelected = hasVoted && a.poll?.responses[0].optionId === opt.id
                            const isExpired = new Date() > new Date(a.poll?.expiresAt || '')
                            const results = pollResults[a.poll?.id || '']
                            
                            return (
                              <div key={opt.id} style={{ position: 'relative' }}>
                                <button
                                  disabled={hasVoted || isExpired || votingId === a.poll?.id}
                                  onClick={() => a.poll && handleVote(a.poll.id, opt.id)}
                                  style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: 'none',
                                    textAlign: 'left', fontSize: '14px', fontWeight: 600,
                                    background: '#fff',
                                    color: isSelected ? '#3636e8' : '#1e1e3a',
                                    boxShadow: isSelected ? '0 0 0 2px #3636e8 inset, 3px 3px 6px #c5c7cf, -2px -2px 4px #fff' : '3px 3px 6px #c5c7cf, -2px -2px 4px #fff',
                                    cursor: (hasVoted || isExpired) ? 'default' : 'pointer',
                                    transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    zIndex: 1
                                  }}
                                >
                                  {/* Vote bar for Manager (from results) or Student (after vote - 100% fill if selected) */}
                                  {(userRole === 'MANAGER' && results) ? (
                                    <div style={{
                                      position: 'absolute', left: 0, top: 0, bottom: 0,
                                      width: `${(results.totalVotes > 0 ? (results.results.find((r:any)=>r.id===opt.id)?.count || 0) / results.totalVotes * 100 : 0)}%`,
                                      background: 'rgba(54,54,232,0.1)', zIndex: -1, transition: 'width 1s ease-out'
                                    }} />
                                  ) : isSelected ? (
                                    <div style={{
                                      position: 'absolute', left: 0, top: 0, bottom: 0,
                                      width: '100%',
                                      background: 'rgba(54,54,232,0.08)', zIndex: -1
                                    }} />
                                  ) : null}
                                  
                                  <span>{opt.text}</span>
                                  
                                  {(userRole === 'MANAGER' && results) && (
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#fff' : '#3636e8' }}>
                                      {results.results.find((r:any)=>r.id===opt.id)?.count || 0} votes
                                    </span>
                                  )}
                                  
                                  {isSelected && (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                  )}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                        
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#9999b0', fontWeight: 600 }}>
                            {new Date() > new Date(a.poll.expiresAt) ? 'Poll Expired' : `Expires: ${new Date(a.poll.expiresAt).toLocaleString()}`}
                          </span>
                          
                          {userRole === 'MANAGER' && (
                            <button 
                              onClick={() => a.poll && fetchResults(a.poll.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#3636e8', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                              Refresh Results (Manager Only)
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Expanded extra: author */}
                    {isExpanded && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          background: '#e8eaf0', boxShadow: '2px 2px 4px #c5c7cf, -2px -2px 4px #ffffff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', fontWeight: 800, color: '#3636e8', overflow: 'hidden', flexShrink: 0,
                        }}>
                          {a.createdBy.avatar
                            ? <img src={a.createdBy.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : a.createdBy.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                          }
                        </div>
                        <span style={{ fontSize: '12px', color: '#9999b0', fontWeight: 600 }}>{a.createdBy.name}</span>
                        <span style={{ fontSize: '12px', color: '#c0c2ca', marginLeft: '4px' }}>
                          {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Read More / Show Less button */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    style={{
                      flexShrink: 0, alignSelf: 'center',
                      padding: '9px 20px', borderRadius: '50px', border: 'none',
                      background: isExpanded ? '#e8eaf0' : typeBg,
                      color: isExpanded ? '#6b6b8a' : typeColor,
                      fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                      boxShadow: isExpanded
                        ? '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff'
                        : `3px 3px 8px ${typeColor}30, -2px -2px 6px rgba(255,255,255,0.8)`,
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap' as const,
                    }}
                  >
                    {isExpanded ? 'Show Less' : 'Read More'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <span style={{ fontSize: '13px', color: '#9999b0', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Showing {filtered.length} announcement{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Modal: Cropper ──────────────────────────────────────────────── */}
      {showCropper && selectedImage && (
        <ImageCropper 
          image={selectedImage} 
          onCropComplete={(blob) => {
            setCroppedImage(blob)
            setShowCropper(false)
          }}
          onCancel={() => {
            setSelectedImage(null)
            setShowCropper(false)
          }}
        />
      )}
    </div>
  )
}
