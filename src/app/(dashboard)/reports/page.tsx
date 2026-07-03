'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

interface Student {
  id: string
  name: string
  email: string
}

interface Course {
  id: string
  name: string
  color?: string
  subject?: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'OVERVIEW' | 'STUDENT_AUDIT'>('OVERVIEW')
  const [role, setRole] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [subView, setSubView] = useState<'ATTENDANCE' | 'PROGRESS'>('ATTENDANCE')

  const { data: coursesData } = useSWR('/api/courses', fetcher)
  const courses = coursesData?.courses || coursesData || []

  const fetchStudents = (passedCourseId?: string) => {
    const url = passedCourseId ? `/api/students?courseId=${passedCourseId}` : '/api/students'
    fetch(url)
      .then(res => res.json())
      .then(d => {
        if (Array.isArray(d)) {
          setStudents(d)
        }
      })
  }

  // Load user role on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(d => {
        const userRole = d.user?.role || ''
        setRole(userRole)
        if (['MANAGER', 'ADMIN'].includes(userRole)) {
          fetchStudents(selectedCourseId)
          loadData()
        } else if (userRole) {
          loadData()
        }
      })
  }, [])

  // Sync data query based on view selection and student selection
  useEffect(() => {
    if (['MANAGER', 'ADMIN'].includes(role)) {
      if (view === 'STUDENT_AUDIT' && selectedStudentId) {
        loadData(selectedStudentId)
      } else if (view === 'OVERVIEW') {
        loadData()
      } else if (view === 'STUDENT_AUDIT' && !selectedStudentId) {
        setData(null)
      }
    }
  }, [selectedStudentId, role, view])

  // Sync students and data when course filter changes
  useEffect(() => {
    if (!role) return
    if (['MANAGER', 'ADMIN'].includes(role)) {
      fetchStudents(selectedCourseId)
      if (view === 'STUDENT_AUDIT' && selectedStudentId) {
        loadData(selectedStudentId)
      } else if (view === 'OVERVIEW') {
        loadData()
      }
    } else {
      loadData()
    }
  }, [selectedCourseId])

  function loadData(studentId?: string) {
    setLoading(true)
    let url = '/api/analytics'
    const params = new URLSearchParams()
    if (studentId) params.set('studentId', studentId)
    if (selectedCourseId) params.set('courseId', selectedCourseId)
    if (params.toString()) url += `?${params.toString()}`

    fetch(url)
      .then(res => res.json())
      .then(d => {
        if (d && !d.error) {
          setData(d)
        } else {
          setData(null)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const isAdminOrManager = ['MANAGER', 'ADMIN'].includes(role)
  const auditedStudentInfo = isAdminOrManager && view === 'STUDENT_AUDIT' && selectedStudentId 
    ? students.find(s => s.id === selectedStudentId) 
    : null

  if (loading && !data && !isAdminOrManager) {
    return (
      <div style={{ padding: '24px 32px 48px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ 
          marginBottom: '36px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          paddingBottom: '24px',
          borderBottom: '1px solid var(--border)'
        }}>
          <div className="skeleton" style={{ height: '40px', width: '250px', borderRadius: '14px' }} />
          <div className="skeleton" style={{ height: '40px', width: '180px', borderRadius: '14px' }} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ borderRadius: '24px', background: 'var(--surface-2)', padding: '28px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="skeleton" style={{ height: '12px', width: '80px', borderRadius: '4px' }} />
                  <div className="skeleton" style={{ height: '18px', width: '18px', borderRadius: '4px' }} />
                </div>
                <div className="skeleton" style={{ height: '32px', width: '120px', marginTop: '12px', borderRadius: '8px' }} />
                <div className="skeleton" style={{ height: '11px', width: '140px', marginTop: '8px', borderRadius: '3px' }} />
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
            <div style={{ borderRadius: '24px', background: 'var(--surface-2)', padding: '28px', border: '1px solid var(--border)' }}>
              <div className="skeleton" style={{ height: '18px', width: '150px', marginBottom: '24px', borderRadius: '4px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '40%' }}>
                      <div className="skeleton" style={{ height: '14px', width: '100%', borderRadius: '4px' }} />
                      <div className="skeleton" style={{ height: '10px', width: '60%', marginTop: '6px', borderRadius: '3px' }} />
                    </div>
                    <div className="skeleton" style={{ height: '18px', width: '60px', borderRadius: '6px' }} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderRadius: '24px', background: 'var(--surface-2)', padding: '28px', border: '1px solid var(--border)' }}>
              <div className="skeleton" style={{ height: '18px', width: '130px', marginBottom: '24px', borderRadius: '4px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: '14px', width: '50%', borderRadius: '4px' }} />
                      <div className="skeleton" style={{ height: '10px', width: '70%', marginTop: '6px', borderRadius: '3px' }} />
                    </div>
                    <div className="skeleton" style={{ height: '16px', width: '40px', borderRadius: '4px' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Modern UI Style System (Glassmorphic dark cards, smooth transitions, proper typography)
  const neuCard: React.CSSProperties = {
    borderRadius: '24px', 
    background: 'var(--surface-2)',
    boxShadow: 'var(--shadow)',
    padding: '28px',
    border: '1px solid var(--border)',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  }

  const getLocalDateString = (dateObjOrStr: Date | string) => {
    const d = new Date(dateObjOrStr)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatTooltipDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const today = new Date()
  const last50Days = Array.from({ length: 50 }, (_, i) => {
    const d = new Date()
    d.setDate(today.getDate() - (49 - i))
    return getLocalDateString(d)
  })

  const uniquePresenceDays = data?.attendance 
    ? new Set(data.attendance.map((l: any) => getLocalDateString(l.timestamp))).size 
    : 0

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Top Filter and View Switcher Header Bar */}
      <div style={{ 
        marginBottom: '36px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '24px',
        paddingBottom: '24px',
        borderBottom: '1px solid var(--border)'
      }}>
        {/* Course Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter Course:</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              style={{
                padding: '10px 36px 10px 16px', 
                borderRadius: '14px', 
                border: '1px solid var(--border)',
                background: 'var(--surface)', 
                boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.03)',
                outline: 'none', 
                fontSize: '13px', 
                fontWeight: 700, 
                color: 'var(--text-primary)',
                appearance: 'none',
                cursor: 'pointer',
                minWidth: '220px'
              }}
            >
              <option value="">All Courses</option>
              {Array.isArray(courses) && courses.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: '14px', pointerEvents: 'none', color: 'var(--text-muted)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
          </div>
          {selectedCourseId && (
            <button
              onClick={() => setSelectedCourseId('')}
              style={{
                padding: '8px 16px', borderRadius: '12px', border: 'none',
                background: 'var(--danger-light)', color: 'var(--danger)', fontSize: '11px',
                fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              ✕ Clear Filter
            </button>
          )}
        </div>

        {/* Manager/Admin Mode Toggle Tabs */}
        {isAdminOrManager && (
          <div style={{ display: 'flex', background: 'var(--surface-2)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border)' }}>
             <button 
               onClick={() => setView('OVERVIEW')}
               style={{
                 padding: '8px 20px', 
                 borderRadius: '12px', 
                 border: 'none',
                 background: view === 'OVERVIEW' ? 'var(--primary)' : 'transparent',
                 color: view === 'OVERVIEW' ? '#fff' : 'var(--text-secondary)',
                 fontSize: '13px',
                 fontWeight: 800, 
                 cursor: 'pointer', 
                 transition: 'all 0.2s',
                 boxShadow: view === 'OVERVIEW' ? '0 4px 10px rgba(54,54,232,0.25)' : 'none'
               }}
             >Platform Overview</button>
             <button 
               onClick={() => { setView('STUDENT_AUDIT'); setData(null); }}
               style={{
                 padding: '8px 20px', 
                 borderRadius: '12px', 
                 border: 'none',
                 background: view === 'STUDENT_AUDIT' ? 'var(--primary)' : 'transparent',
                 color: view === 'STUDENT_AUDIT' ? '#fff' : 'var(--text-secondary)',
                 fontSize: '13px',
                 fontWeight: 800, 
                 cursor: 'pointer', 
                 transition: 'all 0.2s',
                 boxShadow: view === 'STUDENT_AUDIT' ? '0 4px 10px rgba(54,54,232,0.25)' : 'none'
               }}
             >Student Audit</button>
          </div>
        )}
      </div>

      {/* Student Audit Search Header (Manager/Admin Only) */}
      {isAdminOrManager && view === 'STUDENT_AUDIT' && (
        <div style={{ ...neuCard, marginBottom: '36px' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.04em' }}>Search Students</label>
              <input 
                type="text" 
                placeholder="Type name or email..." 
                value={studentSearch} 
                onChange={(e) => setStudentSearch(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  borderRadius: '14px', 
                  border: '1px solid var(--border)', 
                  background: 'var(--surface)', 
                  boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.03)', 
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              />
            </div>
            <div style={{ flex: '1 1 300px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.04em' }}>Select Student</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <select 
                  value={selectedStudentId} 
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '12px 36px 12px 16px', 
                    borderRadius: '14px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--surface)', 
                    boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.03)', 
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 600,
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Choose a student to audit --</option>
                  {students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase())).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: '14px', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Page Rendering Slots */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ borderRadius: '24px', background: 'var(--surface-2)', padding: '28px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="skeleton" style={{ height: '12px', width: '80px', borderRadius: '4px' }} />
                  <div className="skeleton" style={{ height: '18px', width: '18px', borderRadius: '4px' }} />
                </div>
                <div className="skeleton" style={{ height: '32px', width: '120px', marginTop: '12px', borderRadius: '8px' }} />
                <div className="skeleton" style={{ height: '11px', width: '140px', marginTop: '8px', borderRadius: '3px' }} />
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
            <div style={{ borderRadius: '24px', background: 'var(--surface-2)', padding: '28px', border: '1px solid var(--border)' }}>
              <div className="skeleton" style={{ height: '18px', width: '150px', marginBottom: '24px', borderRadius: '4px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '40%' }}>
                      <div className="skeleton" style={{ height: '14px', width: '100%', borderRadius: '4px' }} />
                      <div className="skeleton" style={{ height: '10px', width: '60%', marginTop: '6px', borderRadius: '3px' }} />
                    </div>
                    <div className="skeleton" style={{ height: '18px', width: '60px', borderRadius: '6px' }} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderRadius: '24px', background: 'var(--surface-2)', padding: '28px', border: '1px solid var(--border)' }}>
              <div className="skeleton" style={{ height: '18px', width: '130px', marginBottom: '24px', borderRadius: '4px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: '14px', width: '50%', borderRadius: '4px' }} />
                      <div className="skeleton" style={{ height: '10px', width: '70%', marginTop: '6px', borderRadius: '3px' }} />
                    </div>
                    <div className="skeleton" style={{ height: '16px', width: '40px', borderRadius: '4px' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : data?.type === 'MANAGER_OVERVIEW' ? (
        
        /* ==================== 1. MANAGER OVERVIEW VIEW ==================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          {selectedCourseId && (
            <div style={{ padding: '14px 24px', borderRadius: '16px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Currently showing analytics filtered by course: <strong>{courses.find((c: any) => c.id === selectedCourseId)?.name}</strong></span>
            </div>
          )}

          {/* 4 Platform Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            <div style={{ ...neuCard, borderLeft: '5px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Students</div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', marginTop: '12px' }}>{data.summary.totalStudents}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Active students in scope</div>
            </div>
            
            <div style={{ ...neuCard, borderLeft: '5px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Performance</div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--accent)', marginTop: '12px' }}>{data.summary.avgPlatformScore}%</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Platform score average</div>
            </div>
            
            <div style={{ ...neuCard, borderLeft: '5px solid var(--success)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Submissions</div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--success)', marginTop: '12px' }}>{data.summary.totalExams}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Assessments completed</div>
            </div>

            <div style={{ ...neuCard, borderLeft: '5px solid var(--warning)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Published Results</div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--warning)', marginTop: '12px' }}>{data.summary.totalCerts}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Evaluated & released certs</div>
            </div>
          </div>

          {/* Platform Performance Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start', flexWrap: 'wrap' }}>
            {/* Recent Submissions */}
            <div style={neuCard}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                Recent Submissions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.recentSubmissions.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No submissions recorded yet.</div>
                ) : (
                  data.recentSubmissions.map((s: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{s.student}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.exam}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          fontSize: '10px', fontWeight: 800, 
                          color: s.status === 'Evaluated' ? 'var(--success)' : 'var(--accent)', 
                          background: s.status === 'Evaluated' ? 'rgba(16,185,129,0.1)' : 'var(--primary-light)', 
                          padding: '3px 10px', borderRadius: '6px', textTransform: 'uppercase' 
                        }}>
                          {s.status}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(s.date).toLocaleDateString('en-GB')}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Performers list */}
            <div style={neuCard}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
                Platform Leaderboard
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.topPerformers.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No performance logs available yet.</div>
                ) : (
                  data.topPerformers.map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: i === 0 ? 'var(--warning-light)' : 'var(--primary-light)', color: i === 0 ? 'var(--warning)' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '13px' }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.email}</div>
                      </div>
                      <div style={{ fontSize: '17px', fontWeight: 900, color: 'var(--primary)' }}>
                        {p.average}%
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (isAdminOrManager && view === 'STUDENT_AUDIT' && !selectedStudentId) ? (
        
        /* ==================== 2. AUDIT NOT SELECTED VIEW ==================== */
        <div style={{ ...neuCard, textAlign: 'center', padding: '100px 40px', color: 'var(--text-muted)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Select Student to Audit</h3>
          <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '14px', lineHeight: '1.5' }}>Use the dropdown fields above to filter or search for a student and audit their metrics, grades, and progress.</p>
        </div>
      ) : data?.type === 'STUDENT_DETAIL' ? (
        
        /* ==================== 3. STUDENT DETAIL / AUDITED STUDENT VIEW ==================== */
        <>
          {/* Auditing Student Details Banner Header */}
          {auditedStudentInfo && (
            <div style={{ ...neuCard, background: 'linear-gradient(135deg, var(--surface-2), var(--surface))', borderLeft: '5px solid var(--primary)', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900 }}>
                {auditedStudentInfo.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Auditing Student Info</div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0 2px' }}>{auditedStudentInfo.name}</h2>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{auditedStudentInfo.email}</div>
              </div>
            </div>
          )}

          {/* Sub Navigation tabs */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <button 
              onClick={() => setSubView('ATTENDANCE')}
              style={{
                padding: '10px 20px', borderRadius: '12px', border: 'none',
                background: subView === 'ATTENDANCE' ? 'var(--primary-light)' : 'transparent',
                color: subView === 'ATTENDANCE' ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: '13px', 
                fontWeight: 800, 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Exams & Attendance
            </button>
            <button 
              onClick={() => setSubView('PROGRESS')}
              style={{
                padding: '10px 20px', borderRadius: '12px', border: 'none',
                background: subView === 'PROGRESS' ? 'var(--primary-light)' : 'transparent',
                color: subView === 'PROGRESS' ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: '13px', 
                fontWeight: 800, 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Learning Progress
            </button>
          </div>

          {selectedCourseId && (
            <div style={{ padding: '14px 20px', borderRadius: '14px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span>Showing audited reports for course: <strong>{courses.find((c: any) => c.id === selectedCourseId)?.name}</strong></span>
            </div>
          )}

          {subView === 'ATTENDANCE' ? (
            /* Subview: Exams & Attendance Dashboard */
            <>
              {/* Stat summaries */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '36px' }}>
                <div style={{ ...neuCard, borderLeft: '5px solid var(--success)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Total Presence</div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--success)' }}>
                    {uniquePresenceDays} <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>Days</span>
                  </div>
                </div>
                <div style={{ ...neuCard, borderLeft: '5px solid var(--primary)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Avg. Exam Score</div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--primary)' }}>
                    {parseFloat(data.summary?.averageExamScore || 0).toFixed(0)}%
                  </div>
                </div>
                <div style={{ ...neuCard, borderLeft: '5px solid var(--accent)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Assessments Done</div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {data.summary?.examsTaken || 0}
                  </div>
                </div>
              </div>

              {/* Exam history & Top Performers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', marginBottom: '36px', alignItems: 'start' }}>
                {/* Exam History */}
                <div style={neuCard}>
                   <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>Exam History</h3>
                   {data.exams.length === 0 ? (
                     <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No exam logs recorded yet{selectedCourseId ? ' in this course' : ''}.</p>
                   ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                       {data.exams.map((ex: any, i: number) => (
                         <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                           <div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{ex.title}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(ex.date).toLocaleDateString('en-GB')}</div>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                              {!ex.isEvaluated ? (
                                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent)', background: 'var(--primary-light)', padding: '3px 10px', borderRadius: '6px', textTransform: 'uppercase' }}>Pending Evaluation</span>
                              ) : (
                                <div style={{ 
                                  fontSize: '15px', fontWeight: 900, 
                                  color: (ex.percentage || 0) >= 50 ? 'var(--success)' : 'var(--danger)',
                                  background: (ex.percentage || 0) >= 50 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                  padding: '4px 12px',
                                  borderRadius: '8px',
                                  display: 'inline-block'
                                }}>
                                  {ex.percentage !== null ? `${ex.percentage.toFixed(0)}%` : 'N/A'}
                                </div>
                              )}
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                </div>

                {/* Top Performers list */}
                <div style={neuCard}>
                   <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>Top Performers</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(data.topPerformers || []).map((p: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                           <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '12px' }}>{i+1}</div>
                           <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</div>
                           </div>
                           <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--primary)' }}>{p.average}%</div>
                        </div>
                      ))}
                      {(!data.topPerformers || data.topPerformers.length === 0) && (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px' }}>No rankings available yet.</p>
                      )}
                   </div>
                </div>
              </div>

              {/* Login Heatmap */}
              <div style={neuCard}>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px' }}>Attendance logs (Last 50 Days)</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {last50Days.map(date => {
                       const hasLog = data.attendance?.some((l: any) => getLocalDateString(l.timestamp) === date)
                       return (
                         <div 
                           key={date} 
                           title={`${formatTooltipDate(date)} - ${hasLog ? 'Present' : 'Absent'}`}
                           style={{ 
                             width: '26px', height: '26px', borderRadius: '8px', 
                             background: hasLog ? 'var(--success)' : 'var(--surface)',
                             boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.05)',
                             border: '1px solid var(--border)',
                             cursor: 'pointer'
                           }} 
                         />
                       )
                    })}
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', background: 'var(--success)', borderRadius: '4px' }} /> Present / Logged In
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }} /> Absent / No Session
                    </div>
                </div>
              </div>
            </>
          ) : (
            /* Subview: Learning Progress Dashboard */
            <>
              {/* Lecture Progress stats cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '36px' }}>
                <div style={{ ...neuCard, borderLeft: '5px solid #10b981' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Completed</div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--success)' }}>{data.progress?.completed || 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Lectures finished</div>
                </div>
                <div style={{ ...neuCard, borderLeft: '5px solid #f59e0b' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Needs Rewatch</div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--warning)' }}>{data.progress?.rewatch || 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Marked for review</div>
                </div>
                <div style={{ ...neuCard, borderLeft: '5px solid #9999b0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Yet to Start</div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)' }}>{data.progress?.neverSeen || 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Not yet accessed</div>
                </div>
              </div>

              {/* Progress charts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                {/* Progress Distribution Chart */}
                <div style={neuCard}>
                   <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>Progress Distribution</h3>
                   <div style={{ height: '300px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Completed', value: data.progress?.completed || 0 },
                              { name: 'Rewatch', value: data.progress?.rewatch || 0 },
                              { name: 'Yet to Start', value: data.progress?.neverSeen || 0 },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={95}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#f59e0b" />
                            <Cell fill="#6b7280" />
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              background: 'var(--surface-2)', 
                              border: '1px solid var(--border)', 
                              borderRadius: '12px', 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              color: 'var(--text-primary)'
                            }}
                          />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                {/* Completion Progress percentage and role-based descriptions */}
                <div style={{ ...neuCard, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: '300px' }}>
                    <div style={{ 
                      width: '130px', height: '130px', borderRadius: '50%', 
                      background: 'var(--surface)', 
                      border: '4px solid var(--border)',
                      boxShadow: 'var(--shadow-inset)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '28px', position: 'relative'
                    }}>
                       <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--primary)' }}>{data.progress?.percentage || 0}%</div>
                       <div style={{ position: 'absolute', bottom: '-10px', fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: '50px', border: '1px solid var(--border)' }}>Completion</div>
                    </div>
                    
                    {/* Role-based motivates & student details */}
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>
                      {isAdminOrManager ? "Audited Student Progress" : "Keep it up!"}
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '340px', lineHeight: '1.6', margin: 0 }}>
                      {isAdminOrManager ? (
                        <>
                          This student has completed <strong>{data.progress?.completed}</strong> out of <strong>{data.progress?.total}</strong> lectures (<strong>{data.progress?.percentage}%</strong>) in the audited scope.
                        </>
                      ) : (
                        <>
                          {data.progress?.percentage === 100 
                            ? "Amazing! You've successfully finished all lectures in this course." 
                            : `You have completed ${data.progress?.completed} out of ${data.progress?.total} lectures. Stay consistent and keep moving forward!`}
                        </>
                      )}
                    </p>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        /* ==================== 4. DEFAULT EMPTY LOGS VIEW ==================== */
        <div style={{ ...neuCard, textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
           <p>No analytics or progress logs recorded for this scope yet.</p>
        </div>
      )}
    </div>
  )
}
