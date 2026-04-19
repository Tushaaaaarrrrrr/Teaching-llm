'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EXAM_RESULT_REFRESH_INTERVAL_MS } from '@/lib/exam-policy'
import { RichTextDisplay } from '@/components/ui/RichTextDisplay'

export default function ExamResultPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reviewMode, setReviewMode] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  useEffect(() => {
    let active = true
    const load = () => {
      fetch(`/api/exams/${params.id}`).then(res => res.json()).then(data => {
        if (!active) return
        setExam(data)
        setLoading(false)
        
        // Calculate cooldown if GENERAL_TEST
        const attempt = data?.attempts?.slice().sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())?.[0]
        if (attempt?.submittedAt && data?.examType === 'GENERAL_TEST') {
          const submittedTime = new Date(attempt.submittedAt).getTime()
          const cooldownMs = 5 * 60 * 1000
          const now = Date.now()
          const remaining = submittedTime + cooldownMs - now
          setCooldownSeconds(remaining > 0 ? Math.ceil(remaining / 1000) : 0)
        }
      })
    }
    load()
    const interval = setInterval(load, EXAM_RESULT_REFRESH_INTERVAL_MS)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [params.id])

  // Countdown timer for GENERAL_TEST
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setInterval(() => {
      setCooldownSeconds(prev => prev > 0 ? prev - 1 : 0)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownSeconds])

  // Scroll Lock & Esc Key for Review Modal
  useEffect(() => {
    if (reviewMode) {
      document.body.style.overflow = 'hidden'
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setReviewMode(false)
      }
      window.addEventListener('keydown', handleEsc)
      return () => {
        document.body.style.overflow = 'unset'
        window.removeEventListener('keydown', handleEsc)
      }
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [reviewMode])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading results...</div>

  const attempt = exam?.attempts?.slice().sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())?.[0]
  if (!attempt || !attempt.submittedAt) {
    router.push(`/exams/${params.id}`)
    return null
  }

  const neuCard: React.CSSProperties = {
    borderRadius: '20px', background: '#e8eaf0',
    boxShadow: '6px 6px 14px #c5c7cf, -6px -6px 14px #ffffff',
    padding: '32px',
  }

  const scorePercentage = attempt.totalMarks !== null 
    ? (attempt.totalMarks / exam.questions.reduce((acc: number, q: any) => acc + q.marks, 0)) * 100 
    : null

  const isGeneralTest = exam?.examType === 'GENERAL_TEST'


  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#1e1e3a', marginBottom: '8px' }}>Assessment Complete</h1>
        <p style={{ color: '#6b6b8a' }}>{exam.title}</p>
      </div>

      <div style={{ ...neuCard, textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '8px' }}>Your Score</div>
        {attempt.isEvaluated ? (
          <div>
            <div style={{ fontSize: '48px', fontWeight: 900, color: '#3636e8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <span>{attempt.totalMarks}</span>
              <span style={{ fontSize: '20px', color: '#9999b0' }}>/ {exam.questions.reduce((acc: number, q: any) => acc + q.marks, 0)}</span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '16px', fontWeight: 700, color: scorePercentage! >= 50 ? '#10b981' : '#ef4444', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>{scorePercentage?.toFixed(0)}% - {scorePercentage! >= 50 ? 'Passed' : 'Needs Improvement'}</div>
              {attempt.bonusMarks > 0 && (
                <div style={{ fontSize: '11px', color: '#3636e8', background: '#3636e810', padding: '4px 12px', borderRadius: '50px', alignSelf: 'center', marginTop: '8px' }}>
                  Includes {attempt.bonusMarks} Bonus Points
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#3636e8' }}>
            Pending Manual Evaluation
            <p style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: 500, marginTop: '4px' }}>Some questions require instructor review.</p>
          </div>
        )}

        {!(exam?.examType === 'FINAL_TEST' && !attempt.isPublished) && (
          <button 
            onClick={() => setReviewMode(!reviewMode)}
            style={{ marginTop: '24px', padding: '12px 24px', borderRadius: '50px', border: '2px solid #3636e8', background: reviewMode ? '#3636e8' : 'transparent', color: reviewMode ? '#fff' : '#3636e8', fontWeight: 800, cursor: 'pointer', fontSize: '14px' }}
          >
            {reviewMode ? 'Exit Review Mode' : 'Enter Review Mode'}
          </button>
        )}
      </div>

      {isGeneralTest && (
        <div style={{ ...neuCard, textAlign: 'center', marginBottom: '40px', background: cooldownSeconds > 0 ? '#fff3cd' : '#d4edda' }}>
          {cooldownSeconds > 0 ? (
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '12px' }}>
                Cooldown Active
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#f59e0b', marginBottom: '8px' }}>
                {Math.floor(cooldownSeconds / 60)}m {cooldownSeconds % 60}s
              </div>
              <p style={{ fontSize: '13px', color: '#6b6b8a', margin: '0' }}>You can retake this exam in the time shown above</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '8px' }}>
                ✓ Ready to Retake
              </div>
              <p style={{ fontSize: '13px', color: '#6b6b8a', margin: '0 0 12px 0' }}>The cooldown period has ended. You can now attempt this exam again.</p>
              <button
                onClick={() => router.push(`/exams/${params.id}/attempt`)}
                style={{
                  padding: '12px 32px', borderRadius: '50px', border: 'none',
                  background: '#10b981', color: '#fff', fontSize: '14px', fontWeight: 800,
                  cursor: 'pointer', boxShadow: '4px 4px 10px rgba(16,185,129,0.35)'
                }}
              >
                Retake Exam
              </button>
            </div>
          )}
        </div>
      )}

      {!isGeneralTest && (
        <div style={{ ...neuCard, textAlign: 'center', marginBottom: '40px', background: '#e8d7e8' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '8px' }}>
            Final Assessment
          </div>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#6b6b8a', margin: '0' }}>
            You have completed this final assessment. You cannot retake this exam.
          </p>
        </div>
      )}

      {/* Review Modal Overlay */}
      {reviewMode && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, zIndex: 3000, 
            background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
          }}
          onClick={() => setReviewMode(false)}
        >
          <div 
            style={{ 
              width: '100%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto',
              background: '#f0f2f8', borderRadius: '32px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              position: 'relative', padding: '40px',
              display: 'flex', flexDirection: 'column', gap: '24px'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1e1e3a', margin: 0 }}>
                  Review Assessment
                </h2>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginTop: '4px' }}>
                  Question {currentIdx + 1} of {exam.questions.length}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setReviewMode(false)}
                  style={{ 
                    padding: '12px 24px', borderRadius: '50px', border: 'none', 
                    background: '#fff', color: '#1e1e3a', fontWeight: 800, cursor: 'pointer',
                    boxShadow: '4px 4px 8px #cfd6e1, -4px -4px 8px #ffffff'
                  }}
                >
                  Close Review
                </button>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #cfd6e1', margin: '0' }} />

            {/* Modal Body - Question Content */}
            {(() => {
              const q = exam.questions[currentIdx]
              const resp = attempt.responses?.find((r: any) => r.questionId === q.id)
              
              let isCorrect = false
              let studentDisplayAnswer = resp?.answer || 'No answer provided'
              let correctDisplayAnswer = q.correctAnswer || 'Not available'

              if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
                isCorrect = q.correctAnswer && resp?.answer === q.correctAnswer
              } else if (q.type === 'MSQ') {
                try {
                  const correctArr = JSON.parse(q.correctAnswer || '[]').sort()
                  const studentArr = JSON.parse(resp?.answer || '[]').sort()
                  isCorrect = JSON.stringify(correctArr) === JSON.stringify(studentArr)
                  
                  studentDisplayAnswer = studentArr.length > 0 ? studentArr.join(', ') : 'No options selected'
                  correctDisplayAnswer = correctArr.join(', ')
                } catch {
                  isCorrect = false
                }
              } else if (q.type === 'NAT') {
                if (resp && resp.answer && q.correctAnswer) {
                  isCorrect = parseFloat(resp.answer) === parseFloat(q.correctAnswer)
                }
              } else {
                isCorrect = resp && resp.answer === q.correctAnswer
              }
              
              return (
                <div key={q.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '11px', fontWeight: 900, letterSpacing: '0.05em',
                        background: '#3636e815', color: '#3636e8', padding: '6px 14px', borderRadius: '50px' 
                      }}>
                        {q.type.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b6b8a' }}>{q.marks} Marks</span>
                    </div>
                    {q.type !== 'SUBJECTIVE' && q.correctAnswer !== null && q.correctAnswer !== undefined && (
                      <span style={{ 
                        fontSize: '11px', fontWeight: 800, 
                        color: isCorrect ? '#10b981' : '#ef4444',
                        background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        padding: '6px 14px', borderRadius: '50px', 
                        border: `1px solid ${isCorrect ? '#10b98130' : '#ef444430'}`
                      }}>
                        {isCorrect ? '✓ Correct Answer' : '✗ Incorrect Answer'}
                      </span>
                    )}
                  </div>
 
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e1e3a', lineHeight: '1.4', marginBottom: '32px' }}>
                    <RichTextDisplay text={q.text} />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ 
                      padding: '24px', borderRadius: '24px', 
                      background: isCorrect ? '#10b98108' : '#ef444408', 
                      border: `1px solid ${isCorrect ? '#10b98120' : '#ef444420'}`,
                      boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '12px' }}>Your Submission</div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: isCorrect ? '#10b981' : '#ef4444', lineHeight: '1.5' }}>
                        <RichTextDisplay text={studentDisplayAnswer} />
                      </div>
                    </div>
 
                    {q.correctAnswer && !isCorrect && (
                      <div style={{ padding: '24px', background: '#3636e808', borderRadius: '24px', border: '1px solid #3636e820' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#3636e8', textTransform: 'uppercase', marginBottom: '12px' }}>Correct Solution</div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#3636e8', lineHeight: '1.5' }}>
                          <RichTextDisplay text={correctDisplayAnswer} />
                        </div>
                      </div>
                    )}

                    {q.explanation && (
                      <div style={{ padding: '24px', background: '#fff', borderRadius: '24px', border: '1px solid #cfd6e1', boxShadow: '4px 4px 12px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#6b6b8a', textTransform: 'uppercase', marginBottom: '12px' }}>Evaluation Notes & Explanation</div>
                        <div style={{ fontSize: '15px', color: '#1e1e3a', lineHeight: '1.6' }}><RichTextDisplay text={q.explanation} /></div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Modal Footer - Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '24px', borderTop: '1px solid #cfd6e1' }}>
              <button 
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                style={{ 
                  padding: '12px 32px', borderRadius: '50px', border: 'none',
                  background: '#fff', color: '#1e1e3a',
                  fontWeight: 800, opacity: currentIdx === 0 ? 0.5 : 1, 
                  cursor: currentIdx === 0 ? 'default' : 'pointer',
                  boxShadow: '4px 4px 8px #cfd6e1, -4px -4px 8px #ffffff'
                }}
              >
                ← Previous Question
              </button>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#6b6b8a' }}>
                {currentIdx + 1} / {exam.questions.length}
              </div>
              <button 
                disabled={currentIdx === exam.questions.length - 1}
                onClick={() => setCurrentIdx(prev => prev + 1)}
                style={{ 
                  padding: '12px 32px', borderRadius: '50px', 
                  background: '#3636e8', border: 'none', color: '#fff',
                  fontWeight: 800, opacity: currentIdx === exam.questions.length - 1 ? 0.5 : 1, 
                  cursor: currentIdx === exam.questions.length - 1 ? 'default' : 'pointer',
                  boxShadow: '0 8px 20px rgba(54,54,232,0.3)'
                }}
              >
                Next Question →
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <button 
          onClick={() => router.push('/exams')}
          style={{
            padding: '16px 40px', borderRadius: '50px', border: 'none',
            background: '#3636e8', color: '#fff', fontSize: '15px', fontWeight: 800,
            boxShadow: '4px 4px 10px rgba(54,54,232,0.35)', cursor: 'pointer'
          }}
        >
          Back to Exams
        </button>
      </div>
    </div>
  )
}
