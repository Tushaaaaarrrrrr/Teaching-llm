'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

interface Log {
  id: string
  timestamp: string
}

interface ExamStat {
  title: string
  score: number
  total: number
  percentage: number
  date: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'OVERVIEW' | 'STUDENT_AUDIT'>('OVERVIEW')
  const [role, setRole] = useState('')
  const [students, setStudents] = useState<any[]>([])
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
      .then(data => {
        if (Array.isArray(data)) {
          setStudents(data)
        }
      })
  }

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

  // Re-fetch when course filter changes
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

  if (loading && !data && !isAdminOrManager) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Analytics...</div>

  // Shared Styles
  const neuCard: React.CSSProperties = {
    borderRadius: '20px', background: 'var(--surface-2)',
    boxShadow: 'var(--shadow)',
    padding: '24px',
  }

  const today = new Date()
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(today.getDate() - (29 - i))
    return d.toISOString().split('T')[0]
  })

  return (
    <div style={{ padding: '24px 32px 48px' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        {/* Course Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto' }}>
          <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Filter by Course</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            style={{
              padding: '10px 16px', borderRadius: '12px', border: 'none',
              background: 'var(--surface-2)', boxShadow: 'var(--shadow-inset)',
              outline: 'none', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
              flex: '1 1 200px', maxWidth: '100%',
            }}
          >
            <option value="">All Courses</option>
            {Array.isArray(courses) && courses.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {selectedCourseId && (
            <button
              onClick={() => setSelectedCourseId('')}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: 'none',
                background: 'var(--danger-light)', color: 'var(--danger)', fontSize: '12px',
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>

        {isAdminOrManager && (
          <div style={{ display: 'flex', gap: '12px' }}>
             <button 
               onClick={() => setView('OVERVIEW')}
               style={{
                 padding: '10px 20px', borderRadius: '50px', border: 'none',
                 background: view === 'OVERVIEW' ? 'var(--primary)' : 'var(--surface-2)',
                 color: view === 'OVERVIEW' ? '#fff' : 'var(--text-secondary)',
                 boxShadow: 'var(--shadow)',
                 fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
               }}
             >Overview</button>
             <button 
               onClick={() => { setView('STUDENT_AUDIT'); setData(null); }}
               style={{
                 padding: '10px 20px', borderRadius: '50px', border: 'none',
                 background: view === 'STUDENT_AUDIT' ? 'var(--primary)' : 'var(--surface-2)',
                 color: view === 'STUDENT_AUDIT' ? '#fff' : 'var(--text-secondary)',
                 boxShadow: 'var(--shadow)',
                 fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
               }}
             >Student Audit</button>
          </div>
        )}
      </div>

      {isAdminOrManager && view === 'STUDENT_AUDIT' && (
        <div style={{ ...neuCard, marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1, maxWidth: '500px' }}>
             <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Search Student</label>
             <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                   type="text" placeholder="Name or email..." value={studentSearch} 
                   onChange={(e) => setStudentSearch(e.target.value)}
                   style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: 'none', background: 'var(--surface-2)', boxShadow: 'var(--shadow-inset)', outline: 'none' }}
                />
                <select 
                   value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}
                   style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: 'none', background: 'var(--surface-2)', boxShadow: 'var(--shadow-inset)', outline: 'none' }}
                >
                   <option value="">-- Select Student --</option>
                   {students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Audit selected student's attendance and exam history</p>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>Analyzing data...</div>
      ) : data?.type === 'MANAGER_OVERVIEW' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
           {selectedCourseId && (
             <div style={{ padding: '12px 20px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--accent)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
               Showing analytics filtered by: {courses.find((c: any) => c.id === selectedCourseId)?.name || 'Selected Course'}
             </div>
           )}
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
              <div style={neuCard}>
                 <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Students</div>
                 <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', marginTop: '8px' }}>{data.summary.totalStudents}</div>
              </div>
              <div style={neuCard}>
                 <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Performance</div>
                 <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)', marginTop: '8px' }}>{data.summary.avgPlatformScore}%</div>
              </div>
              <div style={neuCard}>
                 <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Submissions</div>
                 <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--success)', marginTop: '8px' }}>{data.summary.totalExams}</div>
              </div>
              <div style={neuCard}>
                 <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Published Results</div>
                 <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--warning)', marginTop: '8px' }}>{data.summary.totalCerts}</div>
              </div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
              <div style={neuCard}>
                 <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>Recent Submissions</h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.recentSubmissions.map((s: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: '12px' }}>
                        <div>
                           <div style={{ fontSize: '14px', fontWeight: 700 }}>{s.student}</div>
                           <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.exam}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                           <div style={{ fontSize: '11px', fontWeight: 800, color: s.status === 'Evaluated' ? 'var(--success)' : 'var(--accent)' }}>{s.status}</div>
                           <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(s.date).toLocaleDateString('en-GB')}</div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>

              <div style={neuCard}>
                 <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>Top Performers</h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.topPerformers.map((p: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fff', borderRadius: '12px' }}>
                         <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>{i+1}</div>
                         <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>{p.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.email}</div>
                         </div>
                         <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--primary)' }}>{p.average}%</div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      ) : (isAdminOrManager && view === 'STUDENT_AUDIT' && !selectedStudentId) ? (
        <div style={{ ...neuCard, textAlign: 'center', padding: '100px 40px', color: 'var(--text-muted)' }}>
           <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Select a Student</h3>
           <p>Use the search above to audit a specific student's performance.</p>
        </div>
      ) : data?.type === 'STUDENT_DETAIL' ? (
        <>
          {/* Tab Switcher for Student Detail */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #d8dae3', paddingBottom: '12px' }}>
            <button 
              onClick={() => setSubView('ATTENDANCE')}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: subView === 'ATTENDANCE' ? 'var(--primary)' : 'transparent',
                color: subView === 'ATTENDANCE' ? '#fff' : 'var(--text-secondary)',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >Exams & Attendance</button>
            <button 
              onClick={() => setSubView('PROGRESS')}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: subView === 'PROGRESS' ? 'var(--primary)' : 'transparent',
                color: subView === 'PROGRESS' ? '#fff' : 'var(--text-secondary)',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >Learning Progress</button>
          </div>

          {selectedCourseId && (
            <div style={{ padding: '12px 20px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--accent)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Showing results filtered by: {courses.find((c: any) => c.id === selectedCourseId)?.name || 'Selected Course'}
            </div>
          )}
          {subView === 'ATTENDANCE' ? (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
                <div style={neuCard}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Total Presence</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--success)' }}>{data.summary?.attendanceCount || 0} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Days</span></div>
                </div>
                <div style={neuCard}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Avg. Exam Score</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--primary)' }}>{data.summary?.averageExamScore || 0}%</div>
                </div>
                <div style={neuCard}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Assessments Done</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)' }}>{data.summary?.examsTaken || 0}</div>
                </div>
              </div>

              {/* Exam History & Top Performers side-by-side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', marginBottom: '40px' }}>
                {/* Left Card: Exam History */}
                <div style={neuCard}>
                   <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>Exam History</h3>
                   {data.exams.length === 0 ? (
                     <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No exam data available{selectedCourseId ? ' for this course' : ''}.</p>
                   ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                       {data.exams.map((ex: any, i: number) => (
                         <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                           <div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{ex.title}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(ex.date).toLocaleDateString('en-GB')}</div>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                              {!ex.isEvaluated ? (
                                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>Pending</span>
                              ) : (
                                <div style={{ fontSize: '15px', fontWeight: 900, color: (ex.percentage || 0) >= 50 ? 'var(--success)' : 'var(--danger)' }}>
                                  {ex.percentage !== null ? `${ex.percentage.toFixed(0)}%` : 'N/A'}
                                </div>
                              )}
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                </div>

                {/* Right Card: Top Performers */}
                <div style={neuCard}>
                   <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>Top Performers</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(data.topPerformers || []).map((p: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                           <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>{i+1}</div>
                           <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                           </div>
                           <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--primary)' }}>{p.average}%</div>
                        </div>
                      ))}
                      {(!data.topPerformers || data.topPerformers.length === 0) && (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px' }}>No rankings available yet.</p>
                      )}
                   </div>
                </div>
              </div>

              {/* Attendance Heatmap */}
              <div style={{ ...neuCard, marginBottom: '40px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px' }}>Attendance Heatmap (Last 30 Days)</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {last30Days.map(date => {
                       const hasLog = data.attendance?.some((l: any) => l.timestamp.split('T')[0] === date)
                       return (
                         <div 
                           key={date} 
                           title={date}
                           style={{ 
                             width: '24px', height: '24px', borderRadius: '6px', 
                             background: hasLog ? 'var(--success)' : '#fff',
                             boxShadow: ' inset 1px 1px 2px rgba(0,0,0,0.05)',
                             border: '1px solid rgba(0,0,0,0.02)'
                           }} 
                         />
                       )
                    })}
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '12px', height: '12px', background: 'var(--success)', borderRadius: '3px' }} /> Present
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '12px', height: '12px', background: '#fff', border: '1px solid #c5c7cf', borderRadius: '3px' }} /> Absent
                    </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Learning Progress View */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
                <div style={{ ...neuCard, borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Completed</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--success)' }}>{data.progress?.completed || 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Lectures finished</div>
                </div>
                <div style={{ ...neuCard, borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Needs Rewatch</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--warning)' }}>{data.progress?.rewatch || 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Marked for review</div>
                </div>
                <div style={{ ...neuCard, borderLeft: '4px solid #9999b0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Yet to Start</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)' }}>{data.progress?.neverSeen || 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Not yet accessed</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '32px' }}>
                <div style={neuCard}>
                   <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '24px' }}>Progress Distribution</h3>
                   <div style={{ height: '300px', width: '100%' }}>
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
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#f59e0b" />
                            <Cell fill="#c5c7cf" />
                          </Pie>
                          <Tooltip 
                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div style={{ ...neuCard, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ 
                      width: '120px', height: '120px', borderRadius: '50%', 
                      background: 'var(--surface-2)', boxShadow: 'var(--shadow-inset)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '24px', position: 'relative'
                    }}>
                       <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>{data.progress?.percentage || 0}%</div>
                       <div style={{ position: 'absolute', bottom: '-10px', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completion</div>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Keep it up!</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                      {data.progress?.percentage === 100 
                        ? "Amazing! You've successfully finished all lectures in this scope." 
                        : `You have completed ${data.progress?.completed} out of ${data.progress?.total} lectures. Stay consistent!`}
                    </p>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <div style={{ ...neuCard, textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
           <p>No analytics data available for this view.</p>
        </div>
      )}
    </div>
  )
}
