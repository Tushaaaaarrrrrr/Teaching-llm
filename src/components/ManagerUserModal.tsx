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
  age?: number | null
  state?: string | null
  avatar?: string | null
  isGoogleUser?: boolean
  notificationGroupEmails?: string | null
  enrollments?: { courseId: string; type?: string; course: CourseInfo }[]
  instructorAssignments?: { courseId: string; course: CourseInfo }[]
  courseBundleAssignments?: { bundleId: string; bundle: CourseBundleInfo }[]
  enableDetailedLogs?: boolean
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
    enrollmentTypes: {} as Record<string, string>, // courseId → 'LIVE' | 'RECORDED'
    notificationGroupEmails: [] as string[],
    age: '',
    state: '',
    enableDetailedLogs: false,
    iitmJoinYear: '',
    iitmJoinMonth: '',
    iitmLevel: '',
    iitmUserType: '',
    isIdentityUpdated: false
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
      const res = await fetch(`/api/users/${id}?t=${Date.now()}`)
      const data = await res.json()
      if (res.ok) {
        const normalizedUser = {
          ...data,
          name: getSafeDisplayName(data),
          enrollments: normalizeCollection(data?.enrollments),
          instructorAssignments: normalizeCollection(data?.instructorAssignments),
          courseBundleAssignments: normalizeCollection(data?.courseBundleAssignments),
        }
        const notifEmails = data.notificationGroupEmails
          ? data.notificationGroupEmails.split(',').map((e: string) => e.trim()).filter(Boolean)
          : []
        setUser(normalizedUser)
        setFormData({
            name: normalizedUser.name,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            mobileNumber: data.mobileNumber || '',
            email: data.email || '',
            role: data.role || '',
            gender: data.gender || 'MALE',
            age: data.age?.toString() || '',
            state: data.state || '',
            courseIds: normalizeCollection<any>(data?.enrollments).map((e: any) => e.courseId),
            bundleIds: normalizeCollection<any>(data?.courseBundleAssignments).map((b: any) => b.bundleId),
            enrollmentTypes: Object.fromEntries(
              normalizeCollection<any>(data?.enrollments).map((e: any) => [e.courseId, e.type || 'LIVE'])
            ),
            notificationGroupEmails: notifEmails,
            enableDetailedLogs: data.enableDetailedLogs || false,
            iitmJoinYear: data.iitmJoinYear || '',
            iitmJoinMonth: data.iitmJoinMonth || '',
            iitmLevel: data.iitmLevel || '',
            iitmUserType: data.iitmUserType || '',
            isIdentityUpdated: data.isIdentityUpdated || false
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
            name: formData.name,
            firstName: formData.firstName,
            lastName: formData.lastName,
            mobileNumber: formData.mobileNumber,
            email: formData.email,
            role: formData.role,
            gender: formData.gender,
            age: formData.age ? parseInt(formData.age, 10) : null,
            state: formData.state,
            courseIds: formData.courseIds,
            bundleIds: formData.bundleIds,
            enrollmentTypes: formData.enrollmentTypes,
            notificationGroupEmails: formData.notificationGroupEmails.join(','),
            iitmJoinYear: formData.iitmJoinYear || null,
            iitmJoinMonth: formData.iitmJoinMonth || null,
            iitmLevel: formData.iitmLevel || null,
            iitmUserType: formData.iitmUserType || null,
            isIdentityUpdated: formData.isIdentityUpdated,
            ...('enableDetailedLogs' in (user || {}) ? { enableDetailedLogs: formData.enableDetailedLogs } : {})
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



  if (!userId) return null

  const displayName = getSafeDisplayName({ name: formData.name, firstName: formData.firstName, lastName: formData.lastName }) || getSafeDisplayName(user)
  const createdAtDate = parseDate(user?.createdAt)
  const createdAtLabel = createdAtDate
    ? createdAtDate.toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Unknown'
  const isRecentlyCreated = createdAtDate
    ? (Date.now() - createdAtDate.getTime()) <= 10 * 24 * 60 * 60 * 1000
    : false
  const displayInitial = displayName.charAt(0).toUpperCase() || '?'

  const neuBox = {
    background: 'var(--surface)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    borderRadius: '16px',
    padding: '24px',
  }

  const neuInset = {
    background: 'var(--surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    padding: '10px 14px',
    outline: 'none',
    width: '100%',
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }} onClick={onClose}>
      {confirmDialog}
      
      <div className="modal" style={{
        width: '100%', maxWidth: '1000px', maxHeight: '95vh', overflowY: 'auto',
        position: 'relative', padding: '32px'
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
              background: 'var(--surface)', 
              cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                    background: 'var(--surface)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    border: '3px solid var(--border)', flexShrink: 0
                  }}>
                    {user.avatar || user.gender ? (
                      <img src={user.avatar || getDefaultAvatar(formData.gender || user.gender)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--accent)' }}>{displayInitial}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>{displayName}</h2>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {(formData.role || user.role).charAt(0) + (formData.role || user.role).slice(1).toLowerCase()} Account
                      {(formData.role || user.role) !== 'STUDENT' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {user.isGoogleUser && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '4px 12px', borderRadius: '20px',
                          background: 'linear-gradient(135deg, var(--info-light), var(--border))',
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
                          background: 'linear-gradient(135deg, var(--success-light), var(--border))', padding: '4px 12px', borderRadius: '20px',
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
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Full Name</label>
                    <input style={neuInset} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Email Address</label>
                    <input style={neuInset} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>First Name</label>
                    <input style={neuInset} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value, name: `${e.target.value} ${formData.lastName}`.trim()})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Last Name</label>
                    <input style={neuInset} value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value, name: `${formData.firstName} ${e.target.value}`.trim()})} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Mobile Number</label>
                    <input style={neuInset} value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Age</label>
                    <input style={neuInset} type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>State</label>
                    <input style={neuInset} value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                  </div>
                </div>

                {/* Group Mail Section */}
                <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                      📢 Group Mail
                    </label>
                    <a href="/google-sync" style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none', fontWeight: '700' }}>
                      Pools →
                    </a>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    {formData.notificationGroupEmails.length === 0 ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No Group Mail assigned yet. (Auto-assigns on save)
                      </span>
                    ) : (
                      formData.notificationGroupEmails.map(mail => (
                        <span key={mail} style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          background: 'var(--primary-light, #e0e7ff)',
                          color: 'var(--primary, #4338ca)',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid var(--border)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}>
                          ✉️ {mail}
                        </span>
                      ))
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. notifications-group-1@genziitian.org"
                      id="managerModalNotifGroupInput"
                      style={{ flex: 1, fontSize: '12px' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = (e.currentTarget.value || '').trim().toLowerCase()
                          if (val && !formData.notificationGroupEmails.includes(val)) {
                            setFormData(p => ({ ...p, notificationGroupEmails: Array.from(new Set([...p.notificationGroupEmails, val])) }))
                            e.currentTarget.value = ''
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', fontSize: '11px', fontWeight: '700' }}
                      onClick={() => {
                        const input = document.getElementById('managerModalNotifGroupInput') as HTMLInputElement
                        const val = (input?.value || '').trim().toLowerCase()
                        if (val && !formData.notificationGroupEmails.includes(val)) {
                          setFormData(p => ({ ...p, notificationGroupEmails: Array.from(new Set([...p.notificationGroupEmails, val])) }))
                          input.value = ''
                        }
                      }}
                    >
                      + Add Group Mail
                    </button>
                  </div>
                </div>

                {/* IITM Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '20px', marginBottom: '20px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '20px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase', margin: 0 }}>IITM Identity Details</h4>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Join Year</label>
                    <select style={neuInset} value={formData.iitmJoinYear} onChange={e => setFormData({...formData, iitmJoinYear: e.target.value})}>
                      <option value="">Select Year</option>
                      <option value="2023">2023</option>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Join Month</label>
                    <select style={neuInset} value={formData.iitmJoinMonth} onChange={e => setFormData({...formData, iitmJoinMonth: e.target.value})}>
                      <option value="">Select Month</option>
                      <option value="JAN">JAN</option>
                      <option value="MAY">MAY</option>
                      <option value="SEPT">SEPT</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>IITM Level</label>
                    <select style={neuInset} value={formData.iitmLevel} onChange={e => setFormData({...formData, iitmLevel: e.target.value})}>
                      <option value="">Select Level</option>
                      <option value="Qualifier">Qualifier</option>
                      <option value="Foundation">Foundation</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Degree">Degree</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>IITM Category</label>
                    <select style={neuInset} value={formData.iitmUserType} onChange={e => setFormData({...formData, iitmUserType: e.target.value})}>
                      <option value="">Select Category</option>
                      <option value="STANDALONE">STANDALONE</option>
                      <option value="DUAL DEGREE">DUAL DEGREE</option>
                      <option value="WORKING PROFESSIONAL">WORKING PROFESSIONAL</option>
                    </select>
                  </div>
                  
                  <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      id="isIdentityUpdated"
                      checked={formData.isIdentityUpdated}
                      onChange={e => setFormData({...formData, isIdentityUpdated: e.target.checked})}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="isIdentityUpdated" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      Identity Questionnaire Completed (isIdentityUpdated)
                    </label>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Account Created</label>
                  <div style={neuInset}>{createdAtLabel}</div>
                </div>

              </div>

              {/* Right Column: Security + Course Assignments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Gender Preference */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Gender Preference</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {(['MALE', 'FEMALE', 'OTHER'] as const).map(g => (
                      <label key={g} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '10px', borderRadius: '16px',
                        background: formData.gender === g
                          ? g === 'MALE' ? 'var(--primary-light)' : g === 'FEMALE' ? 'rgba(236,72,153,0.16)' : 'rgba(168,85,247,0.16)'
                          : 'var(--surface)',
                        boxShadow: formData.gender === g
                          ? g === 'MALE' ? 'inset 3px 3px 6px rgba(99,102,241,0.18), inset -3px -3px 6px var(--neu-light)'
                          : g === 'FEMALE' ? 'inset 3px 3px 6px rgba(236,72,153,0.14), inset -3px -3px 6px var(--neu-light)'
                          : 'inset 3px 3px 6px rgba(168,85,247,0.14), inset -3px -3px 6px var(--neu-light)'
                          : '4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)',
                        cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s'
                      }}>
                        <input type="radio" checked={formData.gender === g} onChange={() => setFormData({ ...formData, gender: g })} />
                        {g.charAt(0) + g.slice(1).toLowerCase()}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Security ID */}
                <div style={{
                  padding: '20px', borderRadius: '20px',
                  background: 'linear-gradient(135deg, var(--surface-2), var(--surface))',
                  boxShadow: 'inset 4px 4px 10px var(--neu-dark), inset -4px -4px 10px var(--neu-light)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Security Identification</div>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--accent)', background: 'var(--primary-light)', padding: '3px 10px', borderRadius: '50px' }}>SECURE ACCESS</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
                    {user.securityNumber || 'NOT ASSIGNED'}
                  </div>
                </div>

                {user && 'enableDetailedLogs' in user && (
                  <div style={{
                    padding: '20px', borderRadius: '20px', marginTop: '24px',
                    background: 'linear-gradient(135deg, var(--border), var(--surface-2))',
                    boxShadow: 'inset 4px 4px 10px var(--neu-dark), inset -4px -4px 10px var(--neu-light)',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Stealth Tracking</div>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--accent)', background: 'var(--primary-light)', padding: '3px 10px', borderRadius: '50px' }}>SUPER ADMIN</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <div style={{ position: 'relative' }}>
                          <input type="checkbox" className="sr-only" checked={formData.enableDetailedLogs} onChange={e => setFormData({ ...formData, enableDetailedLogs: e.target.checked })} style={{ opacity: 0, width: 0, height: 0 }} />
                          <div style={{
                            display: 'block', width: '48px', height: '28px', borderRadius: '9999px',
                            background: formData.enableDetailedLogs ? 'var(--accent)' : 'var(--text-muted)', transition: 'background 0.3s'
                          }}></div>
                          <div style={{
                            position: 'absolute', top: '2px', left: '2px', width: '24px', height: '24px',
                            backgroundColor: 'var(--surface)', borderRadius: '50%', transition: 'transform 0.3s',
                            transform: formData.enableDetailedLogs ? 'translateX(20px)' : 'translateX(0)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}></div>
                        </div>
                      </label>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {formData.enableDetailedLogs ? 'Detailed Tracking Enabled' : 'Normal Tracking'}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      When enabled, this user's every click is silently logged and visible only to Super Admins.
                    </div>
                  </div>
                )}

                {formData.role !== 'MANAGER' ? (
                  <>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>Subject Bundles</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {bundles.filter(bundle => formData.bundleIds.includes(bundle.id)).map(bundle => (
                          <div key={bundle.id} style={{
                            padding: '10px 18px', borderRadius: '16px', background: 'var(--primary-light)',
                            boxShadow: '4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)',
                            display: 'flex', alignItems: 'center', gap: '10px'
                          }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)' }}>{bundle.name}</span>
                            <button
                              onClick={() => setFormData({...formData, bundleIds: formData.bundleIds.filter(id => id !== bundle.id)})}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}
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
                              padding: '10px 18px', borderRadius: '16px', border: '2px dashed #ddd6fe', background: 'var(--surface-2)',
                              fontSize: '13px', fontWeight: '700', color: 'var(--accent)', cursor: 'pointer', appearance: 'none'
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
                                     <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Regular Course Enrollments */}
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>Course Enrollments</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {courses.filter(c => formData.courseIds.includes(c.id) && formData.enrollmentTypes[c.id] !== 'DEMO').map(c => {
                            const enrollType = formData.enrollmentTypes[c.id] || 'LIVE'
                            const isLive = enrollType === 'LIVE'
                            return (
                            <div key={c.id} style={{
                              padding: '10px 18px', borderRadius: '16px', background: 'var(--surface)',
                              boxShadow: '4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)',
                              display: 'flex', alignItems: 'center', gap: '10px'
                            }}>
                               <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color }} />
                               <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{c.name}</span>
                               {c.isExpired && <span style={{ fontSize: '11px', color: 'var(--warning)', fontWeight: '700', background: '#ffedd5', padding: '2px 8px', borderRadius: '20px' }}>Expired</span>}
                               {c.isEffectivelyDisabled && !c.isExpired && <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: '700', background: 'var(--danger-light)', padding: '2px 8px', borderRadius: '20px' }}>Disabled</span>}
                               {/* Live/Recorded Dropdown */}
                               <select
                                  value={enrollType}
                                  onChange={(e) => {
                                    setFormData({...formData, enrollmentTypes: {...formData.enrollmentTypes, [c.id]: e.target.value}})
                                  }}
                                  style={{
                                    padding: '4px 10px', borderRadius: '20px', border: '1px solid ' + (isLive ? 'var(--border)' : 'var(--border)'),
                                    background: isLive
                                      ? 'linear-gradient(135deg, var(--success-light), var(--border))'
                                      : 'linear-gradient(135deg, var(--border), var(--border))',
                                    color: isLive ? 'var(--success)' : 'var(--warning)',
                                    fontSize: '10px', fontWeight: '800', letterSpacing: '0.04em',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    boxShadow: '2px 2px 4px var(--neu-dark), -2px -2px 4px var(--neu-light)',
                                    outline: 'none',
                                  }}
                                >
                                  <option value="LIVE">🟢 LIVE</option>
                                  <option value="RECORDED">🟡 RECORDED</option>
                                </select>
                               <button 
                                  onClick={() => {
                                    const newTypes = {...formData.enrollmentTypes}
                                    delete newTypes[c.id]
                                    setFormData({...formData, courseIds: formData.courseIds.filter(id => id !== c.id), enrollmentTypes: newTypes})
                                  }}
                                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}
                               >
                                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                               </button>
                            </div>
                            )
                          })}
                          
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                               <select 
                                  onChange={(e) => {
                                   if (e.target.value && !formData.courseIds.includes(e.target.value)) {
                                      setFormData({
                                         ...formData,
                                         courseIds: [...formData.courseIds, e.target.value],
                                         enrollmentTypes: {...formData.enrollmentTypes, [e.target.value]: 'LIVE'}
                                       })
                                    }
                                  }}
                                style={{
                                  padding: '10px 18px', borderRadius: '16px', border: '2px dashed var(--neu-dark)', background: 'var(--surface-2)',
                                  fontSize: '13px', fontWeight: '700', color: 'var(--accent)', cursor: 'pointer', appearance: 'none'
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
                        </div>
                        {bundledCourseIds.size > 0 && (
                          <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--accent)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            Bundled courses are automatically handled.
                          </div>
                        )}
                      </div>

                      {/* Demo Courses Section */}
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>Demo Courses</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {courses.filter(c => formData.courseIds.includes(c.id) && formData.enrollmentTypes[c.id] === 'DEMO').map(c => {
                            return (
                            <div key={c.id} style={{
                              padding: '10px 18px', borderRadius: '16px', background: 'var(--surface)',
                              boxShadow: '4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)',
                              display: 'flex', alignItems: 'center', gap: '10px'
                            }}>
                               <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color }} />
                               <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{c.name}</span>
                               <span style={{ fontSize: '10px', fontWeight: '850', color: 'var(--accent)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo</span>
                               <button 
                                  onClick={() => {
                                    const newTypes = {...formData.enrollmentTypes}
                                    delete newTypes[c.id]
                                    setFormData({...formData, courseIds: formData.courseIds.filter(id => id !== c.id), enrollmentTypes: newTypes})
                                  }}
                                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}
                                >
                                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                               </button>
                            </div>
                            )
                          })}
                          
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                               <select 
                                  onChange={(e) => {
                                   if (e.target.value && !formData.courseIds.includes(e.target.value)) {
                                      setFormData({
                                         ...formData,
                                         courseIds: [...formData.courseIds, e.target.value],
                                         enrollmentTypes: {...formData.enrollmentTypes, [e.target.value]: 'DEMO'}
                                       })
                                    }
                                  }}
                                style={{
                                  padding: '10px 18px', borderRadius: '16px', border: '2px dashed var(--neu-dark)', background: 'var(--surface-2)',
                                  fontSize: '13px', fontWeight: '700', color: 'var(--accent)', cursor: 'pointer', appearance: 'none'
                                }}
                                value=""
                             >
                               <option value="">+ Add Demo Course</option>
                               {courses.filter(c => !formData.courseIds.includes(c.id)).map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                               ))}
                             </select>
                           </div>
                          </div>
                        </div>
                      </div>
                    </div>           </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', borderRadius: '24px', border: '2px dashed var(--border)', padding: '40px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '32px', marginBottom: '16px' }}>🛡️</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Manager Controls</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Managers have global access and don't require individual course enrollments.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '40px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '32px' }}>
              <button onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: '20px', border: 'none', background: 'transparent', fontWeight: '700', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '15px' }}>Cancel</button>
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
            {error && <p style={{ color: 'var(--danger)', fontSize: '13px', textAlign: 'center', marginTop: '20px', fontWeight: '600' }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
