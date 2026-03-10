'use client'

import { useState, useEffect, useCallback } from 'react'

interface ActivityLog {
  id: string
  userId: string
  userName: string
  userRole: string
  securityNumber: string | null
  actionType: string
  actionDescription: string
  moduleName: string
  targetId: string | null
  metadata: string | null
  timestamp: string
}

const MODULE_OPTIONS = [
  'Authentication', 'User Management', 'Classes', 'Topics', 'Content',
  'Lectures', 'Materials', 'Live Sessions', 'Calendar', 'Announcements',
  'Community', 'Support', 'Profile', 'FAQ',
]

const ACTION_OPTIONS = [
  'USER_LOGIN', 'USER_LOGOUT', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
  'PASSWORD_CHANGED', 'PROFILE_UPDATED', 'AVATAR_UPLOADED',
  'CLASS_CREATED', 'CLASS_UPDATED', 'CLASS_DELETED',
  'TOPIC_CREATED', 'TOPIC_UPDATED', 'TOPIC_DELETED',
  'CONTENT_CREATED', 'CONTENT_UPDATED', 'CONTENT_DELETED',
  'LECTURE_CREATED', 'LECTURE_UPDATED', 'LECTURE_DELETED',
  'MATERIAL_CREATED', 'MATERIAL_UPDATED', 'MATERIAL_DELETED',
  'SESSION_CREATED', 'SESSION_UPDATED', 'SESSION_DELETED',
  'EVENT_CREATED', 'EVENT_UPDATED', 'EVENT_DELETED',
  'ANNOUNCEMENT_CREATED',
  'MESSAGE_SENT', 'MESSAGE_DELETED', 'TRANSCRIPT_EXPORTED',
  'TICKET_CREATED', 'TICKET_UPDATED', 'TICKET_DELETED', 'TICKET_REPLY_SENT',
  'CHAT_STARTED', 'CHAT_JOINED', 'CHAT_CLOSED', 'CHAT_HISTORY_DELETED',
  'FAQ_CREATED', 'FAQ_UPDATED', 'FAQ_DELETED',
]

function formatActionType(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\bFaq\b/g, 'FAQ')
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${date} at ${time}`
}

function getRoleBadgeStyle(role: string): React.CSSProperties {
  const colors: Record<string, { bg: string; color: string }> = {
    MANAGER: { bg: '#ede9fe', color: '#7c3aed' },
    ADMIN: { bg: '#dbeafe', color: '#2563eb' },
    STUDENT: { bg: '#d1fae5', color: '#059669' },
  }
  const c = colors[role] || { bg: '#f3f4f6', color: '#6b7280' }
  return {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '50px',
    fontSize: '11px',
    fontWeight: '700',
    background: c.bg,
    color: c.color,
    letterSpacing: '0.3px',
  }
}

function getModuleBadgeStyle(): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '50px',
    fontSize: '11px',
    fontWeight: '600',
    background: '#f0f0f8',
    color: '#4b4b7a',
    letterSpacing: '0.3px',
  }
}

export default function WorkLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [todayCount, setTodayCount] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const limit = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      if (moduleFilter) params.set('moduleName', moduleFilter)
      if (actionFilter) params.set('actionType', actionFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/activity-logs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (err) {
      console.error('Error fetching logs:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter, moduleFilter, actionFilter, dateFrom, dateTo])

  // Fetch today count separately
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    fetch(`/api/activity-logs?dateFrom=${today}&dateTo=${today}&limit=1`)
      .then(r => r.json())
      .then(data => setTodayCount(data.total || 0))
      .catch(() => {})
  }, [logs])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, moduleFilter, actionFilter, dateFrom, dateTo])

  const handleExportCsv = async () => {
    const params = new URLSearchParams()
    params.set('export', 'csv')
    if (search) params.set('search', search)
    if (roleFilter) params.set('role', roleFilter)
    if (moduleFilter) params.set('moduleName', moduleFilter)
    if (actionFilter) params.set('actionType', actionFilter)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    try {
      const res = await fetch(`/api/activity-logs?${params.toString()}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setRoleFilter('')
    setModuleFilter('')
    setActionFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasFilters = search || roleFilter || moduleFilter || actionFilter || dateFrom || dateTo

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Work Log</h1>
          <p className="page-subtitle">Monitor all platform activity and user actions</p>
        </div>
        <button className="btn btn-primary" onClick={handleExportCsv} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#3636e8' }}>{total.toLocaleString()}</div>
          <div style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: '600', marginTop: '4px' }}>Total Logs</div>
        </div>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#059669' }}>{todayCount.toLocaleString()}</div>
          <div style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: '600', marginTop: '4px' }}>Today&apos;s Actions</div>
        </div>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#7c3aed' }}>{page}/{totalPages || 1}</div>
          <div style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: '600', marginTop: '4px' }}>Current Page</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e1e3a' }}>Filters</span>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ marginLeft: 'auto', fontSize: '12px' }}>
              Clear All
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {/* Search */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b6b8a', display: 'block', marginBottom: '4px' }}>Search</label>
            <input
              className="form-input"
              type="text"
              placeholder="Search user or action..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>
          {/* Role */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b6b8a', display: 'block', marginBottom: '4px' }}>Role</label>
            <select
              className="form-input"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            >
              <option value="">All Roles</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
              <option value="STUDENT">Student</option>
            </select>
          </div>
          {/* Module */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b6b8a', display: 'block', marginBottom: '4px' }}>Module</label>
            <select
              className="form-input"
              value={moduleFilter}
              onChange={e => setModuleFilter(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            >
              <option value="">All Modules</option>
              {MODULE_OPTIONS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          {/* Action Type */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b6b8a', display: 'block', marginBottom: '4px' }}>Action Type</label>
            <select
              className="form-input"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            >
              <option value="">All Actions</option>
              {ACTION_OPTIONS.map(a => (
                <option key={a} value={a}>{formatActionType(a)}</option>
              ))}
            </select>
          </div>
          {/* Date From */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b6b8a', display: 'block', marginBottom: '4px' }}>From Date</label>
            <input
              className="form-input"
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>
          {/* Date To */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b6b8a', display: 'block', marginBottom: '4px' }}>To Date</label>
            <input
              className="form-input"
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>
        </div>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: '#6b6b8a', fontSize: '14px' }}>Loading activity logs...</div>
        </div>
      ) : logs.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
          </div>
          <div style={{ color: '#6b6b8a', fontSize: '14px', fontWeight: '600' }}>No activity logs found</div>
          <div style={{ color: '#9999b0', fontSize: '13px', marginTop: '4px' }}>
            {hasFilters ? 'Try adjusting your filters' : 'Activity will appear here as users interact with the platform'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {logs.map((log) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 20px',
                borderRadius: '50px',
                background: '#e8eaf0',
                boxShadow: '4px 4px 10px #c5c7cf, -4px -4px 10px #ffffff',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Timestamp */}
              <div style={{ minWidth: '160px', flexShrink: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e1e3a' }}>
                  {formatTimestamp(log.timestamp)}
                </div>
              </div>

              {/* User info */}
              <div style={{ minWidth: '140px', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e1e3a' }}>{log.userName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={getRoleBadgeStyle(log.userRole)}>{log.userRole}</span>
                  {log.securityNumber && (
                    <span style={{ fontSize: '10px', color: '#9999b0', fontWeight: '600' }}>#{log.securityNumber}</span>
                  )}
                </div>
              </div>

              {/* Action description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: '#1e1e3a', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {log.actionDescription}
                </div>
              </div>

              {/* Module badge */}
              <div style={{ flexShrink: 0 }}>
                <span style={getModuleBadgeStyle()}>{log.moduleName}</span>
              </div>

              {/* Action type */}
              <div style={{ minWidth: '100px', flexShrink: 0, textAlign: 'right' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#6b6b8a',
                  background: '#dddde8',
                  padding: '3px 10px',
                  borderRadius: '50px',
                }}>
                  {formatActionType(log.actionType)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '24px',
          padding: '16px',
        }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ opacity: page <= 1 ? 0.4 : 1 }}
          >
            Previous
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (page <= 4) {
                pageNum = i + 1
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = page - 3 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: page === pageNum ? '700' : '500',
                    color: page === pageNum ? '#ffffff' : '#6b6b8a',
                    background: page === pageNum ? '#3636e8' : '#e8eaf0',
                    boxShadow: page === pageNum
                      ? '2px 2px 6px rgba(54,54,232,0.35)'
                      : '2px 2px 4px #c5c7cf, -2px -2px 4px #ffffff',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                  }}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ opacity: page >= totalPages ? 0.4 : 1 }}
          >
            Next
          </button>
          <span style={{ fontSize: '12px', color: '#9999b0', marginLeft: '8px' }}>
            {total.toLocaleString()} total logs
          </span>
        </div>
      )}
    </div>
  )
}
