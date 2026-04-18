'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EXAM_RESULT_REFRESH_INTERVAL_MS } from '@/lib/exam-policy'

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
            <div style={{ fontSize: '48px', fontWeight: 900, color: '#3636e8' }}>
              {attempt.totalMarks} <span style={{ fontSize: '20px', color: '#9999b0' }}>/ {exam.questions.reduce((acc: number, q: any) => acc + q.marks, 0)}</span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '16px', fontWeight: 700, color: scorePercentage! >= 50 ? '#10b981' : '#ef4444' }}>
              {scorePercentage?.toFixed(0)}% - {scorePercentage! >= 50 ? 'Passed' : 'Needs Improvement'}
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

      {reviewMode && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e1e3a', margin: 0 }}>
            {exam?.examType === 'FINAL_TEST' && !attempt.isPublished
              ? 'Results Status'
              : `Question ${currentIdx + 1} of ${exam.questions.length}`}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => prev - 1)}
              style={{ 
                padding: '10px 20px', borderRadius: '50px', 
                background: '#fff', border: 'none', color: '#1e1e3a',
                fontWeight: 800, opacity: currentIdx === 0 ? 0.5 : 1, 
                cursor: currentIdx === 0 ? 'default' : 'pointer',
                boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff'
              }}
            >
              ← Previous
            </button>
            <button 
              disabled={currentIdx === exam.questions.length - 1}
              onClick={() => setCurrentIdx(prev => prev + 1)}
              style={{ 
                padding: '10px 20px', borderRadius: '50px', 
                background: '#3636e8', border: 'none', color: '#fff',
                fontWeight: 800, opacity: currentIdx === exam.questions.length - 1 ? 0.5 : 1, 
                cursor: currentIdx === exam.questions.length - 1 ? 'default' : 'pointer',
                boxShadow: '0 4px 12px rgba(54,54,232,0.3)'
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {reviewMode && (
          (() => {
            const q = exam.questions[currentIdx]
            const resp = attempt.responses?.find((r: any) => r.questionId === q.id)
            const isCorrect = q.correctAnswer && resp?.answer === q.correctAnswer
            
            return (
              <div key={q.id} style={{ ...neuCard, padding: '48px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                   <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '11px', fontWeight: 900, letterSpacing: '0.05em',
                        background: '#3636e815', color: '#3636e8', padding: '6px 12px', borderRadius: '50px' 
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
                      padding: '4px 12px', borderRadius: '50px', border: `1px solid ${isCorrect ? '#10b98130' : '#ef444430'}`
                    }}>
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                   )}
                </div>

                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1e1e3a', lineHeight: '1.4', marginBottom: '32px' }}>
                  {q.text}
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                   <div style={{ 
                     padding: '24px', borderRadius: '20px', 
                     background: isCorrect ? '#10b98105' : '#ef444405', 
                     border: `1px solid ${isCorrect ? '#10b98120' : '#ef444420'}` 
                   }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '12px' }}>Your Answer</div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: isCorrect ? '#10b981' : '#ef4444', lineHeight: '1.5' }}>
                        {resp?.answer || 'No answer provided'}
                      </div>
                   </div>

                   {q.correctAnswer && !isCorrect && (
                     <div style={{ padding: '24px', background: '#3636e805', borderRadius: '20px', border: '1px solid #3636e820' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#3636e8', textTransform: 'uppercase', marginBottom: '12px' }}>Correct Answer</div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#3636e8', lineHeight: '1.5' }}>{q.correctAnswer}</div>
                     </div>
                   )}

                   {q.explanation && (
                     <div style={{ padding: '24px', background: '#fff', borderRadius: '20px', border: '1px solid #c5c7cf' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#6b6b8a', textTransform: 'uppercase', marginBottom: '12px' }}>Explanation</div>
                        <div style={{ fontSize: '15px', color: '#1e1e3a', lineHeight: '1.6' }}>{q.explanation}</div>
                     </div>
                   )}
                </div>
              </div>
            )
          })()
        )}
      </div>

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
