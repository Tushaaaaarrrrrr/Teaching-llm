'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatIST } from '@/lib/date-utils'

interface NotificationLog {
  id: string
  category: string
  title: string
  body: string
  courseId: string | null
  courseName: string | null
  recipientCount: number
  channel: string
  topicName: string | null
  status: string
  metadata: string | null
  createdAt: string
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  CLASS_SCHEDULED:   { label: 'Class Scheduled',    color: '#6366f1', bg: '#eef2ff', icon: '📅' },
  CLASS_STARTING_15M:{ label: 'Starting in 15m',    color: '#f59e0b', bg: '#fffbeb', icon: '⏰' },
  CLASS_START:       { label: 'Class Started',       color: '#10b981', bg: '#ecfdf5', icon: '🔔' },
  CLASS_RESCHEDULED: { label: 'Rescheduled',         color: '#8b5cf6', bg: '#f5f3ff', icon: '🔄' },
  CLASS_CANCELED:    { label: 'Canceled',            color: '#ef4444', bg: '#fef2f2', icon: '❌' },
  LECTURE_ADDED:     { label: 'Lecture Added',        color: '#0ea5e9', bg: '#f0f9ff', icon: '📚' },
  LIVE_CLASS:        { label: 'Class is Live',        color: '#22c55e', bg: '#f0fdf4', icon: '🟢' },
  ANNOUNCEMENT:      { label: 'Announcement',         color: '#f97316', bg: '#fff7ed', icon: '📢' },
  DAILY_DIGEST:      { label: 'Daily Digest',          color: '#64748b', bg: '#f8fafc', icon: '📋' },
}

const CATEGORY_OPTIONS = [
  'CLASS_SCHEDULED', 'CLASS_STARTING_15M', 'CLASS_START',
  'CLASS_RESCHEDULED', 'CLASS_CANCELED', 'LECTURE_ADDED',
  'LIVE_CLASS', 'ANNOUNCEMENT', 'DAILY_DIGEST',
]

function formatTimestamp(ts: string): string {
  return formatIST(ts, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function NotificationLogsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('')

  const limit = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (categoryFilter) params.set('category', categoryFilter)

      const res = await fetch(`/api/notification-logs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      console.error('Failed to load notification logs')
    } finally {
      setLoading(false)
    }
  }, [page, categoryFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => { setPage(1) }, [categoryFilter])

  const getCategoryConfig = (cat: string) => {
    return CATEGORY_CONFIG[cat] || { label: cat, color: '#64748b', bg: '#f8fafc', icon: '🔔' }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontSize: '26px', fontWeight: '700', color: 'var(--text)',
          margin: 0, letterSpacing: '-0.5px',
        }}>
          Notification History
        </h1>
        <p style={{
          fontSize: '14px', color: 'var(--text-secondary)', margin: '6px 0 0',
        }}>
          Complete log of all notifications sent to students · {total} total
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '24px',
      }}>
        {CATEGORY_OPTIONS.map(cat => {
          const cfg = getCategoryConfig(cat)
          const count = logs.filter(l => l.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '14px 16px', borderRadius: '14px',
                border: categoryFilter === cat ? `2px solid ${cfg.color}` : '2px solid transparent',
                background: cfg.bg, cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '20px' }}>{cfg.icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: cfg.color, lineHeight: 1.2 }}>
                  {cfg.label}
                </div>
                {!loading && (
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {count} on page
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '20px', flexWrap: 'wrap',
      }}>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{
            padding: '8px 14px', borderRadius: '10px',
            border: '1px solid var(--border)', background: 'var(--surface)',
            fontSize: '13px', color: 'var(--text)', outline: 'none',
            cursor: 'pointer', minWidth: '180px',
          }}
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map(cat => (
            <option key={cat} value={cat}>{getCategoryConfig(cat).label}</option>
          ))}
        </select>

        {categoryFilter && (
          <button
            onClick={() => setCategoryFilter('')}
            style={{
              padding: '8px 14px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--surface)',
              fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            Clear Filter ✕
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Page {page} of {totalPages}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Loading notification history...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
              No notification logs yet. Logs will appear here as notifications are sent.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}>Date & Time</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Message</th>
                  <th style={thStyle}>Course</th>
                  <th style={thStyle}>Recipients</th>
                  <th style={thStyle}>Channel</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => {
                  const cfg = getCategoryConfig(log.category)
                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: idx < logs.length - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatTimestamp(log.createdAt)}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '3px 10px', borderRadius: '50px',
                          fontSize: '11px', fontWeight: '600',
                          background: cfg.bg, color: cfg.color,
                        }}>
                          <span>{cfg.icon}</span>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: 'var(--text)', maxWidth: '200px' }}>
                        {log.title}
                      </td>
                      <td style={{
                        ...tdStyle, maxWidth: '280px', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: 'var(--text-secondary)', fontSize: '12px',
                      }}>
                        {log.body}
                      </td>
                      <td style={tdStyle}>
                        {log.courseName ? (
                          <span style={{
                            padding: '3px 10px', borderRadius: '50px',
                            fontSize: '11px', fontWeight: '600',
                            background: 'var(--primary-light)', color: 'var(--accent)',
                          }}>
                            {log.courseName}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: '32px', padding: '3px 10px', borderRadius: '50px',
                          fontSize: '12px', fontWeight: '700',
                          background: '#f1f5f9', color: '#334155',
                        }}>
                          {log.recipientCount}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '50px',
                          fontSize: '10px', fontWeight: '700',
                          background: log.channel === 'TOPIC' ? '#dbeafe' : '#e0e7ff',
                          color: log.channel === 'TOPIC' ? '#1d4ed8' : '#4338ca',
                          letterSpacing: '0.5px',
                        }}>
                          {log.channel}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 10px', borderRadius: '50px',
                          fontSize: '11px', fontWeight: '600',
                          background: log.status === 'SENT' ? '#ecfdf5' : '#fef2f2',
                          color: log.status === 'SENT' ? '#059669' : '#dc2626',
                        }}>
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: log.status === 'SENT' ? '#10b981' : '#ef4444',
                          }} />
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: '10px', marginTop: '24px',
        }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{
              padding: '8px 18px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--surface)',
              fontSize: '13px', cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.5 : 1, color: 'var(--text)',
            }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{
              padding: '8px 18px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--surface)',
              fontSize: '13px', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.5 : 1, color: 'var(--text)',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: '700',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  verticalAlign: 'middle',
}
