'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { allowsMultipleAttempts, EXAM_RESULT_REFRESH_INTERVAL_MS, isFinalTest } from '@/lib/exam-policy'
import ExamTimingStatus from '@/components/exams/ExamTimingStatus'
import { getExamTimingState } from '@/lib/date-utils'
import { RichTextDisplay } from '@/components/ui/RichTextDisplay'

export default function ExamDetailPage({ params }: { params: { id: string } }) {
  const { confirm, confirmDialog } = useConfirmDialog()
  const router = useRouter()
  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [evaluatingAttempt, setEvaluatingAttempt] = useState<any>(null)
  const [evaluations, setEvaluations] = useState<Record<string, { marks: number, feedback: string }>>({})
  const [examFeedback, setExamFeedback] = useState('')
  const [bonusMarks, setBonusMarks] = useState(0)
  const [publishImmediately, setPublishImmediately] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [showExamEditor, setShowExamEditor] = useState(false)
  const [savingExam, setSavingExam] = useState(false)
  const [showQuestionEditor, setShowQuestionEditor] = useState(false)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null)
  const [savingQuestions, setSavingQuestions] = useState(false)
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    startDate: '',
    expiresAt: '',
    durationMinutes: '60'
  })
  const [questionForm, setQuestionForm] = useState({
    text: '',
    type: 'MCQ',
    options: ['', ''],
    correctAnswer: '',
    explanation: '',
    marks: 1,
    imageUrl: '',
    questionBankId: ''
  })

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, EXAM_RESULT_REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
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

  function formatDateTimeForDisplay(value?: string | null) {
    if (!value) return ''
    // Return the value as-is (stored in user's local timezone)
    return value.slice(0, 16) || ''
  }

  function openExamEditor() {
    setExamForm({
      title: exam.title || '',
      description: exam.description || '',
      startDate: formatDateTimeForDisplay(exam.startDate),
      expiresAt: formatDateTimeForDisplay(exam.expiresAt),
      durationMinutes: String(exam.durationMinutes || 60)
    })
    setShowExamEditor(true)
  }

  function openQuestionEditor(question?: any, index?: number) {
    let options = ['', '']
    if (question?.type === 'TRUE_FALSE') {
      options = ['True', 'False']
    } else if (question?.options) {
      try {
        const parsed = typeof question.options === 'string' ? JSON.parse(question.options) : question.options
        if (Array.isArray(parsed) && parsed.length > 0) {
          options = parsed
        }
      } catch {
        options = ['', '']
      }
    }

    setQuestionForm({
      text: question?.text || '',
      type: question?.type || 'MCQ',
      options,
      correctAnswer: question?.correctAnswer || '',
      explanation: question?.explanation || '',
      marks: question?.marks || 1,
      imageUrl: question?.imageUrl || '',
      questionBankId: question?.questionBankId || ''
    })
    setEditingQuestionIndex(index ?? null)
    setShowQuestionEditor(true)
  }

  async function saveExamDetails() {
    if (!examForm.title || !examForm.expiresAt || !examForm.durationMinutes) {
      alert('Please fill title, end date, and duration.')
      return
    }

    if (examForm.startDate && new Date(examForm.expiresAt) <= new Date(examForm.startDate)) {
      alert('End date must be later than the start date.')
      return
    }

    setSavingExam(true)
    try {
      const res = await fetch(`/api/exams/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: examForm.title,
          description: examForm.description,
          startDate: examForm.startDate ? `${examForm.startDate}:00.000Z` : null,
          expiresAt: `${examForm.expiresAt}:00.000Z`,
          durationMinutes: parseInt(examForm.durationMinutes, 10)
        })
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to update exam')
        return
      }

      setShowExamEditor(false)
      await loadData()
    } catch (error) {
      console.error(error)
      alert('Failed to update exam')
    } finally {
      setSavingExam(false)
    }
  }

  async function saveQuestionSet(nextQuestions: any[]) {
    setSavingQuestions(true)
    try {
      const res = await fetch(`/api/exams/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: nextQuestions.map((q, index) => ({
            text: q.text,
            type: q.type,
            options: (q.type === 'MCQ' || q.type === 'MSQ' || q.type === 'TRUE_FALSE')
              ? (Array.isArray(q.options) ? q.options : (() => {
                  try {
                    return JSON.parse(q.options || '[]')
                  } catch {
                    return []
                  }
                })())
              : null,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            marks: q.marks,
            imageUrl: q.imageUrl,
            questionBankId: q.questionBankId,
            order: index
          }))
        })
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to update questions')
        return false
      }

      setShowQuestionEditor(false)
      setEditingQuestionIndex(null)
      await loadData()
      return true
    } catch (error) {
      console.error(error)
      alert('Failed to update questions')
      return false
    } finally {
      setSavingQuestions(false)
    }
  }

  async function handleSaveQuestion() {
    if (!questionForm.text || !questionForm.correctAnswer) {
      alert('Please fill question text and correct answer.')
      return
    }

    const normalizedQuestion = {
      ...questionForm,
      options: questionForm.type === 'TRUE_FALSE'
        ? ['True', 'False']
        : questionForm.options
    }

    const nextQuestions = [...(exam.questions || [])]
    if (editingQuestionIndex === null) {
      nextQuestions.push(normalizedQuestion)
    } else {
      nextQuestions[editingQuestionIndex] = normalizedQuestion
    }

    const updated = await saveQuestionSet(nextQuestions)
    if (updated) {
      setQuestionForm({
        text: '',
        type: 'MCQ',
        options: ['', ''],
        correctAnswer: '',
        explanation: '',
        marks: 1,
        imageUrl: '',
        questionBankId: ''
      })
    }
  }

  async function handleDeleteQuestion(index: number) {
    const allowed = await confirm({
      title: 'Delete Question?',
      message: 'This question will be removed from the exam.',
      confirmLabel: 'Delete Question',
      tone: 'danger',
    })
    if (!allowed) return

    const nextQuestions = exam.questions.filter((_: any, currentIndex: number) => currentIndex !== index)
    if (nextQuestions.length === 0) {
      alert('An exam must have at least one question.')
      return
    }

    await saveQuestionSet(nextQuestions)
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
          isPublished: publishImmediately,
          bonusMarks
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
  const timingState = exam ? getExamTimingState(exam.startDate, exam.expiresAt, now) : 'ended'
  const isExpired = timingState === 'ended'
  const isUpcoming = timingState === 'before'
  const canEditExam = isAdminOrManager && exam && !exam.isPublished
  const hasAttempts = (exam?.attempts?.length || 0) > 0
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
         {confirmDialog}
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
           <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e1e3a', margin: 0 }}>{exam.title} Management</h1>
                <span style={{ 
                  fontSize: '10px', fontWeight: 800, padding: '4px 12px', borderRadius: '50px',
                  background: isFinalTest(exam.examType) ? '#ef444415' : '#8b5cf612',
                  color: isFinalTest(exam.examType) ? '#ef4444' : '#8b5cf6',
                  border: `1px solid ${isFinalTest(exam.examType) ? '#ef444425' : '#8b5cf625'}`,
                  textTransform: 'uppercase', letterSpacing: '0.02em'
                }}>
                  {isFinalTest(exam.examType) ? 'Final Test' : 'Practice Test'}
                </span>
              </div>
              <p style={{ color: '#6b6b8a' }}>{exam.course?.name}</p>
              {canEditExam && (
                <p style={{ color: '#10b981', fontSize: '13px', fontWeight: 700, margin: '6px 0 0' }}>
                  This exam is unpublished. You can edit exam details, and question changes are allowed until attempts begin.
                </p>
              )}
            </div>
           <div style={{ display: 'flex', gap: '12px' }}>
              {canEditExam && (
                <button
                  onClick={openExamEditor}
                  style={{ padding: '10px 20px', borderRadius: '50px', background: '#3636e815', color: '#3636e8', border: 'none', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Edit Exam
                </button>
              )}
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
                const allowed = await confirm({
                  title: 'Delete Exam?',
                  message: 'This exam will be removed permanently.',
                  confirmLabel: 'Delete Exam',
                  tone: 'danger',
                })
                if (!allowed) return
                await fetch(`/api/exams/${params.id}`, { method: 'DELETE' })
                router.push('/exams')
              }} style={{ padding: '10px 20px', borderRadius: '50px', background: '#ef4444', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Delete Exam</button>
           </div>
         </div>

         <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            {/* Questions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <ExamTimingStatus startDate={exam.startDate} expiresAt={exam.expiresAt} />
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a', margin: 0 }}>Question Structure</h2>
                 {canEditExam && (
                   <button
                     onClick={() => openQuestionEditor()}
                     disabled={hasAttempts}
                     style={{ padding: '10px 18px', borderRadius: '50px', background: hasAttempts ? '#cbd5e1' : '#3636e8', color: '#fff', border: 'none', fontSize: '12px', fontWeight: 800, cursor: hasAttempts ? 'not-allowed' : 'pointer' }}
                   >
                     + Add Question
                   </button>
                 )}
               </div>
               {canEditExam && hasAttempts && (
                 <div style={{ padding: '12px 16px', borderRadius: '14px', background: '#f59e0b10', color: '#b45309', fontSize: '13px', fontWeight: 700 }}>
                   Question changes are locked because this exam already has attempts.
                 </div>
               )}
               {exam.questions.map((q: any, i: number) => (
                 <div key={q.id} style={{ ...neuCard, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#3636e8' }}>Q{i+1} - {q.type.replace('_', ' ')}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b6b8a' }}>{q.marks} Marks</span>
                        {canEditExam && !hasAttempts && (
                          <>
                            <button
                              onClick={() => openQuestionEditor(q, i)}
                              style={{ background: 'none', border: 'none', color: '#3636e8', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(i)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, color: '#1e1e3a', marginBottom: '8px' }}><RichTextDisplay text={q.text} /></div>
                    {q.options && (
                      <p style={{ fontSize: '12px', color: '#6b6b8a', marginTop: '10px' }}>
                        Options: {(() => {
                          try {
                            const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                            return Array.isArray(options) ? options.join(', ') : q.options
                          } catch {
                            return q.options
                          }
                        })()}
                      </p>
                    )}
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
                                  {a.user?.name || `Student ${a.userId.slice(-4)}`}
                                  {allowsMultipleAttempts(exam.examType) && (
                                    <span style={{ marginLeft: '8px', fontSize: '11px', color: '#3636e8', background: '#3636e810', padding: '2px 6px', borderRadius: '6px' }}>
                                      Attempt {exam.attempts.filter((att: any) => att.userId === a.userId && new Date(att.startedAt) <= new Date(a.startedAt)).length}
                                    </span>
                                  )}
                                </div>
                                {a.user?.email && (
                                  <div style={{ fontSize: '11px', color: '#9999b0' }}>
                                    {a.user.email}{a.user.securityNumber ? ` • ${a.user.securityNumber}` : ''}
                                  </div>
                                )}
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
                                   setBonusMarks(a.bonusMarks || 0)
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
                                   <span style={{ 
                                     fontSize: '11px', fontWeight: 900, 
                                     color: (() => {
                                       if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') return resp?.answer === q.correctAnswer
                                       if (q.type === 'MSQ') {
                                         try {
                                           const correct = JSON.parse(q.correctAnswer || '[]').sort()
                                           const student = JSON.parse(resp?.answer || '[]').sort()
                                           return JSON.stringify(correct) === JSON.stringify(student)
                                         } catch { return false }
                                       }
                                       if (q.type === 'NAT') return parseFloat(resp?.answer || '0') === parseFloat(q.correctAnswer || '0')
                                       return resp?.answer === q.correctAnswer
                                     })() ? '#10b981' : '#ef4444',
                                     background: (() => {
                                       if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') return resp?.answer === q.correctAnswer
                                       if (q.type === 'MSQ') {
                                         try {
                                           const correct = JSON.parse(q.correctAnswer || '[]').sort()
                                           const student = JSON.parse(resp?.answer || '[]').sort()
                                           return JSON.stringify(correct) === JSON.stringify(student)
                                         } catch { return false }
                                       }
                                       if (q.type === 'NAT') return parseFloat(resp?.answer || '0') === parseFloat(q.correctAnswer || '0')
                                       return resp?.answer === q.correctAnswer
                                     })() ? '#10b98110' : '#ef444410',
                                     padding: '4px 10px', borderRadius: '50px' 
                                   }}>
                                      {(() => {
                                         if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') return resp?.answer === q.correctAnswer
                                         if (q.type === 'MSQ') {
                                           try {
                                             const correct = JSON.parse(q.correctAnswer || '[]').sort()
                                             const student = JSON.parse(resp?.answer || '[]').sort()
                                             return JSON.stringify(correct) === JSON.stringify(student)
                                           } catch { return false }
                                         }
                                         if (q.type === 'NAT') return parseFloat(resp?.answer || '0') === parseFloat(q.correctAnswer || '0')
                                         return resp?.answer === q.correctAnswer
                                      })() ? 'AUTO: CORRECT' : 'AUTO: INCORRECT'}
                                   </span>
                                 )}
                              </div>
                              <div style={{ fontWeight: 700, color: '#1e1e3a', marginBottom: '12px' }}><RichTextDisplay text={q.text} /></div>
                              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #3636e8' }}>
                                 <div style={{ fontSize: '10px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase' }}>Answer</div>
                                 <div style={{ fontSize: '14px', color: '#1e1e3a' }}><RichTextDisplay text={resp?.answer || 'No answer'} /></div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px' }}>
                                 <div>
                                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#6b6b8a' }}>Marks</label>
                                    <input 
                                       type="number" 
                                       disabled={q.type === 'MCQ' || q.type === 'TRUE_FALSE'}
                                       value={evalData.marks}
                                       onChange={(e) => setEvaluations({...evaluations, [resp.id]: {...evalData, marks: parseFloat(e.target.value) || 0}})}
                                       style={{ 
                                         width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #c5c7cf',
                                         background: (q.type === 'MCQ' || q.type === 'TRUE_FALSE') ? '#f3f4f6' : '#fff',
                                         fontWeight: 700, color: '#1e1e3a',
                                         cursor: (q.type === 'MCQ' || q.type === 'TRUE_FALSE') ? 'not-allowed' : 'text'
                                       }} 
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

                      <div style={{ background: '#fff', padding: '24px', borderRadius: '20px', boxShadow: '4px 4px 10px #c5c7cf', marginTop: '20px' }}>
                         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' }}>
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                               <div style={{ fontSize: '10px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '4px' }}>Marks Summary</div>
                               <div style={{ fontSize: '20px', fontWeight: 900, color: '#1e1e3a' }}>
                                  {(Object.values(evaluations).reduce((acc, curr) => acc + curr.marks, 0) + bonusMarks).toFixed(1)}
                                  <span style={{ fontSize: '14px', color: '#9999b0', fontWeight: 700 }}> / {exam.questions.reduce((acc, q) => acc + q.marks, 0)}</span>
                               </div>
                            </div>
                            <div>
                               <label style={{ fontSize: '11px', fontWeight: 800, color: '#6b6b8a', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Bonus Points</label>
                               <input 
                                  type="number" 
                                  value={bonusMarks}
                                  onChange={(e) => setBonusMarks(parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #3636e820', fontWeight: 800, background: '#3636e805' }}
                                />
                            </div>
                         </div>

                         <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                               <label style={{ fontSize: '11px', fontWeight: 800, color: '#6b6b8a', textTransform: 'uppercase' }}>Instructor Overall Remarks</label>
                               <textarea 
                                  value={examFeedback}
                                  onChange={(e) => setExamFeedback(e.target.value)}
                                  rows={2} 
                                  placeholder="Final summary for student..."
                                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #c5c7cf', marginTop: '6px', fontSize: '14px' }}
                               />
                            </div>
                            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                               <input 
                                  type="checkbox" 
                                  id="publish-cb"
                                  checked={publishImmediately}
                                  onChange={(e) => setPublishImmediately(e.target.checked)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                               />
                               <label htmlFor="publish-cb" style={{ fontSize: '13px', fontWeight: 700, color: '#1e1e3a', cursor: 'pointer' }}>Publish Result</label>
                            </div>
                         </div>

                         <button 
                            onClick={handleEvaluateSubmit}
                            style={{ width: '100%', padding: '18px', borderRadius: '50px', background: '#3636e8', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 8px 16px rgba(54,54,232,0.3)', marginTop: '24px', fontSize: '15px' }}
                         >
                            Apply Evaluation & Save
                         </button>
                      </div>
                  </div>
               </div>
            </div>
         )}

         {showExamEditor && (
           <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
             <div style={{ ...neuCard, maxWidth: '700px', width: '100%' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e1e3a', margin: 0 }}>Edit Exam</h2>
                 <button onClick={() => setShowExamEditor(false)} style={{ background: 'none', border: 'none', color: '#6b6b8a', fontWeight: 800, cursor: 'pointer' }}>Close</button>
               </div>
               <div style={{ display: 'grid', gap: '16px' }}>
                 <input value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} placeholder="Exam title" style={{ padding: '12px 14px', borderRadius: '12px', border: 'none', background: '#fff' }} />
                 <textarea value={examForm.description} onChange={(e) => setExamForm({ ...examForm, description: e.target.value })} placeholder="Description" rows={3} style={{ padding: '12px 14px', borderRadius: '12px', border: 'none', background: '#fff', resize: 'vertical' }} />
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px', gap: '16px' }}>
                   <input type="datetime-local" value={examForm.startDate} onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })} style={{ padding: '12px 14px', borderRadius: '12px', border: 'none', background: '#fff' }} />
                   <input type="datetime-local" value={examForm.expiresAt} onChange={(e) => setExamForm({ ...examForm, expiresAt: e.target.value })} style={{ padding: '12px 14px', borderRadius: '12px', border: 'none', background: '#fff' }} />
                   <input type="number" min="1" value={examForm.durationMinutes} onChange={(e) => setExamForm({ ...examForm, durationMinutes: e.target.value })} style={{ padding: '12px 14px', borderRadius: '12px', border: 'none', background: '#fff' }} />
                 </div>
                 <button onClick={saveExamDetails} disabled={savingExam} style={{ padding: '14px 18px', borderRadius: '50px', border: 'none', background: '#3636e8', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                   {savingExam ? 'Saving...' : 'Save Exam Changes'}
                 </button>
               </div>
             </div>
           </div>
         )}

         {showQuestionEditor && (
           <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
             <div style={{ ...neuCard, maxWidth: '760px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e1e3a', margin: 0 }}>{editingQuestionIndex === null ? 'Add Question' : 'Edit Question'}</h2>
                 <button onClick={() => { setShowQuestionEditor(false); setEditingQuestionIndex(null) }} style={{ background: 'none', border: 'none', color: '#6b6b8a', fontWeight: 800, cursor: 'pointer' }}>Close</button>
               </div>
               <div style={{ display: 'grid', gap: '16px' }}>
                 <select value={questionForm.type} onChange={(e) => setQuestionForm({
                   ...questionForm,
                   type: e.target.value,
                   options: e.target.value === 'TRUE_FALSE' ? ['True', 'False'] : ['', ''],
                   correctAnswer: ''
                 })} style={{ padding: '12px 14px', borderRadius: '12px', border: 'none', background: '#fff' }}>
                   <option value="MCQ">Multiple Choice</option>
                   <option value="TRUE_FALSE">True / False</option>
                   <option value="SUBJECTIVE">Subjective</option>
                 </select>
                 <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                     <label style={{ fontSize: '13px', fontWeight: 800, color: '#6b6b8a', display: 'none' }}>Question Text</label>
                     <div />
                     <button
                       onClick={() => {
                         const lang = window.prompt("Enter programming language (optional, e.g., python, javascript):", "");
                         if (lang !== null) {
                           setQuestionForm({ ...questionForm, text: questionForm.text + `\n\`\`\`${lang}\n\n\`\`\`\n` });
                         }
                       }}
                       style={{ padding: '6px 12px', borderRadius: '8px', background: '#3636e810', border: 'none', color: '#3636e8', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                     >
                       {`</> Insert Code Block`}
                     </button>
                   </div>
                   <textarea value={questionForm.text} onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })} placeholder="Question text" rows={4} style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: 'none', background: '#fff', resize: 'vertical' }} />
                 </div>
                 {(questionForm.type === 'MCQ' || questionForm.type === 'TRUE_FALSE') && (
                   <div style={{ display: 'grid', gap: '12px' }}>
                     {(questionForm.type === 'TRUE_FALSE' ? ['True', 'False'] : questionForm.options).map((option, index) => (
                       <div key={`${option}-${index}`} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                         <input
                           type="radio"
                           checked={questionForm.correctAnswer === option}
                           onChange={() => setQuestionForm({ ...questionForm, correctAnswer: option })}
                         />
                         {questionForm.type === 'TRUE_FALSE' ? (
                           <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#fff', flex: 1 }}>{option}</div>
                         ) : (
                           <input
                             value={option}
                             onChange={(e) => {
                               const nextOptions = [...questionForm.options]
                               nextOptions[index] = e.target.value
                               setQuestionForm({ ...questionForm, options: nextOptions })
                             }}
                             placeholder={`Option ${index + 1}`}
                             style={{ padding: '12px 14px', borderRadius: '12px', border: 'none', background: '#fff', flex: 1 }}
                           />
                         )}
                       </div>
                     ))}
                     {questionForm.type === 'MCQ' && questionForm.options.length < 6 && (
                       <button onClick={() => setQuestionForm({ ...questionForm, options: [...questionForm.options, ''] })} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px dashed #3636e8', background: 'transparent', color: '#3636e8', fontWeight: 700, cursor: 'pointer' }}>
                         Add Option
                       </button>
                     )}
                   </div>
                 )}
                 {questionForm.type === 'SUBJECTIVE' && (
                   <textarea value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })} placeholder="Reference answer / keywords" rows={3} style={{ padding: '12px 14px', borderRadius: '12px', border: 'none', background: '#fff', resize: 'vertical' }} />
                 )}
                 <input value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} placeholder="Explanation (optional)" style={{ padding: '12px 14px', borderRadius: '12px', border: 'none', background: '#fff' }} />
                 <input type="number" min="1" value={questionForm.marks} onChange={(e) => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value, 10) || 1 })} placeholder="Marks" style={{ padding: '12px 14px', borderRadius: '12px', border: 'none', background: '#fff' }} />
                 <button onClick={handleSaveQuestion} disabled={savingQuestions} style={{ padding: '14px 18px', borderRadius: '50px', border: 'none', background: '#3636e8', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                   {savingQuestions ? 'Saving...' : 'Save Question'}
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
       {confirmDialog}
       <div style={{ ...neuCard, maxWidth: '900px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1e1e3a', marginBottom: '8px' }}>{exam.title}</h1>
          <p style={{ color: '#6b6b8a', marginBottom: '24px' }}>{exam.course?.name}</p>

          <div style={{ marginBottom: '24px' }}>
            <ExamTimingStatus startDate={exam.startDate} expiresAt={exam.expiresAt} />
          </div>

          <div style={{ textAlign: 'left', marginBottom: '24px', padding: '16px', borderRadius: '12px', background: exam.examType === 'FINAL_TEST' ? '#ef444410' : '#10b98110', borderLeft: `4px solid ${exam.examType === 'FINAL_TEST' ? '#ef4444' : '#10b981'}` }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: exam.examType === 'FINAL_TEST' ? '#ef4444' : '#10b981', marginBottom: '8px' }}>
                      {isFinalTest(exam.examType) ? 'Final Test Rules' : 'General Test Rules'}
            </h3>
            <ul style={{ fontSize: '13px', color: '#6b6b8a', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {isFinalTest(exam.examType) ? (
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
                     {allowsMultipleAttempts(exam.examType) && (
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
          ) : isUpcoming ? (
            <div style={{ padding: '20px', borderRadius: '20px', background: '#3636e810', border: '2px dashed #3636e8', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: '#3636e8', fontWeight: 800, fontSize: '15px' }}>Exam Not Started Yet</div>
              <p style={{ fontSize: '13px', color: '#6b6b8a', margin: 0 }}>You will be able to start this exam when the countdown reaches zero.</p>
            </div>
          ) : isExpired ? (
            <div style={{ padding: '16px', borderRadius: '50px', background: '#ef444410', color: '#ef4444', fontWeight: 700 }}>
              This exam has ended.
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
