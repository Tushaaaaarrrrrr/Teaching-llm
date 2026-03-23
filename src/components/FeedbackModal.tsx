'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FeedbackModalProps {
  courseId: string
  courseName: string
  courseSubject: string
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIES = [
  { id: 'teacherRating', label: 'Teacher Quality' },
  { id: 'conceptRating', label: 'Concept Quality' },
  { id: 'materialRating', label: 'Study Materials Quality' },
  { id: 'examRating', label: 'Exam Session' },
  { id: 'recommendScore', label: 'Recommendation Score' },
]

export default function FeedbackModal({ courseId, courseName, courseSubject, onClose, onSuccess }: FeedbackModalProps) {
  const router = useRouter()
  const [ratings, setRatings] = useState<Record<string, number>>({
    teacherRating: 0,
    conceptRating: 0,
    materialRating: 0,
    examRating: 0,
    recommendScore: 0,
  })
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleRate = (catId: string, value: number) => {
    setRatings(prev => ({ ...prev, [catId]: value }))
  }

  const handleSubmit = async () => {
    // Validation
    const missing = CATEGORIES.find(c => ratings[c.id] === 0)
    if (missing) {
      setError(`Please rate "${missing.label}"`)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          ...ratings,
          comment,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit feedback')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
    }}>
      <div 
        className="fade-in"
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '500px',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#94a3b8',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e1e3a', marginBottom: '4px' }}>
          Feedback for {courseName}
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
          {courseSubject}
        </p>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {CATEGORIES.map(cat => (
            <div key={cat.id}>
              <p style={{ fontSize: '15px', fontWeight: '700', color: '#1e1e3a', marginBottom: '10px' }}>{cat.label}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => handleRate(cat.id, star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: ratings[cat.id] >= star ? '#fbbf24' : '#e2e8f0',
                      transition: 'transform 0.1s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill={ratings[cat.id] >= star ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <p style={{ fontSize: '15px', fontWeight: '700', color: '#1e1e3a', marginBottom: '10px' }}>Additional Comments</p>
            <textarea
              placeholder="Tell us more about your experience..."
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 500))}
              style={{
                width: '100%',
                height: '110px',
                padding: '16px',
                borderRadius: '16px',
                border: '2px solid #f1f5f9',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#3636e8'}
              onBlur={e => e.currentTarget.style.borderColor = '#f1f5f9'}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{comment.length}/500</span>
            </div>
          </div>
        </div>

        <div style={{ 
          marginTop: '24px', 
          padding: '16px', 
          background: '#f8fafc', 
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
        }}>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
            → Your feedback is completely private. Teachers cannot see your feedback or ratings.
          </p>
        </div>

        {error && (
          <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '16px', fontWeight: '600' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button
            onClick={() => router.push('/support')}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '50px',
              border: 'none',
              background: '#f1f5f9',
              color: '#475569',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Need More Help?
          </button>
          <div style={{ display: 'flex', gap: '12px', flex: 1.5 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '50px',
                border: 'none',
                background: 'white',
                color: '#64748b',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                flex: 1.5,
                padding: '14px',
                borderRadius: '50px',
                border: 'none',
                background: '#0a0a0a',
                color: 'white',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
