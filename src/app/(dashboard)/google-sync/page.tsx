'use client'

import { useState } from 'react'
import useSWR from 'swr'

export default function GoogleSyncPage() {
  const [filters, setFilters] = useState({ status: '', action: '', page: 1 })
  const [refreshKey, setRefreshKey] = useState(0)
  const fetcher = (url: string) => fetch(url).then(r => r.json())
  const { data: authData } = useSWR('/api/auth/me', fetcher)
  const userRole = authData?.user?.role || ''

  const syncUrl = userRole === 'MANAGER'
    ? `/api/group-sync-jobs?status=${filters.status}&action=${filters.action}&page=${filters.page}&limit=50&_refresh=${refreshKey}`
    : null
  const { data: syncData, isLoading } = useSWR(syncUrl, fetcher, {
    refreshInterval: 10000,
  })

  const jobs = syncData?.jobs || []
  const pagination = syncData?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 }
  const [isResetting, setIsResetting] = useState(false)

  async function handleResetLock() {
    if (!confirm('Are you sure you want to reset the sync engine? Only do this if jobs have been stuck for more than 5 minutes.')) return
    
    setIsResetting(true)
    try {
      const res = await fetch('/api/google-sync/reset-lock', { method: 'POST' })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to reset lock')
      
      setRefreshKey(prev => prev + 1)
      alert('Sync engine reset successfully. Jobs are now being processed.')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsResetting(false)
    }
  }

  function getErrorLabel(lastError?: string | null) {
    if (!lastError) return ''
    const normalized = lastError.toLowerCase()
    if (normalized.includes('resource not found') || normalized.includes('group not found') || normalized.includes('invalid input')) {
      return 'Google group not found or misconfigured'
    }
    if (normalized.includes('not authorized') || normalized.includes('insufficient permissions')) {
      return 'Google sync permissions are misconfigured'
    }
    return ''
  }

  if (authData && userRole !== 'MANAGER') {
    return (
      <div className="page-container fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Access Denied</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Only managers can access Google Sync monitoring.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      {/* Summary Card */}
      {userRole === 'MANAGER' && (
        <div className="card" style={{ overflow: 'hidden', maxWidth: '100%', marginBottom: '20px' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Google Sync Status</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Latest Google Group add/remove jobs for course enrollments
              </div>
            </div>
            <button
              onClick={handleResetLock}
              disabled={isResetting}
              className="btn btn-sm"
              style={{ 
                background: 'var(--danger-light)', 
                color: 'var(--danger)', 
                border: '1px solid var(--border)',
                fontSize: '11px',
                fontWeight: '700'
              }}
            >
              {isResetting ? 'Resetting...' : 'Reset Sync Engine'}
            </button>
          </div>
          {jobs.length === 0 && !isLoading ? (
            <div style={{ padding: '18px', fontSize: '12px', color: 'var(--text-muted)' }}>No sync jobs yet.</div>
          ) : (
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {jobs.slice(0, 12).map((job: any) => (
                <div key={job.id} style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(180px, 1.3fr) minmax(160px, 1fr) minmax(180px, 1.2fr) 90px 90px 90px minmax(180px, 1.2fr)',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '14px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-light)',
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.userEmail}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{job.course?.name || job.courseId}</div>
                    <div>{job.courseId}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.groupEmail}</div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: job.action === 'ADD' ? 'var(--success)' : 'var(--danger)' }}>{job.action}</div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: job.status === 'SUCCESS' ? 'var(--success)' : job.status === 'FAILED' ? 'var(--danger)' : 'var(--warning)' }}>{job.status}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{job.attemptCount}</div>
                  <div style={{ overflow: 'hidden' }}>
                    {getErrorLabel(job.lastError) && (
                      <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--danger)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getErrorLabel(job.lastError)}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.lastError || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Job Monitor Table */}
      <div className="card" style={{ overflow: 'hidden', maxWidth: '100%' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : (
          <div style={{ padding: '0' }}>
            {/* Header */}
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Google Sync Job Monitor</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Real-time visibility into Google Group sync activity ({pagination.total} total jobs)
                </div>
              </div>
              <button
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="btn btn-sm btn-ghost"
                style={{ border: '1px solid var(--neu-dark)' }}
                disabled={isLoading}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', animation: isLoading ? 'spin 1s linear infinite' : 'none' }}>
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                </svg>
                Refresh
              </button>
            </div>

            {/* Filters */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginRight: '6px' }}>Status:</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    background: 'var(--surface-2)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginRight: '6px' }}>Action:</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    background: 'var(--surface-2)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">All</option>
                  <option value="ADD">Add Member</option>
                  <option value="REMOVE">Remove Member</option>
                </select>
              </div>
              {(filters.status || filters.action) && (
                <button
                  onClick={() => setFilters({ status: '', action: '', page: 1 })}
                  style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Jobs Table */}
            {jobs.length === 0 ? (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No sync jobs {filters.status || filters.action ? 'matching filters' : 'yet'}.
              </div>
            ) : (
              <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Column Headers */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(150px, 1.2fr) minmax(100px, 0.8fr) minmax(140px, 1.1fr) 70px 90px 60px 120px 90px',
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'var(--primary-light)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'var(--primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                }}>
                  <div>User Email</div>
                  <div>Course ID</div>
                  <div>Group Email</div>
                  <div>Action</div>
                  <div>Status</div>
                  <div>Attempts</div>
                  <div>Updated</div>
                  <div>Error</div>
                </div>

                {/* Jobs */}
                {jobs.map((job: any) => {
                  const createdDate = new Date(job.createdAt).toLocaleDateString('en-GB', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  const statusColor = job.status === 'SUCCESS' ? 'var(--success)' : job.status === 'FAILED' ? 'var(--danger)' : job.status === 'PROCESSING' ? 'var(--warning)' : 'var(--text-muted)'
                  const actionColor = job.action === 'ADD' ? 'var(--success)' : 'var(--danger)'

                  return (
                    <div
                      key={job.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(150px, 1.2fr) minmax(100px, 0.8fr) minmax(140px, 1.1fr) 70px 90px 60px 120px 90px',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: job.status === 'FAILED' ? 'var(--danger-light)' : 'var(--surface-2)',
                        border: job.status === 'FAILED' ? '1px solid var(--danger)' : '1px solid var(--border-light)',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.userEmail}>{job.userEmail}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }} title={job.courseId}>{job.courseId}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.groupEmail}>{job.groupEmail}</div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: actionColor, textAlign: 'center' }}>{job.action}</div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: statusColor, textAlign: 'center' }}>{job.status}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>{job.attemptCount}/3</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{createdDate}</div>
                      <div style={{ fontSize: '9px', color: job.lastError ? 'var(--danger)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.lastError || ''}>{job.lastError ? getErrorLabel(job.lastError) || job.lastError.slice(0, 20) : '—'}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}>
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                  disabled={filters.page === 1}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: filters.page === 1 ? 'var(--text-muted)' : 'var(--accent)' }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Page {filters.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, filters.page + 1) })}
                  disabled={filters.page === pagination.totalPages}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: filters.page === pagination.totalPages ? 'var(--text-muted)' : 'var(--accent)' }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
