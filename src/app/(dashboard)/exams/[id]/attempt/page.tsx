'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { hasStrictTimer } from '@/lib/exam-policy'

interface Question {
  id: string
  text: string
  type: string
  options: string | null
  marks: number
}

interface Exam {
  id: string
  title: string
  durationMinutes: number
  expiresAt: string
  questions: Question[]
}

export default function ExamAttemptPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [attempt, setAttempt] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  
  const timeTextRef = useRef<HTMLDivElement>(null)
  const attemptStartedAtRef = useRef<number | null>(null)
  const durationMsRef = useRef<number | null>(null)
  const hasStrictTimerRef = useRef<boolean>(false)
  const submittingRef = useRef<boolean>(false)

  const loadData = useCallback(async () => {
    try {
      const exRes = await fetch(`/api/exams/${params.id}`)
      const examData = await exRes.json()
      
      const attRes = await fetch(`/api/exams/${params.id}/attempt`, { method: 'POST' })
      const attemptData = await attRes.json()

      if (attemptData.error) {
        alert(attemptData.error)
        router.push('/exams')
        return
      }

      setExam(examData)
      setAttempt(attemptData)
      
      const initialAnswers: Record<string, string> = {}
      attemptData.responses?.forEach((r: any) => {
        initialAnswers[r.questionId] = r.answer
      })
      setAnswers(initialAnswers)

      const startedAt = new Date(attemptData.startedAt).getTime()
      const durationMs = examData.durationMinutes * 60 * 1000
      attemptStartedAtRef.current = startedAt
      durationMsRef.current = durationMs
      hasStrictTimerRef.current = hasStrictTimer(examData.examType)
      
      const now = Date.now()
      const elapsed = now - startedAt
      const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000))
      
      if (timeTextRef.current) {
         timeTextRef.current.innerText = formatTime(remaining)
         timeTextRef.current.style.color = remaining < 300 ? '#ef4444' : '#3636e8'
      }

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    let animationFrameId: number
    let lastSecond = -1
    
    // We cannot capture handleSubmit directly if it depends on changing state, but we rely on the component being alive
    // Also, we use an inline trigger for auto-submission.
    const tick = () => {
      if (!hasStrictTimerRef.current || attemptStartedAtRef.current === null || durationMsRef.current === null) {
        animationFrameId = requestAnimationFrame(tick)
        return
      }

      const now = Date.now()
      const elapsed = now - attemptStartedAtRef.current
      const remainingSecs = Math.max(0, Math.floor((durationMsRef.current - elapsed) / 1000))

      if (remainingSecs <= 0 && !submittingRef.current && !loading && exam) {
        // Auto-submit when time is up
        submittingRef.current = true
        setSubmitting(true)
        fetch(`/api/exams/${params.id}/submit`, { method: 'POST' }).then(res => {
          if (res.ok) router.push(`/exams/${params.id}/result`)
        }).catch(err => console.error(err))
        return
      }

      if (remainingSecs !== lastSecond) {
        lastSecond = remainingSecs
        if (timeTextRef.current) {
          timeTextRef.current.innerText = formatTime(remainingSecs)
          timeTextRef.current.style.color = remainingSecs < 300 ? '#ef4444' : '#3636e8'
        }
      }

      animationFrameId = requestAnimationFrame(tick)
    }

    animationFrameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrameId)
  }, [loading, exam, params.id, router])

  const saveAnswer = async (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
    try {
      await fetch(`/api/exams/${params.id}/attempt`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer })
      })
    } catch {}
  }

  const handleSubmit = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const res = await fetch(`/api/exams/${params.id}/submit`, { method: 'POST' })
      if (res.ok) {
        router.push(`/exams/${params.id}/result`)
      } else {
        alert('Failed to submit exam')
      }
    } catch (error) {
      console.error(error)
      submittingRef.current = false
      setSubmitting(false)
    } // deliberately not doing finally to keep submitting=true during redirect
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading assessment...</div>

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const currentQuestion = exam?.questions[currentIdx]

  // Shared Styles
  const neuCard: React.CSSProperties = {
    borderRadius: '20px', background: '#e8eaf0',
    boxShadow: '6px 6px 14px #c5c7cf, -6px -6px 14px #ffffff',
    padding: '32px',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#e8eaf0', padding: '32px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header/Timer */}
        <div style={{ ...neuCard, marginBottom: '24px', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a' }}>{exam?.title}</h1>
            <span style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: 600 }}>Question {currentIdx + 1} of {exam?.questions.length}</span>
          </div>
          {hasStrictTimer((exam as any)?.examType) && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase' }}>Time Remaining</span>
              <div ref={timeTextRef} style={{ fontSize: '24px', fontWeight: 900, color: '#3636e8', fontVariantNumeric: 'tabular-nums' }}>
                --:--
              </div>
            </div>
          )}
        </div>

        {/* Question Area */}
        <div style={neuCard}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
               <span style={{ fontSize: '11px', fontWeight: 800, background: '#3636e812', color: '#3636e8', padding: '4px 10px', borderRadius: '50px' }}>
                 {currentQuestion?.type}
               </span>
               <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b6b8a' }}>{currentQuestion?.marks} Marks</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e1e3a', lineHeight: '1.4' }}>{currentQuestion?.text}</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {currentQuestion?.type === 'MCQ' || currentQuestion?.type === 'TRUE_FALSE' ? (
              (() => {
                // Safely parse options — handles double-stringified JSON
                let opts: string[] = []
                try {
                  let parsed = JSON.parse(currentQuestion.options || '[]')
                  // If it's still a string after parsing, parse again (double-stringified)
                  if (typeof parsed === 'string') {
                    parsed = JSON.parse(parsed)
                  }
                  opts = Array.isArray(parsed) ? parsed : []
                } catch {
                  opts = []
                }
                
                // For TRUE_FALSE, ensure we only show True/False
                if (currentQuestion.type === 'TRUE_FALSE' && opts.length === 0) {
                  opts = ['True', 'False']
                }
                
                return opts.filter(opt => typeof opt === 'string' && opt.trim()).map((opt: string) => (
                  <button
                    key={opt}
                    onClick={() => saveAnswer(currentQuestion.id, opt)}
                    style={{
                      padding: '16px 20px', borderRadius: '16px', border: 'none',
                      textAlign: 'left', fontSize: '15px', fontWeight: 600,
                      background: answers[currentQuestion.id] === opt ? '#3636e8' : '#fff',
                      color: answers[currentQuestion.id] === opt ? '#fff' : '#1e1e3a',
                      boxShadow: answers[currentQuestion.id] === opt ? 'inset 2px 2px 5px rgba(0,0,0,0.2)' : '3px 3px 8px #c5c7cf, -2px -2px 6px #fff',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {opt}
                  </button>
                ))
              })()
            ) : (
              <textarea
                value={answers[currentQuestion.id] || ''}
                onChange={e => saveAnswer(currentQuestion.id, e.target.value)}
                placeholder="Type your answer here..."
                rows={6}
                style={{
                  width: '100%', padding: '20px', borderRadius: '16px', border: 'none',
                  background: '#e8eaf0', boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #ffffff',
                  fontSize: '15px', lineHeight: '1.6', outline: 'none', color: '#1e1e3a'
                }}
              />
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
               disabled={currentIdx === 0}
               onClick={() => setCurrentIdx(prev => prev - 1)}
               style={{ 
                 padding: '12px 24px', borderRadius: '50px', border: 'none', 
                 background: '#fff', color: '#1e1e3a', fontWeight: 700, 
                 cursor: currentIdx === 0 ? 'default' : 'pointer',
                 opacity: currentIdx === 0 ? 0.5 : 1,
                 boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #fff'
               }}
            >
              Previous
            </button>
            
            {currentIdx === (exam?.questions.length || 0) - 1 ? (
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                style={{ 
                  padding: '12px 32px', borderRadius: '50px', border: 'none', 
                  background: '#ef4444', color: '#fff', fontWeight: 800, cursor: 'pointer',
                  boxShadow: '4px 4px 10px rgba(239,68,68,0.35)'
                }}
              >
                {submitting ? 'Submitting...' : 'Complete & Submit'}
              </button>
            ) : (
              <button 
                onClick={() => setCurrentIdx(prev => prev + 1)}
                style={{ 
                  padding: '12px 32px', borderRadius: '50px', border: 'none', 
                  background: '#3636e8', color: '#fff', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '4px 4px 10px rgba(54,54,232,0.35)'
                }}
              >
                Next Question
              </button>
            )}
          </div>
        </div>

        {/* Navigator Dots */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '32px' }}>
          {exam?.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              style={{
                width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                background: currentIdx === i ? '#3636e8' : (answers[exam.questions[i].id] ? '#10b981' : '#fff'),
                color: currentIdx === i || answers[exam.questions[i].id] ? '#fff' : '#1e1e3a',
                fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                boxShadow: '2px 2px 4px #c5c7cf, -2px -2px 4px #fff',
                transition: 'all 0.2s'
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
