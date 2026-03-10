'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STUDENT' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data.users || data || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  function openCreate() {
    setEditId(null)
    setForm({ name: '', email: '', password: '', role: 'STUDENT' })
    setError('')
    setShowModal(true)
  }

  function openEdit(user: User) {
    setEditId(user.id)
    setForm({ name: user.name, email: user.email, password: '', role: user.role })
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
      const body: Record<string, string> = { name: form.name, email: form.email, role: form.role }
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

  const roleColors: Record<string, { bg: string; color: string }> = {
    MANAGER: { bg: '#ede9fe', color: '#7c3aed' },
    ADMIN: { bg: '#dbeafe', color: '#3b82f6' },
    STUDENT: { bg: '#d1fae5', color: '#10b981' },
  }

  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter)

  const counts = {
    all: users.length,
    MANAGER: users.filter(u => u.role === 'MANAGER').length,
    ADMIN: users.filter(u => u.role === 'ADMIN').length,
    STUDENT: users.filter(u => u.role === 'STUDENT').length,
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <p className="page-subtitle">{users.length} total accounts</p>
        <button onClick={openCreate} className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: '20px' }}>
        {[
          { label: 'All Users', key: 'all', color: '#6366f1', bg: '#e0e7ff' },
          { label: 'Managers', key: 'MANAGER', color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Admins', key: 'ADMIN', color: '#3b82f6', bg: '#dbeafe' },
          { label: 'Students', key: 'STUDENT', color: '#10b981', bg: '#d1fae5' },
        ].map(s => (
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
                  background: '#e8eaf0',
                  boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '8px 8px 16px #c2c4cc, -8px -8px 16px #ffffff')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff')}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', background: rc.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: rc.color, fontSize: '13px', fontWeight: '600', flexShrink: 0,
                    boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e1e3a' }}>{user.name}</div>
                    <div style={{ fontSize: '12px', color: '#9999b0', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
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
                    <button onClick={() => handleDelete(user.id)} className="btn btn-sm" style={{ color: '#ef4444', border: '1px solid #fee2e2' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
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
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                <select className="form-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="STUDENT">Student</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
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
