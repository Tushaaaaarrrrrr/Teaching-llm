'use client'

import { useEffect, useState } from 'react'

interface CalEvent {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: string
  classId?: string | null
  class?: { id: string; name: string; color: string } | null
  instructorId?: string | null
  instructor?: { id: string; name: string } | null
}

interface ClassOption {
  id: string
  name: string
  color: string
}

interface InstructorOption {
  id: string
  name: string
}

interface UserInfo {
  role: string
  isCalendarLinked?: boolean
  googleCredential?: {
    lastSyncAt?: string | null
  }
}

const TYPE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  class: { bg: '#e0e7ff', color: '#6366f1', label: 'Class' },
  exam: { bg: '#fee2e2', color: '#ef4444', label: 'Exam' },
  assignment: { bg: '#fef3c7', color: '#f59e0b', label: 'Assignment' },
  event: { bg: '#d1fae5', color: '#10b981', label: 'Event' },
  holiday: { bg: '#d0d2d9', color: '#6b6b8a', label: 'Holiday' },
}

const EVENT_TYPES = [
  { value: 'class', label: 'Class' },
  { value: 'exam', label: 'Exam' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'event', label: 'Event' },
  { value: 'holiday', label: 'Holiday' },
]

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [instructors, setInstructors] = useState<InstructorOption[]>([])
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Detail popover for clicking event pills on calendar
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)
  
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const isAdminOrManager = user?.role === 'MANAGER' || user?.role === 'ADMIN'

  useEffect(() => {
    // Load user info, classes, and instructors once
    Promise.all([
      fetch('/api/profile').then(r => r.json()),
      fetch('/api/classes').then(r => r.json()),
      fetch('/api/instructors').then(r => r.json()),
    ]).then(([profileData, clsData, instrData]) => {
      const u = profileData.user
      setUser(u)
      setClasses(clsData.classes || clsData || [])
      setInstructors(instrData || [])
      
      if (u?.googleCredential?.lastSyncAt) {
        setLastSync(new Date(u.googleCredential.lastSyncAt).toLocaleString())
      }
    }).catch(console.error)
  }, [])

  useEffect(() => {
    loadEvents()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  function loadEvents() {
    setLoading(true)
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    fetch(`/api/events?month=${monthStr}`)
      .then(r => r.json())
      .then(data => setEvents(data.events || data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dateStr)
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => setCurrentDate(new Date())

  const set = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }))

  function openCreate(prefilledDate?: string) {
    setEditId(null)
    setFormData({
      title: '',
      description: '',
      date: prefilledDate || '',
      time: '',
      type: 'class',
      classId: '',
      instructorId: '',
    })
    setShowModal(true)
  }

  function openEdit(ev: CalEvent) {
    setEditId(ev.id)
    setFormData({
      title: ev.title || '',
      description: ev.description || '',
      date: ev.date || '',
      time: ev.time || '',
      type: ev.type || 'class',
      classId: ev.classId || '',
      instructorId: ev.instructorId || '',
    })
    setSelectedEvent(null)
    setShowModal(true)
  }

  async function handleSave() {
    if (!formData.title || !formData.date) return
    setSaving(true)
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        date: formData.date,
        time: formData.time || null,
        type: formData.type || 'class',
        classId: formData.classId || null,
        instructorId: formData.instructorId || null,
        relatedClass: formData.classId
          ? classes.find(c => c.id === formData.classId)?.name || null
          : null,
      }
      const url = editId ? `/api/events/${editId}` : '/api/events'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to save event')
      } else {
        setShowModal(false)
        loadEvents()
      }
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this event?')) return
    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' })
      setSelectedEvent(null)
      loadEvents()
    } catch (e) { console.error(e) }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/google/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setLastSync(new Date().toLocaleString())
        loadEvents()
        alert(`Sync complete! Imported ${data.imported} events.`)
      } else {
        alert(data.error || 'Sync failed')
      }
    } catch (e) {
      console.error(e)
      alert('Network error during sync')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={goToday} className="btn btn-ghost btn-sm">Today</button>
          <button onClick={prevMonth} className="btn btn-icon btn-ghost" style={{ padding: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span style={{ fontSize: '15px', fontWeight: '600', minWidth: '160px', textAlign: 'center' }}>
            {monthName}
          </span>
          <button onClick={nextMonth} className="btn btn-icon btn-ghost" style={{ padding: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
        {isAdminOrManager && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             {user?.isCalendarLinked && (
               <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                 <button 
                   onClick={handleSync} 
                   disabled={syncing}
                   className="btn btn-ghost btn-sm"
                   style={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     gap: '6px',
                     background: '#e8eaf0',
                     boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                     borderRadius: '50px',
                     padding: '8px 16px',
                     color: '#3636e8',
                     fontWeight: '700'
                   }}
                 >
                   <svg 
                     className={syncing ? 'rotate' : ''} 
                     width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                   >
                     <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                   </svg>
                   {syncing ? 'Syncing...' : 'Sync Calendar'}
                 </button>
                 {lastSync && (
                   <span style={{ fontSize: '10px', color: '#9999b0', marginTop: '4px', fontWeight: '600' }}>
                     Last synced: {lastSync}
                   </span>
                 )}
               </div>
             )}
            <button onClick={() => openCreate()} className="btn btn-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Event
            </button>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid #c5c7cf',
          background: '#dddfe6',
        }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{
              padding: '12px 8px',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: '600',
              color: '#6b6b8a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
        }}>
          {days.map((day, i) => {
            const dayEvents = day ? getEventsForDay(day) : []
            return (
              <div key={i} style={{
                minHeight: '100px',
                padding: '6px 8px',
                borderBottom: '1px solid #d8dae3',
                borderRight: (i + 1) % 7 !== 0 ? '1px solid #d8dae3' : 'none',
                background: day && isToday(day) ? '#f0f0ff' : 'transparent',
                transition: 'background 0.15s',
                cursor: day && isAdminOrManager ? 'pointer' : 'default',
                position: 'relative',
              }}
              onMouseEnter={e => { if (day) e.currentTarget.style.background = day && isToday(day) ? '#e8e8ff' : '#f8fafc' }}
              onMouseLeave={e => { if (day) e.currentTarget.style.background = day && isToday(day) ? '#f0f0ff' : 'transparent' }}
              onDoubleClick={() => {
                if (day && isAdminOrManager) {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  openCreate(dateStr)
                }
              }}
              >
                {day && (
                  <>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: isToday(day) ? '700' : '400',
                      color: isToday(day) ? 'white' : '#1e1e3a',
                      background: isToday(day) ? '#6366f1' : 'transparent',
                      marginBottom: '4px',
                    }}>
                      {day}
                    </div>
                    {dayEvents.slice(0, 3).map(ev => {
                      const tc = TYPE_COLORS[ev.type] || TYPE_COLORS.class
                      return (
                        <div key={ev.id} onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev) }} style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: tc.bg,
                          color: tc.color,
                          fontSize: '10px',
                          fontWeight: '600',
                          marginBottom: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }} title={`${ev.title}${ev.time ? ' at ' + ev.time : ''}`}>
                          {ev.title}
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: '10px', color: '#9999b0', paddingLeft: '4px' }}>
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Events This Month List */}
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>Events This Month</h3>
        {events.length === 0 ? (
          <div className="card" style={{ padding: '30px', textAlign: 'center', color: '#9999b0' }}>
            No events this month
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {events.sort((a, b) => a.date.localeCompare(b.date)).map(ev => {
              const tc = TYPE_COLORS[ev.type] || TYPE_COLORS.class
              return (
                <div key={ev.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 24px',
                  gap: '14px',
                  borderRadius: '50px',
                  background: '#e8eaf0',
                  boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '8px 8px 16px #c2c4cc, -8px -8px 16px #ffffff')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff')}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: tc.bg,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: tc.color, lineHeight: 1 }}>
                      {new Date(ev.date + 'T00:00:00').getDate()}
                    </span>
                    <span style={{ fontSize: '9px', color: tc.color, fontWeight: '600', textTransform: 'uppercase' }}>
                      {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e1e3a', marginBottom: '2px' }}>
                      {ev.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9999b0' }}>
                      {ev.time && `${ev.time} · `}
                      {ev.class?.name ? ev.class.name : ev.description || 'General (All Groups)'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10px', padding: '3px 10px', borderRadius: '10px', fontWeight: '600',
                    background: ev.classId ? (ev.class?.color || '#6366f1') + '18' : '#d0d2d9',
                    color: ev.classId ? (ev.class?.color || '#6366f1') : '#6b6b8a',
                  }}>
                    {ev.class?.name || 'General'}
                  </span>
                  <span className={`badge badge-${ev.type === 'exam' ? 'danger' : ev.type === 'assignment' ? 'warning' : 'primary'}`}>
                    {tc.label}
                  </span>
                  {isAdminOrManager && (
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => openEdit(ev)} className="btn btn-ghost btn-sm" title="Edit">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(ev.id)} className="btn btn-sm" style={{ color: '#ef4444', border: '1px solid #fee2e2' }} title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Event Detail Popover */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Event Details</h3>
              <button onClick={() => setSelectedEvent(null)} style={{ color: '#9999b0', cursor: 'pointer', background: 'none', border: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Title</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e1e3a' }}>{selectedEvent.title}</div>
              </div>
              {selectedEvent.description && (
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Description</div>
                  <div style={{ fontSize: '13px', color: '#3a3a5c' }}>{selectedEvent.description}</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Date</div>
                  <div style={{ fontSize: '13px', color: '#1e1e3a' }}>{selectedEvent.date}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Time</div>
                  <div style={{ fontSize: '13px', color: '#1e1e3a' }}>{selectedEvent.time || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Type</div>
                  <span className={`badge badge-${selectedEvent.type === 'exam' ? 'danger' : selectedEvent.type === 'assignment' ? 'warning' : 'primary'}`}>
                    {(TYPE_COLORS[selectedEvent.type] || TYPE_COLORS.class).label}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Subject</div>
                  <div style={{ fontSize: '13px', color: '#1e1e3a' }}>{selectedEvent.class?.name || 'General (All Groups)'}</div>
                </div>
              </div>
              {selectedEvent.instructor && (
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Instructor</div>
                  <div style={{ fontSize: '13px', color: '#1e1e3a' }}>{selectedEvent.instructor.name}</div>
                </div>
              )}
            </div>
            {isAdminOrManager && (
              <div className="modal-footer">
                <button onClick={() => handleDelete(selectedEvent.id)} className="btn btn-sm" style={{ color: '#ef4444', border: '1px solid #fee2e2' }}>
                  Delete
                </button>
                <button onClick={() => openEdit(selectedEvent)} className="btn btn-primary">
                  Edit Event
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Event Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                {editId ? 'Edit Event' : 'Add Event'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ color: '#9999b0', cursor: 'pointer', background: 'none', border: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  value={formData.title || ''}
                  onChange={e => set('title', e.target.value)}
                  placeholder="Event title"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={formData.description || ''}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Subject / Course</label>
                <select
                  className="form-input"
                  value={formData.classId || ''}
                  onChange={e => set('classId', e.target.value)}
                >
                  <option value="">General (visible to all groups)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p style={{ fontSize: '11px', color: '#9999b0', marginTop: '4px' }}>
                  {formData.classId
                    ? 'Only members enrolled in this subject will see this event.'
                    : 'This event will be visible to everyone.'}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date || ''}
                    onChange={e => set('date', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.time || ''}
                    onChange={e => set('time', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-input"
                  value={formData.type || 'class'}
                  onChange={e => set('type', e.target.value)}
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {instructors.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Instructor</label>
                  <select
                    className="form-input"
                    value={formData.instructorId || ''}
                    onChange={e => set('instructorId', e.target.value)}
                  >
                    <option value="">None (no instructor assigned)</option>
                    {instructors.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '11px', color: '#9999b0', marginTop: '4px' }}>
                    Optionally assign an instructor to this event.
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving || !formData.title || !formData.date} className="btn btn-primary">
                {saving ? 'Saving…' : (editId ? 'Update Event' : 'Create Event')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
