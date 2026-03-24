'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

interface AnnouncementClass {
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
  classId: string | null
  createdAt: string
  createdBy: AnnouncementAuthor
  class: AnnouncementClass | null
}

interface ClassOption {
  id: string
  name: string
}

type FilterTab = 'all' | 'updates' | 'class'

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
  const [classes,       setClasses]       = useState<ClassOption[]>([])
  const [loading,       setLoading]       = useState(true)
  const [userRole,      setUserRole]      = useState('')
  const [showForm,      setShowForm]      = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [expandedId,    setExpandedId]    = useState<string | null>(highlightId)
  const [activeTab,     setActiveTab]     = useState<FilterTab>('all')

  // Form state
  const [title,   setTitle]   = useState('')
  const [content, setContent] = useState('')
  const [type,    setType]    = useState('info')
  const [classId, setClassId] = useState('')

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!loading && highlightId && cardRefs.current[highlightId]) {
      cardRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [loading, highlightId])

  async function loadData() {
    try {
      const [annRes, meRes, classRes] = await Promise.all([
        fetch('/api/announcements'),
        fetch('/api/auth/me'),
        fetch('/api/classes'),
      ])
      const annData   = await annRes.json()
      const meData    = await meRes.json()
      const classData = await classRes.json()
      setAnnouncements(Array.isArray(annData)   ? annData   : [])
      setUserRole(meData.user?.role || meData.role || '')
      setClasses(Array.isArray(classData) ? classData : [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), type, classId: classId || undefined }),
      })
      if (res.ok) {
        const newAnn = await res.json()
        setAnnouncements(prev => [newAnn, ...prev])
        setTitle(''); setContent(''); setType('info'); setClassId(''); setShowForm(false)
      }
    } catch { /* ignore */ } finally {
      setSubmitting(false)
    }
  }

  const isAdminOrManager = userRole === 'MANAGER' || userRole === 'ADMIN'

  const filtered = announcements.filter(a => {
    if (activeTab === 'updates') return !a.classId
    if (activeTab === 'class')   return !!a.classId
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
          {(['all', 'updates', 'class'] as FilterTab[]).map(tab => {
            const labels: Record<FilterTab, string> = { all: 'All', updates: 'Updates', class: 'Class' }
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
        {isAdminOrManager && (
          <button
            onClick={() => setShowForm(v => !v)}
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
      {isAdminOrManager && showForm && (
        <div style={{ ...neuCard, marginBottom: '28px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a', marginBottom: '20px' }}>
            Create Announcement
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Announcement title..." style={neuInput} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Content</label>
                <textarea value={content} onChange={e => setContent(e.target.value)}
                  placeholder="Write your announcement details here..." rows={4}
                  style={{ ...neuInput, resize: 'vertical', minHeight: '100px' }} required />
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
                    Target Class (optional)
                  </label>
                  <select value={classId} onChange={e => setClassId(e.target.value)}
                    style={{ ...neuInput, cursor: 'pointer', appearance: 'none' }}>
                    <option value="">All Students (Global)</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                  {submitting ? 'Publishing...' : 'Publish Announcement'}
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
            {isAdminOrManager ? 'Create your first announcement using the button above.' : 'Check back later for updates.'}
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
            const tagLabel    = a.classId ? 'Class Announcement' : 'System Update'

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

                      {/* Class badge */}
                      {a.class && (
                        <span style={{
                          padding: '3px 10px', borderRadius: '50px',
                          background: `${a.class.color}18`, color: a.class.color,
                          fontSize: '11px', fontWeight: 700,
                        }}>
                          {a.class.name}
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

                      <span style={{ fontSize: '12px', color: '#b0b2ba', marginLeft: 'auto' }}>
                        {relativeTime(a.createdAt)}
                      </span>
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
                            : (a.createdBy.name || 'User').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
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
    </div>
  )
}
