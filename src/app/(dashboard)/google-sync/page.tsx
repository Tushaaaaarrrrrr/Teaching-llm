'use client'

import { useState } from 'react'
import useSWR from 'swr'

export default function GoogleSyncPage() {
  const [activeTab, setActiveTab] = useState<'pools' | 'jobs'>('pools')
  const [filters, setFilters] = useState({ status: '', action: '', page: 1 })
  const [refreshKey, setRefreshKey] = useState(0)

  // Notification Pool Form State
  const [newGroupEmail, setNewGroupEmail] = useState('')
  const [newMaxCapacity, setNewMaxCapacity] = useState('500')
  const [isSubmittingPool, setIsSubmittingPool] = useState(false)
  const [isFlushing, setIsFlushing] = useState(false)
  const [poolMessage, setPoolMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetcher = (url: string) => fetch(url).then(r => r.json())
  const { data: authData } = useSWR('/api/auth/me', fetcher)
  const userRole = authData?.user?.role || ''

  // Sync Jobs Data
  const syncUrl = userRole === 'MANAGER'
    ? `/api/group-sync-jobs?status=${filters.status}&action=${filters.action}&page=${filters.page}&limit=50&_refresh=${refreshKey}`
    : null
  const { data: syncData, isLoading: isLoadingJobs } = useSWR(syncUrl, fetcher, {
    refreshInterval: 10000,
  })

  // Notification Pools Stats Data
  const poolsUrl = userRole === 'MANAGER' ? `/api/admin/notification-groups?_refresh=${refreshKey}` : null
  const { data: poolData, isLoading: isLoadingPools, mutate: mutatePools } = useSWR(poolsUrl, fetcher, {
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

  async function handleAddPool(e: React.FormEvent) {
    e.preventDefault()
    if (!newGroupEmail.trim()) return

    setIsSubmittingPool(true)
    setPoolMessage(null)

    try {
      const res = await fetch('/api/admin/notification-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_POOL',
          groupEmail: newGroupEmail.trim().toLowerCase(),
          maxCapacity: parseInt(newMaxCapacity, 10) || 500,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add group email to pool')

      let msg = `Group email "${newGroupEmail}" added to pool successfully!`
      if (data.flushResult && data.flushResult.assigned > 0) {
        msg += ` Automatically assigned ${data.flushResult.assigned} pending overflow user(s) to this group!`
      }

      setPoolMessage({ type: 'success', text: msg })
      setNewGroupEmail('')
      setNewMaxCapacity('500')
      mutatePools()
      setRefreshKey(prev => prev + 1)
    } catch (err) {
      setPoolMessage({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred' })
    } finally {
      setIsSubmittingPool(false)
    }
  }

  async function handleFlushQueue() {
    setIsFlushing(true)
    setPoolMessage(null)

    try {
      const res = await fetch('/api/admin/notification-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'FLUSH_QUEUE' }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to flush overflow queue')

      setPoolMessage({
        type: 'success',
        text: `Flushed queue: Assigned ${data.assigned} user(s). ${data.remainingPending} user(s) remaining in queue.`,
      })
      mutatePools()
      setRefreshKey(prev => prev + 1)
    } catch (err) {
      setPoolMessage({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred' })
    } finally {
      setIsFlushing(false)
    }
  }

  async function handleTogglePoolStatus(poolId: string, currentStatus: boolean) {
    try {
      const res = await fetch('/api/admin/notification-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_STATUS', poolId, isActive: !currentStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update pool status')
      }

      mutatePools()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update pool status')
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

  const pools = poolData?.pools || []
  const pendingOverflowCount = poolData?.pendingOverflowCount || 0
  const totalCapacity = poolData?.totalCapacity || 0
  const totalAssigned = poolData?.totalAssigned || 0

  return (
    <div className="page-container fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header & Tab Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Google Sync & Notification Group Pools</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Manage notification group mail pools, member limits (500 max), and monitor real-time Google Workspace sync jobs.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-2)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('pools')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              background: activeTab === 'pools' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'pools' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ✉️ Notification Pools
            {pendingOverflowCount > 0 && (
              <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: '800' }}>
                {pendingOverflowCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              background: activeTab === 'jobs' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'jobs' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            ⚡ Sync Jobs Monitor
          </button>
        </div>
      </div>

      {/* TAB 1: NOTIFICATION GROUP POOLS */}
      {activeTab === 'pools' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Overflow Alert Banner if users waiting */}
          {pendingOverflowCount > 0 && (
            <div style={{
              background: 'var(--danger-light)',
              border: '1px solid var(--danger)',
              padding: '16px 20px',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--danger)' }}>
                    {pendingOverflowCount} User(s) Pending in Overflow Queue!
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    All existing notification group pools are full (500/500 members). Add a new group email below to automatically assign waiting users.
                  </div>
                </div>
              </div>
              <button
                onClick={handleFlushQueue}
                disabled={isFlushing}
                className="btn btn-sm"
                style={{ background: 'var(--danger)', color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '12px' }}
              >
                {isFlushing ? 'Processing...' : '⚡ Try Flushing Queue Now'}
              </button>
            </div>
          )}

          {/* Feedback Message */}
          {poolMessage && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '600',
              background: poolMessage.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
              color: poolMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${poolMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
            }}>
              {poolMessage.text}
            </div>
          )}

          {/* Stat Summary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL POOL CAPACITY</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                {totalAssigned} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ {totalCapacity} members</span>
              </div>
              <div style={{ marginTop: '8px', background: 'var(--surface-2)', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${totalCapacity > 0 ? Math.min(100, (totalAssigned / totalCapacity) * 100) : 0}%`,
                  background: 'var(--primary)',
                  borderRadius: '4px',
                }} />
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>ACTIVE GROUP POOLS</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                {pools.filter((p: any) => p.isActive).length} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>pools</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                {pools.filter((p: any) => p.isFull).length} full (500 limit)
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>OVERFLOW QUEUE</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: pendingOverflowCount > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '4px' }}>
                {pendingOverflowCount} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>pending users</span>
              </div>
              <div style={{ fontSize: '11px', color: pendingOverflowCount > 0 ? 'var(--danger)' : 'var(--text-muted)', marginTop: '6px' }}>
                {pendingOverflowCount > 0 ? 'Action required: add group email' : 'All users assigned'}
              </div>
            </div>
          </div>

          {/* Add New Pool Email Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Add New Notification Group Email</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              When existing group mails reach 500 members, add a new Google Group email here. Newly registered users will be automatically assigned to it.
            </p>
            <form onSubmit={handleAddPool} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1', minWidth: '260px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Google Group Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. notifications-group-2@genziitian.org"
                  value={newGroupEmail}
                  onChange={e => setNewGroupEmail(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ width: '130px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Max Capacity
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="500"
                  value={newMaxCapacity}
                  onChange={e => setNewMaxCapacity(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingPool || !newGroupEmail.trim()}
                className="btn"
                style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', fontWeight: '700', padding: '10px 20px' }}
              >
                {isSubmittingPool ? 'Adding...' : '+ Add to Pool & Assign Waiting Users'}
              </button>
            </form>
          </div>

          {/* Group Pools Capacity Visualizer List */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Active Notification Group Pools</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Real-time capacity tracking per group email (500 max limit per group)</p>
              </div>
              <button
                onClick={() => mutatePools()}
                className="btn btn-sm btn-ghost"
                style={{ border: '1px solid var(--border)' }}
              >
                Refresh
              </button>
            </div>

            {isLoadingPools ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading pools...</div>
            ) : pools.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No Notification Group emails in pool yet. Add your first group email above to start assigning users!
              </div>
            ) : (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {pools.map((pool: any) => {
                  const percentage = pool.percentage || 0
                  const isFull = pool.isFull || pool.currentCount >= pool.maxCapacity
                  const isNearFull = percentage >= 90 && !isFull

                  return (
                    <div
                      key={pool.id}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: 'var(--surface-2)',
                        border: isFull
                          ? '1px solid var(--purple-light, #e0e7ff)'
                          : isNearFull
                          ? '1px solid #fcd34d'
                          : '1px solid var(--border-light)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{pool.groupEmail}</span>
                          {isFull ? (
                            <span style={{ fontSize: '11px', fontWeight: '800', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px' }}>
                              🔒 FULL (500/500)
                            </span>
                          ) : isNearFull ? (
                            <span style={{ fontSize: '11px', fontWeight: '800', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px' }}>
                              ⚠️ 90% FULL ({pool.currentCount}/{pool.maxCapacity})
                            </span>
                          ) : pool.isActive ? (
                            <span style={{ fontSize: '11px', fontWeight: '800', background: 'var(--success-light)', color: 'var(--success)', padding: '2px 8px', borderRadius: '12px' }}>
                              ✓ ACTIVE POOL
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: '800', background: 'var(--surface)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px' }}>
                              DISABLED
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            {pool.currentCount} / {pool.maxCapacity} members
                          </span>
                          <button
                            onClick={() => handleTogglePoolStatus(pool.id, pool.isActive)}
                            className="btn btn-sm"
                            style={{
                              fontSize: '11px',
                              background: pool.isActive ? 'var(--surface-3)' : 'var(--success-light)',
                              color: pool.isActive ? 'var(--text-muted)' : 'var(--success)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {pool.isActive ? 'Disable Pool' : 'Enable Pool'}
                          </button>
                        </div>
                      </div>

                      {/* Visual Capacity Bar */}
                      <div>
                        <div style={{ height: '10px', width: '100%', background: 'var(--surface)', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${percentage}%`,
                            background: isFull
                              ? 'linear-gradient(90deg, #6366f1, #4f46e5)'
                              : isNearFull
                              ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                              : 'linear-gradient(90deg, #10b981, #059669)',
                            borderRadius: '6px',
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <span>Capacity: {percentage}% filled</span>
                          <span>{pool.maxCapacity - pool.currentCount} slots remaining</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SYNC JOBS MONITOR */}
      {activeTab === 'jobs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Card */}
          <div className="card" style={{ overflow: 'hidden', maxWidth: '100%' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Google Sync Status</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Latest Google Group add/remove jobs for course enrollments and notification groups
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
            {jobs.length === 0 && !isLoadingJobs ? (
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
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{job.course?.name || job.courseId || (job.groupType === 'NOTIFICATION' ? 'Notification Pool' : 'Global')}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{job.groupType || 'COURSE'}</div>
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

          {/* Job Monitor Table */}
          <div className="card" style={{ overflow: 'hidden', maxWidth: '100%' }}>
            {isLoadingJobs ? (
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
                    disabled={isLoadingJobs}
                  >
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
                      <div>Course / Type</div>
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
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }} title={job.courseId || job.groupType}>
                            {job.courseId || (job.groupType === 'NOTIFICATION' ? 'NOTIFICATION' : 'GLOBAL')}
                          </div>
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
        </div>
      )}
    </div>
  )
}
