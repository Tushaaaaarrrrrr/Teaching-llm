'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import ImageCropper from '@/components/ui/ImageCropper'

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
  scheduledAt: string | null
  expiresAt: string | null
  createdAt: string
  _count: { views: number }
  createdBy: { name: string }
}

export default function ManageUpdatesPage() {
  const { data, isLoading } = useSWR('/api/updates', fetcher)
  const updates: SystemUpdate[] = data?.updates || []

  // Form state
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<UpdateType>('GENERAL')
  const [isActive, setIsActive] = useState(true)
  const [priority, setPriority] = useState(0)
  const [animationType, setAnimationType] = useState<string>('')
  const [showDelay, setShowDelay] = useState(3)
  const [targetRole, setTargetRole] = useState<string>('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [saving, setSaving] = useState(false)

  // Image cropper state
  const [cropperImage, setCropperImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Rich text editor ref
  const editorRef = useRef<HTMLDivElement>(null)

  function resetForm() {
    setEditId(null)
    setTitle('')
    setType('GENERAL')
    setIsActive(true)
    setPriority(0)
    setAnimationType('')
    setShowDelay(3)
    setTargetRole('')
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
    setTitle(u.title)
    setType(u.type)
    setIsActive(u.isActive)
    setPriority(u.priority)
    setAnimationType(u.animationType || '')
    setShowDelay(u.showDelay)
    setTargetRole(u.targetRole || '')
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
    await fetch(`/api/updates/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    })
    mutate('/api/updates')
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

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1e1e3a', margin: 0 }}>Update System</h1>
          <p style={{ fontSize: '12px', color: '#9999b0', marginTop: '4px' }}>Manage greetings, updates, and user messages</p>
        </div>
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
                    </div>
                  </div>

                  {/* Views count */}
                  <div style={{ fontSize: '11px', color: '#9999b0', flexShrink: 0 }}>
                    <span style={{ fontWeight: '700', color: '#6366f1' }}>{u._count.views}</span> views
                  </div>

                  {/* Active toggle */}
                  <button onClick={() => toggleActive(u)} style={{
                    width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                    background: u.isActive ? '#10b981' : '#d1d5db',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: '2px',
                      left: u.isActive ? '20px' : '2px',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>

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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '740px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
                {editId ? 'Edit Update' : 'Create New Update'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ color: '#9999b0', cursor: 'pointer', background: 'none', border: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
              {/* Title */}
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Update title" />
              </div>

              {/* Type + Priority row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select className="form-input" value={type} onChange={e => setType(e.target.value as UpdateType)}>
                    <option value="GENERAL">General Update</option>
                    <option value="WELCOME">Welcome Message</option>
                    <option value="DAILY_DIGEST">Daily Digest</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <input type="number" className="form-input" value={priority} onChange={e => setPriority(Number(e.target.value))} min={0} max={100} />
                  <p style={{ fontSize: '10px', color: '#9999b0', marginTop: '2px' }}>Higher = shown first</p>
                </div>
              </div>

              {/* Rich Text Editor */}
              <div className="form-group">
                <label className="form-label">Content *</label>
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

              {/* Target + Schedule row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Target Audience</label>
                  <select className="form-input" value={targetRole} onChange={e => setTargetRole(e.target.value)}>
                    <option value="">All Users</option>
                    <option value="STUDENT">Students Only</option>
                    <option value="ADMIN">Admins Only</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Schedule (Optional)</label>
                  <input type="datetime-local" className="form-input" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                </div>
              </div>

              {/* Expiry */}
              <div className="form-group">
                <label className="form-label">Expires On (Optional)</label>
                <input type="date" className="form-input" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving…' : (editId ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
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
