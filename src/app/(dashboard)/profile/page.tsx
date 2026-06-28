'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getDefaultAvatar } from '@/lib/avatar'
import Cropper from 'react-easy-crop'

// Helper to extract cropped image blob
async function getCroppedImg(imageSrc: string, pixelCrop: any, fileType: string): Promise<Blob> {
  const image = new Image()
  image.src = imageSrc
  await new Promise(resolve => { image.onload = resolve })

  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('No 2d context')

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Canvas is empty')); return }
      resolve(blob)
    }, fileType, 0.9)
  })
}

interface UserProfile {
  id: string
  name: string
  firstName?: string | null
  lastName?: string | null
  mobileNumber?: string | null
  email: string
  role: string
  avatar: string | null
  gender?: string | null
  genderChangedAt?: string | null
  age?: number | null
  state?: string | null
  isIdentityUpdated?: boolean
  iitmJoinYear?: string | null
  iitmJoinMonth?: string | null
  iitmLevel?: string | null
  iitmUserType?: string | null
  securityNumber: string | null
  createdAt: string
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

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)
  useEffect(() => {
    setIsMobile(window.innerWidth <= 768)
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editMobile, setEditMobile] = useState('')
  const [editGender, setEditGender] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editState, setEditState] = useState('')
  const [saving, setSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })

  const [showSecurityNumber, setShowSecurityNumber] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Cropper State
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [selectedFileType, setSelectedFileType] = useState('image/png')
  const [selectedFileName, setSelectedFileName] = useState('avatar.png')

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    try {
      const res = await fetch('/api/profile')
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        setEditFirstName(data.user.firstName || data.user.name.split(' ')[0] || '')
        setEditLastName(data.user.lastName || data.user.name.split(' ').slice(1).join(' ') || '')
        setEditMobile(data.user.mobileNumber || '')
        setEditGender(data.user.gender || 'MALE')
        setEditAge(data.user.age?.toString() || '')
        setEditState(data.user.state || '')
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function handleSaveProfile() {
    if (!editFirstName.trim()) { setProfileMsg({ type: 'error', text: 'First name cannot be empty' }); return }
    setSaving(true)
    setProfileMsg({ type: '', text: '' })
    try {
      const payload: any = { 
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        mobileNumber: editMobile.trim(),
        age: editAge ? parseInt(editAge, 10) : null,
        state: editState.trim(),
      }
      
      // Include gender if it hasn't been changed yet
      if (!user?.genderChangedAt) {
        payload.gender = editGender
      }
      
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setUser(data.user)
        setProfileMsg({ type: 'success', text: 'Profile updated successfully' })
      } else {
        setProfileMsg({ type: 'error', text: data.error || 'Failed to update' })
      }
    } catch { setProfileMsg({ type: 'error', text: 'Something went wrong' }) }
    setSaving(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      alert('Please upload a JPEG, PNG, GIF, or WebP image'); return
    }
    if (file.size > 10 * 1024 * 1024) { alert('File too large. Maximum 10MB'); return }
    
    setSelectedFileType(file.type)
    setSelectedFileName(file.name)

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setImageSrc(reader.result?.toString() || null)
    })
    reader.readAsDataURL(file)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  async function uploadCroppedImage() {
    if (!imageSrc || !croppedAreaPixels) return

    setUploadingAvatar(true)
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, selectedFileType)
      const file = new File([croppedBlob], selectedFileName, { type: selectedFileType })
      
      const formData = new FormData()
      formData.append('avatar', file)
      
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setUser(prev => prev ? { ...prev, avatar: data.avatar } : prev)
        setImageSrc(null)
      } else {
        alert(data.error || 'Failed to upload avatar')
      }
    } catch {
      alert('Upload failed')
    }
    setUploadingAvatar(false)
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true)
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' })
      if (res.ok) {
        setUser(prev => prev ? { ...prev, avatar: null } : prev)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to remove avatar')
      }
    } catch {
      alert('Remove failed')
    }
    setUploadingAvatar(false)
  }

  function handleDiscard() {
    if (user) {
      setEditFirstName(user.firstName || user.name.split(' ')[0] || '')
      setEditLastName(user.lastName || user.name.split(' ').slice(1).join(' ') || '')
      setEditMobile(user.mobileNumber || '')
      setEditGender(user.gender || 'MALE')
      setEditAge(user.age?.toString() || '')
      setEditState(user.state || '')
    }
    setProfileMsg({ type: '', text: '' })
  }

  const initials = (user?.firstName?.[0] || user?.name?.[0] || '?') + (user?.lastName?.[0] || user?.name?.split(' ')[1]?.[0] || '')
  const roleLabel = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : ''
  const resolvedAvatar = user?.avatar || getDefaultAvatar(user?.gender)

  const insetRow: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: isMobile ? '10px 14px' : '14px 18px', borderRadius: '14px', background: 'var(--surface-2)',
    boxShadow: 'inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)',
    gap: '16px',
  }

  if (loading) {
    return (
      <div className="page-container fade-in">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: 'var(--text-muted)' }}>
          Loading profile...
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page-container fade-in">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: 'var(--text-muted)' }}>
          Unable to load profile
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in mobile-profile-page" style={{ padding: isMobile ? '12px' : '20px', paddingBottom: '24px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Back ── */}
        <div>
          <button
            onClick={() => router.back()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '50px',
              background: 'var(--surface-2)', border: 'none', cursor: 'pointer',
              boxShadow: '4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)',
              fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        </div>

        {/* ── Profile Card ── */}
        <div className="card" style={{ padding: isMobile ? '20px' : '32px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: isMobile ? '20px' : '28px', textAlign: isMobile ? 'center' : 'left' }}>
          {/* Avatar — display only; predefined male/female avatar based on gender */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: '100px', height: '100px', borderRadius: '50%',
                background: 'transparent',
                boxShadow: '6px 6px 12px var(--neu-dark), -6px -6px 12px var(--neu-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img src={resolvedAvatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>

          {/* User info */}
          <div style={{ flex: 1, minWidth: '180px', width: isMobile ? '100%' : 'auto' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{user.name}</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>{user.email}</p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <span className="badge" style={{
                background: user.role === 'MANAGER' ? 'var(--primary-light)' : user.role === 'ADMIN' ? 'var(--info-light)' : 'var(--success-light)',
                color: user.role === 'MANAGER' ? 'var(--accent)' : user.role === 'ADMIN' ? 'var(--info)' : 'var(--success)',
                padding: '4px 12px', fontSize: '12px',
              }}>
                {roleLabel}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Profile-pic change disabled — predefined avatars only */}
        </div>


        {/* ── Personal Information + Account Details (side by side) ── */}
        <div className="responsive-two-column-grid">

          {/* ── Personal Information ── */}
          <div className="card" style={{ padding: isMobile ? '16px' : '28px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Personal Information
            </h3>

            {profileMsg.text && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '14px',
                background: profileMsg.type === 'success' ? 'var(--success-light)' : profileMsg.type === 'error' ? 'var(--danger-light)' : 'var(--info-light)',
                color: profileMsg.type === 'success' ? '#065f46' : profileMsg.type === 'error' ? 'var(--danger)' : 'var(--info)',
              }}>
                {profileMsg.text}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
              {/* Name — editable */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '10px' : '16px' }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input className="form-input" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} placeholder="First Name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" value={editLastName} onChange={e => setEditLastName(e.target.value)} placeholder="Last Name" />
                </div>
              </div>

              {/* Gender + Age — side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '10px' : '12px' }}>
                {/* Gender */}
                <div style={{ ...insetRow, flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Gender</span>
                  {user.role === 'MANAGER' ? (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {['MALE', 'FEMALE', 'OTHER'].map(g => (
                        <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          <input type="radio" name="gender" value={g} checked={editGender === g} onChange={e => setEditGender(e.target.value)} style={{ cursor: 'pointer' }} />
                          {g.charAt(0) + g.slice(1).toLowerCase()}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>
                      {user.gender ? (user.gender.charAt(0) + user.gender.slice(1).toLowerCase()) : '—'}
                    </span>
                  )}
                </div>

                {/* Age */}
                <div style={{ ...insetRow, flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Age</span>
                  {user.role === 'MANAGER' ? (
                    <input
                      type="number"
                      className="form-input"
                      value={editAge}
                      onChange={e => setEditAge(e.target.value)}
                      placeholder="Age"
                      style={{ background: 'transparent', padding: '0', border: 'none', borderBottom: '2px solid rgba(0,0,0,0.1)', borderRadius: 0, width: '60px', fontSize: '14px', fontWeight: '600' }}
                    />
                  ) : (
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>{user.age ?? '—'}</span>
                  )}
                </div>
              </div>

              {/* State — read-only for students */}
              <div style={insetRow}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>State / Territory</span>
                {user.role === 'MANAGER' ? (
                  <input
                    type="text"
                    className="form-input"
                    value={editState}
                    onChange={e => setEditState(e.target.value)}
                    placeholder="State"
                    style={{ background: 'transparent', padding: '4px 0', border: 'none', borderBottom: '2px solid rgba(0,0,0,0.1)', borderRadius: 0, width: '140px', fontSize: '14px', fontWeight: '600', textAlign: 'right' }}
                  />
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>{user.state || '—'}</span>
                )}
              </div>

              {/* IITM Join Cohort — Read-only for all */}
              <div style={insetRow}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>IITM Join Cohort</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>
                  {user.iitmJoinYear && user.iitmJoinMonth ? `${user.iitmJoinMonth} ${user.iitmJoinYear}` : '—'}
                </span>
              </div>

              {/* IITM Level — Read-only for all */}
              <div style={insetRow}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>IITM Level</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>{user.iitmLevel || '—'}</span>
              </div>

              {/* IITM Student Type — Read-only for all */}
              <div style={insetRow}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>IITM Category</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>{user.iitmUserType || '—'}</span>
              </div>

              {/* Notice for non-managers */}
              {user.role !== 'MANAGER' && (
                <div style={{
                  padding: '12px 16px', borderRadius: '12px',
                  background: 'var(--primary-light)', border: '1px solid #d4d4ff',
                  display: 'flex', gap: '10px', alignItems: 'flex-start', marginTop: '4px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p style={{ fontSize: '12px', color: '#4b4bcc', lineHeight: 1.5, margin: 0 }}>
                    To edit any personal information, please <strong>raise a ticket in Support</strong> with your reason and our team will update it for you.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Account Details ── */}
          <div className="card" style={{ padding: isMobile ? '16px' : '28px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              Account Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>

              {/* Email */}
              <div style={insetRow}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>Email Address</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600', maxWidth: isMobile ? '120px' : '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
              </div>

              {/* Mobile */}
              <div style={insetRow}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>Mobile Number</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>{user.mobileNumber || '—'}</span>
              </div>

              {/* Security Number */}
              <div style={insetRow}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>Security Number</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600',
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
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '2px' }}
                    >
                      {showSecurityNumber ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  )}
                </div>
              </div>

              {/* Role */}
              <div style={insetRow}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>Role</span>
                <span className="badge" style={{
                  background: user.role === 'MANAGER' ? 'var(--primary-light)' : user.role === 'ADMIN' ? 'var(--info-light)' : 'var(--success-light)',
                  color: user.role === 'MANAGER' ? 'var(--accent)' : user.role === 'ADMIN' ? 'var(--info)' : 'var(--success)',
                  fontSize: '12px',
                }}>
                  {roleLabel}
                </span>
              </div>

              {/* Member Since */}
              <div style={insetRow}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>Member Since</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>
                  {new Date(user.createdAt).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>

            </div>
          </div>

        </div> {/* close grid container */}

        {/* ── Bottom Action Bar ── */}
        <div style={{
          display: 'flex',
          justifyContent: isMobile ? 'stretch' : 'flex-end',
          alignItems: 'center',
          gap: '10px',
          padding: isMobile ? '16px 12px' : '20px 24px',
          borderRadius: '24px',
          background: 'var(--surface-2)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.04), 6px 6px 12px var(--neu-dark), -6px -6px 12px var(--neu-light)',
          flexDirection: 'row',
          position: 'sticky',
          bottom: isMobile ? 'max(12px, env(safe-area-inset-bottom))' : '20px',
          zIndex: 90,
          marginTop: '24px',
          border: '1px solid rgba(255, 255, 255, 0.6)',
        }}>
          <button
            onClick={handleDiscard}
            className="btn btn-ghost"
            style={{
              flex: isMobile ? 1 : 'unset',
              padding: isMobile ? '11px 10px' : undefined,
              fontSize: isMobile ? '13px' : undefined,
              fontWeight: isMobile ? '600' : undefined,
              borderRadius: isMobile ? '50px' : undefined,
              border: isMobile ? '1.5px solid rgba(99,102,241,0.25)' : undefined,
              color: isMobile ? 'var(--accent)' : undefined,
              background: isMobile ? 'rgba(99,102,241,0.06)' : undefined,
            }}
          >
            Discard
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="btn btn-primary"
            style={{
              flex: isMobile ? 1 : 'unset',
              padding: isMobile ? '11px 10px' : undefined,
              fontSize: isMobile ? '13px' : undefined,
              fontWeight: isMobile ? '700' : undefined,
              borderRadius: isMobile ? '50px' : undefined,
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>

      {/* ── Image Crop Modal ── */}
      {imageSrc && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ width: '95%', maxWidth: '500px', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Adjust Profile Picture</h3>
              <button 
                onClick={() => setImageSrc(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div style={{ position: 'relative', width: '100%', height: isMobile ? '280px' : '350px', background: '#333' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  onClick={() => setImageSrc(null)} 
                  className="btn btn-ghost"
                  disabled={uploadingAvatar}
                >
                  Cancel
                </button>
                <button 
                  onClick={uploadCroppedImage} 
                  className="btn btn-primary"
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? 'Uploading...' : 'Save Picture'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
