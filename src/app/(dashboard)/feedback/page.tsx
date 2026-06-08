'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import FeedbackModal from '@/components/FeedbackModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface CourseItem {
  id: string
  name: string
  subject: string
  color: string
}

interface FeedbackItem {
  id: string
  teacherRating: number
  conceptRating: number
  materialRating: number
  recommendScore: number
  comment: string
  createdAt: string
  student: { name: string; email: string }
  course: { id: string; name: string }
}

export default function FeedbackPage() {
  const { data: userData } = useSWR('/api/auth/me', fetcher)
  const user = userData?.user

  if (!user) return <div className="page-container skeleton" style={{ height: '400px' }} />

  if (user.role === 'MANAGER') {
    return <ManagerFeedbackView />
  }

  return <StudentFeedbackView userId={user.id} />
}

function StudentFeedbackView({ userId }: { userId: string }) {
  const router = useRouter()
  const { data: coursesRaw, isLoading } = useSWR('/api/courses', fetcher)
  const { data: submittedFeedbacksRaw, mutate: mutateFeedbacks } = useSWR('/api/feedback?studentId=' + userId, fetcher)

  // Safety: always ensure arrays — API may return an error object on 401
  const courses: CourseItem[] = Array.isArray(coursesRaw) ? coursesRaw : []
  const submittedFeedbacks: any[] = Array.isArray(submittedFeedbacksRaw) ? submittedFeedbacksRaw : []

  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null)

  const isAlreadySubmitted = (courseId: string) => {
    return submittedFeedbacks.some(f => f.courseId === courseId)
  }

  if (isLoading) return <div className="page-container animate-pulse" />

  return (
    <div className="page-container fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(16px, 4vw, 32px)' }}>
      {/* Premium Neumorphic Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '28px',
        justifyContent: 'flex-start'
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Go Back"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--surface)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '4px 4px 10px #c5c7cf, -4px -4px 10px #ffffff',
            color: 'var(--text-secondary)',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '2px 2px 4px #c5c7cf, -2px -2px 4px #ffffff'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 10px #c5c7cf, -4px -4px 10px #ffffff'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 900,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            fontFamily: "'Outfit', 'Nunito', sans-serif"
          }}>
            Course Feedback
          </h1>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            margin: '3px 0 0',
            fontFamily: "'Outfit', sans-serif"
          }}>
            Ratings &amp; student reviews
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {courses.map(course => {
          const submitted = isAlreadySubmitted(course.id)
          const feedbackObj = submittedFeedbacks.find(f => f.courseId === course.id)
          return (
            <div
              key={course.id}
              style={{
                background: 'var(--surface)',
                borderRadius: '24px',
                padding: '24px 28px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '12px',
                border: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{
                  fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                  {course.subject}
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{course.name}</h3>
              </div>

              <p style={{ fontSize: '14px', color: submitted ? 'var(--success)' : 'var(--text-muted)', fontWeight: '600', margin: 0 }}>
                {submitted ? '✓ Feedback submitted' : 'No feedback given yet'}
              </p>

              {submitted && feedbackObj && (
                <div style={{ width: '100%', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                    {[
                      { label: 'Teacher', val: feedbackObj.teacherRating },
                      { label: 'Concept', val: feedbackObj.conceptRating },
                      { label: 'Materials', val: feedbackObj.materialRating },
                      { label: 'Recommend', val: feedbackObj.recommendScore },
                    ].map(r => (
                      <div key={r.label}>
                        <span style={{ fontSize: '10.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                          {r.label}
                        </span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1,2,3,4,5].map(s => (
                            <svg key={s} width="11" height="11" viewBox="0 0 24 24" fill={s <= r.val ? '#fbbf24' : 'var(--surface-2)'}>
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {feedbackObj.comment && (
                    <div style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0, fontStyle: 'italic' }}>
                        "{feedbackObj.comment}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!submitted && (
                <button
                  onClick={() => setSelectedCourse(course)}
                  style={{
                    background: '#0a0a0a',
                    color: 'white',
                    padding: '12px 28px',
                    borderRadius: '50px',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    marginTop: '4px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Share Feedback
                </button>
              )}
            </div>
          )
        })}

        {courses.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <p>You are not enrolled in any courses yet.</p>
          </div>
        )}
      </div>

      {selectedCourse && (
        <FeedbackModal
          courseId={selectedCourse.id}
          courseName={selectedCourse.name}
          courseSubject={selectedCourse.subject}
          onClose={() => setSelectedCourse(null)}
          onSuccess={() => {
            mutateFeedbacks()
            // Optional: show a success toast or message
          }}
        />
      )}
    </div>
  )
}

function ManagerFeedbackView() {
  const router = useRouter()
  const { data: feedbacksRaw, isLoading } = useSWR('/api/feedback', fetcher)
  const { data: coursesRaw } = useSWR('/api/courses', fetcher)

  // Safety: always ensure arrays — API may return an error object on 401
  const feedbacks: FeedbackItem[] = Array.isArray(feedbacksRaw) ? feedbacksRaw : []
  const courses: CourseItem[] = Array.isArray(coursesRaw) ? coursesRaw : []

  const [filterCourse, setFilterCourse] = useState('')
  const [searchStudent, setSearchStudent] = useState('')

  const filtered = feedbacks.filter(f => {
    const matchCourse = !filterCourse || f.course.id === filterCourse
    const matchStudent = !searchStudent || 
      f.student.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      f.student.email.toLowerCase().includes(searchStudent.toLowerCase())
    return matchCourse && matchStudent
  })

  if (isLoading) return <div className="page-container animate-pulse" />

  return (
    <div className="page-container fade-in" style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      {/* Premium Neumorphic Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '28px',
        justifyContent: 'flex-start'
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Go Back"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--surface)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '4px 4px 10px #c5c7cf, -4px -4px 10px #ffffff',
            color: 'var(--text-secondary)',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '2px 2px 4px #c5c7cf, -2px -2px 4px #ffffff'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 10px #c5c7cf, -4px -4px 10px #ffffff'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 900,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            fontFamily: "'Outfit', 'Nunito', sans-serif"
          }}>
            Course Feedback
          </h1>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            margin: '3px 0 0',
            fontFamily: "'Outfit', sans-serif"
          }}>
            Ratings &amp; student reviews
          </p>
        </div>
      </div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <select 
              value={filterCourse}
              onChange={e => setFilterCourse(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: 'var(--surface)',
                fontSize: '14px',
                color: 'var(--text-primary)',
                outline: 'none',
                appearance: 'none',
                minWidth: '200px',
              }}
            >
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <input 
            type="text"
            placeholder="Search student..."
            value={searchStudent}
            onChange={e => setSearchStudent(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: 'var(--surface)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {filtered.map(f => (
          <div 
            key={f.id}
            style={{
              background: 'var(--surface)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              border: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>{f.student.name}</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{f.student.email} • {new Date(f.createdAt).toLocaleDateString('en-GB')}</p>
              </div>
              <div style={{ 
                background: 'var(--surface)', padding: '6px 14px', borderRadius: '50px', 
                fontSize: '12px', fontWeight: '700', color: 'var(--primary)', border: '1px solid #e2e8f0' 
              }}>
                {f.course.name}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {[
                { label: 'Teacher', val: f.teacherRating },
                { label: 'Concept', val: f.conceptRating },
                { label: 'Materials', val: f.materialRating },
                { label: 'Recommend', val: f.recommendScore },
              ].map(r => (
                <div key={r.label}>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{r.label}</p>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1,2,3,4,5].map(s => (
                      <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={s <= r.val ? '#fbbf24' : 'var(--surface-2)'}>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {f.comment && (
              <div style={{ padding: '14px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  "{f.comment}"
                </p>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '16px', fontWeight: '500' }}>No feedback entries found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
