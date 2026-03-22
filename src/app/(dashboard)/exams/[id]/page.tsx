'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ExamDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [evaluatingAttempt, setEvaluatingAttempt] = useState<any>(null)
  const [evaluations, setEvaluations] = useState<Record<string, { marks: number, feedback: string }>>({})
  const [examFeedback, setExamFeedback] = useState('')
  const [publishImmediately, setPublishImmediately] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [exRes, meRes] = await Promise.all([
        fetch(`/api/exams/${params.id}`),
        fetch('/api/auth/me')
      ])
      const exData = await exRes.json()
      const meData = await meRes.json()
      setExam(exData)
      setUserRole(meData.user?.role || meData.role || '')
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    try {
      const res = await fetch(`/api/exams/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !exam.isPublished })
      })
      if (res.ok) loadData()
    } catch (error) {
      console.error(error)
    }
  }

  const handleEvaluateSubmit = async () => {
    setLoading(true)
    try {
      const evalList = Object.entries(evaluations).map(([responseId, data]) => ({
        responseId,
        marks: data.marks,
        feedback: data.feedback
      }))

      const res = await fetch(`/api/exams/attempts/${evaluatingAttempt.id}/evaluate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          evaluations: evalList, 
          feedback: examFeedback,
          isPublished: publishImmediately
        })
      })

      if (res.ok) {
        setEvaluatingAttempt(null)
        loadData()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePublishAttempt = async (attemptId: string, currentState: boolean) => {
    try {
      const res = await fetch(`/api/exams/attempts/${attemptId}/publish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentState })
      })
      if (res.ok) loadData()
    } catch (error) {
      console.error(error)
    }
  }

  const isAdminOrManager = userRole === 'MANAGER' || userRole === 'ADMIN'
  const isExpired = exam ? new Date() > new Date(exam.expiresAt) : false
  const sortedAttempts = [...(exam?.attempts || [])].sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  const latestAttempt = sortedAttempts[0]

  // Shared Styles
  const neuCard: React.CSSProperties = {
    borderRadius: '20px', background: '#e8eaf0',
    boxShadow: '6px 6px 14px #c5c7cf, -6px -6px 14px #ffffff',
    padding: '32px',
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>

  if (isAdminOrManager) {
    return (
      <div style={{ padding: '32px' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e1e3a', margin: 0 }}>{exam.title} Management</h1>
                <span style={{ 
                  fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '6px',
                  background: exam.examType === 'FINAL_TEST' ? '#ef444420' : '#10b98120',
                  color: exam.examType === 'FINAL_TEST' ? '#ef4444' : '#10b981'
                }}>
                  {exam.examType === 'FINAL_TEST' ? 'FINAL TEST' : 'GENERAL TEST'}
                </span>
              </div>
              <p style={{ color: '#6b6b8a' }}>{exam.course?.name}</p>
            </div>
           <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={handlePublish}
                style={{ 
                  padding: '10px 20px', borderRadius: '50px', background: exam.isPublished ? '#ef444415' : '#10b98115', 
                  color: exam.isPublished ? '#ef4444' : '#10b981', border: 'none', fontSize: '13px', fontWeight: 800, cursor: 'pointer' 
                }}
              >
                {exam.isPublished ? 'Unpublish' : 'Publish'}
              </button>
              <button onClick={async () => {
                if (confirm('Are you sure you want to delete this exam?')) {
                  await fetch(`/api/exams/${params.id}`, { method: 'DELETE' })
                  router.push('/exams')
                }
              }} style={{ padding: '10px 20px', borderRadius: '50px', background: '#ef4444', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Delete Exam</button>
           </div>
         </div>

         <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            {/* Questions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a' }}>Question Structure</h2>
               {exam.questions.map((q: any, i: number) => (
                 <div key={q.id} style={{ ...neuCard, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#3636e8' }}>Q{i+1} - {q.type}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b6b8a' }}>{q.marks} Marks</span>
                    </div>
                    <p style={{ fontWeight: 600, color: '#1e1e3a' }}>{q.text}</p>
                 </div>
               ))}
            </div>

            {/* Submissions */}
            <div>
               <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a', marginBottom: '16px' }}>Submissions</h2>
               <div style={{ ...neuCard, padding: '16px' }}>
                  {exam.attempts?.length === 0 ? (
                    <p style={{ fontSize: '14px', color: '#9999b0', textAlign: 'center' }}>No submissions yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       {exam.attempts.map((a: any) => (
                         <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fff', borderRadius: '12px', boxShadow: '2px 2px 4px #c5c7cf' }}>
                             <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e1e3a' }}>
                                  Student {a.userId.slice(-4)}
                                  {exam.examType === 'GENERAL_TEST' && (
                                    <span style={{ marginLeft: '8px', fontSize: '11px', color: '#3636e8', background: '#3636e810', padding: '2px 6px', borderRadius: '6px' }}>
                                      Attempt {exam.attempts.filter((att: any) => att.userId === a.userId && new Date(att.startedAt) <= new Date(a.startedAt)).length}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6b6b8a', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span>{new Date(a.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                  {a.submittedAt ? (
                                    <>
                                      <span style={{ color: a.isEvaluated ? '#10b981' : '#3636e8', fontWeight: 700 }}>
                                        {a.isEvaluated ? 'Evaluated' : 'Needs Review'}
                                      </span>
                                      {a.isEvaluated && (
                                        <span 
                                          onClick={(e) => { e.stopPropagation(); handleTogglePublishAttempt(a.id, a.isPublished); }}
                                          style={{ 
                                            background: a.isPublished ? '#10b98120' : '#f59e0b20', 
                                            color: a.isPublished ? '#10b981' : '#f59e0b',
                                            padding: '2px 8px', borderRadius: '10px', fontSize: '9px', fontWeight: 800, cursor: 'pointer'
                                          }}
                                        >
                                          {a.isPublished ? 'PUBLISHED' : 'UNPUBLISHED'}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    'In Progress'
                                  )}
                                </div>
                             </div>
                             {a.submittedAt && (
                               <button 
                                 onClick={() => {
                                   setEvaluatingAttempt(a)
                                   const initialEvals: any = {}
                                   a.responses.forEach((r: any) => {
                                     initialEvals[r.id] = { marks: r.marks || 0, feedback: r.feedback || '' }
                                   })
                                   setEvaluations(initialEvals)
                                   setExamFeedback(a.feedback || '')
                                   setPublishImmediately(a.isPublished)
                                 }}
                                 style={{ background: 'none', border: 'none', color: '#3636e8', fontWeight: 800, cursor: 'pointer', fontSize: '12px' }}
                               >
                                 {a.isEvaluated ? 'Review' : 'Evaluate'}
                               </button>
                             )}
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            </div>
         </div>

         {/* Evaluation Overlay */}
         {evaluatingAttempt && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
               <div style={{ ...neuCard, maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#e8eaf0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                     <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e1e3a' }}>Evaluate Submission</h2>
                     <button onClick={() => setEvaluatingAttempt(null)} style={{ background: 'none', border: 'none', color: '#6b6b8a', fontWeight: 800, cursor: 'pointer' }}>Close</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                     {exam.questions.map((q: any) => {
                        const resp = evaluatingAttempt.responses.find((r: any) => r.questionId === q.id)
                        const evalData = evaluations[resp?.id] || { marks: 0, feedback: '' }

                        return (
                           <div key={q.id} style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '2px 2px 5px #c5c7cf' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                 <span style={{ fontSize: '12px', fontWeight: 800, color: '#6b6b8a' }}>{q.type} - Max {q.marks} Marks</span>
                                 {q.type !== 'SUBJECTIVE' && (
                                   <span style={{ fontSize: '12px', fontWeight: 800, color: resp?.answer === q.correctAnswer ? '#10b981' : '#ef4444' }}>
                                      {resp?.answer === q.correctAnswer ? 'Auto: Correct' : 'Auto: Incorrect'}
                                   </span>
                                 )}
                              </div>
                              <p style={{ fontWeight: 700, color: '#1e1e3a', marginBottom: '12px' }}>{q.text}</p>
                              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #3636e8' }}>
                                 <div style={{ fontSize: '10px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase' }}>Answer</div>
                                 <div style={{ fontSize: '14px', color: '#1e1e3a' }}>{resp?.answer || 'No answer'}</div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px' }}>
                                 <div>
                                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#6b6b8a' }}>Marks</label>
                                    <input 
                                      type="number" 
                                      value={evalData.marks}
                                      onChange={(e) => setEvaluations({...evaluations, [resp.id]: {...evalData, marks: parseInt(e.target.value)}})}
                                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #c5c7cf' }} 
                                    />
                                 </div>
                                 <div>
                                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#6b6b8a' }}>Feedback</label>
                                    <input 
                                      type="text" 
                                      value={evalData.feedback}
                                      onChange={(e) => setEvaluations({...evaluations, [resp.id]: {...evalData, feedback: e.target.value}})}
                                      placeholder="Note for student..."
                                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #c5c7cf' }} 
                                    />
                                 </div>
                              </div>
                           </div>
                        )
                     })}

                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ flex: 1, marginRight: '20px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 800, color: '#1e1e3a' }}>Overall Feedback</label>
                            <textarea 
                               value={examFeedback}
                               onChange={(e) => setExamFeedback(e.target.value)}
                               rows={2} 
                               style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #c5c7cf', marginTop: '6px' }}
                            />
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                               type="checkbox" 
                               id="publish-cb"
                               checked={publishImmediately}
                               onChange={(e) => setPublishImmediately(e.target.checked)}
                            />
                            <label htmlFor="publish-cb" style={{ fontSize: '13px', fontWeight: 700, color: '#1e1e3a', cursor: 'pointer' }}>Publish Result</label>
                         </div>
                      </div>

                     <button 
                        onClick={handleEvaluateSubmit}
                        style={{ width: '100%', padding: '16px', borderRadius: '50px', background: '#3636e8', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '4px 4px 10px rgba(54,54,232,0.35)' }}
                     >
                        Submit Evaluation
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
    )
  }

  // Student View
  return (
    <div style={{ padding: '64px 32px', display: 'flex', justifyContent: 'center' }}>
       <div style={{ ...neuCard, maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1e1e3a', marginBottom: '8px' }}>{exam.title}</h1>
          <p style={{ color: '#6b6b8a', marginBottom: '24px' }}>{exam.course?.name}</p>

          <div style={{ textAlign: 'left', marginBottom: '24px', padding: '16px', borderRadius: '12px', background: exam.examType === 'FINAL_TEST' ? '#ef444410' : '#10b98110', borderLeft: `4px solid ${exam.examType === 'FINAL_TEST' ? '#ef4444' : '#10b981'}` }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: exam.examType === 'FINAL_TEST' ? '#ef4444' : '#10b981', marginBottom: '8px' }}>
              {exam.examType === 'FINAL_TEST' ? 'Final Test Rules' : 'General Test Rules'}
            </h3>
            <ul style={{ fontSize: '13px', color: '#6b6b8a', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {exam.examType === 'FINAL_TEST' ? (
                <>
                  <li>Strict time limit enforced.</li>
                  <li>Only one attempt allowed.</li>
                  <li>Correct answers hidden until exam evaluates and finishes.</li>
                </>
              ) : (
                <>
                  <li>No strict time limit enforced.</li>
                  <li>Multiple attempts allowed (5 min cooldown).</li>
                  <li>Full result and correct answers shown immediately after submission.</li>
                </>
              )}
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
             <div style={{ padding: '16px', borderRadius: '16px', background: '#fff', boxShadow: '3px 3px 6px #c5c7cf' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase' }}>Questions</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a' }}>{exam.questions?.length}</div>
             </div>
             <div style={{ padding: '16px', borderRadius: '16px', background: '#fff', boxShadow: '3px 3px 6px #c5c7cf' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase' }}>Duration</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a' }}>{exam.durationMinutes}m</div>
             </div>
          </div>

           {latestAttempt?.submittedAt ? (
             <>
               {latestAttempt.isPublished || exam.examType === 'GENERAL_TEST' ? (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   <p style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', margin: 0 }}>
                     You scored {latestAttempt.totalMarks} points on your latest attempt.
                   </p>
                   <div style={{ display: 'flex', gap: '12px' }}>
                     <button
                        onClick={() => router.push(`/exams/${params.id}/result`)}
                        style={{ flex: 1, padding: '16px', borderRadius: '50px', border: 'none', background: '#3636e8', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '4px 4px 10px rgba(54,54,232,0.35)' }}
                     >
                       View Results
                     </button>
                     {exam.examType === 'GENERAL_TEST' && (
                       <button
                          onClick={() => router.push(`/exams/${params.id}/attempt`)}
                          style={{ flex: 1, padding: '16px', borderRadius: '50px', border: '2px solid #3636e8', background: 'transparent', color: '#3636e8', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
                       >
                         Retry Exam
                       </button>
                     )}
                   </div>
                 </div>
               ) : (
                 <div style={{ padding: '20px', borderRadius: '20px', background: '#f59e0b10', border: '2px dashed #f59e0b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ color: '#f59e0b', fontWeight: 800, fontSize: '15px' }}>Assessment Submitted</div>
                    <p style={{ fontSize: '13px', color: '#6b6b8a', margin: 0 }}>Your responses are being reviewed. Results will be visible once published by the instructor.</p>
                 </div>
               )}
             </>
          ) : isExpired ? (
            <div style={{ padding: '16px', borderRadius: '50px', background: '#ef444410', color: '#ef4444', fontWeight: 700 }}>
              This exam has expired.
            </div>
          ) : (
            <button
               onClick={() => router.push(`/exams/${params.id}/attempt`)}
               style={{ width: '100%', padding: '16px', borderRadius: '50px', border: 'none', background: '#3636e8', color: '#fff', fontSize: '16px', fontWeight: 800, cursor: 'pointer', boxShadow: '4px 4px 10px rgba(54,54,232,0.35)' }}
            >
              Start Exam Now
            </button>
          )}

          <button onClick={() => router.push('/exams')} style={{ background: 'none', border: 'none', color: '#6b6b8a', fontWeight: 600, fontSize: '14px', marginTop: '20px', cursor: 'pointer' }}>Cancel</button>
       </div>
    </div>
  )
}
