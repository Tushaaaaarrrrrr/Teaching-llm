'use client'

import { useState, useEffect } from 'react'
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
  examRating: number
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
  const { data: courses, isLoading } = useSWR<CourseItem[]>('/api/courses', fetcher)
  const { data: submittedFeedbacks, mutate: mutateFeedbacks } = useSWR<any[]>('/api/feedback?studentId=' + userId, fetcher)
  
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null)

  const isAlreadySubmitted = (courseId: string) => {
    return submittedFeedbacks?.some(f => f.courseId === courseId) || false
  }

  if (isLoading) return <div className="page-container animate-pulse" />

  return (
    <div className="page-container fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <button 
          onClick={() => window.history.back()}
          style={{ 
            background: 'none', border: 'none', color: '#9999b0', fontSize: '14px', 
            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginBottom: '16px',
            padding: 0
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {courses?.map(course => {
          const submitted = isAlreadySubmitted(course.id)
          return (
            <div 
              key={course.id}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '24px 32px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid #f1f5f9',
              }}
            >
              <div>
                <span style={{ 
                  fontSize: '11px', fontWeight: '800', color: '#9999b0', 
                  textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' 
                }}>
                  {course.subject}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e1e3a', marginBottom: '4px' }}>{course.name}</h3>
                <p style={{ fontSize: '13px', color: submitted ? '#10b981' : '#94a3b8', fontWeight: '600' }}>
                  {submitted ? '✓ Feedback submitted' : 'No feedback given yet'}
                </p>
              </div>

              {!submitted && (
                <button
                  onClick={() => setSelectedCourse(course)}
                  style={{
                    background: '#0a0a0a',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '50px',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Share Feedback
                </button>
              )}
            </div>
          )
        })}

        {courses?.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
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
  const { data: feedbacks, isLoading } = useSWR<FeedbackItem[]>('/api/feedback', fetcher)
  const { data: courses } = useSWR<CourseItem[]>('/api/courses', fetcher)
  
  const [filterCourse, setFilterCourse] = useState('')
  const [searchStudent, setSearchStudent] = useState('')

  const filtered = feedbacks?.filter(f => {
    const matchCourse = !filterCourse || f.course.id === filterCourse
    const matchStudent = !searchStudent || 
      f.student.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      f.student.email.toLowerCase().includes(searchStudent.toLowerCase())
    return matchCourse && matchStudent
  })

  if (isLoading) return <div className="page-container animate-pulse" />

  return (
    <div className="page-container fade-in">
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
                background: 'white',
                fontSize: '14px',
                color: '#1e1e3a',
                outline: 'none',
                appearance: 'none',
                minWidth: '200px',
              }}
            >
              <option value="">All Courses</option>
              {courses?.map(c => (
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
              background: 'white',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {filtered?.map(f => (
          <div 
            key={f.id}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              border: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1e1e3a', marginBottom: '2px' }}>{f.student.name}</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>{f.student.email} • {new Date(f.createdAt).toLocaleDateString()}</p>
              </div>
              <div style={{ 
                background: '#f8fafc', padding: '6px 14px', borderRadius: '50px', 
                fontSize: '12px', fontWeight: '700', color: '#3636e8', border: '1px solid #e2e8f0' 
              }}>
                {f.course.name}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {[
                { label: 'Teacher', val: f.teacherRating },
                { label: 'Concept', val: f.conceptRating },
                { label: 'Materials', val: f.materialRating },
                { label: 'Exam', val: f.examRating },
                { label: 'Recommend', val: f.recommendScore },
              ].map(r => (
                <div key={r.label}>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: '#9999b0', textTransform: 'uppercase', marginBottom: '4px' }}>{r.label}</p>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1,2,3,4,5].map(s => (
                      <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={s <= r.val ? '#fbbf24' : '#e2e8f0'}>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {f.comment && (
              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                  "{f.comment}"
                </p>
              </div>
            )}
          </div>
        ))}

        {filtered?.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px', color: '#94a3b8' }}>
            <p style={{ fontSize: '16px', fontWeight: '500' }}>No feedback entries found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
