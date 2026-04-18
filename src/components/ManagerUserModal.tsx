'use client'

import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import { useRouter } from 'next/navigation'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { getDefaultAvatar } from '@/lib/avatar'

interface CourseInfo {
  id: string
  name: string
  color: string
  subject?: string
  isDisabled?: boolean
  isExpired?: boolean
  isEffectivelyDisabled?: boolean
}

interface CourseBundleInfo {
  id: string
  name: string
  courses?: { course: CourseInfo }[]
}

interface User {
  id: string
  name: string
  firstName?: string | null
  lastName?: string | null
  mobileNumber?: string | null
  email: string
  role: string
  securityNumber?: string | null
  createdAt: string
  gender?: string
  avatar?: string | null
  isGoogleUser?: boolean
  enrollments?: { courseId: string; course: CourseInfo }[]
  instructorAssignments?: { courseId: string; course: CourseInfo }[]
  courseBundleAssignments?: { bundleId: string; bundle: CourseBundleInfo }[]
}

interface ManagerUserModalProps {
  userId: string | null
  onClose: () => void
  onUpdate: () => void
}

export default function ManagerUserModal({ userId, onClose, onUpdate }: ManagerUserModalProps) {
  const { confirm, confirmDialog } = useConfirmDialog()
  const router = useRouter()
  const [user, setUser] = useState<User|null>(null)
  const [courses, setCourses] = useState<CourseInfo[]>([])
  const [bundles, setBundles] = useState<CourseBundleInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    firstName: '',
    lastName: '',
    mobileNumber: '',
    email: '',
    role: '',
    gender: 'MALE',
    courseIds: [] as string[],
    bundleIds: [] as string[],
  })
  const bundledCourseIds = new Set(
    bundles
      .filter(bundle => formData.bundleIds.includes(bundle.id))
      .flatMap(bundle => (bundle.courses || []).map(entry => entry.course.id))
  )

  function normalizeCollection<T>(value: unknown, nestedKey?: string): T[] {
    if (Array.isArray(value)) return value as T[]
    if (nestedKey && value && typeof value === 'object') {
      const nested = (value as Record<string, unknown>)[nestedKey]
      if (Array.isArray(nested)) return nested as T[]
    }
    return []
  }

  function getSafeDisplayName(data: Partial<User> | null | undefined) {
    const fullName = data?.name?.trim()
    if (fullName) return fullName
    const composedName = [data?.firstName?.trim(), data?.lastName?.trim()].filter(Boolean).join(' ')
    return composedName || 'Unknown User'
  }

  function parseDate(value?: string) {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  useEffect(() => {
    if (userId) {
      loadUser(userId)
      loadCourses()
      loadBundles()
    }
  }, [userId])

  async function loadUser(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${id}`)
      const data = await res.json()
      if (res.ok) {
        const normalizedUser = {
          ...data,
          name: getSafeDisplayName(data),
          enrollments: normalizeCollection(data?.enrollments),
          instructorAssignments: normalizeCollection(data?.instructorAssignments),
          courseBundleAssignments: normalizeCollection(data?.courseBundleAssignments),
        }
        setUser(normalizedUser)
        setFormData({
            name: normalizedUser.name,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            mobileNumber: data.mobileNumber || '',
            email: data.email || '',
            role: data.role || '',
            gender: data.gender || 'MALE',
            courseIds: normalizeCollection<any>(data?.enrollments).map((e: any) => e.courseId),
            bundleIds: normalizeCollection<any>(data?.courseBundleAssignments).map((b: any) => b.bundleId),
        })
      } else {
        setUser(null)
        setError(data?.error || 'Failed to load user')
      }
    } catch (e) {
      console.error(e)
      setUser(null)
      setError('Failed to load user')
    } finally {
      setLoading(false)
    }
  }

  async function loadCourses() {
    try {
      const res = await fetch('/api/courses')
      const data = await res.json()
      setCourses(normalizeCollection<CourseInfo>(data, 'courses'))
    } catch (e) {
      console.error(e)
      setCourses([])
    }
  }

  async function loadBundles() {
    try {
      const res = await fetch('/api/course-bundles')
      const data = await res.json()
      setBundles(normalizeCollection<CourseBundleInfo>(data, 'bundles'))
    } catch (e) {
      console.error(e)
      setBundles([])
    }
  }

  async function handleUpdate() {
    if (!userId) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: `${formData.firstName} ${formData.lastName}`.trim() || formData.name,
            firstName: formData.firstName,
            lastName: formData.lastName,
            mobileNumber: formData.mobileNumber,
            email: formData.email,
            role: formData.role,
            gender: formData.gender,
            courseIds: formData.courseIds,
            bundleIds: formData.bundleIds
        }),
      })
      if (res.ok) {
        mutate('/api/users')
        mutate('/api/auth/me')
        mutate('/api/dashboard')
        router.refresh()
        onUpdate()
        onClose()
      } else {
        const d = await res.json()
        setError(d.error || 'Failed to update')
      }
    } catch (e) {
      setError('Connection error')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!userId) return
    const allowed = await confirm({
      title: 'Reset Password?',
      message: 'A new temporary password will be generated for this user.',
      confirmLabel: 'Reset Password',
      tone: 'default',
    })
    if (!allowed) return
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'RESET' }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(`Password reset successfully. New temporary password: ${data.tempPassword}`)
      } else {
        alert(data.error || 'Failed to reset')
      }
    } catch (e) {
      alert('Error resetting password')
    }
  }

  if (!userId) return null

  const displayName = getSafeDisplayName(user)
  const createdAtDate = parseDate(user?.createdAt)
  const createdAtLabel = createdAtDate
    ? createdAtDate.toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Unknown'
  const isRecentlyCreated = createdAtDate
    ? (Date.now() - createdAtDate.getTime()) <= 10 * 24 * 60 * 60 * 1000
    : false
  const displayInitial = displayName.charAt(0).toUpperCase() || '?'

  const neuBox = {
    background: '#f0f2f8',
    boxShadow: '8px 8px 16px #d1d9e6, -8px -8px 16px #ffffff',
    borderRadius: '24px',
  }

  const neuInset = {
    background: '#f0f2f8',
    boxShadow: 'inset 4px 4px 8px #d1d9e6, inset -4px -4px 8px #ffffff',
    borderRadius: '12px',
    border: 'none',
    padding: '10px 14px',
    outline: 'none',
    width: '100%',
    fontSize: '13px',
    color: '#1e1e3a',
    fontFamily: 'inherit',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }} onClick={onClose}>
      {confirmDialog}
      
      <div style={{
        width: '100%', maxWidth: '1000px', maxHeight: '95vh', overflowY: 'auto',
        position: 'relative', padding: '32px', ...neuBox
      }} onClick={e => e.stopPropagation()}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>Loading...</div>
        ) : !user ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>User not found</div>
        ) : (
          <>
            <button onClick={onClose} style={{
              position: 'absolute', top: '24px', right: '24px',
              width: '36px', height: '36px', borderRadius: '50%', border: 'none',
              background: '#f0f2f8', boxShadow: '4px 4px 8px #d1d9e6, -4px -4px 8px #ffffff',
              cursor: 'pointer', color: '#6b6b8a', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '40px' }}>
              {/* Left Column: Profile & Personal Details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
                  <div style={{
                    width: '90px', height: '90px', borderRadius: '50%',
                    background: '#f0f2f8', boxShadow: '4px 4px 10px #d1d9e6, -4px -4px 10px #ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    border: '3px solid #fff', flexShrink: 0
                  }}>
                    {user.avatar || user.gender ? (
                      <img src={user.avatar || getDefaultAvatar(formData.gender || user.gender)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ fontSize: '36px', fontWeight: '800', color: '#6366f1' }}>{displayInitial}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e1e3a', marginBottom: '4px' }}>{displayName}</h2>
                    <div style={{ fontSize: '13px', color: '#9999b0', fontWeight: '600' }}>{user.role} Account</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {user.isGoogleUser && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '4px 12px', borderRadius: '20px',
                          background: 'linear-gradient(135deg, #e8f0fe, #d2e3fc)',
                          border: '1px solid #c6d9f1',
                          fontSize: '10px', fontWeight: '700', color: '#4285f4'
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Authenticated
                        </span>
                      )}
                      {isRecentlyCreated && (
                        <span style={{
                          fontSize: '10px', fontWeight: '700', color: '#065f46',
                          background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', padding: '4px 12px', borderRadius: '20px',
                          border: '1px solid #86efac',
                        }}>
                          NEWBIE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Full Name</label>
                    <input style={neuInset} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Email Address</label>
                    <input style={neuInset} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>First Name</label>
                    <input style={neuInset} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Last Name</label>
                    <input style={neuInset} value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Mobile Number</label>
                  <input style={neuInset} value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Role</label>
                    <select style={neuInset} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value, courseIds: e.target.value === 'MANAGER' ? [] : formData.courseIds, bundleIds: e.target.value === 'MANAGER' ? [] : formData.bundleIds})}>
                      <option value="STUDENT">Student</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Account Created</label>
                    <div style={neuInset}>{createdAtLabel}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Gender Preference</label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      padding: '12px', borderRadius: '16px',
                      background: formData.gender === 'MALE' ? '#e0e7ff' : '#f0f2f8',
                      boxShadow: formData.gender === 'MALE'
                        ? 'inset 3px 3px 6px rgba(99,102,241,0.18), inset -3px -3px 6px #ffffff'
                        : '4px 4px 8px #d1d9e6, -4px -4px 8px #ffffff',
                      cursor: 'pointer', color: '#1e1e3a', fontSize: '14px', fontWeight: '700', transition: 'all 0.2s'
                    }}>
                      <input type="radio" checked={formData.gender === 'MALE'} onChange={() => setFormData({ ...formData, gender: 'MALE' })} />
                      Male
                    </label>
                    <label style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      padding: '12px', borderRadius: '16px',
                      background: formData.gender === 'FEMALE' ? '#fce7f3' : '#f0f2f8',
                      boxShadow: formData.gender === 'FEMALE'
                        ? 'inset 3px 3px 6px rgba(236,72,153,0.14), inset -3px -3px 6px #ffffff'
                        : '4px 4px 8px #d1d9e6, -4px -4px 8px #ffffff',
                      cursor: 'pointer', color: '#1e1e3a', fontSize: '14px', fontWeight: '700', transition: 'all 0.2s'
                    }}>
                      <input type="radio" checked={formData.gender === 'FEMALE'} onChange={() => setFormData({ ...formData, gender: 'FEMALE' })} />
                      Female
                    </label>
                  </div>
                </div>

                <div style={{ 
                  marginBottom: '20px', padding: '20px', borderRadius: '20px', 
                  background: 'linear-gradient(135deg, #f0f2f8, #f8fafc)',
                  boxShadow: 'inset 4px 4px 10px #d1d9e6, inset -4px -4px 10px #ffffff',
                  border: '1px solid rgba(255,255,255,0.6)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Security Identification</div>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#6366f1', background: '#e0e7ff', padding: '3px 10px', borderRadius: '50px' }}>SECURE ACCESS</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e1e3a', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
                    {user.securityNumber || 'NOT ASSIGNED'}
                  </div>
                </div>

                <div style={{ 
                  padding: '12px 20px', borderRadius: '18px', ...neuInset,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div style={{ color: '#9999b0', fontSize: '14px', letterSpacing: '0.3em' }}>••••••••••••</div>
                  <button 
                    onClick={handleResetPassword}
                    style={{
                      padding: '10px 22px', borderRadius: '14px', border: 'none', background: '#fff',
                      boxShadow: '4px 4px 8px #d1d9e6, -2px -2px 4px #ffffff',
                      fontSize: '13px', fontWeight: '700', color: '#3636e8', cursor: 'pointer', transition: 'transform 0.1s'
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Reset Password
                  </button>
                </div>
              </div>

              {/* Right Column: Course Assignments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {formData.role !== 'MANAGER' ? (
                  <>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>Subject Bundles</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {bundles.filter(bundle => formData.bundleIds.includes(bundle.id)).map(bundle => (
                          <div key={bundle.id} style={{
                            padding: '10px 18px', borderRadius: '16px', background: '#f3f0ff',
                            boxShadow: '4px 4px 8px #d1d9e6, -4px -4px 8px #ffffff',
                            display: 'flex', alignItems: 'center', gap: '10px'
                          }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#6d28d9' }}>{bundle.name}</span>
                            <button
                              onClick={() => setFormData({...formData, bundleIds: formData.bundleIds.filter(id => id !== bundle.id)})}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        ))}

                        <div style={{ position: 'relative' }}>
                          <select
                            onChange={(e) => {
                              if (e.target.value && !formData.bundleIds.includes(e.target.value)) {
                                setFormData({...formData, bundleIds: [...formData.bundleIds, e.target.value]})
                              }
                            }}
                            style={{
                              padding: '10px 18px', borderRadius: '16px', border: '2px dashed #ddd6fe', background: 'rgba(255,255,255,0.3)',
                              fontSize: '13px', fontWeight: '700', color: '#7c3aed', cursor: 'pointer', appearance: 'none'
                            }}
                            value=""
                          >
                            <option value="">+ Add Bundle</option>
                            {bundles.filter(bundle => !formData.bundleIds.includes(bundle.id)).map(bundle => (
                              <option key={bundle.id} value={bundle.id}>{bundle.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div style={{ flex: 1.5 }}>
                      <label style={{ fontSize: '11px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>Course Enrollments</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {courses.filter(c => formData.courseIds.includes(c.id)).map(c => (
                          <div key={c.id} style={{
                            padding: '10px 18px', borderRadius: '16px', background: '#f0f2f8',
                            boxShadow: '4px 4px 8px #d1d9e6, -4px -4px 8px #ffffff',
                            display: 'flex', alignItems: 'center', gap: '10px'
                          }}>
                             <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color }} />
                             <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e1e3a' }}>{c.name}</span>
                             {c.isExpired && <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: '700', background: '#ffedd5', padding: '2px 8px', borderRadius: '20px' }}>Expired</span>}
                             {c.isEffectivelyDisabled && !c.isExpired && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700', background: '#fee2e2', padding: '2px 8px', borderRadius: '20px' }}>Disabled</span>}
                             <button 
                                onClick={() => setFormData({...formData, courseIds: formData.courseIds.filter(id => id !== c.id)})}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                             >
                               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                             </button>
                          </div>
                        ))}
                        
                        <div style={{ position: 'relative' }}>
                           <select 
                              onChange={(e) => {
                               if (e.target.value && !formData.courseIds.includes(e.target.value)) {
                                  setFormData({...formData, courseIds: [...formData.courseIds, e.target.value]})
                                }
                              }}
                              style={{
                                padding: '10px 18px', borderRadius: '16px', border: '2px dashed #d1d9e6', background: 'rgba(255,255,255,0.3)',
                                fontSize: '13px', fontWeight: '700', color: '#6366f1', cursor: 'pointer', appearance: 'none'
                              }}
                              value=""
                           >
                             <option value="">+ Add Course</option>
                             {courses.filter(c => !formData.courseIds.includes(c.id) && !bundledCourseIds.has(c.id) && !c.isEffectivelyDisabled).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                             ))}
                           </select>
                        </div>
                      </div>
                      {bundledCourseIds.size > 0 && (
                        <div style={{ marginTop: '14px', fontSize: '12px', color: '#7c3aed', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                          Bundled courses are automatically handled.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '24px', border: '2px dashed #e2e8f0', padding: '40px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '32px', marginBottom: '16px' }}>🛡️</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e1e3a', marginBottom: '4px' }}>Manager Controls</div>
                      <div style={{ fontSize: '13px', color: '#6b6b8a' }}>Managers have global access and don't require individual course enrollments.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '40px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '32px' }}>
              <button onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: '20px', border: 'none', background: 'transparent', fontWeight: '700', color: '#6b6b8a', cursor: 'pointer', fontSize: '15px' }}>Cancel</button>
              <button 
                onClick={handleUpdate}
                disabled={saving}
                style={{ 
                  flex: 1.5, padding: '16px', borderRadius: '20px', border: 'none', 
                  background: 'linear-gradient(135deg, #6366f1, #3636e8)', 
                  fontWeight: '700', color: '#fff', cursor: 'pointer',
                  boxShadow: '0 8px 16px rgba(54,54,232,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  fontSize: '15px', transition: 'all 0.2s'
                }}>
                {saving ? 'Updating...' : <>Update Profile <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>}
              </button>
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', marginTop: '20px', fontWeight: '600' }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
