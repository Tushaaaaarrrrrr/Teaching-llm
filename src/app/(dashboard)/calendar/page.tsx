'use client'

import { useEffect, useState } from 'react'

interface CalEvent {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: string
  class?: { name: string; color: string } | null
}

const TYPE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  class: { bg: '#e0e7ff', color: '#6366f1', label: 'Class' },
  exam: { bg: '#fee2e2', color: '#ef4444', label: 'Exam' },
  assignment: { bg: '#fef3c7', color: '#f59e0b', label: 'Assignment' },
  event: { bg: '#d1fae5', color: '#10b981', label: 'Event' },
  holiday: { bg: '#d0d2d9', color: '#6b6b8a', label: 'Holiday' },
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    fetch(`/api/events?month=${monthStr}`)
      .then(r => r.json())
      .then(data => setEvents(data.events || data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, month])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const days = []
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
              }}
              onMouseEnter={e => { if (day) e.currentTarget.style.background = day && isToday(day) ? '#e8e8ff' : '#f8fafc' }}
              onMouseLeave={e => { if (day) e.currentTarget.style.background = day && isToday(day) ? '#f0f0ff' : 'transparent' }}
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
                        <div key={ev.id} style={{
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

      {/* Upcoming Events List */}
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>Events This Month</h3>
        {events.length === 0 ? (
          <div className="card" style={{ padding: '30px', textAlign: 'center', color: '#9999b0' }}>
            No events this month
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {events.sort((a, b) => a.date.localeCompare(b.date)).map(ev => {
              const tc = TYPE_COLORS[ev.type] || TYPE_COLORS.class
              return (
                <div key={ev.id} className="card" style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 18px',
                  gap: '14px',
                }}>
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
                      {ev.class?.name || ev.description || tc.label}
                    </div>
                  </div>
                  <span className={`badge badge-${ev.type === 'exam' ? 'danger' : ev.type === 'assignment' ? 'warning' : 'primary'}`}>
                    {tc.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
