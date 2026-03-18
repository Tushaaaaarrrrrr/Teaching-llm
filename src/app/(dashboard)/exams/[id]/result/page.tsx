'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ExamResultPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/exams/${params.id}`).then(res => res.json()).then(data => {
      setExam(data)
      setLoading(false)
    })
  }, [params.id])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading results...</div>

  const attempt = exam?.attempts?.[0]
  if (!attempt || !attempt.submittedAt) {
    router.push(`/exams/${params.id}`)
    return null
  }

  // Shared Styles
  const neuCard: React.CSSProperties = {
    borderRadius: '20px', background: '#e8eaf0',
    boxShadow: '6px 6px 14px #c5c7cf, -6px -6px 14px #ffffff',
    padding: '32px',
  }

  const scorePercentage = attempt.totalMarks !== null 
    ? (attempt.totalMarks / exam.questions.reduce((acc: number, q: any) => acc + q.marks, 0)) * 100 
    : null

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
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e1e3a', marginBottom: '20px' }}>Question Breakdown</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {exam.questions.map((q: any, idx: number) => {
          const resp = attempt.responses?.find((r: any) => r.questionId === q.id)
          const isCorrect = q.correctAnswer && resp?.answer === q.correctAnswer
          
          return (
            <div key={q.id} style={neuCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontWeight: 800, color: '#6b6b8a' }}>Question {idx + 1}</span>
                {q.type !== 'SUBJECTIVE' && (
                  <span style={{ 
                    fontSize: '11px', fontWeight: 800, 
                    color: isCorrect ? '#10b981' : '#ef4444',
                    background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    padding: '4px 10px', borderRadius: '50px'
                  }}>
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#1e1e3a', marginBottom: '16px' }}>{q.text}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '12px', background: '#f0f2f7', borderRadius: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '4px' }}>Your Answer</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e1e3a' }}>{resp?.answer || 'No answer'}</div>
                </div>
                {q.correctAnswer && (
                  <div style={{ padding: '12px', background: 'rgba(54,54,232,0.05)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#3636e8', textTransform: 'uppercase', marginBottom: '4px' }}>Correct Answer</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#3636e8' }}>{q.correctAnswer}</div>
                  </div>
                )}
              </div>

              {q.explanation && (
                <div style={{ marginTop: '16px', fontSize: '13px', color: '#6b6b8a', padding: '12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <span style={{ fontWeight: 700, color: '#1e1e3a' }}>Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          )
        })}
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
