'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EXAM_RESULT_REFRESH_INTERVAL_MS, isFinalTest } from '@/lib/exam-policy'
import { RichTextDisplay } from '@/components/ui/RichTextDisplay'
import ConfirmDialog from '@/components/ConfirmDialog'

export default function ExamResultPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reviewMode, setReviewMode] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({})

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

  const attemptData = exam?.attempts?.slice().sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())?.[0]
  const isExpired = exam && new Date() > new Date(exam.expiresAt)
  const isMockedAttempt = !attemptData && isExpired

  useEffect(() => {
    if (isMockedAttempt) {
      setReviewMode(true)
    }
  }, [isMockedAttempt])

  if (loading) {
    return (
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: '36px', width: '50%', margin: '0 auto 8px', borderRadius: '6px' }} />
          <div className="skeleton" style={{ height: '18px', width: '30%', margin: '0 auto', borderRadius: '4px' }} />
        </div>

        <div style={{ borderRadius: '20px', background: 'var(--surface-2)', boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)', padding: '32px', textAlign: 'center', marginBottom: '40px' }}>
          <div className="skeleton" style={{ height: '14px', width: '80px', margin: '0 auto 12px', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '48px', width: '120px', margin: '0 auto 16px', borderRadius: '8px' }} />
          <div className="skeleton" style={{ height: '20px', width: '180px', margin: '0 auto', borderRadius: '50px' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="skeleton" style={{ height: '45px', width: '100%', borderRadius: '14px' }} />
          <div className="skeleton" style={{ height: '45px', width: '100%', borderRadius: '14px' }} />
        </div>
      </div>
    )
  }

  const attempt = isMockedAttempt ? {
    id: 'dummy',
    submittedAt: new Date(exam.expiresAt).toISOString(),
    startedAt: new Date(exam.expiresAt).toISOString(),
    isEvaluated: true,
    isPublished: true,
    totalMarks: 0,
    bonusMarks: 0,
    responses: []
  } : attemptData

  if (!exam || exam.error || !exam.questions) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>
        {exam?.error || 'Error loading assessment results. Please check your network or try again later.'}
      </div>
    )
  }

  if (!attempt || !attempt.submittedAt) {
    router.push(`/exams/${params.id}`)
    return null
  }

  const neuCard: React.CSSProperties = {
    borderRadius: '20px', background: 'var(--surface-2)',
    boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
    padding: '32px',
  }

  const totalExamMarks = exam.questions.reduce((acc: number, q: any) => acc + (q.marks || 0), 0)
  const scorePercentage = (attempt.totalMarks !== null && attempt.totalMarks !== undefined && totalExamMarks > 0)
    ? (attempt.totalMarks / totalExamMarks) * 100 
    : null

  const isGeneralTest = exam?.examType === 'GENERAL_TEST'
  const isFinal = isFinalTest(exam?.examType)
  const isPublished = attempt?.isPublished || false
  const isEvaluated = attempt?.isEvaluated || false


  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px' }}>Assessment Complete</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{exam.title}</p>
      </div>

      <div style={{ ...neuCard, textAlign: 'center', marginBottom: '40px' }}>
        {isMockedAttempt ? (
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Review Mode
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
              This exam has ended. You can review all questions, options, and correct answers.
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Your Score</div>
            {attempt.isEvaluated ? (
              <div>
                <div style={{ fontSize: '48px', fontWeight: 900, color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                  <span>{attempt.totalMarks}</span>
                  <span style={{ fontSize: '20px', color: 'var(--text-muted)' }}>/ {exam.questions.reduce((acc: number, q: any) => acc + q.marks, 0)}</span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '16px', fontWeight: 700, color: scorePercentage! >= 50 ? 'var(--success)' : 'var(--danger)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>{scorePercentage?.toFixed(0)}% - {scorePercentage! >= 50 ? 'Passed' : 'Needs Improvement'}</div>
                  {attempt.bonusMarks > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--primary)', background: 'var(--primary-light)', padding: '4px 12px', borderRadius: '50px', alignSelf: 'center', marginTop: '8px' }}>
                      Includes {attempt.bonusMarks} Bonus Points
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                Pending Manual Evaluation
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '4px' }}>Some questions require instructor review.</p>
              </div>
            )}
          </>
        )}

        {!(exam?.examType === 'FINAL_TEST' && !attempt.isPublished) && (
          <button 
            onClick={() => setReviewMode(!reviewMode)}
            style={{ marginTop: '24px', padding: '12px 24px', borderRadius: '50px', border: '2px solid #3636e8', background: reviewMode ? 'var(--primary)' : 'transparent', color: reviewMode ? '#fff' : 'var(--primary)', fontWeight: 800, cursor: 'pointer', fontSize: '14px' }}
          >
            {reviewMode ? 'Exit Review Mode' : 'Enter Review Mode'}
          </button>
        )}
      </div>

      {isGeneralTest && (
        <div style={{ ...neuCard, textAlign: 'center', marginBottom: '40px', background: cooldownSeconds > 0 ? '#fff3cd' : '#d4edda' }}>
          {cooldownSeconds > 0 ? (
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
                Cooldown Active
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--warning)', marginBottom: '8px' }}>
                {Math.floor(cooldownSeconds / 60)}m {cooldownSeconds % 60}s
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0' }}>You can retake this exam in the time shown above</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', marginBottom: '8px' }}>
                ✓ Ready to Retake
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>The cooldown period has ended. You can now attempt this exam again.</p>
              <button
                onClick={() => router.push(`/exams/${params.id}/attempt`)}
                style={{
                  padding: '12px 32px', borderRadius: '50px', border: 'none',
                  background: 'var(--success)', color: '#fff', fontSize: '14px', fontWeight: 800,
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
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Final Assessment
          </div>
          <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)', margin: '0' }}>
            You have completed this final assessment. You cannot retake this exam.
          </p>
        </div>
      )}

      {/* Review Modal Overlay */}
      {reviewMode && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, zIndex: 3000, 
            background: 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0px'
          }}
          onClick={() => setReviewMode(false)}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            .sidebar-nav, .sidebar-overlay, .dashboard-header, .mobile-bottom-nav {
              display: none !important;
            }
            .dashboard-main-container {
              margin-left: 0 !important;
              max-width: 100vw !important;
              width: 100vw !important;
              height: 100vh !important;
              height: 100dvh !important;
            }
          `}} />
          <div 
            style={{ 
              width: '100vw', height: '100vh', overflowY: 'auto',
              background: 'var(--surface)', 
              position: 'relative', padding: '40px',
              display: 'flex', flexDirection: 'column', gap: '24px'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                  Review Assessment
                </h2>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Question {currentIdx + 1} of {exam.questions.length}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setReviewMode(false)}
                  style={{ 
                    padding: '12px 24px', borderRadius: '50px', border: 'none', 
                    background: 'var(--surface)', color: 'var(--text-primary)', fontWeight: 800, cursor: 'pointer',
                    boxShadow: '4px 4px 8px #cfd6e1, -4px -4px 8px var(--neu-light)'
                  }}
                >
                  Exit Review Mode
                </button>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0' }} />

            {/* Modal Body - Question Content */}
            {(() => {
              const q = exam.questions[currentIdx]
              const resp = attempt.responses?.find((r: any) => r.questionId === q.id)
              
              let isCorrect = false
              let studentDisplayAnswer = resp?.answer || 'No answer provided'
              let correctDisplayAnswer = q.correctAnswer || 'Not available'
              let studentArr: string[] = []
              let correctArr: string[] = []

              if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
                isCorrect = q.correctAnswer && resp?.answer === q.correctAnswer
                correctArr = q.correctAnswer ? [q.correctAnswer] : []
                studentArr = resp?.answer ? [resp.answer] : []
              } else if (q.type === 'MSQ') {
                try {
                  const parsedCorrect = JSON.parse(q.correctAnswer || '[]')
                  correctArr = Array.isArray(parsedCorrect) ? parsedCorrect : [q.correctAnswer]
                } catch {
                  correctArr = q.correctAnswer ? [q.correctAnswer] : []
                }
                try {
                  const parsedStudent = JSON.parse(resp?.answer || '[]')
                  studentArr = Array.isArray(parsedStudent) ? parsedStudent : (resp?.answer ? [resp.answer] : [])
                } catch {
                  studentArr = resp?.answer ? [resp.answer] : []
                }
                
                try {
                  const sortedCorrect = [...correctArr].sort()
                  const sortedStudent = [...studentArr].sort()
                  isCorrect = JSON.stringify(sortedCorrect) === JSON.stringify(sortedStudent)
                  
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
              
              const isRevealed = revealedAnswers[q.id] || false
              
              return (
                <div key={q.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '11px', fontWeight: 900, letterSpacing: '0.05em',
                        background: 'var(--primary-light)', color: 'var(--primary)', padding: '6px 14px', borderRadius: '50px' 
                      }}>
                        {q.type.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>{q.marks} Marks</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button
                        onClick={() => {
                          setRevealedAnswers(prev => ({
                            ...prev,
                            [q.id]: !prev[q.id]
                          }))
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '50px',
                          border: '1px solid var(--primary)',
                          background: isRevealed ? 'var(--primary-light)' : 'transparent',
                          color: 'var(--primary)',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s',
                          boxShadow: '2px 2px 5px rgba(0,0,0,0.02)'
                        }}
                      >
                        {isRevealed ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                            Hide Answer
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            Reveal Answer
                          </>
                        )}
                      </button>
                      {q.type !== 'SUBJECTIVE' && q.correctAnswer !== null && q.correctAnswer !== undefined && (() => {
                        const earned = resp?.marks ?? 0
                        const isPartiallyCorrect = earned > 0 && earned < q.marks
                        const isFullyCorrect = earned === q.marks || isCorrect

                        if (isFullyCorrect) {
                          return (
                            <span style={{ 
                              fontSize: '11px', fontWeight: 800, 
                              color: 'var(--success)',
                              background: 'rgba(16,185,129,0.1)',
                              padding: '6px 14px', borderRadius: '50px', 
                              border: '1px solid var(--success-light)'
                            }}>
                              ✓ Correct Answer
                            </span>
                          )
                        } else if (isPartiallyCorrect) {
                          return (
                            <span style={{ 
                              fontSize: '11px', fontWeight: 800, 
                              color: 'var(--warning)',
                              background: 'rgba(245,158,11,0.1)',
                              padding: '6px 14px', borderRadius: '50px', 
                              border: '1px solid var(--warning-light)'
                            }}>
                              ⚠ Partially Correct (+{earned.toFixed(1)} / +{q.marks} Marks)
                            </span>
                          )
                        } else {
                          return (
                            <span style={{ 
                              fontSize: '11px', fontWeight: 800, 
                              color: 'var(--danger)',
                              background: 'rgba(239,68,68,0.1)',
                              padding: '6px 14px', borderRadius: '50px', 
                              border: '1px solid var(--danger-light)'
                            }}>
                              ✗ Incorrect Answer
                            </span>
                          )
                        }
                      })()}
                    </div>
                  </div>
 
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.4', marginBottom: '32px' }}>
                    <RichTextDisplay text={q.text} />
                  </div>

                  {q.imageUrl && (
                    <div style={{ marginBottom: '32px', maxWidth: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                      <img 
                        src={q.imageUrl} 
                        alt="Question Graphic" 
                        style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '12px' }} 
                      />
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {!(q.type === 'MCQ' || q.type === 'MSQ' || q.type === 'TRUE_FALSE') ? (
                      <>
                        <div style={{ 
                          padding: '24px', borderRadius: '24px', 
                          background: isCorrect ? 'var(--success-light)' : 'var(--danger-light)', 
                          border: `1px solid ${isCorrect ? 'var(--success-light)' : 'var(--danger-light)'}`,
                          boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Your Submission</div>
                          <div style={{ fontSize: '17px', fontWeight: 700, color: isCorrect ? 'var(--success)' : 'var(--danger)', lineHeight: '1.5' }}>
                            <RichTextDisplay text={studentDisplayAnswer} />
                          </div>
                        </div>
     
                        {q.correctAnswer && isRevealed && (
                          <div style={{ padding: '24px', background: 'var(--primary-light)', borderRadius: '24px', border: '1px solid #3636e820' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '12px' }}>Correct Solution</div>
                            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--primary)', lineHeight: '1.5' }}>
                              <RichTextDisplay text={correctDisplayAnswer} />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      (() => {
                        let opts: string[] = []
                        try {
                          let parsed = JSON.parse(q.options || '[]')
                          if (typeof parsed === 'string') parsed = JSON.parse(parsed)
                          opts = Array.isArray(parsed) ? parsed : []
                        } catch { opts = [] }
                        
                        if (q.type === 'TRUE_FALSE') opts = ['True', 'False']

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '12px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                              Options & Review
                            </div>
                            {opts.filter(opt => typeof opt === 'string' && opt.trim()).map((opt: string) => {
                              const isSelected = studentArr.some(s => typeof s === 'string' && typeof opt === 'string' && s.trim().toLowerCase() === opt.trim().toLowerCase())
                              const isOptCorrect = correctArr.some(c => typeof c === 'string' && typeof opt === 'string' && c.trim().toLowerCase() === opt.trim().toLowerCase())

                              let bg = 'var(--surface-2)'
                              let border = '1px solid var(--border)'
                              let color = 'var(--text-primary)'
                              let icon = null
                              let badge = null

                              if (isSelected) {
                                if (isOptCorrect) {
                                  bg = 'var(--success)'
                                  color = '#fff'
                                  border = 'none'
                                  icon = (
                                    <div style={{ 
                                      width: '24px', height: '24px', borderRadius: q.type === 'MSQ' ? '6px' : '50%', 
                                      border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                      </svg>
                                    </div>
                                  )
                                  badge = (
                                    <span style={{ 
                                      fontSize: '11px', fontWeight: 800, background: 'rgba(255,255,255,0.2)', 
                                      color: '#fff', padding: '4px 10px', borderRadius: '50px', flexShrink: 0
                                    }}>
                                      Selected (Correct)
                                    </span>
                                  )
                                } else {
                                  bg = 'var(--danger)'
                                  color = '#fff'
                                  border = 'none'
                                  icon = (
                                    <div style={{ 
                                      width: '24px', height: '24px', borderRadius: q.type === 'MSQ' ? '6px' : '50%', 
                                      border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                      </svg>
                                    </div>
                                  )
                                  badge = (
                                    <span style={{ 
                                      fontSize: '11px', fontWeight: 800, background: 'rgba(255,255,255,0.2)', 
                                      color: '#fff', padding: '4px 10px', borderRadius: '50px', flexShrink: 0
                                    }}>
                                      Selected (Incorrect)
                                    </span>
                                  )
                                }
                              } else {
                                if (isOptCorrect && isRevealed) {
                                  bg = 'var(--success-light)'
                                  color = 'var(--success)'
                                  border = '2px solid var(--success)'
                                  icon = (
                                    <div style={{ 
                                      width: '24px', height: '24px', borderRadius: q.type === 'MSQ' ? '6px' : '50%', 
                                      border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                      </svg>
                                    </div>
                                  )
                                  badge = (
                                    <span style={{ 
                                      fontSize: '11px', fontWeight: 800, background: 'rgba(16,185,129,0.1)', 
                                      color: 'var(--success)', padding: '4px 10px', borderRadius: '50px',
                                      border: '1px solid rgba(16,185,129,0.2)', flexShrink: 0
                                    }}>
                                      Correct Option
                                    </span>
                                  )
                                } else {
                                  icon = (
                                    <div style={{ 
                                      width: '24px', height: '24px', borderRadius: q.type === 'MSQ' ? '6px' : '50%', 
                                      border: '2px solid var(--border)', flexShrink: 0
                                    }} />
                                  )
                                }
                              }

                              return (
                                <div
                                  key={opt}
                                  style={{
                                    padding: '18px 24px', borderRadius: '20px', border: border,
                                    background: bg, color: color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                                    boxShadow: '2px 2px 6px rgba(0,0,0,0.02)'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                    {icon}
                                    <div style={{ flex: 1 }}><RichTextDisplay text={opt} /></div>
                                  </div>
                                  {badge}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()
                    )}

                    {q.explanation && isRevealed && (
                      <div style={{ padding: '24px', background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '4px 4px 12px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Evaluation Notes & Explanation</div>
                        <div style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.6' }}><RichTextDisplay text={q.explanation} /></div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Modal Footer - Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
              <button 
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                style={{ 
                  padding: '12px 32px', borderRadius: '50px', border: 'none',
                  background: 'var(--surface)', color: 'var(--text-primary)',
                  fontWeight: 800, opacity: currentIdx === 0 ? 0.5 : 1, 
                  cursor: currentIdx === 0 ? 'default' : 'pointer',
                  boxShadow: '4px 4px 8px #cfd6e1, -4px -4px 8px var(--neu-light)'
                }}
              >
                ← Previous Question
              </button>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {currentIdx + 1} / {exam.questions.length}
              </div>
              <button 
                disabled={currentIdx === exam.questions.length - 1}
                onClick={() => setCurrentIdx(prev => prev + 1)}
                style={{ 
                  padding: '12px 32px', borderRadius: '50px', 
                  background: 'var(--primary)', border: 'none', color: '#fff',
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

      {/* Pending Final Exam Modal */}
      {isFinal && !isPublished && (
        <ConfirmDialog
          open={true}
          title="Exam Submitted!"
          message="Thank you for completing this final assessment. Your responses have been saved. Please wait until your mentor reviews your attempt and publishes the final results."
          confirmLabel="Back to Exams"
          cancelLabel="View Exam Info"
          onConfirm={() => router.push('/exams')}
          onCancel={() => router.push(`/exams/${params.id}`)}
          tone="default"
        />
      )}

      {/* Pending General Exam Modal */}
      {!isFinal && !isEvaluated && (
        <ConfirmDialog
          open={true}
          title="Calculating Your Result"
          message="Please wait, our system is calculating your result. This page will automatically refresh once the calculation is completed."
          confirmLabel="Back to Exams"
          cancelLabel="View Exam Info"
          onConfirm={() => router.push('/exams')}
          onCancel={() => router.push(`/exams/${params.id}`)}
          tone="default"
        />
      )}

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <button 
          onClick={() => router.push('/exams')}
          style={{
            padding: '16px 40px', borderRadius: '50px', border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: '15px', fontWeight: 800,
            boxShadow: '4px 4px 10px rgba(54,54,232,0.35)', cursor: 'pointer'
          }}
        >
          Back to Exams
        </button>
      </div>
    </div>
  )
}
