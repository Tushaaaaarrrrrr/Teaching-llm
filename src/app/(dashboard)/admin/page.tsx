'use client'

import { useEffect, useState } from 'react'

interface CourseInfo {
  id: string
  name: string
  color: string
  subject?: string
}

interface Enrollment {
  courseId: string
  course: CourseInfo
}

interface InstructorAssignment {
  courseId: string
  course: CourseInfo
}

interface User {
  id: string
  name: string
  email: string
  role: string
  isTerminated: boolean
  canTerminate: boolean
  gender?: string
  securityNumber?: string | null
  createdAt: string
  enrollments?: Enrollment[]
  instructorAssignments?: InstructorAssignment[]
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [courses, setCourses] = useState<CourseInfo[]>([])
  const [userRole, setUserRole] = useState('')
  const [userPermissions, setUserPermissions] = useState({ canTerminate: false, canCreateStudents: false })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ 
    name: '', email: '', password: '', role: 'STUDENT', gender: 'MALE',
    courseIds: [] as string[], assignedCourseIds: [] as string[], 
    canTerminate: false, canCreateStudents: false 
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
    loadCourses()
    loadUserRole()
  }, [])

  async function loadUserRole() {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUserRole(data.user?.role || '')
      setUserPermissions({
        canTerminate: data.user?.canTerminate || false,
        canCreateStudents: data.user?.canCreateStudents || false,
      })
    } catch (e) {
      console.error(e)
    }
  }

  async function loadCourses() {
    try {
      const res = await fetch('/api/courses')
      const data = await res.json()
      setCourses(data || [])
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
    setForm({ 
      name: '', email: '', password: '', role: 'STUDENT', gender: 'MALE',
      courseIds: [], assignedCourseIds: [], 
      canTerminate: false, canCreateStudents: false 
    })
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
      gender: user.gender || 'MALE',
      courseIds: user.enrollments?.map(e => e.courseId) || [],
      assignedCourseIds: user.instructorAssignments?.map(a => a.courseId) || [],
      canTerminate: (user as any).canTerminate || false,
      canCreateStudents: (user as any).canCreateStudents || false,
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
      const body: Record<string, any> = { 
        name: form.name, email: form.email, role: form.role, gender: form.gender,
        courseIds: form.courseIds,
        canTerminate: form.canTerminate,
        canCreateStudents: form.canCreateStudents
      }
      if (form.password) body.password = form.password
      if (form.role === 'INSTRUCTOR') body.assignedCourseIds = form.assignedCourseIds

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
    INSTRUCTOR: { bg: '#fef3c7', color: '#d97706' },
    STUDENT: { bg: '#d1fae5', color: '#10b981' },
  }

  // Filter users based on current user role
  const visibleUsers = userRole === 'ADMIN' ? users : users
  const filtered = filter === 'all' ? visibleUsers : visibleUsers.filter(u => u.role === filter)

  const counts = {
    all: visibleUsers.length,
    MANAGER: visibleUsers.filter(u => u.role === 'MANAGER').length,
    ADMIN: visibleUsers.filter(u => u.role === 'ADMIN').length,
    INSTRUCTOR: visibleUsers.filter(u => u.role === 'INSTRUCTOR').length,
    STUDENT: visibleUsers.filter(u => u.role === 'STUDENT').length,
  }

  // For ADMIN users, only show role tabs visible to them
  const filterTabs = [
    { label: 'All Users', key: 'all', color: '#6366f1', bg: '#e0e7ff' },
    ...(userRole === 'MANAGER' ? [
      { label: 'Managers', key: 'MANAGER', color: '#7c3aed', bg: '#ede9fe' },
      { label: 'Admins', key: 'ADMIN', color: '#3b82f6', bg: '#dbeafe' },
      { label: 'Instructors', key: 'INSTRUCTOR', color: '#d97706', bg: '#fef3c7' },
    ] : []),
    { label: 'Students', key: 'STUDENT', color: '#10b981', bg: '#d1fae5' },
  ]

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <p className="page-subtitle">{visibleUsers.length} total accounts</p>
        {(userRole === 'MANAGER' || (userRole === 'ADMIN' && userPermissions.canCreateStudents)) && (
          <button onClick={openCreate} className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {userRole === 'ADMIN' ? 'Add Student' : 'Add User'}
          </button>
        )}
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
                      {user.gender && (
                        <span style={{ fontSize: '10px', color: '#9999b0', fontWeight: '400' }}>({user.gender})</span>
                      )}
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
                    {/* Course badges for ADMIN/STUDENT users */}
                    {(user.role === 'ADMIN' || user.role === 'STUDENT') && user.enrollments && user.enrollments.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {user.enrollments.slice(0, 3).map(e => (
                          <span key={e.courseId} style={{
                            padding: '2px 8px', borderRadius: '50px', fontSize: '10px', fontWeight: '600',
                            background: e.course.color + '18', color: e.course.color,
                            whiteSpace: 'nowrap',
                          }}>
                            {e.course.name}
                          </span>
                        ))}
                        {user.enrollments.length > 3 && (
                          <span style={{ fontSize: '10px', color: '#9999b0', paddingTop: '2px' }}>+{user.enrollments.length - 3}</span>
                        )}
                      </div>
                    )}
                    {/* Assigned subjects for INSTRUCTOR users */}
                    {user.role === 'INSTRUCTOR' && user.instructorAssignments && user.instructorAssignments.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {user.instructorAssignments.slice(0, 3).map(a => (
                          <span key={a.courseId} style={{
                            padding: '2px 8px', borderRadius: '50px', fontSize: '10px', fontWeight: '600',
                            background: a.course.color + '18', color: a.course.color,
                            whiteSpace: 'nowrap',
                          }}>
                            {a.course.name}
                          </span>
                        ))}
                        {user.instructorAssignments.length > 3 && (
                          <span style={{ fontSize: '10px', color: '#9999b0', paddingTop: '2px' }}>+{user.instructorAssignments.length - 3}</span>
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
                    {/* Terminate / Revert toggle - based on MANAGER or ADMIN with canTerminate */}
                    {user.role === 'STUDENT' && (userRole === 'MANAGER' || (userRole === 'ADMIN' && userPermissions.canTerminate)) && (
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
                    {/* Delete - only for MANAGER or privileged ADMIN */}
                    {(userRole === 'MANAGER' || (userRole === 'ADMIN' && userPermissions.canTerminate && user.role === 'STUDENT')) && (
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
                  <select className="form-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value, courseIds: [], assignedCourseIds: [] }))}>
                    <option value="STUDENT">Student</option>
                    <option value="ADMIN">Admin</option>
                    <option value="INSTRUCTOR">Instructor</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                ) : (
                  <input className="form-input" value="STUDENT" disabled style={{ opacity: 0.6 }} />
                )}
              </div>

              {!editId && (
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input 
                        type="radio" 
                        name="gender" 
                        value="MALE" 
                        checked={form.gender === 'MALE'} 
                        onChange={() => setForm(p => ({ ...p, gender: 'MALE' }))} 
                      />
                      Male
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input 
                        type="radio" 
                        name="gender" 
                        value="FEMALE" 
                        checked={form.gender === 'FEMALE'} 
                        onChange={() => setForm(p => ({ ...p, gender: 'FEMALE' }))} 
                      />
                      Female
                    </label>
                  </div>
                </div>
              )}
              
              {/* Granular Permissions (MANAGER ONLY for ADMIN/INSTRUCTOR roles) */}
              {userRole === 'MANAGER' && (form.role === 'ADMIN' || form.role === 'INSTRUCTOR') && (
                <div style={{
                  background: '#f9fafb', padding: '12px', borderRadius: '10px',
                  border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '2px' }}>GRANULAR PERMISSIONS</div>
                  
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ fontSize: '13px', color: '#4b5563' }}>Allow User Termination</span>
                    <div style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
                      <input 
                        type="checkbox" 
                        style={{ opacity: 0, width: 0, height: 0 }} 
                        checked={form.canTerminate}
                        onChange={e => setForm(p => ({ ...p, canTerminate: e.target.checked }))}
                      />
                      <span style={{
                        position: 'absolute', cursor: 'pointer', inset: 0,
                        backgroundColor: form.canTerminate ? '#3b82f6' : '#d1d5db',
                        borderRadius: '34px', transition: '.2s'
                      }}>
                        <span style={{
                          position: 'absolute', content: '""', height: '14px', width: '14px',
                          left: form.canTerminate ? '18px' : '3px', bottom: '3px',
                          backgroundColor: 'white', borderRadius: '50%', transition: '.2s'
                        }} />
                      </span>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ fontSize: '13px', color: '#4b5563' }}>Allow Student Creation</span>
                    <div style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
                      <input 
                        type="checkbox" 
                        style={{ opacity: 0, width: 0, height: 0 }} 
                        checked={form.canCreateStudents}
                        onChange={e => setForm(p => ({ ...p, canCreateStudents: e.target.checked }))}
                      />
                      <span style={{
                        position: 'absolute', cursor: 'pointer', inset: 0,
                        backgroundColor: form.canCreateStudents ? '#3b82f6' : '#d1d5db',
                        borderRadius: '34px', transition: '.2s'
                      }}>
                        <span style={{
                          position: 'absolute', content: '""', height: '14px', width: '14px',
                          left: form.canCreateStudents ? '18px' : '3px', bottom: '3px',
                          backgroundColor: 'white', borderRadius: '50%', transition: '.2s'
                        }} />
                      </span>
                    </div>
                  </label>
                </div>
              )}
              {/* Course assignment for ADMIN or STUDENT roles */}
              {(form.role === 'ADMIN' || form.role === 'STUDENT') && (
                <div className="form-group">
                  <label className="form-label">Assigned Subject Courses</label>
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    maxHeight: '200px', overflowY: 'auto',
                    padding: '10px', borderRadius: '8px',
                    background: '#f3f4f6', border: '1px solid #e5e7eb',
                  }}>
                    {courses.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#9999b0' }}>No courses available</span>
                    ) : (
                      courses.map(cls => (
                        <label key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={form.courseIds.includes(cls.id)}
                            onChange={e => {
                              setForm(p => ({
                                ...p,
                                courseIds: e.target.checked
                                  ? [...p.courseIds, cls.id]
                                  : p.courseIds.filter(id => id !== cls.id)
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
              {/* Subject assignment for INSTRUCTOR role */}
              {form.role === 'INSTRUCTOR' && userRole === 'MANAGER' && (
                <div className="form-group">
                  <label className="form-label">Assigned Subjects / Courses</label>
                  <p style={{ fontSize: '11px', color: '#9999b0', marginBottom: '6px' }}>
                    Select the subjects this instructor can manage content for.
                  </p>
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    maxHeight: '200px', overflowY: 'auto',
                    padding: '10px', borderRadius: '8px',
                    background: '#f3f4f6', border: '1px solid #e5e7eb',
                  }}>
                    {courses.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#9999b0' }}>No courses available</span>
                    ) : (
                      courses.map(cls => (
                        <label key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={form.assignedCourseIds.includes(cls.id)}
                            onChange={e => {
                              setForm(p => ({
                                ...p,
                                assignedCourseIds: e.target.checked
                                  ? [...p.assignedCourseIds, cls.id]
                                  : p.assignedCourseIds.filter(id => id !== cls.id)
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
