'use client'

import { useEffect, useState } from 'react'

interface CalEvent {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  type: string
  status: string
  isGlobal: boolean
  courseId?: string | null
  course?: { id: string; name: string; color: string } | null
  meetLink?: string | null
  date?: string
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
  const [formData, setFormData] = useState<any>({})
  const [saving, setSaving] = useState(false)

  // Detail popover for clicking event pills on calendar
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const isAdminOrManager = user?.role === 'MANAGER' || user?.role === 'ADMIN'

  useEffect(() => {
    // Load user info, classes, and instructors once
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/classes').then(r => r.json()),
      fetch('/api/instructors').then(r => r.json()),
    ]).then(([meData, clsData, instrData]) => {
      setUser(meData.user || meData)
      setClasses(clsData.classes || clsData || [])
      setInstructors(instrData || [])
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
    return events.filter(e => {
      const eDate = new Date(e.date || (e as any).startTime).toISOString().split('T')[0]
      return eDate === dateStr
    })
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => setCurrentDate(new Date())

  const set = (key: string, val: string | boolean) => setFormData(prev => ({ ...prev, [key]: val } as any))

  function openCreate(prefilledDate?: string) {
    setEditId(null)
    setFormData({
      title: '',
      description: '',
      startTime: prefilledDate ? `${prefilledDate}T10:00` : '',
      endTime: prefilledDate ? `${prefilledDate}T11:00` : '',
      type: 'class',
      courseId: '',
      isGlobal: false,
      status: 'SCHEDULED',
      recurrence: 'ONETIME',
    })
    setShowModal(true)
  }

  function openEdit(ev: any) {
    setEditId(ev.id)
    setFormData({
      title: ev.title || '',
      description: ev.description || '',
      startTime: ev.startTime ? new Date(ev.startTime).toISOString().slice(0, 16) : '',
      endTime: ev.endTime ? new Date(ev.endTime).toISOString().slice(0, 16) : '',
      type: ev.type || 'class',
      courseId: ev.courseId || '',
      isGlobal: !!ev.isGlobal,
      status: ev.status || 'SCHEDULED',
      recurrence: ev.recurrence || 'ONETIME',
      meetLink: ev.meetLink || '',
    })
    setSelectedEvent(null)
    setShowModal(true)
  }

  async function handleSave() {
    if (!formData.title || !formData.startTime || !formData.endTime) return
    setSaving(true)
    try {
      const url = editId ? `/api/events/${editId}` : '/api/events'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                      const isCancelled = ev.status === 'CANCELLED'
                      return (
                        <div key={ev.id} onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev) }} style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isCancelled ? '#f1f1f1' : tc.bg,
                          color: isCancelled ? '#999' : tc.color,
                          fontSize: '10px',
                          fontWeight: '600',
                          marginBottom: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          textDecoration: isCancelled ? 'line-through' : 'none',
                          border: ev.status === 'RESCHEDULED' ? `1px dashed ${tc.color}` : 'none',
                        }} title={`${ev.title}${ev.startTime ? ' at ' + new Date(ev.startTime).toLocaleTimeString() : ''} (${ev.status})`}>
                          {ev.isGlobal && '🌐 '}{ev.title}
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
            {events.sort((a, b) => (a.startTime || a.date).localeCompare(b.startTime || b.date)).map(ev => {
              const tc = TYPE_COLORS[ev.type] || TYPE_COLORS.class
              const isCancelled = ev.status === 'CANCELLED'
              const date = new Date(ev.startTime || ev.date)
              return (
                <div key={ev.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 24px',
                  gap: '14px',
                  borderRadius: '50px',
                  background: isCancelled ? '#f8f8f8' : '#e8eaf0',
                  boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff',
                  transition: 'box-shadow 0.2s',
                  opacity: isCancelled ? 0.7 : 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '8px 8px 16px #c2c4cc, -8px -8px 16px #ffffff')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff')}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: isCancelled ? '#eee' : tc.bg,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: isCancelled ? '#999' : tc.color, lineHeight: 1 }}>
                      {date.getDate()}
                    </span>
                    <span style={{ fontSize:9, color: isCancelled ? '#999' : tc.color, fontWeight: '600', textTransform: 'uppercase' }}>
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: isCancelled ? '#999' : '#1e1e3a', marginBottom: '2px', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                      {ev.isGlobal && '🌐 '}{ev.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9999b0' }}>
                      {ev.startTime && `${new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · `}
                      {ev.course?.name ? ev.course.name : ev.description || 'General (All Groups)'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10px', padding: '3px 10px', borderRadius: '10px', fontWeight: '600',
                    background: ev.courseId ? (ev.course?.color || '#6366f1') + '18' : '#d0d2d9',
                    color: ev.courseId ? (ev.course?.color || '#6366f1') : '#6b6b8a',
                  }}>
                    {ev.course?.name || 'General'}
                  </span>
                  <span className={`badge badge-${ev.status === 'CANCELLED' ? 'warning' : ev.type === 'exam' ? 'danger' : ev.type === 'assignment' ? 'warning' : 'primary'}`}>
                    {ev.status === 'CANCELLED' ? 'CANCELLED' : tc.label}
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
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e1e3a' }}>
                  {selectedEvent.isGlobal && '🌐 '}{selectedEvent.title}
                </div>
              </div>
              {selectedEvent.description && (
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Description</div>
                  <div style={{ fontSize: '13px', color: '#3a3a5c' }}>{selectedEvent.description}</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Start</div>
                  <div style={{ fontSize: '13px', color: '#1e1e3a' }}>{selectedEvent.startTime ? new Date(selectedEvent.startTime).toLocaleString() : '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>End</div>
                  <div style={{ fontSize: '13px', color: '#1e1e3a' }}>{selectedEvent.endTime ? new Date(selectedEvent.endTime).toLocaleString() : '—'}</div>
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
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Status</div>
                  <span className={`badge badge-${selectedEvent.status === 'CANCELLED' ? 'warning' : 'success'}`}>
                    {selectedEvent.status}
                  </span>
                </div>
              </div>
              {selectedEvent.meetLink && (
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Meeting Link</div>
                  <a href={selectedEvent.meetLink} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#6366f1', textDecoration: 'underline' }}>
                    {selectedEvent.meetLink}
                  </a>
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
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="isGlobal"
                  checked={!!formData.isGlobal} 
                  onChange={e => set('isGlobal', e.target.checked)}
                />
                <label htmlFor="isGlobal" className="form-label" style={{ marginBottom: 0 }}>Global Event (Visible to everyone)</label>
              </div>
              
              {!formData.isGlobal && (
                <div className="form-group">
                  <label className="form-label">Course *</label>
                  <select
                    className="form-input"
                    value={formData.courseId || ''}
                    onChange={e => set('courseId', e.target.value)}
                  >
                    <option value="">Select course...</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

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
                  <label className="form-label">Meeting Link (Optional)</label>
                  <input
                    className="form-input"
                    value={formData.meetLink || ''}
                    onChange={e => set('meetLink', e.target.value)}
                    placeholder="https://meet.jit.si/..."
                  />
                </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.startTime || ''}
                    onChange={e => set('startTime', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.endTime || ''}
                    onChange={e => set('endTime', e.target.value)}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                    <option value="holiday">Holiday</option>
                    <option value="introduction">Introduction</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={formData.status || 'SCHEDULED'}
                    onChange={e => set('status', e.target.value)}
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="RESCHEDULED">Rescheduled</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Recurrence</label>
                  <select
                    className="form-input"
                    value={formData.recurrence || 'ONETIME'}
                    onChange={e => set('recurrence', e.target.value)}
                  >
                    <option value="ONETIME">One-time</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="CUSTOM">Custom Interval</option>
                  </select>
                </div>
                {formData.recurrence === 'CUSTOM' && (
                  <div className="form-group">
                    <label className="form-label">Interval (Days)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.interval || ''}
                      onChange={e => set('interval', e.target.value)}
                      placeholder="e.g. 3"
                      min="1"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving || !formData.title || !formData.startTime} className="btn btn-primary">
                {saving ? 'Saving…' : (editId ? 'Update Event' : 'Create Event')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
