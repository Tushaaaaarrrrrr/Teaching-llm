'use client'

import { useEffect, useState } from 'react'

type Tab = 'classes' | 'lectures' | 'sessions' | 'materials' | 'announcements'

export default function ManagePage() {
  const [tab, setTab] = useState<Tab>('classes')
  const [classes, setClasses] = useState<any[]>([])
  const [lectures, setLectures] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [cls, lec, sess, mat, ann] = await Promise.all([
        fetch('/api/classes').then(r => r.json()),
        fetch('/api/lectures').then(r => r.json()),
        fetch('/api/live-sessions').then(r => r.json()),
        fetch('/api/materials').then(r => r.json()),
        fetch('/api/announcements').then(r => r.json()),
      ])
      setClasses(cls.classes || cls || [])
      setLectures(lec.lectures || lec || [])
      setSessions(sess.sessions || sess || [])
      setMaterials(mat.materials || mat || [])
      setAnnouncements(ann.announcements || ann || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  function openCreate() {
    setEditId(null)
    setFormData({})
    setShowModal(true)
  }

  function openEdit(item: any) {
    setEditId(item.id)
    setFormData({ ...item, classId: item.classId || item.class?.id || '' })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const endpoints: Record<Tab, string> = {
        classes: '/api/classes',
        lectures: '/api/lectures',
        sessions: '/api/live-sessions',
        materials: '/api/materials',
        announcements: '/api/announcements',
      }
      const url = editId ? `${endpoints[tab]}/${editId}` : endpoints[tab]
      const method = editId ? 'PUT' : 'POST'
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      setShowModal(false)
      loadData()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return
    const endpoints: Record<Tab, string> = {
      classes: '/api/classes',
      lectures: '/api/lectures',
      sessions: '/api/live-sessions',
      materials: '/api/materials',
      announcements: '/api/announcements',
    }
    await fetch(`${endpoints[tab]}/${id}`, { method: 'DELETE' })
    loadData()
  }

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: 'classes', label: 'Classes', count: classes.length },
    { key: 'lectures', label: 'Lectures', count: lectures.length },
    { key: 'sessions', label: 'Live Sessions', count: sessions.length },
    { key: 'materials', label: 'Materials', count: materials.length },
    { key: 'announcements', label: 'Announcements', count: announcements.length },
  ]

  const COLORS = ['#4F46E5', '#7C3AED', '#0EA5E9', '#F59E0B', '#10B981', '#EF4444', '#EC4899']

  function renderForm() {
    const f = formData
    const set = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }))
    const classOptions = classes.map(c => ({ value: c.id, label: c.name }))

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
            <div className="form-group"><label className="form-label">Class *</label><select className="form-input" value={f.classId || ''} onChange={e => set('classId', e.target.value)}><option value="">Select class...</option>{classOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={f.title || ''} onChange={e => set('title', e.target.value)} placeholder="Lecture title" /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={f.description || ''} onChange={e => set('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} /></div>
            <div className="form-group"><label className="form-label">Video URL</label><input className="form-input" value={f.videoUrl || ''} onChange={e => set('videoUrl', e.target.value)} placeholder="/videos/lecture.mp4" /></div>
            <div className="form-group"><label className="form-label">Notes URL</label><input className="form-input" value={f.notesUrl || ''} onChange={e => set('notesUrl', e.target.value)} placeholder="/notes/lecture.pdf" /></div>
            <div className="form-group"><label className="form-label">Duration</label><input className="form-input" value={f.duration || ''} onChange={e => set('duration', e.target.value)} placeholder="e.g. 1h 15min" /></div>
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
            <div className="form-group"><label className="form-label">Class *</label><select className="form-input" value={f.classId || ''} onChange={e => set('classId', e.target.value)}><option value="">Select class...</option>{classOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={f.title || ''} onChange={e => set('title', e.target.value)} placeholder="Material title" /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={f.description || ''} onChange={e => set('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} /></div>
            <div className="form-group"><label className="form-label">File URL *</label><input className="form-input" value={f.fileUrl || ''} onChange={e => set('fileUrl', e.target.value)} placeholder="/materials/file.pdf" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group"><label className="form-label">File Type</label><input className="form-input" value={f.fileType || ''} onChange={e => set('fileType', e.target.value)} placeholder="PDF, PPTX, DOC" /></div>
              <div className="form-group"><label className="form-label">File Size</label><input className="form-input" value={f.fileSize || ''} onChange={e => set('fileSize', e.target.value)} placeholder="2.5 MB" /></div>
            </div>
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
      case 'classes': return classes
      case 'lectures': return lectures
      case 'sessions': return sessions
      case 'materials': return materials
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

      {/* Items Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0' }}>Loading...</div>
        ) : getItems().length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0' }}>
            No {tab} yet. Click "Create New" to add one.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  {tab !== 'announcements' && tab !== 'classes' && <th>Class</th>}
                  <th>Details</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getItems().map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: '#1e1e3a' }}>
                        {item.name || item.title}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: '11px', color: '#9999b0', marginTop: '2px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.description || item.content}
                        </div>
                      )}
                    </td>
                    {tab !== 'announcements' && tab !== 'classes' && (
                      <td>
                        <span style={{ fontSize: '12px', color: '#6b6b8a' }}>
                          {item.class?.name || '—'}
                        </span>
                      </td>
                    )}
                    <td>
                      <span style={{ fontSize: '12px', color: '#9999b0' }}>
                        {tab === 'classes' && `${item._count?.lectures || 0} lectures`}
                        {tab === 'lectures' && (item.duration || 'No duration')}
                        {tab === 'sessions' && (
                          <span className={`badge badge-${item.status === 'live' ? 'danger' : item.status === 'completed' ? 'success' : 'info'}`}>
                            {item.status}
                          </span>
                        )}
                        {tab === 'materials' && `${item.fileType || ''} ${item.fileSize || ''}`}
                        {tab === 'announcements' && (
                          <span className={`badge badge-${item.type === 'warning' ? 'warning' : item.type === 'success' ? 'success' : 'info'}`}>
                            {item.type}
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                {saving ? 'Saving...' : (editId ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
