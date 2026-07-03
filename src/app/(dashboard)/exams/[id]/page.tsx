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
  const [showCodeModal, setShowCodeModal] = useState<{ language: string } | null>(null)
  const [codeSnippet, setCodeSnippet] = useState('')

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
    // Convert stored UTC date to local datetime-local format
    const d = new Date(value)
    if (isNaN(d.getTime())) return ''
    // datetime-local format: YYYY-MM-DDTHH:MM
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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

  const handleImageUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'exams')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.url) {
        setQuestionForm(prev => ({ ...prev, imageUrl: data.url }))
      }
    } catch (error) {
      console.error('Image upload failed', error)
    }
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
          startDate: examForm.startDate ? new Date(examForm.startDate).toISOString() : null,
          expiresAt: new Date(examForm.expiresAt).toISOString(),
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
    borderRadius: '20px', background: 'var(--surface-2)',
    boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
    padding: '32px',
  }

  if (loading) {
    return (
      <div style={{ padding: '32px' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
           <div style={{ width: '50%' }}>
             <div className="skeleton" style={{ height: '32px', width: '80%', marginBottom: '12px', borderRadius: '6px' }} />
             <div className="skeleton" style={{ height: '16px', width: '35%', borderRadius: '4px' }} />
           </div>
           <div style={{ display: 'flex', gap: '12px' }}>
             <div className="skeleton" style={{ height: '40px', width: '100px', borderRadius: '50px' }} />
             <div className="skeleton" style={{ height: '40px', width: '100px', borderRadius: '50px' }} />
           </div>
         </div>

         <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
             <div style={{ ...neuCard, padding: '32px' }}>
               <div className="skeleton" style={{ height: '24px', width: '40%', marginBottom: '20px', borderRadius: '6px' }} />
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 <div className="skeleton" style={{ height: '14px', width: '100%', borderRadius: '4px' }} />
                 <div className="skeleton" style={{ height: '14px', width: '90%', borderRadius: '4px' }} />
                 <div className="skeleton" style={{ height: '14px', width: '85%', borderRadius: '4px' }} />
                 <div className="skeleton" style={{ height: '14px', width: '95%', borderRadius: '4px' }} />
               </div>
             </div>
             
             <div style={{ ...neuCard, padding: '32px' }}>
               <div className="skeleton" style={{ height: '24px', width: '35%', marginBottom: '20px', borderRadius: '6px' }} />
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 {[1, 2, 3].map(i => (
                   <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div className="skeleton" style={{ height: '16px', width: '40%', borderRadius: '4px' }} />
                     <div className="skeleton" style={{ height: '20px', width: '20%', borderRadius: '50px' }} />
                   </div>
                 ))}
               </div>
             </div>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
             <div style={{ ...neuCard, padding: '32px' }}>
               <div className="skeleton" style={{ height: '20px', width: '50%', marginBottom: '16px', borderRadius: '6px' }} />
               <div className="skeleton" style={{ height: '48px', width: '100%', borderRadius: '12px' }} />
             </div>
           </div>
         </div>
      </div>
    )
  }

  if (isAdminOrManager) {
    return (
      <div style={{ padding: '32px' }}>
         {confirmDialog}
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
           <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{exam.title} Management</h1>
                <span style={{ 
                  fontSize: '10px', fontWeight: 800, padding: '4px 12px', borderRadius: '50px',
                  background: isFinalTest(exam.examType) ? 'var(--danger-light)' : 'var(--primary-light)',
                  color: isFinalTest(exam.examType) ? 'var(--danger)' : 'var(--accent)',
                  border: `1px solid ${isFinalTest(exam.examType) ? 'var(--danger-light)' : 'var(--primary-light)'}`,
                  textTransform: 'uppercase', letterSpacing: '0.02em'
                }}>
                  {isFinalTest(exam.examType) ? 'Final Test' : 'Practice Test'}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>{exam.course?.name}</p>
              {canEditExam && (
                <p style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 700, margin: '6px 0 0' }}>
                  This exam is unpublished. You can edit exam details, and question changes are allowed until attempts begin.
                </p>
              )}
            </div>
           <div style={{ display: 'flex', gap: '12px' }}>
              {canEditExam && (
                <button
                  onClick={openExamEditor}
                  style={{ padding: '10px 20px', borderRadius: '50px', background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Edit Exam
                </button>
              )}
              <button 
                onClick={handlePublish}
                style={{ 
                  padding: '10px 20px', borderRadius: '50px', background: exam.isPublished ? 'var(--danger-light)' : 'var(--success-light)', 
                  color: exam.isPublished ? 'var(--danger)' : 'var(--success)', border: 'none', fontSize: '13px', fontWeight: 800, cursor: 'pointer' 
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
              }} style={{ padding: '10px 20px', borderRadius: '50px', background: 'var(--danger)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Delete Exam</button>
           </div>
         </div>

         <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            {/* Questions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <ExamTimingStatus startDate={exam.startDate} expiresAt={exam.expiresAt} />
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Question Structure</h2>
                 {canEditExam && (
                   <button
                     onClick={() => openQuestionEditor()}
                     disabled={hasAttempts}
                     style={{ padding: '10px 18px', borderRadius: '50px', background: hasAttempts ? 'var(--text-muted)' : 'var(--primary)', color: '#fff', border: 'none', fontSize: '12px', fontWeight: 800, cursor: hasAttempts ? 'not-allowed' : 'pointer' }}
                   >
                     + Add Question
                   </button>
                 )}
               </div>
               {canEditExam && hasAttempts && (
                 <div style={{ padding: '12px 16px', borderRadius: '14px', background: 'var(--warning-light)', color: 'var(--warning)', fontSize: '13px', fontWeight: 700 }}>
                   Question changes are locked because this exam already has attempts.
                 </div>
               )}
               {exam.questions.map((q: any, i: number) => (
                 <div key={q.id} style={{ ...neuCard, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)' }}>Q{i+1} - {q.type.replace('_', ' ')}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>{q.marks} Marks</span>
                        {canEditExam && !hasAttempts && (
                          <>
                            <button
                              onClick={() => openQuestionEditor(q, i)}
                              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(i)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}><RichTextDisplay text={q.text} /></div>
                    {q.imageUrl && (
                      <div style={{ marginTop: '12px', marginBottom: '12px', maxWidth: '300px', borderRadius: '8px', overflow: 'hidden' }}>
                        <img src={q.imageUrl} alt="Question Graphic" style={{ width: '100%', height: 'auto', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px' }} />
                      </div>
                    )}
                    {q.options && (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px' }}>
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
               <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>Submissions</h2>
               <div style={{ ...neuCard, padding: '16px' }}>
                  {exam.attempts?.length === 0 ? (
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>No submissions yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       {exam.attempts.map((a: any) => (
                         <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--surface)', borderRadius: '12px', boxShadow: '2px 2px 4px var(--neu-dark)' }}>
                             <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {a.user?.name || `Student ${a.userId.slice(-4)}`}
                                  {allowsMultipleAttempts(exam.examType) && (
                                    <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 6px', borderRadius: '6px' }}>
                                      Attempt {exam.attempts.filter((att: any) => att.userId === a.userId && new Date(att.startedAt) <= new Date(a.startedAt)).length}
                                    </span>
                                  )}
                                </div>
                                {a.user?.email && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {a.user.email}{a.user.securityNumber ? ` • ${a.user.securityNumber}` : ''}
                                  </div>
                                )}
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span>{new Date(a.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                  {a.submittedAt ? (
                                    <>
                                      <span style={{ color: a.isEvaluated ? 'var(--success)' : 'var(--primary)', fontWeight: 700 }}>
                                        {a.isEvaluated ? 'Evaluated' : 'Needs Review'}
                                      </span>
                                      {a.isEvaluated && (
                                        <span 
                                          onClick={(e) => { e.stopPropagation(); handleTogglePublishAttempt(a.id, a.isPublished); }}
                                          style={{ 
                                            background: a.isPublished ? 'var(--success-light)' : 'var(--warning-light)', 
                                            color: a.isPublished ? 'var(--success)' : 'var(--warning)',
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
                                 style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer', fontSize: '12px' }}
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
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }} onClick={() => setEvaluatingAttempt(null)}>
               <div className="modal" style={{ maxWidth: 'min(800px, calc(100vw - 32px))', width: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: 'clamp(16px, 4vw, 32px)' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                     <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Evaluate Submission</h2>
                     <button onClick={() => setEvaluatingAttempt(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: 800, cursor: 'pointer' }}>Close</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                     {exam.questions.map((q: any) => {
                        const resp = evaluatingAttempt.responses.find((r: any) => r.questionId === q.id)
                        const evalData = evaluations[resp?.id] || { marks: 0, feedback: '' }

                        return (
                           <div key={q.id} style={{ background: 'var(--surface)', padding: '20px', borderRadius: '16px', boxShadow: '2px 2px 5px var(--neu-dark)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                 <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>{q.type} - Max {q.marks} Marks</span>
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
                                     })() ? 'var(--success)' : 'var(--danger)',
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
                                     })() ? 'var(--success-light)' : 'var(--danger-light)',
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
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}><RichTextDisplay text={q.text} /></div>
                              {q.imageUrl && (
                                <div style={{ marginBottom: '16px', maxWidth: '300px', borderRadius: '8px', overflow: 'hidden' }}>
                                  <img src={q.imageUrl} alt="Question Graphic" style={{ width: '100%', height: 'auto', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px' }} />
                                </div>
                              )}
                              <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #3636e8' }}>
                                 <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Answer</div>
                                 <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}><RichTextDisplay text={resp?.answer || 'No answer'} /></div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px' }}>
                                 <div>
                                    <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>Marks</label>
                                    <input 
                                       type="number" 
                                       disabled={q.type === 'MCQ' || q.type === 'TRUE_FALSE'}
                                       value={evalData.marks}
                                       onChange={(e) => setEvaluations({...evaluations, [resp.id]: {...evalData, marks: parseFloat(e.target.value) || 0}})}
                                       className="form-input"
                                       style={{ 
                                         fontWeight: 700, color: 'var(--text-primary)',
                                         cursor: (q.type === 'MCQ' || q.type === 'TRUE_FALSE') ? 'not-allowed' : 'text'
                                       }} 
                                    />
                                 </div>
                                 <div>
                                    <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>Feedback</label>
                                    <input 
                                      type="text" 
                                      value={evalData.feedback}
                                      onChange={(e) => setEvaluations({...evaluations, [resp.id]: {...evalData, feedback: e.target.value}})}
                                      placeholder="Note for student..."
                                      className="form-input"
                                    />
                                 </div>
                              </div>
                           </div>
                        )
                     })}

                      <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: '4px 4px 10px var(--neu-dark)', marginTop: '20px' }}>
                         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' }}>
                            <div style={{ padding: '16px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
                               <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Marks Summary</div>
                               <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)' }}>
                                  {(Object.values(evaluations).reduce((acc, curr) => acc + curr.marks, 0) + bonusMarks).toFixed(1)}
                                  <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 700 }}> / {exam.questions.reduce((acc, q) => acc + q.marks, 0)}</span>
                               </div>
                            </div>
                            <div>
                               <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Bonus Points</label>
                               <input 
                                  type="number" 
                                  value={bonusMarks}
                                  onChange={(e) => setBonusMarks(parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="form-input"
                                  style={{ fontWeight: 800 }}
                                />
                            </div>
                         </div>

                         <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                               <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Instructor Overall Remarks</label>
                               <textarea 
                                  className="form-input"
                                  value={examFeedback}
                                  onChange={(e) => setExamFeedback(e.target.value)}
                                  rows={2} 
                                  placeholder="Final summary for student..."
                                  style={{ marginTop: '6px', fontSize: '14px' }}
                               />
                            </div>
                            <div style={{ padding: '20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                               <input 
                                  type="checkbox" 
                                  id="publish-cb"
                                  checked={publishImmediately}
                                  onChange={(e) => setPublishImmediately(e.target.checked)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                               />
                               <label htmlFor="publish-cb" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>Publish Result</label>
                            </div>
                         </div>

                         <button 
                            onClick={handleEvaluateSubmit}
                            style={{ width: '100%', padding: '18px', borderRadius: '50px', background: 'var(--primary)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 8px 16px rgba(54,54,232,0.3)', marginTop: '24px', fontSize: '15px' }}
                         >
                            Apply Evaluation & Save
                         </button>
                      </div>
                  </div>
               </div>
            </div>
         )}

         {showExamEditor && (
           <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }} onClick={() => setShowExamEditor(false)}>
             <div className="modal" style={{ maxWidth: 'min(700px, calc(100vw - 32px))', width: '100%', padding: 'clamp(16px, 4vw, 32px)' }} onClick={e => e.stopPropagation()}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Edit Exam</h2>
                 <button onClick={() => setShowExamEditor(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: 800, cursor: 'pointer' }}>Close</button>
               </div>
               <div style={{ display: 'grid', gap: '16px' }}>
                 <input className="form-input" value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} placeholder="Exam title" />
                 <textarea className="form-input" value={examForm.description} onChange={(e) => setExamForm({ ...examForm, description: e.target.value })} placeholder="Description" rows={3} style={{ resize: 'vertical' }} />
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                   <input className="form-input" type="datetime-local" value={examForm.startDate} onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })} />
                   <input className="form-input" type="datetime-local" value={examForm.expiresAt} onChange={(e) => setExamForm({ ...examForm, expiresAt: e.target.value })} />
                   <input className="form-input" type="number" min="1" value={examForm.durationMinutes} onChange={(e) => setExamForm({ ...examForm, durationMinutes: e.target.value })} />
                 </div>
                 <button onClick={saveExamDetails} disabled={savingExam} style={{ padding: '14px 18px', borderRadius: '50px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                   {savingExam ? 'Saving...' : 'Save Exam Changes'}
                 </button>
               </div>
             </div>
           </div>
         )}

         {showQuestionEditor && (
           <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }} onClick={() => { setShowQuestionEditor(false); setEditingQuestionIndex(null) }}>
             <div className="modal" style={{ maxWidth: 'min(760px, calc(100vw - 32px))', width: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: 'clamp(16px, 4vw, 32px)' }} onClick={e => e.stopPropagation()}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{editingQuestionIndex === null ? 'Add Question' : 'Edit Question'}</h2>
                 <button onClick={() => { setShowQuestionEditor(false); setEditingQuestionIndex(null) }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: 800, cursor: 'pointer' }}>Close</button>
               </div>
               <div style={{ display: 'grid', gap: '16px' }}>
                 <select className="form-input" value={questionForm.type} onChange={(e) => setQuestionForm({
                   ...questionForm,
                   type: e.target.value,
                   options: e.target.value === 'TRUE_FALSE' ? ['True', 'False'] : ['', ''],
                   correctAnswer: ''
                 })}>
                   <option value="MCQ">Multiple Choice</option>
                   <option value="TRUE_FALSE">True / False</option>
                   <option value="SUBJECTIVE">Subjective</option>
                 </select>
                 <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                     <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)', display: 'none' }}>Question Text</label>
                   </div>
                   <textarea 
                     className="form-input"
                     value={questionForm.text.split('```')[0].trim()} 
                     onChange={(e) => {
                       const newText = e.target.value;
                       const currentParts = questionForm.text.split('```');
                       if (currentParts.length >= 3) {
                         const codePart = '```' + currentParts.slice(1).join('```');
                         setQuestionForm({ ...questionForm, text: newText + (newText ? '\n\n' : '') + codePart });
                       } else {
                         setQuestionForm({ ...questionForm, text: newText });
                       }
                     }} 
                     placeholder="Question text" 
                     rows={4} 
                     style={{ resize: 'vertical', minHeight: '100px' }} 
                   />
                   {questionForm.text.includes('```') && (
                     <div style={{ marginTop: '16px', background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                         <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Code Preview</span>
                         <button 
                           type="button" 
                           onClick={() => {
                             const textOnly = questionForm.text.split('```')[0].trim();
                             setQuestionForm({ ...questionForm, text: textOnly });
                           }}
                           style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                         >
                           REMOVE CODE
                         </button>
                       </div>
                       <RichTextDisplay text={'```' + questionForm.text.split('```').slice(1).join('```')} />
                     </div>
                   )}
                   <div style={{ marginTop: '16px', background: 'var(--surface)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.6)' }}>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '10px' }}>Attachment (Optional)</label>
                       
                       {(questionForm.imageUrl && questionForm.text.includes('```')) && (
                         <div style={{ padding: '8px 12px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, marginBottom: '12px' }}>
                           Please choose one: Question Image or Code
                         </div>
                       )}

                       <div style={{ display: 'flex', gap: '24px' }}>
                         <div style={{ opacity: questionForm.text.includes('```') ? 0.5 : 1, pointerEvents: questionForm.text.includes('```') ? 'none' : 'auto' }}>
                           <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Image Upload</p>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                             <label style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--surface)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: 'var(--primary)', display: 'inline-block' }}>
                               Choose File
                               <input 
                                  type="file" 
                                  accept="image/*" 
                                  hidden
                                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                               />
                             </label>
                             <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{questionForm.imageUrl ? 'Uploaded successfully' : 'No file chosen'}</span>
                           </div>
                         </div>

                         <div style={{ width: '1px', background: 'rgba(0,0,0,0.1)' }} />

                         <div style={{ opacity: questionForm.imageUrl ? 0.5 : 1, pointerEvents: questionForm.imageUrl ? 'none' : 'auto' }}>
                           <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Code Block</p>
                           <select
                             value=""
                             onChange={(e) => {
                               const lang = e.target.value;
                               if (lang) {
                                 const existingBlocks = (questionForm.text.match(/```/g) || []).length;
                                 if (existingBlocks >= 4) {
                                   alert("Maximum 2 code blocks per question allowed.");
                                   e.target.value = '';
                                   return;
                                 }
                                 setShowCodeModal({ language: lang });
                                 setCodeSnippet('');
                                 e.target.value = '';
                               }
                             }}
                             style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--surface)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: 'var(--primary)' }}
                           >
                             <option value="">+ Add Code</option>
                             <option value="python">Python</option>
                             <option value="java">Java</option>
                             <option value="cpp">C++</option>
                             <option value="javascript">JavaScript</option>
                             <option value="csharp">C#</option>
                             <option value="html">HTML</option>
                             <option value="css">CSS</option>
                             <option value="sql">SQL</option>
                           </select>
                         </div>
                       </div>

                       {questionForm.imageUrl && (
                         <div style={{ marginTop: '16px', position: 'relative', width: '200px' }}>
                            <img src={questionForm.imageUrl} alt="Preview" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '14px', boxShadow: '4px 4px 12px rgba(0,0,0,0.1)' }} />
                            <button type="button" onClick={() => setQuestionForm(prev => ({ ...prev, imageUrl: '' }))} style={{ position: 'absolute', top: '-12px', right: '-12px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>×</button>
                         </div>
                       )}
                    </div>
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
                           <div className="form-input" style={{ flex: 1, cursor: 'default' }}>{option}</div>
                         ) : (
                           <input
                             className="form-input"
                             value={option}
                             onChange={(e) => {
                               const nextOptions = [...questionForm.options]
                               nextOptions[index] = e.target.value
                               setQuestionForm({ ...questionForm, options: nextOptions })
                             }}
                             placeholder={`Option ${index + 1}`}
                             style={{ flex: 1 }}
                           />
                         )}
                       </div>
                     ))}
                     {questionForm.type === 'MCQ' && questionForm.options.length < 6 && (
                       <button onClick={() => setQuestionForm({ ...questionForm, options: [...questionForm.options, ''] })} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px dashed #3636e8', background: 'transparent', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>
                         Add Option
                       </button>
                     )}
                   </div>
                 )}
                 {questionForm.type === 'SUBJECTIVE' && (
                   <textarea className="form-input" value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })} placeholder="Reference answer / keywords" rows={3} style={{ resize: 'vertical' }} />
                 )}
                 <input className="form-input" value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} placeholder="Explanation (optional)" />
                 <input className="form-input" type="number" min="1" value={questionForm.marks} onChange={(e) => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value, 10) || 1 })} placeholder="Marks" />
                 <button onClick={handleSaveQuestion} disabled={savingQuestions} style={{ padding: '14px 18px', borderRadius: '50px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                   {savingQuestions ? 'Saving...' : 'Save Question'}
                 </button>
               </div>
            </div>
          </div>
        )}

      {showCodeModal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 6000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setShowCodeModal(null)}>
          <div className="modal" style={{ padding: 'clamp(16px, 4vw, 32px)', width: '100%', maxWidth: 'min(700px, calc(100vw - 32px))' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '16px', textTransform: 'capitalize' }}>Add Code ({showCodeModal.language})</h3>
            <textarea
              value={codeSnippet}
              onChange={e => setCodeSnippet(e.target.value)}
              placeholder="Paste or write your code here..."
              style={{ width: '100%', height: '300px', padding: '16px', borderRadius: '12px', border: '1px solid #cfd6e1', fontFamily: 'monospace', fontSize: '14px', resize: 'vertical', background: 'var(--surface)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowCodeModal(null)} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#f1f1f8', color: 'var(--text-secondary)', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
              <button 
                onClick={() => {
                  if (codeSnippet.trim()) {
                    const qText = questionForm.text.split('```')[0].trim();
                    const newText = qText + (qText ? '\n\n' : '') + `\`\`\`${showCodeModal.language}\n${codeSnippet}\n\`\`\``;
                    setQuestionForm({ ...questionForm, text: newText });
                  }
                  setShowCodeModal(null);
                }} 
                style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
              >
                OK
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
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px' }}>{exam.title}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{exam.course?.name}</p>

          <div style={{ marginBottom: '24px' }}>
            <ExamTimingStatus startDate={exam.startDate} expiresAt={exam.expiresAt} />
          </div>

          <div style={{ textAlign: 'left', marginBottom: '24px', padding: '16px', borderRadius: '12px', background: exam.examType === 'FINAL_TEST' ? 'var(--danger-light)' : 'var(--success-light)', borderLeft: `4px solid ${exam.examType === 'FINAL_TEST' ? 'var(--danger)' : 'var(--success)'}` }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: exam.examType === 'FINAL_TEST' ? 'var(--danger)' : 'var(--success)', marginBottom: '8px' }}>
                      {isFinalTest(exam.examType) ? 'Final Test Rules' : 'General Test Rules'}
            </h3>
            <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
             <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--surface)', boxShadow: '3px 3px 6px var(--neu-dark)' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Questions</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{exam.questions?.length}</div>
             </div>
             <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--surface)', boxShadow: '3px 3px 6px var(--neu-dark)' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duration</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{exam.durationMinutes}m</div>
             </div>
          </div>

           {latestAttempt?.submittedAt ? (
             <>
               {latestAttempt.isPublished || exam.examType === 'GENERAL_TEST' ? (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--success)', margin: 0 }}>
                     You scored {latestAttempt.totalMarks} points on your latest attempt.
                   </p>
                   <div style={{ display: 'flex', gap: '12px' }}>
                     <button
                        onClick={() => router.push(`/exams/${params.id}/result`)}
                        style={{ flex: 1, padding: '16px', borderRadius: '50px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '4px 4px 10px rgba(54,54,232,0.35)' }}
                     >
                       View Results
                     </button>
                     {allowsMultipleAttempts(exam.examType) && (
                       <button
                          onClick={() => router.push(`/exams/${params.id}/attempt`)}
                          style={{ flex: 1, padding: '16px', borderRadius: '50px', border: '2px solid #3636e8', background: 'transparent', color: 'var(--primary)', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
                       >
                         Retry Exam
                       </button>
                     )}
                   </div>
                 </div>
               ) : (
                 <div style={{ padding: '20px', borderRadius: '20px', background: 'var(--warning-light)', border: '2px dashed #f59e0b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ color: 'var(--warning)', fontWeight: 800, fontSize: '15px' }}>Assessment Submitted</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Your responses are being reviewed. Results will be visible once published by the instructor.</p>
                 </div>
               )}
             </>
          ) : isUpcoming ? (
            <div style={{ padding: '20px', borderRadius: '20px', background: 'var(--primary-light)', border: '2px dashed #3636e8', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '15px' }}>Exam Not Started Yet</div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>You will be able to start this exam when the countdown reaches zero.</p>
            </div>
          ) : isExpired ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div style={{ padding: '16px', borderRadius: '50px', background: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 700, textAlign: 'center' }}>
                This exam has ended.
              </div>
              <button
                 onClick={() => router.push(`/exams/${params.id}/result`)}
                 style={{ width: '100%', padding: '16px', borderRadius: '50px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 800, cursor: 'pointer', boxShadow: '4px 4px 10px rgba(54,54,232,0.35)' }}
              >
                Review Exam
              </button>
            </div>
          ) : (
            <button
               onClick={() => router.push(`/exams/${params.id}/attempt`)}
               style={{ width: '100%', padding: '16px', borderRadius: '50px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 800, cursor: 'pointer', boxShadow: '4px 4px 10px rgba(54,54,232,0.35)' }}
            >
              Start Exam Now
            </button>
          )}

          <button onClick={() => router.push('/exams')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '14px', marginTop: '20px', cursor: 'pointer' }}>Cancel</button>
       </div>
    </div>
  )
}
