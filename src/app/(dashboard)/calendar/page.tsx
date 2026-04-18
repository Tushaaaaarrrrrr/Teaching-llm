'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

interface CalEvent {
  id: string
  title: string
  description: string
  date: string
  time: string
  endTime?: string
  type: string
  meetLink?: string | null
  status?: string
  internalStatus?: string
  courseId?: string | null
  isGlobal?: boolean
  recurrence?: string | null
  interval?: number | null
  parentId?: string | null
  course?: { id: string; name: string; color: string } | null
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
}

function buildEventDateTime(date: string, startTimeValue: string, endTimeValue: string) {
  const startTime = new Date(`${date}T${startTimeValue}:00`)
  const endTime = new Date(`${date}T${endTimeValue}:00`)

  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
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

const EVENT_STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
]

const RECURRENCE_OPTIONS = [
  { value: 'ONETIME', label: 'One Time' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'CUSTOM', label: 'Custom Interval' },
]

function CalendarPageContent() {
  const { confirm, confirmDialog } = useConfirmDialog()
  const [mounted, setMounted] = useState(false)
  const [events, setEvents] = useState<CalEvent[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [instructors, setInstructors] = useState<InstructorOption[]>([])
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [todayState, setTodayState] = useState<Date | null>(null)

  useEffect(() => {
    setMounted(true)
    setCurrentDate(new Date())
    setTodayState(new Date())
  }, [])

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Detail popover for clicking event pills on calendar
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)
  const [selectedDailyDay, setSelectedDailyDay] = useState<number | null>(null)

  const year = currentDate?.getFullYear() || new Date().getFullYear()
  const month = currentDate?.getMonth() ?? new Date().getMonth()
  const monthName = currentDate ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''
  const isManager = user?.role === 'MANAGER'

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

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const isToday = (day: number) => {
    if (!todayState) return false
    return day === todayState.getDate() && month === todayState.getMonth() && year === todayState.getFullYear()
  }

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
      endTime: '',
      type: 'class',
      courseId: "",
      instructorId: '',
      meetLink: '',
      status: 'SCHEDULED',
      recurrence: 'ONETIME',
      interval: '1',
      parentId: '',
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
      endTime: ev.endTime || '',
      type: ev.type || 'class',
      courseId: ev.isGlobal ? 'GLOBAL' : (ev.courseId || ''),
      instructorId: ev.instructorId || '',
      meetLink: ev.meetLink || '',
      status: ev.internalStatus || 'SCHEDULED',
      recurrence: ev.recurrence || 'ONETIME',
      interval: ev.interval ? String(ev.interval) : '1',
      parentId: ev.parentId || '',
    })
    setSelectedEvent(null)
    setShowModal(true)
  }

  async function handleSave() {
    if (!formData.title || !formData.date || !formData.time || !formData.endTime) return
    
    // Ensure course is selected (not accidentally global)
    if (!formData.courseId || formData.courseId === '') {
      alert("Please select a course for this event.\n\nTo make it visible to all users, select 'Global (visible to all users)'.")
      return
    }
    
    setSaving(true)
    try {
      const { startTime, endTime } = buildEventDateTime(formData.date, formData.time, formData.endTime)
      if (new Date(endTime) <= new Date(startTime)) {
        alert('End time must be later than start time')
        setSaving(false)
        return
      }
      const isGlobal = formData.courseId === 'GLOBAL'
      const recurrence = formData.recurrence || 'ONETIME'
      const isSeriesEvent = !!formData.parentId || recurrence !== 'ONETIME'
      const payload = {
        title: formData.title,
        description: formData.description || null,
        date: formData.date,
        time: formData.time,
        startTime,
        endTime,
        meetLink: formData.meetLink || null,
        status: formData.status || 'SCHEDULED',
        recurrence,
        interval: recurrence === 'CUSTOM' ? (formData.interval || '1') : null,
        type: formData.type || 'class',
        courseId: isGlobal ? null : (formData.courseId || null),
        isGlobal,
        instructorId: formData.instructorId || null,
        parentId: formData.parentId || null,
        relatedCourse: !isGlobal && formData.courseId
          ? classes.find(c => c.id === formData.courseId)?.name || null
          : null,
      }
      const url = editId ? `/api/events/${editId}` : '/api/events'
      const method = editId ? 'PUT' : 'POST'
      let applyToFuture = false
      if (editId && isSeriesEvent) {
        applyToFuture = await confirm({
          title: 'Update Recurring Event?',
          message: 'Do you want to apply these changes to this event and all future events in the series?',
          confirmLabel: 'This & Future Events',
          cancelLabel: 'Only This Event',
          tone: 'default',
        })
      }
      const requestBody = editId && isSeriesEvent
        ? { ...payload, applyToFuture }
        : payload
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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
    const allowed = await confirm({
      title: 'Delete Event?',
      message: 'This event will be removed from the calendar.',
      confirmLabel: 'Delete Event',
      tone: 'danger',
    })
    if (!allowed) return
    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' })
      setSelectedEvent(null)
      loadEvents()
    } catch (e) { console.error(e) }
  }

  if (!mounted || !currentDate) return null

  return (
    <div className="page-container fade-in">
      {confirmDialog}
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
        {isManager && (
          <button onClick={() => openCreate()} className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Event
          </button>
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
            const dayKey = day ? `day-${year}-${month}-${day}` : `empty-${i}`
            return (
              <div key={dayKey} style={{
                minHeight: '100px',
                padding: '6px 8px',
                borderBottom: '1px solid #d8dae3',
                borderRight: (i + 1) % 7 !== 0 ? '1px solid #d8dae3' : 'none',
                background: day && isToday(day) ? '#f0f0ff' : 'transparent',
                transition: 'background 0.15s',
                cursor: day ? 'pointer' : 'default',
                position: 'relative',
              }}
              onClick={() => {
                if (day) setSelectedDailyDay(day)
              }}
              onMouseEnter={e => { if (day) e.currentTarget.style.background = day && isToday(day) ? '#e8e8ff' : '#f8fafc' }}
              onMouseLeave={e => { if (day) e.currentTarget.style.background = day && isToday(day) ? '#f0f0ff' : 'transparent' }}
              onDoubleClick={(e) => {
                e.stopPropagation() // prevent click from triggering immediately if double clicked
                if (day && isManager) {
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
                        <div key={ev.id} onClick={(e) => { 
                          e.stopPropagation(); 
                          if (isManager) setSelectedEvent(ev);
                        }} style={{
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
                          cursor: isManager ? 'pointer' : 'default',
                        }} title={`${ev.title}${ev.time ? ` ${ev.time}${ev.endTime ? ` - ${ev.endTime}` : ''}` : ''}`}>
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
                      {ev.time && `${ev.time}${ev.endTime ? ` - ${ev.endTime}` : ''} · `}
                      {ev.course?.name ? ev.course.name : ev.description || 'Global (All Users)'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10px', padding: '3px 10px', borderRadius: '10px', fontWeight: '600',
                    background: ev.courseId ? (ev.course?.color || '#6366f1') + '18' : '#d0d2d9',
                    color: ev.courseId ? (ev.course?.color || '#6366f1') : '#6b6b8a',
                  }}>
                    {ev.course?.name || 'Global'}
                  </span>
                  <span className={`badge badge-${ev.type === 'exam' ? 'danger' : ev.type === 'assignment' ? 'warning' : 'primary'}`}>
                    {tc.label}
                  </span>
                  {isManager && (
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
                  <div style={{ fontSize: '13px', color: '#1e1e3a' }}>
                    {selectedEvent.time
                      ? `${selectedEvent.time}${selectedEvent.endTime ? ` - ${selectedEvent.endTime}` : ''}`
                      : '—'}
                  </div>
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
                  <div style={{ fontSize: '13px', color: '#1e1e3a' }}>{selectedEvent.course?.name || 'Global (All Users)'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Status</div>
                  <div style={{ fontSize: '13px', color: '#1e1e3a' }}>{selectedEvent.internalStatus || selectedEvent.status || 'SCHEDULED'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Recurrence</div>
                  <div style={{ fontSize: '13px', color: '#1e1e3a' }}>
                    {selectedEvent.recurrence === 'CUSTOM' && selectedEvent.interval
                      ? `Every ${selectedEvent.interval} day(s)`
                      : (selectedEvent.recurrence || 'ONETIME')}
                  </div>
                </div>
              </div>
              {selectedEvent.instructor && (
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Instructor</div>
                  <div style={{ fontSize: '13px', color: '#1e1e3a' }}>{selectedEvent.instructor.name}</div>
                </div>
              )}
              {selectedEvent.meetLink && (
                <div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Meet Link</div>
                  <a href={selectedEvent.meetLink} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#2563eb', wordBreak: 'break-all' }}>
                    {selectedEvent.meetLink}
                  </a>
                </div>
              )}
            </div>
            {isManager && (
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
                  value={formData.courseId || ''}
                  onChange={e => set('courseId', e.target.value)}
                  required
                >
                  <option value="">-- Select a Course --</option>
                  <option value="GLOBAL">Global (visible to all users)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p style={{ fontSize: '11px', color: '#9999b0', marginTop: '4px' }}>
                  {formData.courseId && formData.courseId !== 'GLOBAL'
                    ? 'Only members enrolled in this subject will see this event.'
                    : 'This event will be visible to all users.'}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
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
                  <label className="form-label">Start Time *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.time || ''}
                    onChange={e => set('time', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.endTime || ''}
                    onChange={e => set('endTime', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Meet Link</label>
                <input
                  type="url"
                  className="form-input"
                  value={formData.meetLink || ''}
                  onChange={e => set('meetLink', e.target.value)}
                  placeholder="https://meet.google.com/..."
                />
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={formData.status || 'SCHEDULED'}
                    onChange={e => set('status', e.target.value)}
                  >
                    {EVENT_STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Recurrence</label>
                  <select
                    className="form-input"
                    value={formData.recurrence || 'ONETIME'}
                    onChange={e => set('recurrence', e.target.value)}
                  >
                    {RECURRENCE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {formData.recurrence === 'CUSTOM' && (
                <div className="form-group">
                  <label className="form-label">Repeat Every (Days)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={formData.interval || '1'}
                    onChange={e => set('interval', e.target.value)}
                  />
                </div>
              )}
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
              <button onClick={handleSave} disabled={saving || !formData.title || !formData.date || !formData.time || !formData.endTime} className="btn btn-primary">
                {saving ? 'Saving…' : (editId ? 'Update Event' : 'Create Event')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Schedule Modal */}
      {selectedDailyDay !== null && (
        <div className="modal-overlay" onClick={() => setSelectedDailyDay(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Schedule for the Day</h3>
                <p style={{ fontSize: '13px', color: '#6b6b8a', marginTop: '2px' }}>
                  {new Date(year, month, selectedDailyDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setSelectedDailyDay(null)} style={{ color: '#9999b0', cursor: 'pointer', background: 'none', border: 'none' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {(() => {
                const dayEvents = getEventsForDay(selectedDailyDay).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                if (dayEvents.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9999b0' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.5 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <p style={{ fontSize: '15px', fontWeight: '600' }}>No events scheduled for this day.</p>
                    </div>
                  )
                }
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {dayEvents.map(ev => {
                      const tc = TYPE_COLORS[ev.type] || TYPE_COLORS.class
                      return (
                        <div key={ev.id} style={{ 
                          border: `1px solid ${tc.bg}`, 
                          borderRadius: '16px', 
                          padding: '16px 20px',
                          background: '#ffffff',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: tc.color }} />
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                                <span className={`badge badge-${ev.type === 'exam' ? 'danger' : ev.type === 'assignment' ? 'warning' : 'primary'}`}>
                                  {tc.label}
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b6b8a' }}>
                                  {ev.time ? `${ev.time}${ev.endTime ? ` - ${ev.endTime}` : ''}` : 'Time TBD'}
                                </span>
                              </div>
                              <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1e1e3a', margin: 0 }}>
                                {ev.title}
                              </h4>
                            </div>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f1f5' }}>
                            <div>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</div>
                              <div style={{ fontSize: '13px', color: '#1e1e3a', fontWeight: '600' }}>{ev.course?.name || 'Global'}</div>
                            </div>
                            {ev.instructor && (
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instructor</div>
                                <div style={{ fontSize: '13px', color: '#1e1e3a', fontWeight: '600' }}>{ev.instructor.name}</div>
                              </div>
                            )}
                          </div>
                          
                          {ev.description && (
                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#6b6b8a', lineHeight: '1.5' }}>
                              {ev.description}
                            </div>
                          )}

                          {isManager && ev.meetLink && (
                            <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Meeting Link (Manager Only)</div>
                              <a href={ev.meetLink} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#2563eb', fontWeight: '600', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                                {ev.meetLink}
                              </a>
                            </div>
                          )}
                          
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
            
            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button 
                onClick={() => setSelectedDailyDay(null)} 
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default dynamic(() => Promise.resolve(CalendarPageContent), { ssr: false })
