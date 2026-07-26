'use client'

import { useState } from 'react'
import useSWR from 'swr'

export default function GoogleSyncPage() {
  const [activeTab, setActiveTab] = useState<'pools' | 'jobs'>('pools')
  const [filters, setFilters] = useState({ status: '', action: '', page: 1 })
  const [refreshKey, setRefreshKey] = useState(0)

  // Category & Email Form State
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [isSubmittingCat, setIsSubmittingCat] = useState(false)

  const [selectedCatForEmail, setSelectedCatForEmail] = useState<string | null>(null)
  const [newGroupEmail, setNewGroupEmail] = useState('')
  const [newMaxCapacity, setNewMaxCapacity] = useState('500')
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false)

  const [poolMessage, setPoolMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Bulk Assignment Form State
  const [bulkCatSelect, setBulkCatSelect] = useState('')
  const [isBulkRunning, setIsBulkRunning] = useState(false)

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
  const [isResetting, setIsResetting] = useState(false)
  const [isRetryingFailed, setIsRetryingFailed] = useState(false)
  const [isProcessingSync, setIsProcessingSync] = useState(false)

  async function handleResetLock() {
    if (!confirm('Are you sure you want to reset the sync engine? Only do this if jobs have been stuck for more than 5 minutes.')) return

    setIsResetting(true)
    try {
      const res = await fetch('/api/google-sync/reset-lock', { method: 'POST' })
      const text = await res.text()
      let data: any = {}
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error('Server operation timed out or returned an HTML error. Please try refreshing.')
      }

      if (!res.ok) throw new Error(data.error || 'Failed to reset lock')

      setRefreshKey(prev => prev + 1)
      alert(data.message || 'Sync engine reset successfully. Background processing started.')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsResetting(false)
    }
  }

  async function handleRetryFailed() {
    if (!confirm('Are you sure you want to reset and retry all FAILED sync jobs? They will be re-queued with 0 attempts and rate-limited safely.')) return

    setIsRetryingFailed(true)
    try {
      const res = await fetch('/api/google-sync/retry-failed', { method: 'POST' })
      const text = await res.text()
      let data: any = {}
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error('Server operation timed out or returned an HTML error. Please try refreshing.')
      }

      if (!res.ok) throw new Error(data.error || 'Failed to retry failed jobs')

      setRefreshKey(prev => prev + 1)
      alert(data.message || 'Failed sync jobs successfully re-queued for processing!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsRetryingFailed(false)
    }
  }

  async function handleForceRunSyncEngine() {
    setIsProcessingSync(true)
    try {
      const res = await fetch('/api/google-sync/process?force=true', { method: 'POST' })
      const text = await res.text()
      let data: any = {}
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error('Server operation timed out or returned an HTML error. Please try refreshing.')
      }

      if (!res.ok) throw new Error(data.error || 'Failed to process sync batch')

      setRefreshKey(prev => prev + 1)
      mutatePools()
      alert(`Batch Processed! Processed ${data.processed || 0} jobs (${data.succeeded || 0} succeeded, ${data.failed || 0} failed). ${data.hasMore ? 'Remaining jobs are continuing in background.' : 'Queue complete!'}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessingSync(false)
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatName.trim()) return

    setIsSubmittingCat(true)
    setPoolMessage(null)

    try {
      const res = await fetch('/api/admin/notification-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_CATEGORY',
          name: newCatName.trim(),
          description: newCatDesc.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create Pool Group')

      setPoolMessage({ type: 'success', text: `Pool Group "${newCatName}" created successfully!` })
      setNewCatName('')
      setNewCatDesc('')
      mutatePools()
    } catch (err) {
      setPoolMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create Pool Group' })
    } finally {
      setIsSubmittingCat(false)
    }
  }

  async function handleAddEmailToCategory(categoryId: string, e: React.FormEvent) {
    e.preventDefault()
    if (!newGroupEmail.trim()) return

    setIsSubmittingEmail(true)
    setPoolMessage(null)

    try {
      const res = await fetch('/api/admin/notification-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_EMAIL_TO_CATEGORY',
          categoryId,
          groupEmail: newGroupEmail.trim().toLowerCase(),
          maxCapacity: parseInt(newMaxCapacity, 10) || 500,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add group email to pool')

      let msg = `Group email "${newGroupEmail}" added successfully!`
      if (data.flushResult && data.flushResult.assigned > 0) {
        msg += ` Automatically assigned ${data.flushResult.assigned} waiting user(s) to this group!`
      }

      setPoolMessage({ type: 'success', text: msg })
      setNewGroupEmail('')
      setSelectedCatForEmail(null)
      mutatePools()
      setRefreshKey(prev => prev + 1)
    } catch (err) {
      setPoolMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add group email' })
    } finally {
      setIsSubmittingEmail(false)
    }
  }

  async function handleToggleEmailStatus(emailId: string, currentStatus: boolean) {
    try {
      const res = await fetch('/api/admin/notification-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_EMAIL_STATUS',
          emailId,
          isActive: !currentStatus,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update status')
      }

      mutatePools()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  async function handleBulkAssign(categoryId?: string) {
    const catName = categories.find((c: any) => c.id === categoryId)?.name || 'Default Pool'
    if (!confirm(`Are you sure you want to assign Pool Group "${catName}" to EVERY registered user (preserving existing groups)?`)) return

    setIsBulkRunning(true)
    setPoolMessage(null)

    try {
      const res = await fetch('/api/admin/notification-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ASSIGN_ALL_CATEGORY',
          categoryId: categoryId || undefined,
        }),
      })

      const text = await res.text()
      let data: any = {}
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error('Server operation timed out or returned an HTML error. Please try refreshing.')
      }

      if (!res.ok) throw new Error(data.error || 'Failed to complete bulk assignment')

      setPoolMessage({
        type: 'success',
        text: `Bulk action completed! ${data.count || 0} users were processed for "${data.categoryName || catName}".`,
      })
      setBulkCatSelect('')
      mutatePools()
      setRefreshKey(prev => prev + 1)
    } catch (err) {
      setPoolMessage({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred' })
    } finally {
      setIsBulkRunning(false)
    }
  }

  const [isCleaning, setIsCleaning] = useState(false)

  async function handleCleanupDuplicates() {
    if (!confirm('Are you sure you want to clean up duplicate pool email assignments? This will ensure every student gets EXACTLY 1 email per Pool Group, free up filled spots, and redistribute pending users.')) return

    setIsCleaning(true)
    setPoolMessage(null)

    try {
      const res = await fetch('/api/admin/notification-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLEANUP_DUPLICATES' }),
      })

      const text = await res.text()
      let data: any = {}
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error('Server operation timed out or returned an HTML error. Please try refreshing.')
      }

      if (!res.ok) throw new Error(data.error || 'Failed to clean duplicates')

      setPoolMessage({
        type: 'success',
        text: data.message || `Successfully cleaned duplicate group emails!`,
      })
      mutatePools()
      setRefreshKey(prev => prev + 1)
    } catch (err) {
      setPoolMessage({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred' })
    } finally {
      setIsCleaning(false)
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

  const jobs = syncData?.jobs || []
  const pagination = syncData?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 }
  const categories = poolData?.categories || []
  const totalPendingGlobal = poolData?.totalPendingGlobal || 0
  const totalUsersCount = poolData?.totalUsersCount || 0
  const totalAssignedUsersCount = poolData?.totalAssignedUsersCount || 0
  const totalUnassignedUsersCount = poolData?.totalUnassignedUsersCount || 0
  const predictedGroupsNeeded = poolData?.predictedGroupsNeeded || 0

  const syncJobsPendingCount = syncData?.pendingCount || 0
  const syncJobsProcessingCount = syncData?.processingCount || 0
  const syncJobsFailedCount = syncData?.failedCount || 0
  const totalActiveQueueJobs = syncJobsPendingCount + syncJobsProcessingCount

  // ETA Calculation: ~1.5 sec rate-limited per Google Workspace API job
  const etaTotalSeconds = totalActiveQueueJobs * 1.5
  let formattedSyncETA = '0 sec (Queue clear)'
  if (totalActiveQueueJobs > 0) {
    if (etaTotalSeconds < 60) {
      formattedSyncETA = `~${Math.round(etaTotalSeconds)} sec`
    } else if (etaTotalSeconds < 3600) {
      formattedSyncETA = `~${Math.ceil(etaTotalSeconds / 60)} min(s)`
    } else {
      const hrs = Math.floor(etaTotalSeconds / 3600)
      const mins = Math.ceil((etaTotalSeconds % 3600) / 60)
      formattedSyncETA = `~${hrs} hr ${mins} min`
    }
  }

  return (
    <div className="page-container fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header & Tab Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Google Sync & Named Notification Pools</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Manage named pool categories, 500-member email limits, and monitor real-time Google Workspace sync jobs.</p>
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
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⚡ Sync Jobs Monitor
          </button>
        </div>
      </div>

      {/* TAB 1: NOTIFICATION GROUPS & POOLS */}
      {activeTab === 'pools' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Live Member Analytics & Prediction Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Registered Users
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                {totalUsersCount.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Active database accounts
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ✅ Assigned (At least 1 group)
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
                {totalAssignedUsersCount.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {totalUsersCount > 0 ? Math.round((totalAssignedUsersCount / totalUsersCount) * 100) : 0}% of total users covered
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: totalUnassignedUsersCount > 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⏳ Remaining (Unassigned)
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: totalUnassignedUsersCount > 0 ? '#f59e0b' : 'var(--text-primary)', marginTop: '4px' }}>
                {totalUnassignedUsersCount.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {totalUnassignedUsersCount > 0 ? 'Need pool assignment' : 'All users assigned!'}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', background: 'var(--primary-light, #e0e7ff)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--primary, #4338ca)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                💡 Prediction: Emails Needed
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary, #4338ca)', marginTop: '4px' }}>
                {predictedGroupsNeeded} <span style={{ fontSize: '14px', fontWeight: '700' }}>group email(s)</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--primary, #4338ca)', marginTop: '4px', opacity: 0.9 }}>
                Required for {totalUnassignedUsersCount} remaining users (500 max each)
              </div>
            </div>
          </div>

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

          {/* Top Form: Create New Pool Category */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>+ Create New Named Pool Group</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
              Create friendly Pool Group names (e.g. "General Announcements", "IITM Batch 2026"). You can assign users to this Pool name, and the system automatically fills its child emails up to 500 members.
            </p>
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1', minWidth: '220px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Pool Group Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. General Announcements"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: '1.5', minWidth: '280px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main announcement channel for registered students"
                  value={newCatDesc}
                  onChange={e => setNewCatDesc(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingCat || !newCatName.trim()}
                className="btn"
                style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', fontWeight: '700', padding: '10px 20px' }}
              >
                {isSubmittingCat ? 'Creating...' : '+ Create Pool Group'}
              </button>
            </form>
          </div>

          {/* Bulk Operations Panel */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Bulk Pool Assignment Tools</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Batch assign Pool Groups to all users in your database at once.
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {/* Option 1: Auto-distribute to Default Pool */}
              <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>1. Auto-distribute All Users to General Pool</div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
                    Automatically assigns every user to available emails in the default pool ("General Announcements"), filling them 500-by-500.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isBulkRunning || categories.length === 0}
                  onClick={() => handleBulkAssign()}
                  className="btn"
                  style={{ alignSelf: 'flex-start', background: 'var(--primary)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: '700' }}
                >
                  {isBulkRunning ? 'Processing...' : '⚡ Auto-distribute All Users'}
                </button>
              </div>

              {/* Option 2: Assign Secondary Custom Pool to Everyone (Excludes Default General Pool) */}
              <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>2. Assign Secondary Pool Group to Everyone</div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '8px' }}>
                    Assigns a custom secondary Pool Group to **ALL** users in the database (preserving existing groups).
                  </p>
                  
                  {(() => {
                    const secondaryCategories = categories.filter((c: any) => !c.isDefault && c.name !== 'General Announcements')
                    return (
                      <select
                        value={bulkCatSelect}
                        onChange={e => setBulkCatSelect(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                        disabled={isBulkRunning || secondaryCategories.length === 0}
                      >
                        <option value="">
                          {secondaryCategories.length === 0
                            ? '-- No custom secondary pools (General Pool auto-assigned above) --'
                            : '-- Select a Secondary Pool Group --'}
                        </option>
                        {secondaryCategories.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.totalAssigned} / {c.totalCapacity} members across {c.emails.length} emails)
                          </option>
                        ))}
                      </select>
                    )
                  })()}
                </div>
                <button
                  type="button"
                  disabled={isBulkRunning || !bulkCatSelect}
                  onClick={() => handleBulkAssign(bulkCatSelect)}
                  className="btn"
                  style={{ alignSelf: 'flex-start', background: 'var(--success)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: '700' }}
                >
                  {isBulkRunning ? 'Processing...' : '✉️ Assign Secondary Pool to Everyone'}
                </button>
              </div>

              {/* Option 3: Clean & Recalculate Duplicates */}
              <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>3. Clean & Recalculate Duplicates</div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
                    Ensures every student has EXACTLY 1 email per Pool Group, frees up held capacity, and redistributes pending users.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isCleaning}
                  onClick={handleCleanupDuplicates}
                  className="btn"
                  style={{ alignSelf: 'flex-start', background: 'var(--warning, #f59e0b)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: '700' }}
                >
                  {isCleaning ? 'Cleaning...' : '🧹 Clean & Fix Duplicates'}
                </button>
              </div>
            </div>
          </div>

          {/* Named Pool Groups List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Active Pool Groups & Email Limits</h3>
              <button
                onClick={() => mutatePools()}
                className="btn btn-sm btn-ghost"
                style={{ border: '1px solid var(--border)', fontSize: '12px' }}
              >
                🔄 Refresh Pools
              </button>
            </div>

            {isLoadingPools ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Pool Groups...</div>
            ) : categories.length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No Pool Groups created yet. Create your first Pool Group above!
              </div>
            ) : (
              categories.map((cat: any) => {
                const isAddingEmailToThis = selectedCatForEmail === cat.id

                return (
                  <div key={cat.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Category Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                            📂 {cat.name}
                          </h4>
                          {cat.isDefault && (
                            <span style={{ fontSize: '10px', fontWeight: '700', background: 'var(--primary-light, #e0e7ff)', color: 'var(--primary, #4338ca)', padding: '2px 8px', borderRadius: '12px' }}>
                              DEFAULT POOL
                            </span>
                          )}
                        </div>
                        {cat.description && (
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{cat.description}</p>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            {cat.totalAssigned} / {cat.totalCapacity} members
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {cat.emails.length} email(s) in pool • {cat.pendingCount} pending in queue
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedCatForEmail(isAddingEmailToThis ? null : cat.id)}
                          className="btn btn-sm"
                          style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', fontSize: '12px', fontWeight: '700' }}
                        >
                          {isAddingEmailToThis ? 'Cancel' : '+ Add Group Email'}
                        </button>
                      </div>
                    </div>

                    {/* Inline Form to Add Google Email to this Pool Category */}
                    {isAddingEmailToThis && (
                      <form onSubmit={e => handleAddEmailToCategory(cat.id, e)} style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '10px', border: '1px solid var(--primary-light)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1', minWidth: '240px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                            Google Group Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. notifications-group-1@genziitian.org"
                            value={newGroupEmail}
                            onChange={e => setNewGroupEmail(e.target.value)}
                            className="form-input"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div style={{ width: '120px' }}>
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
                          disabled={isSubmittingEmail || !newGroupEmail.trim()}
                          className="btn btn-sm"
                          style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', fontWeight: '700', padding: '10px 16px' }}
                        >
                          {isSubmittingEmail ? 'Saving...' : 'Add to Pool'}
                        </button>
                      </form>
                    )}

                    {/* Child Emails List inside Category */}
                    {cat.emails.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                        No Google Group emails added to this pool yet. Click <strong>+ Add Group Email</strong> above to add one (up to 500 members each).
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {cat.emails.map((email: any) => {
                          const percentage = email.percentage || 0
                          const isFull = email.isFull

                          return (
                            <div
                              key={email.id}
                              style={{
                                padding: '12px 16px',
                                borderRadius: '10px',
                                background: 'var(--surface-2)',
                                border: '1px solid var(--border-light)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    ✉️ {email.groupEmail}
                                  </span>
                                  {isFull ? (
                                    <span style={{ fontSize: '10px', fontWeight: '800', background: 'var(--danger-light)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '12px' }}>
                                      FULL (500/500)
                                    </span>
                                  ) : email.isActive ? (
                                    <span style={{ fontSize: '10px', fontWeight: '800', background: 'var(--success-light)', color: 'var(--success)', padding: '2px 8px', borderRadius: '12px' }}>
                                      ACTIVE POOL
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '10px', fontWeight: '800', background: 'var(--surface-3)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px' }}>
                                      DISABLED
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                    {email.currentCount} / {email.maxCapacity} members
                                  </span>
                                  <button
                                    onClick={() => handleToggleEmailStatus(email.id, email.isActive)}
                                    className="btn btn-sm"
                                    style={{
                                      fontSize: '11px',
                                      padding: '4px 10px',
                                      background: 'transparent',
                                      border: '1px solid var(--border)',
                                      color: email.isActive ? 'var(--danger)' : 'var(--success)',
                                    }}
                                  >
                                    {email.isActive ? 'Disable' : 'Enable'}
                                  </button>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div style={{ background: 'var(--surface)', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${percentage}%`,
                                    background: isFull ? 'var(--danger)' : 'var(--primary)',
                                    transition: 'width 0.3s ease',
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE GROUP SYNC JOBS MONITOR */}
      {activeTab === 'jobs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Live Pending Queue & ETA Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: totalActiveQueueJobs > 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⏳ Pending Jobs in Queue
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: totalActiveQueueJobs > 0 ? '#f59e0b' : 'var(--text-primary)', marginTop: '4px' }}>
                {totalActiveQueueJobs.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: '600' }}>jobs</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {totalActiveQueueJobs > 0 ? 'Queued background sync jobs' : 'Queue clear — all syncs complete!'}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', background: 'var(--primary-light, #e0e7ff)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--primary, #4338ca)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⏱️ Estimated Time to Finish (ETA)
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary, #4338ca)', marginTop: '4px' }}>
                {formattedSyncETA}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--primary, #4338ca)', marginTop: '4px', opacity: 0.9 }}>
                Based on ~1.5s rate-limited processing per Google API quota
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: syncJobsFailedCount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ❌ Failed Jobs
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: syncJobsFailedCount > 0 ? 'var(--danger)' : 'var(--text-primary)', marginTop: '4px' }}>
                {syncJobsFailedCount.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: '600' }}>jobs</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {syncJobsFailedCount > 0 ? 'Use "Retry All Failed Jobs" below' : 'Zero errors'}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
                className="form-input"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
              </select>

              <select
                value={filters.action}
                onChange={e => setFilters(f => ({ ...f, action: e.target.value, page: 1 }))}
                className="form-input"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <option value="">All Actions</option>
                <option value="ADD">ADD (Add Member)</option>
                <option value="REMOVE">REMOVE (Remove Member)</option>
              </select>

              <button
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="btn btn-sm btn-ghost"
                style={{ border: '1px solid var(--border)' }}
              >
                Refresh
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleForceRunSyncEngine}
                disabled={isProcessingSync}
                className="btn btn-sm"
                style={{ fontSize: '12px', background: 'var(--success, #10b981)', color: '#ffffff', border: 'none', fontWeight: '700' }}
              >
                {isProcessingSync ? 'Processing Batch...' : '▶️ Force Run Batch Now'}
              </button>
              <button
                onClick={handleRetryFailed}
                disabled={isRetryingFailed}
                className="btn btn-sm"
                style={{ fontSize: '12px', background: 'var(--primary)', color: '#ffffff', border: 'none', fontWeight: '700' }}
              >
                {isRetryingFailed ? 'Re-queueing...' : '🔄 Retry All Failed Jobs'}
              </button>
              <button
                onClick={handleResetLock}
                disabled={isResetting}
                className="btn btn-sm btn-outline-danger"
                style={{ fontSize: '12px' }}
              >
                {isResetting ? 'Resetting...' : '⚠️ Reset Sync Lock'}
              </button>
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            {isLoadingJobs ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading sync jobs...</div>
            ) : jobs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No sync jobs found.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: '700' }}>User Email</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700' }}>Group Email</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700' }}>Action</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700' }}>Attempts</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700' }}>Last Error</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700' }}>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job: any) => {
                      const errLabel = getErrorLabel(job.lastError)
                      return (
                        <tr key={job.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '600' }}>{job.userEmail}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{job.groupEmail}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              fontWeight: '700',
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: job.action === 'ADD' ? 'var(--success-light)' : 'var(--danger-light)',
                              color: job.action === 'ADD' ? 'var(--success)' : 'var(--danger)',
                            }}>
                              {job.action}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              fontWeight: '700',
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: job.status === 'SUCCESS' ? 'var(--success-light)' : job.status === 'FAILED' ? 'var(--danger-light)' : 'var(--surface-3)',
                              color: job.status === 'SUCCESS' ? 'var(--success)' : job.status === 'FAILED' ? 'var(--danger)' : 'var(--text-secondary)',
                            }}>
                              {job.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{job.attemptCount} / 5</td>
                          <td style={{ padding: '12px 16px', color: 'var(--danger)', fontSize: '11px' }}>
                            {errLabel ? (
                              <div style={{ fontWeight: '700', color: 'var(--danger)' }}>{errLabel}</div>
                            ) : null}
                            {job.lastError || '-'}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px' }}>
                            {new Date(job.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total jobs)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    disabled={filters.page <= 1}
                    onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                    className="btn btn-sm"
                    style={{ border: '1px solid var(--border)', fontSize: '12px' }}
                  >
                    Previous
                  </button>
                  <button
                    disabled={filters.page >= pagination.totalPages}
                    onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                    className="btn btn-sm"
                    style={{ border: '1px solid var(--border)', fontSize: '12px' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
