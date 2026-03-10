'use client'

import { useEffect, useState } from 'react'

type Tab = 'classes' | 'lectures' | 'sessions' | 'materials' | 'announcements'

export default function ManagePage() {
  const [tab, setTab] = useState<Tab>('classes')
  const [classes, setClasses]           = useState<any[]>([])
  const [lectures, setLectures]         = useState<any[]>([])
  const [sessions, setSessions]         = useState<any[]>([])
  const [materials, setMaterials]       = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [editId, setEditId]             = useState<string | null>(null)
  const [formData, setFormData]         = useState<Record<string, string>>({})
  const [saving, setSaving]             = useState(false)

  // For lecture / material forms: topic selector
  const [topicsForClass, setTopicsForClass] = useState<any[]>([])
  const [loadingTopics, setLoadingTopics]   = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [cls, lec, sess, mat, ann] = await Promise.all([
        fetch('/api/classes').then(r => r.json()),
        fetch('/api/content?hasVideo=true').then(r => r.json()),
        fetch('/api/live-sessions').then(r => r.json()),
        fetch('/api/content?hasPpt=true').then(r => r.json()),
        fetch('/api/announcements').then(r => r.json()),
      ])
      setClasses(cls.classes || cls || [])
      setLectures(lec.content || [])
      setSessions(sess.sessions || sess || [])
      setMaterials(mat.content || [])
      setAnnouncements(ann.announcements || ann || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function loadTopicsForClass(classId: string) {
    if (!classId) { setTopicsForClass([]); return }
    setLoadingTopics(true)
    try {
      const data = await fetch(`/api/classes/${classId}/topics`).then(r => r.json())
      setTopicsForClass(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    setLoadingTopics(false)
  }

  function openCreate() {
    setEditId(null)
    setFormData({})
    setTopicsForClass([])
    setShowModal(true)
  }

  function openEdit(item: any) {
    setEditId(item.id)
    if (tab === 'lectures' || tab === 'materials') {
      // Content items carry their class info via topic relation
      const classId = item.topic?.classId || ''
      setFormData({
        id: item.id,
        title: item.title || '',
        description: item.description || '',
        videoUrl: item.videoUrl || '',
        pptUrl: item.pptUrl || '',
        topicId: item.topicId || '',
        classId,
      })
      setTopicsForClass([])
      setShowModal(true)
      if (classId) loadTopicsForClass(classId)
    } else {
      setFormData({ ...item, classId: item.classId || item.class?.id || '' })
      setShowModal(true)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (tab === 'lectures' || tab === 'materials') {
        const { topicId, title, description, videoUrl, pptUrl } = formData
        if (editId) {
          await fetch(`/api/content/${editId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, videoUrl, pptUrl }),
          })
        } else {
          if (!topicId) { setSaving(false); return }
          await fetch(`/api/topics/${topicId}/content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, videoUrl, pptUrl }),
          })
        }
      } else {
        const endpoints: Record<Tab, string> = {
          classes:       '/api/classes',
          lectures:      '',            // handled above
          sessions:      '/api/live-sessions',
          materials:     '',            // handled above
          announcements: '/api/announcements',
        }
        const base = endpoints[tab]
        const url  = editId ? `${base}/${editId}` : base
        await fetch(url, {
          method: editId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }
      setShowModal(false)
      loadData()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return
    if (tab === 'lectures' || tab === 'materials') {
      await fetch(`/api/content/${id}`, { method: 'DELETE' })
    } else {
      const endpoints: Record<Tab, string> = {
        classes:       '/api/classes',
        lectures:      '',
        sessions:      '/api/live-sessions',
        materials:     '',
        announcements: '/api/announcements',
      }
      await fetch(`${endpoints[tab]}/${id}`, { method: 'DELETE' })
    }
    loadData()
  }

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: 'classes',       label: 'Classes',       count: classes.length },
    { key: 'lectures',      label: 'Lectures',      count: lectures.length },
    { key: 'sessions',      label: 'Live Sessions', count: sessions.length },
    { key: 'materials',     label: 'Materials',     count: materials.length },
    { key: 'announcements', label: 'Announcements', count: announcements.length },
  ]

  const COLORS = ['#4F46E5', '#7C3AED', '#0EA5E9', '#F59E0B', '#10B981', '#EF4444', '#EC4899']

  function renderForm() {
    const f = formData
    const set = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }))
    const classOptions = classes.map(c => ({ value: c.id, label: c.name }))

    // shared class + topic selector used in lectures & materials
    const classTopicSelector = (
      <>
        <div className="form-group">
          <label className="form-label">Class *</label>
          <select
            className="form-input"
            value={f.classId || ''}
            onChange={e => { set('classId', e.target.value); set('topicId', ''); loadTopicsForClass(e.target.value) }}
          >
            <option value="">Select class...</option>
            {classOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Topic *</label>
          <select
            className="form-input"
            value={f.topicId || ''}
            onChange={e => set('topicId', e.target.value)}
            disabled={!f.classId || loadingTopics}
          >
            <option value="">{loadingTopics ? 'Loading topics…' : 'Select topic…'}</option>
            {topicsForClass.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          {f.classId && !loadingTopics && topicsForClass.length === 0 && (
            <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
              No topics found. Add a topic in the Classes tab first.
            </p>
          )}
        </div>
      </>
    )

    switch (tab) {
      case 'classes':
        return (
          <>
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={f.name || ''} onChange={e => set('name', e.target.value)} placeholder="Class name" /></div>
            <div className="form-group"><label className="form-label">Subject</label><input className="form-input" value={f.subject || ''} onChange={e => set('subject', e.target.value)} placeholder="e.g. Computer Science" /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={f.description || ''} onChange={e => set('description', e.target.value)} placeholder="Class description" rows={3} style={{ resize: 'vertical' }} /></div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => set('color', c)} style={{
                    width: '32px', height: '32px', borderRadius: '8px', background: c,
                    border: f.color === c ? '3px solid #1e1e3a' : '2px solid transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }} />
                ))}
              </div>
            </div>
          </>
        )

      case 'lectures':
        return (
          <>
            {classTopicSelector}
            <div className="form-group"><label className="form-label">Lecture Title *</label><input className="form-input" value={f.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. Introduction to Variables" /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={f.description || ''} onChange={e => set('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} /></div>
            <div className="form-group"><label className="form-label">Video URL *</label><input className="form-input" value={f.videoUrl || ''} onChange={e => set('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=… or direct video link" /></div>
            <div className="form-group"><label className="form-label">Attachment / PPT URL</label><input className="form-input" value={f.pptUrl || ''} onChange={e => set('pptUrl', e.target.value)} placeholder="https://… (PDF, PPT, or any file — optional)" /></div>
          </>
        )

      case 'sessions':
        return (
          <>
            <div className="form-group"><label className="form-label">Class *</label><select className="form-input" value={f.classId || ''} onChange={e => set('classId', e.target.value)}><option value="">Select class...</option>{classOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={f.title || ''} onChange={e => set('title', e.target.value)} placeholder="Session title" /></div>
            <div className="form-group"><label className="form-label">Instructor</label><input className="form-input" value={f.instructor || ''} onChange={e => set('instructor', e.target.value)} placeholder="Instructor name" /></div>
            <div className="form-group"><label className="form-label">Meeting Link *</label><input className="form-input" value={f.meetingLink || ''} onChange={e => set('meetingLink', e.target.value)} placeholder="https://meet.jit.si/..." /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group"><label className="form-label">Date *</label><input type="date" className="form-input" value={f.date || ''} onChange={e => set('date', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Time *</label><input type="time" className="form-input" value={f.time || ''} onChange={e => set('time', e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={f.status || 'scheduled'} onChange={e => set('status', e.target.value)}><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="completed">Completed</option></select></div>
          </>
        )

      case 'materials':
        return (
          <>
            {classTopicSelector}
            <div className="form-group"><label className="form-label">Material Title *</label><input className="form-input" value={f.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. Week 1 Slides" /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={f.description || ''} onChange={e => set('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} /></div>
            <div className="form-group"><label className="form-label">File URL *</label><input className="form-input" value={f.pptUrl || ''} onChange={e => set('pptUrl', e.target.value)} placeholder="https://… (PDF, PPT, DOCX, etc.)" /></div>
            <div className="form-group"><label className="form-label">Video URL</label><input className="form-input" value={f.videoUrl || ''} onChange={e => set('videoUrl', e.target.value)} placeholder="https://… (optional)" /></div>
          </>
        )

      case 'announcements':
        return (
          <>
            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={f.title || ''} onChange={e => set('title', e.target.value)} placeholder="Announcement title" /></div>
            <div className="form-group"><label className="form-label">Content *</label><textarea className="form-input" value={f.content || ''} onChange={e => set('content', e.target.value)} rows={3} style={{ resize: 'vertical' }} placeholder="Announcement content" /></div>
            <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={f.type || 'info'} onChange={e => set('type', e.target.value)}><option value="info">Info</option><option value="warning">Warning</option><option value="success">Success</option><option value="error">Error</option></select></div>
          </>
        )
    }
  }

  function getItems(): any[] {
    switch (tab) {
      case 'classes':       return classes
      case 'lectures':      return lectures
      case 'sessions':      return sessions
      case 'materials':     return materials
      case 'announcements': return announcements
    }
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div />
        <button onClick={openCreate} className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create New
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #c5c7cf', paddingBottom: '0' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: '500',
              color: tab === t.key ? '#6366f1' : '#6b6b8a',
              borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
            <span style={{
              marginLeft: '6px',
              padding: '1px 7px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '600',
              background: tab === t.key ? '#e0e7ff' : '#d0d2d9',
              color: tab === t.key ? '#6366f1' : '#9999b0',
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="card" style={{ overflow: 'hidden', maxWidth: '100%' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0' }}>Loading…</div>
        ) : getItems().length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0' }}>
            No {tab} yet. Click &quot;Create New&quot; to add one.
          </div>
        ) : (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {getItems().map((item, idx) => {
              const rawDetail = item.description || item.content || item.duration || ''
              const itemDetail = rawDetail.length > 72 ? rawDetail.slice(0, 69) + '…' : rawDetail

              // For content items class lives in item.topic.class
              const isContent = tab === 'lectures' || tab === 'materials'
              const itemClassName = isContent ? item.topic?.class?.name : item.class?.name
              const showClassName = tab !== 'announcements' && tab !== 'classes' && itemClassName

              // Build subtitle: ClassName › TopicName · description
              const subtitleParts: string[] = []
              if (showClassName) subtitleParts.push(itemClassName)
              if (isContent && item.topic?.title) subtitleParts.push(item.topic.title)
              if (itemDetail) subtitleParts.push(itemDetail)
              const subtitle = subtitleParts.join(' › ')

              const iconLabel =
                tab === 'classes'       ? item.name?.slice(0, 2).toUpperCase() :
                tab === 'sessions'      ? '▶' :
                tab === 'announcements' ? '!' :
                String(idx + 1).padStart(2, '0')

              return (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 20px',
                  borderRadius: '50px',
                  background: '#e8eaf0',
                  boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '8px 8px 16px #c2c4cc, -8px -8px 16px #ffffff')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff')}
                >
                  {/* Icon badge */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: '#e8eaf0',
                    boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#6366f1', fontSize: '13px', fontWeight: '700',
                  }}>
                    {iconLabel}
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e1e3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name || item.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9999b0', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subtitle}
                    </div>
                  </div>

                  {/* Details badge */}
                  <div style={{ flexShrink: 0 }}>
                    {tab === 'classes' && (
                      <span style={{ fontSize: '12px', color: '#9999b0' }}>{item._count?.lectures || 0} lectures</span>
                    )}
                    {tab === 'sessions' && (
                      <span className={`badge badge-${item.status === 'live' ? 'danger' : item.status === 'completed' ? 'success' : 'info'}`}>
                        {item.status}
                      </span>
                    )}
                    {(tab === 'lectures' || tab === 'materials') && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {item.videoUrl && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#e0e7ff', color: '#6366f1', fontWeight: '600' }}>Video</span>
                        )}
                        {item.pptUrl && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#d1fae5', color: '#10b981', fontWeight: '600' }}>File</span>
                        )}
                      </div>
                    )}
                    {tab === 'announcements' && (
                      <span className={`badge badge-${item.type === 'warning' ? 'warning' : item.type === 'success' ? 'success' : 'info'}`}>
                        {item.type}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => openEdit(item)} className="btn btn-ghost btn-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="btn btn-sm" style={{ color: '#ef4444', border: '1px solid #fee2e2' }}>
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                {editId ? 'Edit' : 'Create'} {tab.slice(0, -1).charAt(0).toUpperCase() + tab.slice(1, -1)}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ color: '#9999b0', cursor: 'pointer', background: 'none', border: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {renderForm()}
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
    </div>
  )
}
