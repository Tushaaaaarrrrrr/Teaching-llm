'use client'

import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import { useRouter } from 'next/navigation'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

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
    courseIds: [] as string[],
    bundleIds: [] as string[],
  })
  const bundledCourseIds = new Set(
    bundles
      .filter(bundle => formData.bundleIds.includes(bundle.id))
      .flatMap(bundle => (bundle.courses || []).map(entry => entry.course.id))
  )

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
        setUser(data)
        setFormData({
            name: data.name || '',
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            mobileNumber: data.mobileNumber || '',
            email: data.email || '',
            role: data.role || '',
            courseIds: data.enrollments?.map((e: any) => e.courseId) || [],
            bundleIds: data.courseBundleAssignments?.map((b: any) => b.bundleId) || [],
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadCourses() {
    try {
      const res = await fetch('/api/courses')
      const data = await res.json()
      setCourses(data.courses || data || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function loadBundles() {
    try {
      const res = await fetch('/api/course-bundles')
      const data = await res.json()
      setBundles(data.bundles || data || [])
    } catch (e) {
      console.error(e)
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
        width: '100%', maxWidth: '560px', maxHeight: '95vh', overflowY: 'auto',
        position: 'relative', padding: '24px', ...neuBox
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
              cursor: 'pointer', color: '#6b6b8a', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '75px', height: '75px', borderRadius: '50%', margin: '0 auto 12px',
                background: '#f0f2f8', boxShadow: '4px 4px 10px #d1d9e6, -4px -4px 10px #ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                border: '3px solid #fff'
              }}>
                {user.avatar ? (
                  <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#6366f1' }}>{user.name.charAt(0).toUpperCase()}</div>
                )}
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e1e3a', marginBottom: '2px' }}>{user.name}</h2>
              <div style={{ fontSize: '12px', color: '#9999b0', fontWeight: '600' }}>{user.role} Account</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                {user.isGoogleUser && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '3px 10px', borderRadius: '20px',
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
                    Google Authenticated
                  </span>
                )}
                {((new Date().getTime() - new Date(user.createdAt).getTime()) <= 10 * 24 * 60 * 60 * 1000) && (
                  <span style={{
                    fontSize: '10px', fontWeight: '700', color: '#065f46',
                    background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', padding: '3px 10px', borderRadius: '20px',
                    border: '1px solid #86efac',
                  }}>
                    NEWBIEE
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Full Name</label>
                <input style={neuInset} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Email Address</label>
                <input style={neuInset} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>First Name</label>
                <input style={neuInset} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Last Name</label>
                <input style={neuInset} value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Mobile Number</label>
              <input style={neuInset} value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Role</label>
                <select style={neuInset} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value, courseIds: e.target.value === 'MANAGER' ? [] : formData.courseIds, bundleIds: e.target.value === 'MANAGER' ? [] : formData.bundleIds})}>
                  <option value="STUDENT">Student</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Account Created</label>
                <div style={neuInset}>{new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>

            <div style={{ 
              marginBottom: '16px', padding: '16px 20px', borderRadius: '18px', 
              background: 'linear-gradient(135deg, #eef1f8, #f5f7fb)',
              boxShadow: 'inset 3px 3px 8px #d1d9e6, inset -3px -3px 8px #ffffff',
              border: '1px solid rgba(255,255,255,0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Security Identification</div>
                <span style={{ fontSize: '9px', fontWeight: '800', color: '#6366f1', background: '#e0e7ff', padding: '2px 8px', borderRadius: '50px' }}>ACTIVE SECURE</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e1e3a', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                {user.securityNumber || 'NOT ASSIGNED'}
              </div>
            </div>

            <div style={{ 
              marginBottom: '16px', padding: '10px 20px', borderRadius: '16px', ...neuInset,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ color: '#9999b0', fontSize: '13px', letterSpacing: '0.2em' }}>••••••••••••••</div>
              <button 
                onClick={handleResetPassword}
                style={{
                  padding: '8px 20px', borderRadius: '12px', border: 'none', background: '#fff',
                  boxShadow: '4px 4px 8px #d1d9e6, -2px -2px 4px #ffffff',
                  fontSize: '12px', fontWeight: '700', color: '#3636e8', cursor: 'pointer'
                }}>
                Reset Password
              </button>
            </div>

            {formData.role !== 'MANAGER' && (
              <div style={{ marginBottom: '20px' }}>
                {bundles.length > 0 && (
                  <>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Assigned Bundles</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                      {bundles.filter(bundle => formData.bundleIds.includes(bundle.id)).map(bundle => (
                        <div key={bundle.id} style={{
                          padding: '8px 16px', borderRadius: '14px', background: '#f3f0ff',
                          boxShadow: '3px 3px 6px #d1d9e6, -3px -3px 6px #ffffff',
                          display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#6d28d9' }}>{bundle.name}</span>
                          <button
                            onClick={() => setFormData({...formData, bundleIds: formData.bundleIds.filter(id => id !== bundle.id)})}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
                            padding: '8px 16px', borderRadius: '14px', border: 'none', background: 'none',
                            boxShadow: 'inset 2px 2px 5px #d1d9e6, inset -2px -2px 5px #ffffff',
                            fontSize: '12px', fontWeight: '700', color: '#7c3aed', cursor: 'pointer',
                            appearance: 'none', borderStyle: 'dashed', borderWidth: '1.5px', borderColor: '#ddd6fe'
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
                  </>
                )}
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Enrolled Courses</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {courses.filter(c => formData.courseIds.includes(c.id)).map(c => (
                    <div key={c.id} style={{
                      padding: '8px 16px', borderRadius: '14px', background: '#f0f2f8',
                      boxShadow: '3px 3px 6px #d1d9e6, -3px -3px 6px #ffffff',
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                       <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.color }} />
                       <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e1e3a' }}>{c.name}</span>
                       {c.isExpired && <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: '700' }}>Expired</span>}
                       {c.isEffectivelyDisabled && !c.isExpired && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700' }}>Disabled</span>}
                       <button 
                          onClick={() => setFormData({...formData, courseIds: formData.courseIds.filter(id => id !== c.id)})}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                       >
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
                          padding: '8px 16px', borderRadius: '14px', border: 'none', background: 'none',
                          boxShadow: 'inset 2px 2px 5px #d1d9e6, inset -2px -2px 5px #ffffff',
                          fontSize: '12px', fontWeight: '700', color: '#6366f1', cursor: 'pointer',
                          appearance: 'none', borderStyle: 'dashed', borderWidth: '1.5px', borderColor: '#d1d9e6'
                        }}
                        value=""
                     >
                       <option value="">+ Add New</option>
                       {courses.filter(c => !formData.courseIds.includes(c.id) && !bundledCourseIds.has(c.id) && !c.isEffectivelyDisabled).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                       ))}
                     </select>
                  </div>
                </div>
                {bundledCourseIds.size > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#7c3aed', fontWeight: '600' }}>
                    Courses already included through selected bundles are not added twice.
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
              <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: 'transparent', fontWeight: '700', color: '#6b6b8a', cursor: 'pointer' }}>Cancel</button>
              <button 
                onClick={handleUpdate}
                disabled={saving}
                style={{ 
                  flex: 1, padding: '12px', borderRadius: '14px', border: 'none', 
                  background: 'linear-gradient(135deg, #6366f1, #3636e8)', 
                  fontWeight: '700', color: '#fff', cursor: 'pointer',
                  boxShadow: '4px 4px 12px rgba(54,54,232,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                {saving ? 'Updating...' : <>Update User <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>}
              </button>
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', marginTop: '16px', fontWeight: '600' }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
