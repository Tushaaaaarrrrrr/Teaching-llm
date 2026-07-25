'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { normalizeMeetLink } from '@/lib/meet-link'
import { formatTimeString12Hour } from '@/lib/date-utils'
import { useRouter } from 'next/navigation'

interface CalEvent {
  id: string
  title: string
  description: string
  date: string
  time: string
  endTime?: string
  type: string
  meetLink?: string | null
  streamProvider?: string | null
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
  class: { bg: 'var(--info)', color: '#ffffff', label: 'Class' }, // Vibrant Blue like Google Calendar
  exam: { bg: 'var(--danger)', color: '#ffffff', label: 'Exam' },
  assignment: { bg: '#FFC107', color: '#000000', label: 'Assignment' }, // Punchy Yellow
  event: { bg: 'var(--success)', color: '#ffffff', label: 'Event' },
  holiday: { bg: 'var(--text-secondary)', color: '#ffffff', label: 'Holiday' },
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
  const router = useRouter()
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
  // Mobile agenda view selected day (separate from the modal-opening selectedDailyDay)
  const [mobileSelectedDay, setMobileSelectedDay] = useState<number>(() => new Date().getDate())
  const mobileDayStripRef = useRef<HTMLDivElement>(null)

  const year = currentDate?.getFullYear() || new Date().getFullYear()
  const month = currentDate?.getMonth() ?? new Date().getMonth()
  const monthName = currentDate ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''
  const isManager = user?.role === 'MANAGER'

  useEffect(() => {
    // Load user info, classes (courses only), and instructors once
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/classes?includeDms=false&activeOnly=true').then(r => r.json()),
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
      .then(data => setEvents(Array.isArray(data) ? data : Array.isArray(data?.events) ? data.events : []))
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
      streamProvider: 'MEET',
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
      streamProvider: ev.streamProvider || 'MEET',
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
      const streamProvider = (formData.streamProvider || 'MEET').toUpperCase()
      const payload = {
        title: formData.title,
        description: formData.description || null,
        date: formData.date,
        time: formData.time,
        startTime,
        endTime,
        // Meet/YouTube/Drive all use the meetLink column; Agora ignores it (server clears it anyway).
        meetLink: streamProvider === 'AGORA' ? null : (formData.meetLink || null),
        status: formData.status || 'SCHEDULED',
        recurrence,
        interval: recurrence === 'CUSTOM' ? (formData.interval || '1') : null,
        type: formData.type || 'class',
        courseId: isGlobal ? null : (formData.courseId || null),
        isGlobal,
        instructorId: formData.instructorId || null,
        parentId: formData.parentId || null,
        streamProvider,
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

  // Snap mobileSelectedDay to a valid range whenever month changes
  useEffect(() => {
    const totalDays = new Date(year, month + 1, 0).getDate()
    const today = todayState
    if (today && today.getFullYear() === year && today.getMonth() === month) {
      setMobileSelectedDay(today.getDate())
    } else {
      setMobileSelectedDay(prev => Math.min(prev, totalDays))
    }
  }, [year, month, todayState])

  // Auto-scroll the day strip so the selected day stays in view
  useEffect(() => {
    const el = mobileDayStripRef.current?.querySelector<HTMLElement>(`[data-day="${mobileSelectedDay}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [mobileSelectedDay])

  // On first mount (and when month/today resolves), force-scroll the day strip to today
  // so the calendar always opens centered on the current date, even if mobileSelectedDay
  // happened to already equal today's date and the scroll-on-change effect didn't fire.
  useEffect(() => {
    if (!mounted || !todayState) return
    const el = mobileDayStripRef.current?.querySelector<HTMLElement>(`[data-day="${mobileSelectedDay}"]`)
    if (el) el.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, todayState, year, month])

  if (!mounted || !currentDate) return null

  const mobileDayEvents = getEventsForDay(mobileSelectedDay).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const mobileSelectedDateLabel = new Date(year, month, mobileSelectedDay).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
  const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="page-container fade-in" style={{ padding: '32px' }}>
      {confirmDialog}

      {/* ───────────── MOBILE CALENDAR (≤768px) ───────────── */}
      <div className="calendar-mobile-only">
        {/* Premium Neumorphic Page Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px',
          justifyContent: 'flex-start'
        }}>
          <button
            onClick={() => router.back()}
            aria-label="Go Back"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--surface)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)',
              color: 'var(--text-secondary)',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '2px 2px 4px var(--neu-dark), -2px -2px 4px var(--neu-light)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontSize: '22px',
              fontWeight: 900,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              fontFamily: "'Outfit', 'Nunito', sans-serif"
            }}>
              Calendar
            </h1>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              margin: '3px 0 0',
              fontFamily: "'Outfit', sans-serif"
            }}>
              Schedule, classes &amp; deadlines
            </p>
          </div>
        </div>

        {/* Month navigator */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface-2)', padding: '8px 8px 8px 18px', borderRadius: '50px',
          boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)',
          marginBottom: '18px',
        }}>
          <button onClick={prevMonth} aria-label="Previous month" style={{
            width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-2)', boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)', color: 'var(--primary)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button onClick={goToday} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)',
          }}>{monthName}</button>
          <button onClick={nextMonth} aria-label="Next month" style={{
            width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-2)', boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)', color: 'var(--primary)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Day strip (horizontal scroll) */}
        <div
          ref={mobileDayStripRef}
          className="calendar-mobile-day-strip"
          style={{
            display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px',
            marginBottom: '20px', WebkitOverflowScrolling: 'touch',
          }}
        >
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dayDate = new Date(year, month, day)
            const wkLabel = WEEKDAY_LABELS[dayDate.getDay()]
            const isSelected = day === mobileSelectedDay
            const today = isToday(day)
            const eventCount = getEventsForDay(day).length
            return (
              <button
                key={`mday-${day}`}
                data-day={day}
                onClick={() => setMobileSelectedDay(day)}
                style={{
                  flex: '0 0 auto',
                  width: '54px', minHeight: '70px',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '4px', padding: '8px 6px', borderRadius: '20px',
                  background: isSelected ? 'var(--primary)' : 'var(--surface-2)',
                  color: isSelected ? '#ffffff' : (today ? 'var(--primary)' : 'var(--text-secondary)'),
                  boxShadow: isSelected
                    ? '5px 5px 12px rgba(54,54,232,0.35), -3px -3px 8px var(--neu-glow)'
                    : '4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: 700, opacity: isSelected ? 0.85 : 1 }}>{wkLabel}</span>
                <span style={{ fontSize: '17px', fontWeight: 800 }}>{day}</span>
                {eventCount > 0 && (
                  <span style={{
                    position: 'absolute', bottom: '6px',
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: isSelected ? '#ffffff' : 'var(--primary)',
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Selected day header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>Schedule</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>{mobileSelectedDateLabel}</div>
          </div>
          {isManager && (
            <button onClick={() => openCreate(`${year}-${String(month + 1).padStart(2, '0')}-${String(mobileSelectedDay).padStart(2, '0')}`)} style={{
              background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
              borderRadius: '50%', width: '40px', height: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 14px rgba(54,54,232,0.4)',
            }} aria-label="Add event">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          )}
        </div>

        {/* Agenda list for selected day */}
        {mobileDayEvents.length === 0 ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center', borderRadius: '24px',
            background: 'var(--surface-2)', boxShadow: 'inset 4px 4px 8px var(--neu-dark), inset -4px -4px 8px var(--neu-light)',
            color: 'var(--text-muted)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--neu-dark)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Nothing scheduled</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Enjoy your free time</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mobileDayEvents.map(ev => {
              const tc = TYPE_COLORS[ev.type] || TYPE_COLORS.class
              return (
                <div
                  key={ev.id}
                  onClick={() => {
                    if (isManager) setSelectedEvent(ev)
                  }}
                  style={{
                    display: 'flex', alignItems: 'stretch', gap: '14px',
                    padding: '14px 16px', borderRadius: '20px',
                    background: 'var(--surface)', cursor: isManager ? 'pointer' : 'default',
                    boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
                    borderLeft: `5px solid ${tc.bg}`,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '76px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>{ev.time ? formatTimeString12Hour(ev.time) : '—'}</span>
                    {ev.endTime && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>to {formatTimeString12Hour(ev.endTime)}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '50px', background: tc.bg + '22', color: tc.bg === '#FFC107' ? '#b48a04' : tc.bg }}>
                        {tc.label}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.course?.name || (ev.isGlobal ? 'Global' : '')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ───────────── DESKTOP CALENDAR (>768px) ───────────── */}
      <div className="page-header calendar-desktop-only" style={{ marginBottom: '32px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          background: 'var(--surface-2)',
          padding: '6px',
          borderRadius: '50px',
          boxShadow: 'inset 4px 4px 8px var(--border), inset -4px -4px 8px var(--neu-light)'
        }}>
          <button onClick={goToday} className="btn btn-sm" style={{ 
            background: 'transparent', 
            boxShadow: 'none',
            color: 'var(--text-primary)',
            fontWeight: '700'
          }}>Today</button>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />
          <button onClick={prevMonth} style={{ 
            width: '32px', height: '32px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', transition: 'all 0.2s'
          }} className="hover:bg-white/50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button onClick={nextMonth} style={{ 
            width: '32px', height: '32px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', transition: 'all 0.2s'
          }} className="hover:bg-white/50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        <h2 style={{ 
          fontSize: '26px', 
          fontWeight: '800', 
          color: 'var(--text-primary)',
          margin: 0,
          background: 'linear-gradient(135deg, var(--text-primary), var(--info))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {monthName}
        </h2>

        {isManager && (
          <button onClick={() => openCreate()} className="btn btn-primary" style={{ padding: '10px 24px', fontWeight: '700' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Event
          </button>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="card calendar-desktop-only" style={{
        overflow: 'hidden',
        borderRadius: '28px',
        border: '1px solid var(--border)',
        boxShadow: '20px 20px 60px var(--neu-dark), -20px -20px 60px var(--neu-light)'
      }}>
        {/* Day headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
          backdropFilter: 'blur(10px)'
        }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{
              padding: '16px 8px',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: '800',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
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
            const today = day ? isToday(day) : false
            return (
              <div key={dayKey} style={{
                minHeight: '120px',
                padding: '36px 8px 8px', // Extra top padding for the date number
                borderBottom: '1px solid rgba(0,0,0,0.03)',
                borderRight: (i + 1) % 7 !== 0 ? '1px solid rgba(0,0,0,0.03)' : 'none',
                background: today ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                boxShadow: today ? 'inset 0 0 0 1.5px var(--info)' : 'none',
                transition: 'all 0.2s ease',
                cursor: day ? 'pointer' : 'default',
                position: 'relative',
              }}
              onClick={() => {
                if (day) setSelectedDailyDay(day)
              }}
              onMouseEnter={e => { 
                if (day) {
                  e.currentTarget.style.background = 'var(--surface-2)';
                  e.currentTarget.style.boxShadow = today 
                    ? 'inset 0 0 0 1.5px var(--info), inset 0 0 20px rgba(0,0,0,0.02)' 
                    : 'inset 0 0 20px rgba(0,0,0,0.02)';
                  e.currentTarget.style.zIndex = '5';
                }
              }}
              onMouseLeave={e => { 
                if (day) {
                  e.currentTarget.style.background = today ? 'rgba(59, 130, 246, 0.08)' : 'transparent';
                  e.currentTarget.style.boxShadow = today ? 'inset 0 0 0 1.5px var(--info)' : 'none';
                  e.currentTarget.style.zIndex = '1';
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                if (day && isManager) {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  openCreate(dateStr)
                }
              }}
              >
                {day && (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '12px',
                      fontSize: '13px',
                      fontWeight: today ? '800' : '600',
                      color: today ? 'var(--info)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {day}
                      {today && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--info)' }} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {dayEvents.slice(0, 4).map(ev => {
                        const tc = TYPE_COLORS[ev.type] || TYPE_COLORS.class
                        return (
                          <div key={ev.id} onClick={(e) => { 
                            e.stopPropagation(); 
                            if (isManager) setSelectedEvent(ev);
                          }} style={{
                            padding: '4px 8px',
                            borderRadius: '8px',
                            background: tc.bg,
                            color: tc.color,
                            fontSize: '10px',
                            fontWeight: '700',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: isManager ? 'pointer' : 'default',
                            boxShadow: today ? '0 0 8px rgba(255, 255, 255, 0.35)' : '0 2px 4px rgba(0,0,0,0.05)',
                            border: today ? '1.5px solid #ffffff' : '1px solid var(--border)'
                          }} title={`${ev.title}${ev.time ? ` ${ev.time}` : ''}`}>
                            {ev.title}
                          </div>
                        )
                      })}
                      {dayEvents.length > 4 && (
                        <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', paddingLeft: '4px', marginTop: '2px' }}>
                          + {dayEvents.length - 4} MORE
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Events This Month List */}
      <div className="calendar-desktop-only" style={{ marginTop: '40px' }}>
        <h3 style={{
          fontSize: '15px',
          fontWeight: '800',
          marginBottom: '16px',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>Events This Month</h3>
        {events.length === 0 ? (
          <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface-2)', backdropFilter: 'blur(10px)' }}>
            No events this month
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(() => {
              const todayDateObj = todayState || new Date()
              const todayStr = `${todayDateObj.getFullYear()}-${String(todayDateObj.getMonth() + 1).padStart(2, '0')}-${String(todayDateObj.getDate()).padStart(2, '0')}`
              
              const todayEvents = events.filter(e => e.date === todayStr)
              const otherEvents = events.filter(e => e.date !== todayStr)

              const sortByDateAndTime = (a: CalEvent, b: CalEvent) => {
                const dateCompare = a.date.localeCompare(b.date)
                if (dateCompare !== 0) return dateCompare
                return (a.time || '').localeCompare(b.time || '')
              }

              const sortedEvents = [
                ...todayEvents.sort(sortByDateAndTime),
                ...otherEvents.sort(sortByDateAndTime)
              ]

              return sortedEvents.map(ev => {
                const tc = TYPE_COLORS[ev.type] || TYPE_COLORS.class
                const isEventToday = ev.date === todayStr
                return (
                  <div key={ev.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px 24px',
                    gap: '16px',
                    borderRadius: '24px',
                    background: isEventToday 
                      ? 'linear-gradient(135deg, var(--surface) 0%, rgba(59, 130, 246, 0.07) 100%)' 
                      : 'var(--surface)',
                    boxShadow: isEventToday
                      ? '0 0 20px rgba(59, 130, 246, 0.12), 8px 8px 24px rgba(0,0,0,0.04)'
                      : '8px 8px 24px rgba(0,0,0,0.04), -8px -8px 24px var(--neu-glow)',
                    transition: 'all 0.3s ease',
                    border: isEventToday ? '1.5px solid var(--info)' : '1px solid var(--border)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = isEventToday
                      ? '0 0 25px rgba(59, 130, 246, 0.2), 12px 12px 32px rgba(0,0,0,0.06)'
                      : '12px 12px 32px rgba(0,0,0,0.06)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = isEventToday
                      ? '0 0 20px rgba(59, 130, 246, 0.12), 8px 8px 24px rgba(0,0,0,0.04)'
                      : '8px 8px 24px rgba(0,0,0,0.04), -8px -8px 24px var(--neu-glow)'
                  }}
                  >
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: tc.bg,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: tc.color, lineHeight: 1 }}>
                        {new Date(ev.date + 'T00:00:00').getDate()}
                      </span>
                      <span style={{ fontSize: '9px', color: tc.color, fontWeight: '700', textTransform: 'uppercase', opacity: 0.9 }}>
                        {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {ev.title}
                        {isEventToday && (
                          <span style={{
                            fontSize: '9px',
                            padding: '2px 8px',
                            borderRadius: '50px',
                            fontWeight: '800',
                            background: 'var(--info)',
                            color: '#ffffff',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            Today
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>
                        {ev.time && `${formatTimeString12Hour(ev.time)}${ev.endTime ? ` - ${formatTimeString12Hour(ev.endTime)}` : ''} · `}
                        {ev.course?.name ? ev.course.name : ev.description || 'Global (All Users)'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px', padding: '4px 12px', borderRadius: '50px', fontWeight: '700',
                      background: 'var(--bg)',
                      color: 'var(--text-secondary)',
                    }}>
                      {ev.course?.name || 'Global'}
                    </span>
                    <span style={{
                      fontSize: '10px', padding: '4px 12px', borderRadius: '50px', fontWeight: '700',
                      background: tc.bg + '20',
                      color: tc.bg === '#FFC107' ? '#b48a04' : tc.bg, // Adjust contrast for yellow
                    }}>
                      {tc.label}
                    </span>
                    {isManager && (
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => openEdit(ev)} className="btn btn-ghost btn-sm" style={{ padding: '8px', boxShadow: 'none' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(ev.id)} className="btn btn-sm" style={{ padding: '8px', color: 'var(--danger)', background: 'var(--danger-light)', boxShadow: 'none' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>

      {/* Event Detail Popover */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 'min(440px, calc(100vw - 32px))', borderRadius: '28px' }}>
            <div className="modal-header" style={{ border: 'none', padding: '24px 24px 0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>Event Details</h3>
              <button onClick={() => setSelectedEvent(null)} style={{ color: 'var(--text-muted)', transition: 'all 0.2s' }} className="hover:rotate-90">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Title</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{selectedEvent.title}</div>
              </div>
              {selectedEvent.description && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Description</div>
                  <div style={{ fontSize: '13px', color: '#3a3a5c' }}>{selectedEvent.description}</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Date</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{selectedEvent.date}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Time</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                    {selectedEvent.time
                      ? `${formatTimeString12Hour(selectedEvent.time)}${selectedEvent.endTime ? ` - ${formatTimeString12Hour(selectedEvent.endTime)}` : ''}`
                      : '—'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Type</div>
                  <span className={`badge badge-${selectedEvent.type === 'exam' ? 'danger' : selectedEvent.type === 'assignment' ? 'warning' : 'primary'}`}>
                    {(TYPE_COLORS[selectedEvent.type] || TYPE_COLORS.class).label}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Subject</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{selectedEvent.course?.name || 'Global (All Users)'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Status</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{selectedEvent.internalStatus || selectedEvent.status || 'SCHEDULED'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Recurrence</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                    {selectedEvent.recurrence === 'CUSTOM' && selectedEvent.interval
                      ? `Every ${selectedEvent.interval} day(s)`
                      : (selectedEvent.recurrence || 'ONETIME')}
                  </div>
                </div>
              </div>
              {selectedEvent.instructor && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Instructor</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{selectedEvent.instructor.name}</div>
                </div>
              )}
              {selectedEvent.meetLink && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Meet Link</div>
                  <a href={normalizeMeetLink(selectedEvent.meetLink) ?? '#'} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'var(--info)', wordBreak: 'break-all' }}>
                    {selectedEvent.meetLink}
                  </a>
                </div>
              )}
            </div>
            {isManager && (
              <div className="modal-footer">
                <button onClick={() => handleDelete(selectedEvent.id)} className="btn btn-sm" style={{ color: 'var(--danger)', border: '1px solid #fee2e2' }}>
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
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}>
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
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
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
                <label className="form-label">Stream Provider</label>
                <select
                  className="form-input"
                  value={formData.streamProvider || 'MEET'}
                  onChange={e => set('streamProvider', e.target.value)}
                >
                  <option value="MEET">Google Meet (paste link)</option>
                  <option value="YOUTUBE">YouTube (paste link)</option>
                  <option value="DRIVE">Google Drive (paste link)</option>
                  <option value="AGORA">In-app live class (Agora)</option>
                </select>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  {formData.streamProvider === 'AGORA'
                    ? 'Students will join inside the app. No external link needed.'
                    : 'Students follow the link below to attend.'}
                </p>
              </div>
              {formData.streamProvider !== 'AGORA' && (
                <div className="form-group">
                  <label className="form-label">
                    {formData.streamProvider === 'YOUTUBE' ? 'YouTube Link'
                      : formData.streamProvider === 'DRIVE' ? 'Google Drive Link'
                      : 'Meet Link'}
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    value={formData.meetLink || ''}
                    onChange={e => set('meetLink', e.target.value)}
                    placeholder={
                      formData.streamProvider === 'YOUTUBE'
                        ? 'https://www.youtube.com/watch?v=...'
                        : formData.streamProvider === 'DRIVE'
                          ? 'https://drive.google.com/file/d/.../view'
                          : 'https://meet.google.com/...'
                    }
                  />
                </div>
              )}
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
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 'min(600px, calc(100vw - 32px))', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Schedule for the Day</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {new Date(year, month, selectedDailyDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setSelectedDailyDay(null)} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}>
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
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
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
                          background: 'var(--surface)',
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
                                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                  {ev.time ? `${formatTimeString12Hour(ev.time)}${ev.endTime ? ` - ${formatTimeString12Hour(ev.endTime)}` : ''}` : 'Time TBD'}
                                </span>
                              </div>
                              <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                {ev.title}
                              </h4>
                            </div>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f1f5' }}>
                            <div>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</div>
                              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>{ev.course?.name || 'Global'}</div>
                            </div>
                            {ev.instructor && (
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instructor</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>{ev.instructor.name}</div>
                              </div>
                            )}
                          </div>
                          
                          {ev.description && (
                            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              {ev.description}
                            </div>
                          )}

                          {isManager && ev.meetLink && (
                            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Meeting Link (Manager Only)</div>
                              <a href={normalizeMeetLink(ev.meetLink) ?? '#'} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'var(--info)', fontWeight: '600', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
            
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
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
