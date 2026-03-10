'use client'

import { useEffect, useState } from 'react'

interface ClassInfo {
  id: string
  name: string
  color: string
  subject?: string
}

interface Enrollment {
  classId: string
  class: ClassInfo
}

interface User {
  id: string
  name: string
  email: string
  role: string
  isTerminated: boolean
  createdAt: string
  enrollments?: Enrollment[]
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STUDENT', classIds: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
    loadClasses()
    loadUserRole()
  }, [])

  async function loadUserRole() {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUserRole(data.user?.role || '')
    } catch (e) {
      console.error(e)
    }
  }

  async function loadClasses() {
    try {
      const res = await fetch('/api/classes')
      const data = await res.json()
      setClasses(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data.users || data || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  function openCreate() {
    setEditId(null)
    setForm({ name: '', email: '', password: '', role: 'STUDENT', classIds: [] })
    setError('')
    setShowModal(true)
  }

  function openEdit(user: User) {
    setEditId(user.id)
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      classIds: user.enrollments?.map(e => e.classId) || [],
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name || !form.email) {
      setError('Name and email are required')
      return
    }
    if (!editId && !form.password) {
      setError('Password is required for new users')
      return
    }

    setSaving(true)
    setError('')
    try {
      const url = editId ? `/api/users/${editId}` : '/api/users'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: Record<string, any> = { name: form.name, email: form.email, role: form.role, classIds: form.classIds }
      if (form.password) body.password = form.password

      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save')
        setSaving(false)
        return
      }

      setShowModal(false)
      loadUsers()
    } catch (e) {
      setError('Something went wrong')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete')
        return
      }
      loadUsers()
    } catch (e) {
      console.error(e)
    }
  }

  async function handleToggleTerminate(user: User) {
    const action = user.isTerminated ? 'restore' : 'terminate'
    if (!confirm(`Are you sure you want to ${action} ${user.name}'s account?`)) return

    setTogglingId(user.id)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTerminated: !user.isTerminated }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u =>
          u.id === user.id ? { ...u, isTerminated: !u.isTerminated } : u
        ))
      } else {
        const data = await res.json()
        alert(data.error || `Failed to ${action} user`)
      }
    } catch (e) {
      console.error(e)
    }
    setTogglingId(null)
  }

  const roleColors: Record<string, { bg: string; color: string }> = {
    MANAGER: { bg: '#ede9fe', color: '#7c3aed' },
    ADMIN: { bg: '#dbeafe', color: '#3b82f6' },
    STUDENT: { bg: '#d1fae5', color: '#10b981' },
  }

  // Filter users based on current user role
  const visibleUsers = userRole === 'ADMIN' ? users : users
  const filtered = filter === 'all' ? visibleUsers : visibleUsers.filter(u => u.role === filter)

  const counts = {
    all: visibleUsers.length,
    MANAGER: visibleUsers.filter(u => u.role === 'MANAGER').length,
    ADMIN: visibleUsers.filter(u => u.role === 'ADMIN').length,
    STUDENT: visibleUsers.filter(u => u.role === 'STUDENT').length,
  }

  // For ADMIN users, only show role tabs visible to them
  const filterTabs = [
    { label: 'All Users', key: 'all', color: '#6366f1', bg: '#e0e7ff' },
    ...(userRole === 'MANAGER' ? [
      { label: 'Managers', key: 'MANAGER', color: '#7c3aed', bg: '#ede9fe' },
      { label: 'Admins', key: 'ADMIN', color: '#3b82f6', bg: '#dbeafe' },
    ] : []),
    { label: 'Students', key: 'STUDENT', color: '#10b981', bg: '#d1fae5' },
  ]

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <p className="page-subtitle">{visibleUsers.length} total accounts</p>
        <button onClick={openCreate} className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {userRole === 'ADMIN' ? 'Add Student' : 'Add User'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: '20px' }}>
        {filterTabs.map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className="card"
            style={{
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              cursor: 'pointer',
              border: filter === s.key ? `2px solid ${s.color}` : '1px solid #d8dae3',
              transition: 'all 0.15s',
              textAlign: 'left',
            }}
          >
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px', background: s.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color,
              fontSize: '18px', fontWeight: '700', flexShrink: 0,
            }}>
              {counts[s.key as keyof typeof counts]}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e1e3a' }}>{s.label}</div>
              <div style={{ fontSize: '11px', color: '#9999b0' }}>
                {s.key === 'all' ? 'Total registered' : `${s.label} role`}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Users List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0' }}>Loading users...</div>
        ) : (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(user => {
              const rc = roleColors[user.role] || roleColors.STUDENT
              const initials = user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div key={user.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 20px',
                  borderRadius: '50px',
                  background: user.isTerminated ? 'rgba(239,68,68,0.04)' : '#e8eaf0',
                  boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff',
                  transition: 'box-shadow 0.2s',
                  opacity: user.isTerminated ? 0.7 : 1,
                  flexWrap: 'wrap',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '8px 8px 16px #c2c4cc, -8px -8px 16px #ffffff')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff')}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', background: user.isTerminated ? '#fee2e2' : rc.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: user.isTerminated ? '#ef4444' : rc.color, fontSize: '13px', fontWeight: '600', flexShrink: 0,
                    boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e1e3a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {user.name}
                      {user.isTerminated && (
                        <span style={{
                          fontSize: '10px', fontWeight: '700', color: '#ef4444',
                          background: '#fee2e2', padding: '1px 8px', borderRadius: '20px',
                        }}>
                          TERMINATED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9999b0', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    {/* Class badges for ADMIN/STUDENT users */}
                    {(user.role === 'ADMIN' || user.role === 'STUDENT') && user.enrollments && user.enrollments.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {user.enrollments.slice(0, 3).map(e => (
                          <span key={e.classId} style={{
                            padding: '2px 8px', borderRadius: '50px', fontSize: '10px', fontWeight: '600',
                            background: e.class.color + '18', color: e.class.color,
                            whiteSpace: 'nowrap',
                          }}>
                            {e.class.name}
                          </span>
                        ))}
                        {user.enrollments.length > 3 && (
                          <span style={{ fontSize: '10px', color: '#9999b0', paddingTop: '2px' }}>+{user.enrollments.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="badge" style={{ background: rc.bg, color: rc.color, flexShrink: 0 }}>
                    {user.role}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9999b0', flexShrink: 0, minWidth: '90px', textAlign: 'right' }}>
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => openEdit(user)} className="btn btn-ghost btn-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    {/* Terminate / Revert toggle - only for MANAGER or ADMIN's own students */}
                    {user.role === 'STUDENT' && (userRole === 'MANAGER' || userRole === 'ADMIN') && (
                      <button
                        onClick={() => handleToggleTerminate(user)}
                        disabled={togglingId === user.id}
                        className="btn btn-sm"
                        style={{
                          color: user.isTerminated ? '#10b981' : '#ef4444',
                          border: user.isTerminated ? '1px solid #d1fae5' : '1px solid #fee2e2',
                          background: user.isTerminated ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
                          minWidth: '90px',
                        }}
                      >
                        {togglingId === user.id ? (
                          <svg className="spinner" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                            <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/>
                          </svg>
                        ) : user.isTerminated ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="1 4 1 10 7 10"/>
                              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                            </svg>
                            Revert
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="15" y1="9" x2="9" y2="15"/>
                              <line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                            Terminate
                          </>
                        )}
                      </button>
                    )}
                    {/* Delete - only for MANAGER */}
                    {userRole === 'MANAGER' && (
                      <button onClick={() => handleDelete(user.id)} className="btn btn-sm" style={{ color: '#ef4444', border: '1px solid #fee2e2' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9999b0' }}>No users found</div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                {editId ? 'Edit User' : 'Create New User'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ color: '#9999b0', cursor: 'pointer', background: 'none', border: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
              {error && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                  {error}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="john@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">{editId ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                <input type="password" className="form-input" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder={editId ? 'Leave blank to keep' : 'Enter password'} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                {userRole === 'MANAGER' ? (
                  <select className="form-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="STUDENT">Student</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                ) : (
                  <input className="form-input" value="STUDENT" disabled style={{ opacity: 0.6 }} />
                )}
              </div>
              {/* Class assignment for ADMIN or STUDENT roles */}
              {(form.role === 'ADMIN' || form.role === 'STUDENT') && (
                <div className="form-group">
                  <label className="form-label">Assigned {form.role === 'ADMIN' ? 'Subject' : 'Subject'} Classes</label>
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    maxHeight: '200px', overflowY: 'auto',
                    padding: '10px', borderRadius: '8px',
                    background: '#f3f4f6', border: '1px solid #e5e7eb',
                  }}>
                    {classes.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#9999b0' }}>No classes available</span>
                    ) : (
                      classes.map(cls => (
                        <label key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={form.classIds.includes(cls.id)}
                            onChange={e => {
                              setForm(p => ({
                                ...p,
                                classIds: e.target.checked
                                  ? [...p.classIds, cls.id]
                                  : p.classIds.filter(id => id !== cls.id)
                              }))
                            }}
                          />
                          <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: cls.color, flexShrink: 0,
                          }} />
                          <span style={{ fontSize: '13px' }}>{cls.name}</span>
                          {cls.subject && (
                            <span style={{ fontSize: '11px', color: '#9999b0' }}>({cls.subject})</span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : (editId ? 'Update User' : 'Create User')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
