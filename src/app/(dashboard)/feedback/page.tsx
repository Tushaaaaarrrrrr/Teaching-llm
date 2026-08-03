'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import FeedbackModal from '@/components/FeedbackModal'
import ManagerUserModal from '@/components/ManagerUserModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface CourseItem {
  id: string
  name: string
  subject: string
  color: string
  requireFeedback?: boolean
}

interface FeedbackItem {
  id: string
  type: 'COURSE' | 'APP' | 'WEBSITE'
  studentId: string
  teacherRating: number
  conceptRating: number
  materialRating: number
  recommendScore: number
  comment: string
  createdAt: string
  student: { id: string; name: string; email: string; securityNumber?: string | null }
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
  const [selectedCourseForEdit, setSelectedCourseForEdit] = useState<{ course: CourseItem; feedback: any } | null>(null)
  const [selectedPlatformFeedback, setSelectedPlatformFeedback] = useState<{ id?: string; type: 'APP' | 'WEBSITE'; rating: number; comment: string } | null>(null)

  const [isNativeApp, setIsNativeApp] = useState(false)
  useEffect(() => {
    const detectNativeApp = () => {
      const w = window as any
      setIsNativeApp(
        document.documentElement.classList.contains('is-native') ||
        Boolean(w.Capacitor?.isNativePlatform?.() || w.Capacitor?.isNative)
      )
    }
    detectNativeApp()
    const observer = new MutationObserver(detectNativeApp)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const platformFeedbackObj = submittedFeedbacks.find(f => f.type === (isNativeApp ? 'APP' : 'WEBSITE'))
  const hasPlatformFeedback = !!platformFeedbackObj

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
            boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)',
            color: 'var(--text-secondary)',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '2px 2px 4px var(--neu-dark), -2px -2px 4px var(--neu-light)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)'
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
            Feedback
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
        {/* App / Website Feedback Card */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '24px',
            padding: '24px 28px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '12px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{
              fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              Platform Feedback
            </span>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              {isNativeApp ? 'App Feedback' : 'Website Feedback'}
            </h3>
          </div>

          <p style={{ fontSize: '14px', color: hasPlatformFeedback ? 'var(--success)' : 'var(--text-muted)', fontWeight: '600', margin: 0 }}>
            {hasPlatformFeedback ? '✓ Feedback submitted' : 'No feedback given yet'}
          </p>

          {hasPlatformFeedback && platformFeedbackObj && (
            <div style={{ width: '100%', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '10.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  Rating
                </span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill={s <= platformFeedbackObj.teacherRating ? '#fbbf24' : 'var(--surface-2)'}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                </div>
              </div>
              {platformFeedbackObj.comment && (
                <div style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0, fontStyle: 'italic' }}>
                    "{platformFeedbackObj.comment}"
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => {
              setSelectedPlatformFeedback({
                id: platformFeedbackObj?.id,
                type: isNativeApp ? 'APP' : 'WEBSITE',
                rating: platformFeedbackObj?.teacherRating || 0,
                comment: platformFeedbackObj?.comment || '',
              })
            }}
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
            {hasPlatformFeedback ? 'Edit Review' : 'Share Feedback'}
          </button>
        </div>

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
                border: '1px solid var(--border)',
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
                <div style={{ width: '100%', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '4px' }}>
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
                    <div style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0, fontStyle: 'italic' }}>
                        "{feedbackObj.comment}"
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedCourseForEdit({ course, feedback: feedbackObj })}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      padding: '8px 16px',
                      borderRadius: '50px',
                      fontWeight: '700',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      alignSelf: 'flex-start',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Edit Feedback
                  </button>
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
          }}
        />
      )}

      {selectedCourseForEdit && (
        <FeedbackModal
          courseId={selectedCourseForEdit.course.id}
          courseName={selectedCourseForEdit.course.name}
          courseSubject={selectedCourseForEdit.course.subject}
          existingFeedback={{
            id: selectedCourseForEdit.feedback.id,
            teacherRating: selectedCourseForEdit.feedback.teacherRating,
            conceptRating: selectedCourseForEdit.feedback.conceptRating,
            materialRating: selectedCourseForEdit.feedback.materialRating,
            recommendScore: selectedCourseForEdit.feedback.recommendScore,
            comment: selectedCourseForEdit.feedback.comment,
          }}
          onClose={() => setSelectedCourseForEdit(null)}
          onSuccess={() => {
            mutateFeedbacks()
          }}
        />
      )}

      {selectedPlatformFeedback && (
        <AppFeedbackModal
          initialData={selectedPlatformFeedback}
          onClose={() => setSelectedPlatformFeedback(null)}
          onSuccess={() => {
            mutateFeedbacks()
          }}
        />
      )}
    </div>
  )
}

function ManagerFeedbackView() {
  const router = useRouter()
  const { data: feedbacksRaw, isLoading } = useSWR('/api/feedback', fetcher)
  const { data: coursesRaw, mutate: mutateCourses } = useSWR('/api/courses', fetcher)

  // Safety: always ensure arrays — API may return an error object on 401
  const feedbacks: FeedbackItem[] = Array.isArray(feedbacksRaw) ? feedbacksRaw : []
  const courses: CourseItem[] = Array.isArray(coursesRaw) ? coursesRaw : []

  const [filterCourse, setFilterCourse] = useState('')
  const [searchStudent, setSearchStudent] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showForceSettings, setShowForceSettings] = useState(false)

  const filtered = feedbacks.filter(f => {
    let matchCourse = true
    if (filterCourse === 'COURSE_ONLY') {
      matchCourse = f.course.id !== 'APP' && f.course.id !== 'WEB'
    } else if (filterCourse === 'APP') {
      matchCourse = f.course.id === 'APP'
    } else if (filterCourse === 'WEB') {
      matchCourse = f.course.id === 'WEB'
    } else if (filterCourse) {
      matchCourse = f.course.id === filterCourse
    }

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
            boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)',
            color: 'var(--text-secondary)',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '2px 2px 4px var(--neu-dark), -2px -2px 4px var(--neu-light)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)'
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
            Feedback
          </h1>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            margin: '3px 0 0',
            fontFamily: "'Outfit', sans-serif"
          }}>
            Student reviews &amp; platform feedback
          </p>
        </div>
      </div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <button
          onClick={() => setShowForceSettings(true)}
          style={{
            background: '#0a0a0a',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'transform 0.1s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span>⚙️</span> Required Feedback
        </button>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <select 
              value={filterCourse}
              onChange={e => setFilterCourse(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                color: 'var(--text-primary)',
                outline: 'none',
                appearance: 'none',
                minWidth: '200px',
              }}
            >
              <option value="">All Feedback</option>
              <option value="COURSE_ONLY">Course Feedback</option>
              <option value="APP">App Feedback</option>
              <option value="WEB">Website Feedback</option>
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
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {filtered.map(f => {
          const isAppOrWeb = f.course.id === 'APP' || f.course.id === 'WEB'
          return (
            <div 
              key={f.id}
              style={{
                background: 'var(--surface)',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'flex-start' }}>
                <div>
                  <button
                    onClick={() => setSelectedUserId(f.studentId)}
                    title="View Student Profile"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'var(--primary)',
                      fontWeight: '700',
                      fontSize: '16px',
                      marginBottom: '2px',
                      display: 'inline-block',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {f.student.name}
                  </button>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    ID: {(f.student as any).securityNumber || 'N/A'} • {f.student.email} • {new Date(f.createdAt).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <div style={{ 
                  background: isAppOrWeb ? 'rgba(54,54,232,0.05)' : 'var(--surface)', 
                  padding: '6px 14px', borderRadius: '50px', 
                  fontSize: '12px', fontWeight: '700', 
                  color: f.course.id === 'APP' ? '#3636e8' : f.course.id === 'WEB' ? '#10b981' : 'var(--primary)', 
                  border: '1px solid var(--border)' 
                }}>
                  {f.course.name}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                {isAppOrWeb ? (
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Rating
                    </p>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={s <= f.teacherRating ? '#fbbf24' : 'var(--surface-2)'}>
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      ))}
                    </div>
                  </div>
                ) : (
                  [
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
                  ))
                )}
              </div>

              {f.comment && (
                <div style={{ padding: '14px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                    "{f.comment}"
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '16px', fontWeight: '500' }}>No feedback entries found.</p>
          </div>
        )}
      </div>

      {selectedUserId && (
        <ManagerUserModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} onUpdate={() => {}} />
      )}

      {showForceSettings && (
        <ForceFeedbackSettingsModal
          courses={courses}
          onClose={() => setShowForceSettings(false)}
          onMutate={mutateCourses}
        />
      )}
    </div>
  )
}

function ForceFeedbackSettingsModal({ 
  courses, 
  onClose, 
  onMutate 
}: { 
  courses: CourseItem[], 
  onClose: () => void, 
  onMutate: () => void 
}) {
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const activeCourse = courses.find(c => c.id === selectedCourseId)

  const handleToggleForceFeedback = async () => {
    if (!activeCourse) return
    
    const newRequired = !activeCourse.requireFeedback
    const actionWord = newRequired ? 'require extensive feedback' : 'disable the extensive feedback requirement'
    
    if (!window.confirm(`Are you sure you want to ${actionWord} for "${activeCourse.name}"?`)) {
      return
    }

    setIsUpdating(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/courses/${activeCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeCourse.name,
          subject: activeCourse.subject,
          color: activeCourse.color,
          requireFeedback: newRequired
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update course feedback settings')
      }

      setSuccess(`Successfully updated "${activeCourse.name}"!`)
      onMutate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--surface)',
        width: '100%',
        maxWidth: '480px',
        borderRadius: '24px',
        padding: '28px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        border: '1px solid var(--border)',
        position: 'relative',
        fontFamily: "'Outfit', sans-serif",
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Forced Feedback Settings
        </h3>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.4' }}>
          Select a course below to enable or disable forced extensive feedback. When enabled, students must submit feedback to access the course.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
              Select Course
            </label>
            <select
              value={selectedCourseId}
              onChange={e => {
                setSelectedCourseId(e.target.value)
                setError('')
                setSuccess('')
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            >
              <option value="">-- Choose a Course --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.requireFeedback ? '★' : ''}
                </option>
              ))}
            </select>
          </div>

          {activeCourse && (
            <div style={{ 
              background: 'var(--surface-2)', 
              borderRadius: '16px', 
              padding: '18px', 
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Course
                </span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {activeCourse.name}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Current Status
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: activeCourse.requireFeedback ? 'var(--success)' : 'var(--text-muted)',
                  }} />
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: activeCourse.requireFeedback ? 'var(--success)' : 'var(--text-secondary)' }}>
                    {activeCourse.requireFeedback ? 'Forced Extensive Feedback Active' : 'Standard (Optional Feedback)'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleToggleForceFeedback}
                disabled={isUpdating}
                style={{
                  marginTop: '6px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '50px',
                  border: 'none',
                  background: activeCourse.requireFeedback ? 'var(--danger)' : '#0a0a0a',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s',
                  opacity: isUpdating ? 0.7 : 1,
                }}
              >
                {isUpdating ? 'Updating...' : activeCourse.requireFeedback ? 'Disable Force Feedback' : 'Enable Force Feedback'}
              </button>
            </div>
          )}

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '13px', margin: 0, fontWeight: '600' }}>
              ⚠️ {error}
            </p>
          )}

          {success && (
            <p style={{ color: 'var(--success)', fontSize: '13px', margin: 0, fontWeight: '600' }}>
              ✓ {success}
            </p>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 24px',
                borderRadius: '50px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface AppFeedbackModalProps {
  initialData: { id?: string; type: 'APP' | 'WEBSITE'; rating: number; comment: string }
  onClose: () => void
  onSuccess: () => void
}

function AppFeedbackModal({ initialData, onClose, onSuccess }: AppFeedbackModalProps) {
  const [rating, setRating] = useState(initialData.rating)
  const [comment, setComment] = useState(initialData.comment)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const isEdit = !!initialData.id
      const url = '/api/feedback/app'
      const method = isEdit ? 'PUT' : 'POST'

      const body: any = {
        rating,
        comment,
      }

      if (isEdit) {
        body.id = initialData.id
      } else {
        body.platform = initialData.type === 'APP' ? 'APP' : 'WEB'
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      <div style={{
        background: 'var(--surface)',
        width: '100%',
        maxWidth: '450px',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        border: '1px solid var(--border)',
        position: 'relative',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
          {initialData.type === 'APP' ? 'App Review' : 'Website Review'}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Your review helps us improve the learning platform.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Rating</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: s <= rating ? '#fbbf24' : 'var(--surface-2)',
                    transition: 'transform 0.1s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill={s <= rating ? '#fbbf24' : 'none'} stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Comments</p>
            <textarea
              placeholder="Tell us what you liked or how we can improve..."
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 500))}
              style={{
                width: '100%',
                height: '100px',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
              }}
            />
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: '12px', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '50px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-secondary)',
                fontWeight: '700',
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
                padding: '10px',
                borderRadius: '50px',
                border: 'none',
                background: '#0a0a0a',
                color: 'white',
                fontWeight: '700',
                cursor: 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
