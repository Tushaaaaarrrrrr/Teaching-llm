'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'

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
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(role)

  // Show UI Loading skeleton
  if (loading && !data) {
    return (
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ height: '40px', width: '200px', background: 'var(--surface-2)', borderRadius: '12px', marginBottom: '24px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: '120px', background: 'var(--surface-2)', borderRadius: '24px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      </div>
    )
  }

  // Filter students by search
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  )

  // Helper styles for glass/neumorphic aesthetic card
  const neuCard: React.CSSProperties = {
    background: 'var(--surface-2)',
    borderRadius: '24px',
    padding: '32px',
    boxShadow: 'var(--shadow-elevation-low)',
    border: '1px solid var(--border)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  }

  // Calculate distinct layout helper for Login Heatmap
  const getLocalDateString = (isoString: string) => {
     try {
       const d = new Date(isoString)
       return d.toISOString().split('T')[0]
     } catch {
       return ''
     }
  }

  const get50DaysAgoArray = () => {
    const arr = []
    for (let i = 49; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      arr.push(d.toISOString().split('T')[0])
    }
    return arr
  }
  const last50Days = get50DaysAgoArray()

  const formatTooltipDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    } catch {
      return dateStr
    }
  }

  // Active student banner metadata
  const auditedStudentInfo = view === 'STUDENT_AUDIT' && selectedStudentId 
    ? students.find(s => s.id === selectedStudentId)
    : null

  // Presence metrics calculation helper
  const uniquePresenceDays = data?.attendance 
    ? new Set(data.attendance.map((l: any) => getLocalDateString(l.timestamp))).size
    : 0

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
      
      {/* ==================== 1. TOP HEADER BRANDING & ACTION BAR ==================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Analytics & Performance
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px', fontWeight: 500 }}>
            Monitor real-time engagement logs, graded evaluations, and class averages.
          </p>
        </div>

        {/* Global course-wide filtering dropdown */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
             <select 
               value={selectedCourseId}
               onChange={(e) => setSelectedCourseId(e.target.value)}
               style={{
                 appearance: 'none',
                 background: 'var(--surface-2)',
                 border: '1px solid var(--border)',
                 borderRadius: '16px',
                 padding: '12px 40px 12px 20px',
                 fontSize: '13px',
                 fontWeight: 800,
                 color: 'var(--text-primary)',
                 cursor: 'pointer',
                 outline: 'none',
                 boxShadow: 'var(--shadow-elevation-low)',
               }}
             >
                <option value="">All Registered Courses</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
             </select>
             <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
             </div>
          </div>
        </div>
      </div>

      {/* ==================== 2. ROLE BASED SWITCHER/AUDIT CONTROLS ==================== */}
      {isAdminOrManager && (
        <div style={{ ...neuCard, marginBottom: '32px', padding: '24px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            {/* View selectors */}
            <div style={{ display: 'flex', background: 'var(--surface)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <button 
                onClick={() => setView('OVERVIEW')}
                style={{
                  padding: '10px 24px', borderRadius: '12px', border: 'none',
                  background: view === 'OVERVIEW' ? 'var(--surface-2)' : 'transparent',
                  color: view === 'OVERVIEW' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: view === 'OVERVIEW' ? 'var(--shadow-elevation-low)' : 'none',
                  fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Overview Metrics
              </button>
              <button 
                onClick={() => setView('STUDENT_AUDIT')}
                style={{
                  padding: '10px 24px', borderRadius: '12px', border: 'none',
                  background: view === 'STUDENT_AUDIT' ? 'var(--surface-2)' : 'transparent',
                  color: view === 'STUDENT_AUDIT' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: view === 'STUDENT_AUDIT' ? 'var(--shadow-elevation-low)' : 'none',
                  fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Individual Student Audit
              </button>
            </div>

            {/* Student Search & Select (Only active in Student Audit mode) */}
            {view === 'STUDENT_AUDIT' && (
              <div style={{ display: 'flex', gap: '16px', flex: 1, justifyContent: 'flex-end', minWidth: '300px' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <input 
                    type="text" 
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '12px 16px 12px 40px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                  <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                </div>

                <div style={{ position: 'relative', width: '220px' }}>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    style={{
                      appearance: 'none',
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '12px 40px 12px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="">Choose Student...</option>
                    {filteredStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Render selected view content */}
      {view === 'OVERVIEW' ? (
        /* ==================== 2. OVERVIEW METRICS VIEW ==================== */
        <>
          {/* Stat summaries */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '36px' }}>
            <div style={{ ...neuCard, borderLeft: '5px solid var(--success)' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Total Presence Logs</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--success)' }}>
                {data?.attendance?.length || 0} <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>Logs</span>
              </div>
            </div>
            <div style={{ ...neuCard, borderLeft: '5px solid var(--primary)' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Average Class Grade</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--primary)' }}>
                {parseFloat(data?.summary?.averageExamScore || 0).toFixed(0)}%
              </div>
            </div>
            <div style={{ ...neuCard, borderLeft: '5px solid var(--accent)' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Exams Conducted</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)' }}>
                {data?.summary?.examsTaken || 0}
              </div>
            </div>
          </div>

          {/* Exam list & Recent logins */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', marginBottom: '36px', alignItems: 'start' }}>
            {/* Exam averages */}
            <div style={neuCard}>
               <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>Class Exams Performance</h3>
               {(!data?.exams || data.exams.length === 0) ? (
                 <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No exams logged yet{selectedCourseId ? ' in this course' : ''}.</p>
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   {data.exams.map((ex: any, i: number) => (
                     <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                       <div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{ex.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(ex.date).toLocaleDateString('en-GB')}</div>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                          <div style={{ 
                            fontSize: '15px', fontWeight: 900, 
                            color: 'var(--primary)',
                            background: 'var(--primary-light)',
                            padding: '4px 12px',
                            borderRadius: '8px',
                            display: 'inline-block'
                          }}>
                            {ex.averageScore !== null ? `${parseFloat(ex.averageScore).toFixed(0)}%` : 'N/A'}
                          </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>

            {/* Top Performers list */}
            <div style={neuCard}>
               <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>Class Top Performers</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(data?.topPerformers || []).map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                       <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '12px' }}>{i+1}</div>
                       <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</div>
                       </div>
                       <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--primary)' }}>{p.average}%</div>
                    </div>
                  ))}
                  {(!data?.topPerformers || data.topPerformers.length === 0) && (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px' }}>No rankings available yet.</p>
                  )}
               </div>
            </div>
          </div>

          {/* Login Heatmap */}
          <div style={neuCard}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px' }}>Global Login Distribution (Last 50 Days)</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {last50Days.map(date => {
                   const dayLogs = data?.attendance?.filter((l: any) => getLocalDateString(l.timestamp) === date) || []
                   const activeCount = dayLogs.length
                   
                   // Determine heat level color
                   let cellBg = 'var(--surface)'
                   if (activeCount > 0 && activeCount <= 2) cellBg = 'rgba(16, 185, 129, 0.3)'
                   else if (activeCount > 2 && activeCount <= 5) cellBg = 'rgba(16, 185, 129, 0.6)'
                   else if (activeCount > 5) cellBg = 'var(--success)'

                   return (
                     <div 
                       key={date} 
                       title={`${formatTooltipDate(date)} - ${activeCount} Active student(s)`}
                       style={{ 
                         width: '26px', height: '26px', borderRadius: '8px', 
                         background: cellBg,
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
                  <div style={{ width: '12px', height: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }} /> No Active Students
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: 'rgba(16, 185, 129, 0.4)', borderRadius: '4px' }} /> 1 - 2 Logins
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: 'var(--success)', borderRadius: '4px' }} /> 5+ Logins
                </div>
            </div>
          </div>
        </>
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

          {selectedCourseId && (
            <div style={{ padding: '14px 20px', borderRadius: '14px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span>Showing audited reports for course: <strong>{courses.find((c: any) => c.id === selectedCourseId)?.name}</strong></span>
            </div>
          )}

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
        /* ==================== 4. DEFAULT EMPTY LOGS VIEW ==================== */
        <div style={{ ...neuCard, textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
           <p>No analytics or progress logs recorded for this scope yet.</p>
        </div>
      )}
    </div>
  )
}
