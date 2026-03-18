'use client'

import { useEffect, useState } from 'react'

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

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'OVERVIEW' | 'STUDENT_AUDIT'>('OVERVIEW')
  const [role, setRole] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(d => {
        const userRole = d.user?.role || ''
        setRole(userRole)
        if (userRole === 'MANAGER') {
          fetch('/api/students')
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) {
                setStudents(data)
              }
            })
          loadData()
        } else if (userRole) {
          loadData()
        }
      })
  }, [])

  useEffect(() => {
    if (role === 'MANAGER') {
      if (view === 'STUDENT_AUDIT' && selectedStudentId) {
        loadData(selectedStudentId)
      } else if (view === 'OVERVIEW') {
        loadData()
      } else if (view === 'STUDENT_AUDIT' && !selectedStudentId) {
        setData(null)
      }
    }
  }, [selectedStudentId, role, view])

  function loadData(studentId?: string) {
    setLoading(true)
    const url = studentId ? `/api/analytics?studentId=${studentId}` : '/api/analytics'
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

  const isManager = role === 'MANAGER'

  if (loading && !data && !isManager) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Analytics...</div>

  // Shared Styles
  const neuCard: React.CSSProperties = {
    borderRadius: '20px', background: '#e8eaf0',
    boxShadow: '6px 6px 14px #c5c7cf, -6px -6px 14px #ffffff',
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
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        {isManager && (
          <div style={{ display: 'flex', gap: '12px' }}>
             <button 
               onClick={() => setView('OVERVIEW')}
               style={{
                 padding: '10px 20px', borderRadius: '50px', border: 'none',
                 background: view === 'OVERVIEW' ? '#3636e8' : '#e8eaf0',
                 color: view === 'OVERVIEW' ? '#fff' : '#6b6b8a',
                 boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                 fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
               }}
             >Overview</button>
             <button 
               onClick={() => { setView('STUDENT_AUDIT'); setData(null); }}
               style={{
                 padding: '10px 20px', borderRadius: '50px', border: 'none',
                 background: view === 'STUDENT_AUDIT' ? '#3636e8' : '#e8eaf0',
                 color: view === 'STUDENT_AUDIT' ? '#fff' : '#6b6b8a',
                 boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                 fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
               }}
             >Student Audit</button>
          </div>
        )}
      </div>

      {isManager && view === 'STUDENT_AUDIT' && (
        <div style={{ ...neuCard, marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1, maxWidth: '500px' }}>
             <label style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Search Student</label>
             <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                   type="text" placeholder="Name or email..." value={studentSearch} 
                   onChange={(e) => setStudentSearch(e.target.value)}
                   style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: 'none', background: '#e8eaf0', boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff', outline: 'none' }}
                />
                <select 
                   value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}
                   style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: 'none', background: '#e8eaf0', boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff', outline: 'none' }}
                >
                   <option value="">-- Select Student --</option>
                   {students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <p style={{ fontSize: '12px', color: '#9999b0' }}>Audit selected student's attendance and exam history</p>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center', color: '#9999b0' }}>Analyzing data...</div>
      ) : data?.type === 'MANAGER_OVERVIEW' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
              <div style={neuCard}>
                 <div style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase' }}>Total Students</div>
                 <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e1e3a', marginTop: '8px' }}>{data.summary.totalStudents}</div>
              </div>
              <div style={neuCard}>
                 <div style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase' }}>Avg Performance</div>
                 <div style={{ fontSize: '24px', fontWeight: 900, color: '#3636e8', marginTop: '8px' }}>{data.summary.avgPlatformScore}%</div>
              </div>
              <div style={neuCard}>
                 <div style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase' }}>Submissions</div>
                 <div style={{ fontSize: '24px', fontWeight: 900, color: '#10b981', marginTop: '8px' }}>{data.summary.totalExams}</div>
              </div>
              <div style={neuCard}>
                 <div style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase' }}>Published Results</div>
                 <div style={{ fontSize: '24px', fontWeight: 900, color: '#f59e0b', marginTop: '8px' }}>{data.summary.totalCerts}</div>
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
                           <div style={{ fontSize: '12px', color: '#9999b0' }}>{s.exam}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                           <div style={{ fontSize: '11px', fontWeight: 800, color: s.status === 'Evaluated' ? '#10b981' : '#6366f1' }}>{s.status}</div>
                           <div style={{ fontSize: '10px', color: '#9999b0' }}>{new Date(s.date).toLocaleDateString()}</div>
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
                         <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3636e820', color: '#3636e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>{i+1}</div>
                         <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>{p.name}</div>
                            <div style={{ fontSize: '11px', color: '#9999b0' }}>{p.email}</div>
                         </div>
                         <div style={{ fontSize: '16px', fontWeight: 900, color: '#3636e8' }}>{p.average}%</div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      ) : (isManager && view === 'STUDENT_AUDIT' && !selectedStudentId) ? (
        <div style={{ ...neuCard, textAlign: 'center', padding: '100px 40px', color: '#9999b0' }}>
           <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e1e3a', marginBottom: '8px' }}>Select a Student</h3>
           <p>Use the search above to audit a specific student's performance.</p>
        </div>
      ) : data?.type === 'STUDENT_DETAIL' ? (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
            <div style={neuCard}>
               <div style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '8px' }}>Total Presence</div>
               <div style={{ fontSize: '28px', fontWeight: 900, color: '#10b981' }}>{data.summary?.attendanceCount || 0} <span style={{ fontSize: '14px', fontWeight: 600, color: '#9999b0' }}>Days</span></div>
            </div>
            <div style={neuCard}>
               <div style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '8px' }}>Avg. Exam Score</div>
               <div style={{ fontSize: '28px', fontWeight: 900, color: '#3636e8' }}>{data.summary?.averageExamScore || 0}%</div>
            </div>
            <div style={neuCard}>
               <div style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '8px' }}>Assessments Done</div>
               <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e1e3a' }}>{data.summary?.examsTaken || 0}</div>
            </div>
          </div>

          {/* Attendance Heatmap */}
          <div style={{ ...neuCard, marginBottom: '40px' }}>
             <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a', marginBottom: '20px' }}>Attendance Heatmap (Last 30 Days)</h2>
             <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {last30Days.map(date => {
                   const hasLog = data.attendance?.some((l: any) => l.timestamp.split('T')[0] === date)
                   return (
                     <div 
                       key={date} 
                       title={date}
                       style={{ 
                         width: '24px', height: '24px', borderRadius: '6px', 
                         background: hasLog ? '#10b981' : '#fff',
                         boxShadow: ' inset 1px 1px 2px rgba(0,0,0,0.05)',
                         border: '1px solid rgba(0,0,0,0.02)'
                       }} 
                     />
                   )
                })}
             </div>
             <div style={{ marginTop: '16px', display: 'flex', gap: '16px', fontSize: '12px', color: '#6b6b8a', fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '3px' }} /> Present
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <div style={{ width: '12px', height: '12px', background: '#fff', border: '1px solid #c5c7cf', borderRadius: '3px' }} /> Absent
                </div>
             </div>
          </div>

          {/* Exam Performance */}
          <div style={neuCard}>
             <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a', marginBottom: '20px' }}>Exam History</h2>
             {data.exams.length === 0 ? (
               <p style={{ textAlign: 'center', color: '#9999b0', padding: '24px' }}>No exam data available.</p>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.exams.map((ex: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#fff', borderRadius: '16px', boxShadow: '2px 2px 5px #c5c7cf' }}>
                       <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e1e3a' }}>{ex.title}</div>
                          <div style={{ fontSize: '12px', color: '#6b6b8a' }}>{new Date(ex.date).toLocaleDateString()}</div>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                           {!ex.isEvaluated ? (
                             <div style={{ 
                               fontSize: '11px', fontWeight: '800', color: '#6366f1', 
                               background: '#e0e7ff', padding: '4px 12px', borderRadius: '20px',
                               textTransform: 'uppercase', letterSpacing: '0.04em'
                             }}>
                               Pending Evaluation
                             </div>
                           ) : !ex.isPublished && !isManager ? (
                             <div style={{ 
                               fontSize: '11px', fontWeight: '800', color: '#f59e0b', 
                               background: '#fef3c7', padding: '4px 12px', borderRadius: '20px',
                               textTransform: 'uppercase', letterSpacing: '0.04em'
                             }}>
                               Result Not Published
                             </div>
                           ) : (
                             <>
                               <div style={{ fontSize: '18px', fontWeight: 900, color: (ex.percentage || 0) >= 50 ? '#10b981' : '#ef4444' }}>
                                  {ex.percentage !== null ? `${ex.percentage.toFixed(0)}%` : 'N/A'}
                               </div>
                               <div style={{ fontSize: '11px', fontWeight: 700, color: '#9999b0' }}>
                                  {ex.score !== null ? `${ex.score} / ${ex.total}` : '-- / --'} Marks
                               </div>
                               {!ex.isPublished && isManager && (
                                 <div style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
                                    (Admin Only: Not Published)
                                 </div>
                               )}
                             </>
                           )}
                        </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        </>
      ) : (
        <div style={{ ...neuCard, textAlign: 'center', padding: '40px', color: '#9999b0' }}>
           <p>No analytics data available for this view.</p>
        </div>
      )}
    </div>
  )
}
