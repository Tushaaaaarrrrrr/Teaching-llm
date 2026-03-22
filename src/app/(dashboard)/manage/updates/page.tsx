'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import ImageCropper from '@/components/ui/ImageCropper'
import DOMPurify from 'dompurify'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type UpdateType = 'WELCOME' | 'GENERAL' | 'DAILY_DIGEST'

interface SystemUpdate {
  id: string
  title: string
  content: string
  type: UpdateType
  imageUrl: string | null
  isActive: boolean
  priority: number
  animationType: string | null
  showDelay: number
  targetRole: string | null
  courseId: string | null
  ctaText: string | null
  ctaLink: string | null
  scheduledAt: string | null
  expiresAt: string | null
  createdAt: string
  _count: { views: number }
  createdBy: { name: string }
}

const TEMPLATES = {
  WELCOME: { label: 'Welcome (New Users)', type: 'WELCOME', targetRole: '', priority: 100, animationType: 'confetti', showDelay: 0, content: '<h1>Welcome to Alpha IITIAN!</h1><p>We are thrilled to have you here.</p>' },
  EXAM: { label: 'Exam Notification', type: 'GENERAL', targetRole: 'STUDENT', priority: 50, animationType: '', showDelay: 3, content: '<h2>Mid-term Exam Starting Soon!</h2><p>Make sure to review your study materials before it begins.</p>' },
  DIGEST: { label: 'Daily Digest', type: 'DAILY_DIGEST', targetRole: 'STUDENT', priority: 10, animationType: '', showDelay: 3, content: '<p>Here is your summary of recent activities and updates.</p>' },
  CUSTOM: { label: 'Custom Update', type: 'GENERAL', targetRole: '', priority: 0, animationType: '', showDelay: 3, content: '' }
}

export default function ManageUpdatesPage() {
  const { data, isLoading } = useSWR('/api/updates', fetcher)
  const { data: coursesData } = useSWR('/api/courses', fetcher)
  
  const updates: SystemUpdate[] = data?.updates || []
  const courses = coursesData?.courses || coursesData || []

  // Form state
  const [showModal, setShowModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof TEMPLATES>('CUSTOM')
  
  const [title, setTitle] = useState('')
  const [type, setType] = useState<UpdateType>('GENERAL')
  const [isActive, setIsActive] = useState(true)
  const [priority, setPriority] = useState(0)
  const [animationType, setAnimationType] = useState<string>('')
  const [showDelay, setShowDelay] = useState(3)
  const [targetRole, setTargetRole] = useState<string>('')
  const [courseId, setCourseId] = useState<string>('')
  const [ctaText, setCtaText] = useState<string>('')
  const [ctaLink, setCtaLink] = useState<string>('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Image cropper state
  const [cropperImage, setCropperImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Rich text editor ref
  const editorRef = useRef<HTMLDivElement>(null)

  function applyTemplate(t: keyof typeof TEMPLATES) {
    setSelectedTemplate(t)
    const tmpl = TEMPLATES[t]
    setType(tmpl.type as UpdateType)
    setTargetRole(tmpl.targetRole)
    setPriority(tmpl.priority)
    setAnimationType(tmpl.animationType)
    setShowDelay(tmpl.showDelay)
    // Only pre-fill content if empty to prevent data loss
    if (editorRef.current && !editorRef.current.innerHTML.trim()) {
      editorRef.current.innerHTML = tmpl.content
    }
  }

  function resetForm() {
    setEditId(null)
    setSelectedTemplate('CUSTOM')
    setTitle('')
    setType('GENERAL')
    setIsActive(true)
    setPriority(0)
    setAnimationType('')
    setShowDelay(3)
    setTargetRole('')
    setCourseId('')
    setCtaText('')
    setCtaLink('')
    setScheduledAt('')
    setExpiresAt('')
    setImageUrl('')
    if (editorRef.current) editorRef.current.innerHTML = ''
  }

  function openCreate() {
    resetForm()
    setShowModal(true)
    setTimeout(() => { if (editorRef.current) editorRef.current.focus() }, 100)
  }

  function openEdit(u: SystemUpdate) {
    setEditId(u.id)
    setSelectedTemplate('CUSTOM')
    setTitle(u.title)
    setType(u.type)
    setIsActive(u.isActive)
    setPriority(u.priority)
    setAnimationType(u.animationType || '')
    setShowDelay(u.showDelay)
    setTargetRole(u.targetRole || '')
    setCourseId(u.courseId || '')
    setCtaText(u.ctaText || '')
    setCtaLink(u.ctaLink || '')
    setScheduledAt(u.scheduledAt ? u.scheduledAt.split('T')[0] + 'T' + u.scheduledAt.split('T')[1]?.slice(0, 5) : '')
    setExpiresAt(u.expiresAt ? u.expiresAt.split('T')[0] : '')
    setImageUrl(u.imageUrl || '')
    setShowModal(true)
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = u.content
    }, 50)
  }

  async function handleSave() {
    const content = editorRef.current?.innerHTML || ''
    if (!title.trim() || !content.trim()) return

    setSaving(true)
    try {
      const body: any = {
        title: title.trim(),
        content,
        type,
        isActive,
        priority,
        animationType: animationType || null,
        showDelay,
        targetRole: targetRole || null,
        courseId: courseId || null,
        ctaText: ctaText || null,
        ctaLink: ctaLink || null,
        scheduledAt: scheduledAt || null,
        expiresAt: expiresAt || null,
        imageUrl: imageUrl || null,
      }

      const url = editId ? `/api/updates/${editId}` : '/api/updates'
      await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      setShowModal(false)
      resetForm()
      mutate('/api/updates')
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this update? This cannot be undone.')) return
    await fetch(`/api/updates/${id}`, { method: 'DELETE' })
    mutate('/api/updates')
  }

  async function toggleActive(u: SystemUpdate) {
    if (togglingId) return
    setTogglingId(u.id)
    try {
      await fetch(`/api/updates/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !u.isActive }),
      })
      await mutate('/api/updates')
    } catch (e) {
      console.error(e)
    } finally {
      setTogglingId(null)
    }
  }

  // Image upload handler
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropperImage(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleCropComplete(blob: Blob) {
    setCropperImage(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', blob, 'update-image.jpg')
      formData.append('type', 'updates')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setImageUrl(data.url)
    } catch (e) { console.error(e) }
    setUploading(false)
  }

  // Rich text formatting commands
  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
  }

  const typeConfig: Record<UpdateType, { label: string; color: string; bg: string }> = {
    WELCOME: { label: 'Welcome', color: '#7c3aed', bg: '#ede9fe' },
    GENERAL: { label: 'General', color: '#3b82f6', bg: '#dbeafe' },
    DAILY_DIGEST: { label: 'Daily Digest', color: '#0ea5e9', bg: '#e0f2fe' },
  }

  const isWelcome = type === 'WELCOME'
  // Welcome messages are strictly for new users, so disable targeting
  const hideTargeting = isWelcome

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <button onClick={openCreate} className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Update
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: updates.length, color: '#6366f1' },
          { label: 'Active', value: updates.filter(u => u.isActive).length, color: '#10b981' },
          { label: 'Welcome', value: updates.filter(u => u.type === 'WELCOME').length, color: '#7c3aed' },
          { label: 'Total Views', value: updates.reduce((s, u) => s + u._count.views, 0), color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: s.color, marginTop: '4px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Updates List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0' }}>Loading…</div>
        ) : updates.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0' }}>
            No updates yet. Click "New Update" to create one.
          </div>
        ) : (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {updates.map(u => {
              const tc = typeConfig[u.type]
              return (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '14px 20px', borderRadius: '50px',
                  background: '#e8eaf0',
                  boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff',
                  transition: 'box-shadow 0.2s',
                  opacity: u.isActive ? 1 : 0.55,
                }}>
                  {/* Type badge */}
                  <div style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '10px',
                    fontWeight: '800', background: tc.bg, color: tc.color,
                    textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
                  }}>
                    {tc.label}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e1e3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9999b0', marginTop: '2px' }}>
                      {u.createdBy.name} · {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {u.animationType && ` · 🎉 ${u.animationType}`}
                      {u.targetRole && ` · 🎯 ${u.targetRole}`}
                      {u.courseId && ` · 📚 ${courses.find((c: any) => c.id === u.courseId)?.name || 'Course'}`}
                    </div>
                  </div>

                  {/* Views count */}
                  <div style={{ fontSize: '11px', color: '#9999b0', flexShrink: 0 }}>
                    <span style={{ fontWeight: '700', color: '#6366f1' }}>{u._count.views}</span> views
                  </div>

                  {/* Active toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: u.isActive ? '#10b981' : '#9999b0', textTransform: 'uppercase' }}>
                      {u.isActive ? 'On' : 'Off'}
                    </span>
                    <button 
                      onClick={() => toggleActive(u)} 
                      disabled={togglingId === u.id}
                      style={{
                        width: '44px', height: '22px', borderRadius: '11px', border: 'none', cursor: togglingId === u.id ? 'wait' : 'pointer',
                        background: u.isActive ? '#10b981' : '#d1d5db',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                        opacity: togglingId === u.id ? 0.7 : 1,
                      }}
                    >
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: '2px',
                        left: u.isActive ? '24px' : '2px',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {togglingId === u.id && (
                          <div style={{ width: '10px', height: '10px', border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => openEdit(u)} className="btn btn-ghost btn-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="btn btn-sm" style={{ color: '#ef4444', border: '1px solid #fee2e2' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '740px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
                {editId ? 'Edit Update' : 'Create New Update'}
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowPreviewModal(true)} className="btn btn-sm" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                  👀 Preview as User
                </button>
                <button onClick={() => setShowModal(false)} style={{ color: '#9999b0', cursor: 'pointer', background: 'none', border: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, padding: '24px' }}>
              
              {/* Template Selection */}
              <div className="form-group" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ marginBottom: '12px' }}>Start from a Template</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((key) => (
                    <button
                      key={key}
                      onClick={() => applyTemplate(key)}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                        border: selectedTemplate === key ? '2px solid #6366f1' : '1px solid #cbd5e1',
                        background: selectedTemplate === key ? '#eef2ff' : '#fff',
                        color: selectedTemplate === key ? '#4f46e5' : '#475569',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {TEMPLATES[key].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input 
                  className="form-input" 
                  value={type === 'DAILY_DIGEST' ? "Daily Digest" : title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Update title" 
                  disabled={type === 'DAILY_DIGEST'}
                  style={{ opacity: type === 'DAILY_DIGEST' ? 0.7 : 1 }}
                />
              </div>

              {/* Type + Priority row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select className="form-input" value={type} onChange={e => {
                    setType(e.target.value as UpdateType)
                    if (e.target.value === 'WELCOME') {
                      setTargetRole('')
                      setCourseId('')
                    }
                  }}>
                    <option value="GENERAL">General Update</option>
                    <option value="WELCOME">Welcome Message</option>
                    <option value="DAILY_DIGEST">Daily Digest</option>
                  </select>
                  {isWelcome && <p style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>Welcome messages are strictly for new users.</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <input type="number" className="form-input" value={priority} onChange={e => setPriority(Number(e.target.value))} min={0} max={100} />
                  <p style={{ fontSize: '10px', color: '#9999b0', marginTop: '2px' }}>Higher = shown first</p>
                </div>
              </div>

              {/* Rich Text Editor */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Content *</label>
                  {type === 'DAILY_DIGEST' && (
                    <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: '600', background: '#eef2ff', padding: '2px 8px', borderRadius: '4px' }}>
                      ✨ System Generated
                    </span>
                  )}
                </div>
                
                {type === 'DAILY_DIGEST' ? (
                  <div style={{ padding: '20px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                      The content for Daily Digest is automatically generated based on real-time activity in the student's enrolled courses (New lectures, materials, exams, etc.).
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Toolbar */}
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: '2px', padding: '6px 8px',
                      background: '#f1f3f9', borderRadius: '10px 10px 0 0', border: '1px solid #d0d2d9', borderBottom: 'none',
                    }}>
                      {[
                        { cmd: 'bold', icon: 'B', style: { fontWeight: '800' } },
                        { cmd: 'italic', icon: 'I', style: { fontStyle: 'italic' } },
                        { cmd: 'underline', icon: 'U', style: { textDecoration: 'underline' } },
                        { cmd: 'strikeThrough', icon: 'S', style: { textDecoration: 'line-through' } },
                      ].map(b => (
                        <button key={b.cmd} type="button" onClick={() => execCmd(b.cmd)}
                          style={{
                            width: '30px', height: '28px', border: 'none', borderRadius: '6px',
                            background: 'transparent', cursor: 'pointer', fontSize: '13px',
                            color: '#1e1e3a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            ...b.style,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#e0e7ff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {b.icon}
                        </button>
                      ))}
                      <div style={{ width: '1px', background: '#d0d2d9', margin: '2px 4px' }} />
                      <button type="button" onClick={() => execCmd('insertUnorderedList')} style={{ width: '30px', height: '28px', border: 'none', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e0e7ff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >☰</button>
                      <button type="button" onClick={() => execCmd('insertOrderedList')} style={{ width: '30px', height: '28px', border: 'none', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e0e7ff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >1.</button>
                      <div style={{ width: '1px', background: '#d0d2d9', margin: '2px 4px' }} />
                      <select onChange={e => { if (e.target.value) execCmd('formatBlock', e.target.value); e.target.value = '' }}
                        style={{ height: '28px', border: 'none', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: '11px', color: '#6b6b8a', padding: '0 6px' }}
                      >
                        <option value="">Heading</option>
                        <option value="h1">H1</option>
                        <option value="h2">H2</option>
                        <option value="h3">H3</option>
                        <option value="p">Normal</option>
                      </select>
                      <div style={{ width: '1px', background: '#d0d2d9', margin: '2px 4px' }} />
                      <input type="color" defaultValue="#1e1e3a" onChange={e => execCmd('foreColor', e.target.value)}
                        style={{ width: '28px', height: '28px', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '2px' }}
                        title="Text Color"
                      />
                      <button type="button" onClick={() => {
                        const url = prompt('Enter link URL:')
                        if (url) execCmd('createLink', url)
                      }} style={{ width: '30px', height: '28px', border: 'none', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e0e7ff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >🔗</button>
                    </div>

                    {/* Editor */}
                    <div
                      ref={editorRef}
                      contentEditable
                      style={{
                        minHeight: '160px', maxHeight: '300px', overflowY: 'auto',
                        padding: '14px', border: '1px solid #d0d2d9', borderRadius: '0 0 10px 10px',
                        fontSize: '14px', lineHeight: '1.6', color: '#1e1e3a',
                        outline: 'none', background: '#fff',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                      onBlur={e => e.currentTarget.style.borderColor = '#d0d2d9'}
                    />
                  </>
                )}
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label className="form-label">Image (Optional)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="file" ref={fileInputRef} accept="image/png,image/jpeg" onChange={handleImageSelect} style={{ display: 'none' }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-ghost btn-sm"
                    style={{ fontSize: '12px' }}
                  >
                    {uploading ? 'Uploading…' : '📷 Upload Image'}
                  </button>
                  {imageUrl && (
                    <>
                      <img src={imageUrl} alt="" style={{ height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                      <button type="button" onClick={() => setImageUrl('')} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '12px',
                      }}>Remove</button>
                    </>
                  )}
                </div>
              </div>

              {/* Animation + Delay row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Animation</label>
                  <select className="form-input" value={animationType} onChange={e => setAnimationType(e.target.value)}>
                    <option value="">None</option>
                    <option value="confetti">🎊 Confetti</option>
                    <option value="fireworks">🎆 Fireworks</option>
                    <option value="festival">🎉 Festival</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Show Delay (seconds)</label>
                  <input type="number" className="form-input" value={showDelay} onChange={e => setShowDelay(Number(e.target.value))} min={0} max={600} />
                  <p style={{ fontSize: '10px', color: '#9999b0', marginTop: '2px' }}>Delay before this message appears after the previous one</p>
                </div>
              </div>

              {/* CTA buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">CTA Button Text (Optional)</label>
                  <input type="text" className="form-input" value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="e.g. Go to Exam" />
                </div>
                <div className="form-group">
                  <label className="form-label">CTA Button Link</label>
                  <input type="text" className="form-input" value={ctaLink} onChange={e => setCtaLink(e.target.value)} placeholder="e.g. /exams/123" />
                  <p style={{ fontSize: '10px', color: '#9999b0', marginTop: '2px' }}>Required if CTA Text is provided</p>
                </div>
              </div>

              {/* Target + Course + Schedule row */}
              <div style={{ opacity: hideTargeting ? 0.5 : 1, pointerEvents: hideTargeting ? 'none' : 'auto', background: hideTargeting ? '#f8fafc' : 'transparent', padding: hideTargeting ? '16px' : '0', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#334155' }}>Targeting & Schedule</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Target Audience</label>
                    <select className="form-input" value={targetRole} onChange={e => {
                      setTargetRole(e.target.value)
                      if (e.target.value !== 'STUDENT') setCourseId('')
                    }}>
                      <option value="">All Users</option>
                      <option value="STUDENT">Students Only</option>
                      <option value="ADMIN">Admins Only</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Course</label>
                    <select className="form-input" value={courseId} onChange={e => setCourseId(e.target.value)} disabled={targetRole !== 'STUDENT'}>
                      <option value="">All Courses</option>
                      {courses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Schedule (Optional)</label>
                    <input type="datetime-local" className="form-input" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expires On (Optional)</label>
                    <input type="date" className="form-input" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: isActive ? '#10b981' : '#64748b' }}>
                    {isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    style={{
                      width: '50px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer',
                      background: isActive ? '#10b981' : '#d1d5db',
                      position: 'relative', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isActive ? '0 4px 12px rgba(16,185,129,0.2)' : 'none',
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: '3px',
                      left: isActive ? '27px' : '3px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isActive ? (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                      ) : (
                        <div style={{ width: '8px', height: '2px', background: '#d1d5db', borderRadius: '1px' }} />
                      )}
                    </div>
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Update Status</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button 
                  onClick={handleSave} 
                  disabled={saving || (!!ctaText && !ctaLink) || !title} 
                  className="btn btn-primary"
                >
                  {saving ? 'Saving…' : (editId ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal - Replicates exact UI of UpdateOverlay */}
      {showPreviewModal && (
        <div className="modal-overlay" style={{ zIndex: 10000, backdropFilter: 'blur(8px)', background: 'rgba(15,23,42,0.6)' }} onClick={() => setShowPreviewModal(false)}>
          <div
            style={{
              maxWidth: '560px', width: '92%', borderRadius: '24px', overflow: 'hidden',
              background: '#ffffff', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              animation: 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header gradient */}
            <div style={{
              background: type === 'WELCOME'
                ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                : type === 'DAILY_DIGEST'
                ? 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)'
                : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              padding: '36px 28px 24px', textAlign: 'center', position: 'relative', flexShrink: 0,
            }}>
              <button onClick={() => setShowPreviewModal(false)} style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              {type === 'WELCOME' && (
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%', background: '#fff',
                  margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                }}>
                  <span style={{ fontSize: '36px', lineHeight: '1' }}>👋</span>
                </div>
              )}

              <h2 style={{
                fontSize: type === 'WELCOME' ? '28px' : '22px',
                fontWeight: '800', color: '#fff', margin: 0, lineHeight: '1.2',
              }}>
                {title || 'Update Title'}
              </h2>
            </div>

            {/* Image */}
            {imageUrl && (
              <div style={{ flexShrink: 0 }}>
                <img
                  src={imageUrl}
                  alt=""
                  style={{ width: '100%', maxHeight: '240px', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Content */}
            <div style={{
              padding: '28px', overflowY: 'auto', flex: 1,
              background: '#f8fafc',
            }}>
              <div
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editorRef.current?.innerHTML || 'Content goes here...') }}
                style={{
                  fontSize: '15px', color: '#334155', lineHeight: '1.7',
                  wordBreak: 'break-word',
                }}
              />
            </div>

            {/* Footer */}
            <div style={{
              padding: '20px 28px', textAlign: 'center', flexShrink: 0,
              borderTop: '1px solid #e2e8f0', background: '#fff',
              display: 'flex', gap: '12px', justifyContent: 'center'
            }}>
              {ctaText && ctaLink && (
                <button onClick={() => setShowPreviewModal(false)} style={{
                  background: '#3636e8', color: '#fff', border: 'none', padding: '14px 24px',
                  borderRadius: '50px', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(54,54,232,0.25)', transition: 'transform 0.2s, box-shadow 0.2s',
                  flex: 1, maxWidth: '200px'
                }}>
                  {ctaText}
                </button>
              )}
              <button onClick={() => setShowPreviewModal(false)} style={{
                background: ctaText ? '#f1f5f9' : '#1e293b', 
                color: ctaText ? '#475569' : '#fff', 
                border: 'none', padding: '14px 24px',
                borderRadius: '50px', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
                boxShadow: ctaText ? 'none' : '0 4px 14px rgba(30,41,59,0.25)', 
                transition: 'transform 0.2s, background 0.2s',
                flex: ctaText ? undefined : 1, 
                maxWidth: ctaText ? undefined : '200px'
              }}>
                {type === 'WELCOME' && !ctaText ? "Let's Get Started" : (ctaText ? 'Close' : 'Got It')}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes bounceIn {
              0% { opacity: 0; transform: scale(0.85); }
              70% { opacity: 1; transform: scale(1.02); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Image Cropper */}
      {cropperImage && (
        <ImageCropper
          image={cropperImage}
          aspect={16 / 9}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropperImage(null)}
        />
      )}
    </div>
  )
}
