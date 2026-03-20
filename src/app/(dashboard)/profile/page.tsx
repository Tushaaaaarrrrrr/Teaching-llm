'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
  securityNumber: string | null
  createdAt: string
  isCalendarLinked?: boolean
}

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [editName, setEditName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState({ type: '', text: '' })

  const [showSecurityNumber, setShowSecurityNumber] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    try {
      const res = await fetch('/api/profile')
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        setEditName(data.user.name)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function handleSaveName() {
    if (!editName.trim()) { setNameMsg({ type: 'error', text: 'Name cannot be empty' }); return }
    if (editName.trim() === user?.name) { setNameMsg({ type: 'info', text: 'No changes to save' }); return }
    setSavingName(true)
    setNameMsg({ type: '', text: '' })
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setUser(prev => prev ? { ...prev, name: data.user.name } : prev)
        setNameMsg({ type: 'success', text: 'Name updated successfully' })
      } else {
        setNameMsg({ type: 'error', text: data.error || 'Failed to update' })
      }
    } catch { setNameMsg({ type: 'error', text: 'Something went wrong' }) }
    setSavingName(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      alert('Please upload a JPEG, PNG, GIF, or WebP image'); return
    }
    if (file.size > 5 * 1024 * 1024) { alert('File too large. Maximum 5MB'); return }
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) setUser(prev => prev ? { ...prev, avatar: data.avatar } : prev)
      else alert(data.error || 'Failed to upload avatar')
    } catch { alert('Upload failed') }
    setUploadingAvatar(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDiscard() {
    if (user) setEditName(user.name)
    setNameMsg({ type: '', text: '' })
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const roleLabel = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : ''

  const insetRow: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px', borderRadius: '14px', background: '#e8eaf0',
    boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
    gap: '16px',
  }

  if (loading) {
    return (
      <div className="page-container fade-in">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: '#9999b0' }}>
          Loading profile...
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page-container fade-in">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: '#9999b0' }}>
          Unable to load profile
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Back ── */}
        <div>
          <button
            onClick={() => router.back()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '50px',
              background: '#e8eaf0', border: 'none', cursor: 'pointer',
              boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
              fontSize: '13px', fontWeight: '600', color: '#6b6b8a',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3636e8' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b6b8a' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        </div>

        {/* ── Profile Card ── */}
        <div className="card" style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              title="Click to change photo"
              style={{
                width: '100px', height: '100px', borderRadius: '50%',
                background: user.avatar ? 'transparent' : '#e8eaf0',
                boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', cursor: 'pointer',
              }}
            >
              {user.avatar
                ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '32px', fontWeight: '800', color: '#3636e8' }}>{initials}</span>
              }
            </div>
            {/* Camera badge */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute', bottom: '2px', right: '2px',
                width: '30px', height: '30px', borderRadius: '50%',
                background: '#3636e8', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
                boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            {uploadingAvatar && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg className="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
              </div>
            )}
          </div>

          {/* User info */}
          <div style={{ flex: 1, minWidth: '180px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1e1e3a', marginBottom: '4px' }}>{user.name}</h2>
            <p style={{ fontSize: '14px', color: '#9999b0', marginBottom: '10px' }}>{user.email}</p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge" style={{
                background: user.role === 'MANAGER' ? '#ede9fe' : user.role === 'ADMIN' ? '#dbeafe' : '#d1fae5',
                color: user.role === 'MANAGER' ? '#7c3aed' : user.role === 'ADMIN' ? '#3b82f6' : '#10b981',
                padding: '4px 12px', fontSize: '12px',
              }}>
                {roleLabel}
              </span>
              <span style={{ fontSize: '12px', color: '#9999b0' }}>
                Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost" style={{ flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Change Photo
          </button>
        </div>

        {/* ── Personal Information + Account Details (side by side) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* ── Personal Information ── */}
          <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e1e3a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Personal Information
            </h3>

            {nameMsg.text && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '14px',
                background: nameMsg.type === 'success' ? '#d1fae5' : nameMsg.type === 'error' ? '#fee2e2' : '#dbeafe',
                color: nameMsg.type === 'success' ? '#065f46' : nameMsg.type === 'error' ? '#991b1b' : '#1e40af',
              }}>
                {nameMsg.text}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Enter your name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" value={user.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                <span style={{ fontSize: '11px', color: '#9999b0' }}>Email cannot be changed. Contact admin for updates.</span>
              </div>
            </div>
          </div>

          {/* ── Account Details ── */}
          <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e1e3a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              Account Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>

              {/* Security Number with eye toggle */}
              <div style={insetRow}>
                <span style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: '500' }}>Security Number</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '13px', color: '#1e1e3a', fontWeight: '600',
                    fontFamily: 'monospace', letterSpacing: showSecurityNumber ? '0.5px' : '3px',
                  }}>
                    {user.securityNumber
                      ? (showSecurityNumber ? user.securityNumber : '••••••••')
                      : 'N/A'
                    }
                  </span>
                  {user.securityNumber && (
                    <button
                      type="button"
                      onClick={() => setShowSecurityNumber(v => !v)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9999b0', display: 'flex', padding: '2px' }}
                    >
                      {showSecurityNumber ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  )}
                </div>
              </div>

              {/* Role */}
              <div style={insetRow}>
                <span style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: '500' }}>Role</span>
                <span className="badge" style={{
                  background: user.role === 'MANAGER' ? '#ede9fe' : user.role === 'ADMIN' ? '#dbeafe' : '#d1fae5',
                  color: user.role === 'MANAGER' ? '#7c3aed' : user.role === 'ADMIN' ? '#3b82f6' : '#10b981',
                  fontSize: '12px',
                }}>
                  {roleLabel}
                </span>
              </div>

              {/* Member Since */}
              <div style={insetRow}>
                <span style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: '500' }}>Member Since</span>
                <span style={{ fontSize: '13px', color: '#1e1e3a', fontWeight: '600' }}>
                  {new Date(user.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* ── Bottom Action Bar ── */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '12px',
          padding: '20px 24px', borderRadius: '20px', background: '#e8eaf0',
          boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff',
        }}>
          <button onClick={handleDiscard} className="btn btn-ghost">
            Discard Changes
          </button>
          <button onClick={handleSaveName} disabled={savingName} className="btn btn-primary">
            {savingName ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  )
}
