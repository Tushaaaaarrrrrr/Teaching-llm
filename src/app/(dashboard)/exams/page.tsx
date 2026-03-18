'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Exam {
  id: string
  title: string
  description: string | null
  courseId: string
  expiresAt: string
  startDate: string | null
  durationMinutes: number
  isPublished: boolean
  createdAt: string
  course: { name: string; color: string }
  _count: { questions: number }
}

interface CourseOption {
  id: string
  name: string
}

export default function ExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [exRes, meRes, clRes] = await Promise.all([
        fetch('/api/exams'),
        fetch('/api/auth/me'),
        fetch('/api/courses')
      ])
      const exData = await exRes.json()
      const meData = await meRes.json()
      const clData = await clRes.json()

      setExams(Array.isArray(exData) ? exData : [])
      setUserRole(meData.user?.role || meData.role || '')
      setCourses(Array.isArray(clData) ? clData : [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isAdminOrManager = userRole === 'MANAGER' || userRole === 'ADMIN'

  // Categorize exams
  const now = new Date()
  const upcomingExams = exams.filter(e => e.startDate && new Date(e.startDate) > now)
  const activeExams = exams.filter(e => {
    const start = e.startDate ? new Date(e.startDate) : null
    const end = new Date(e.expiresAt)
    return (!start || start <= now) && end > now
  })
  const expiredExams = exams.filter(e => new Date(e.expiresAt) <= now)

  // Shared Styles
  const neuCard: React.CSSProperties = {
    borderRadius: '20px', background: '#e8eaf0',
    boxShadow: '6px 6px 14px #c5c7cf, -6px -6px 14px #ffffff',
    padding: '24px',
  }

  const neuButton: React.CSSProperties = {
    padding: '12px 28px', borderRadius: '50px', border: 'none',
    background: '#3636e8', color: '#fff', fontSize: '14px', fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '4px 4px 10px rgba(54,54,232,0.35), -2px -2px 6px rgba(255,255,255,0.7)',
    transition: 'all 0.2s ease',
  }

  const renderExamCard = (exam: Exam) => {
    const isUpcoming = exam.startDate && new Date(exam.startDate) > now
    const isExpired = new Date(exam.expiresAt) <= now
    
    return (
      <div 
        key={exam.id} 
        style={{ ...neuCard, display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ 
            padding: '4px 12px', borderRadius: '50px', 
            background: `${exam.course.color}18`, color: exam.course.color,
            fontSize: '11px', fontWeight: 800, textTransform: 'uppercase'
          }}>
            {exam.course.name}
          </span>
          {isUpcoming ? (
            <span style={{ 
              padding: '4px 10px', borderRadius: '50px', background: '#3636e812', 
              color: '#3636e8', fontSize: '10px', fontWeight: 800 
            }}>
              UPCOMING
            </span>
          ) : !exam.isPublished && (
            <span style={{ 
              padding: '4px 10px', borderRadius: '50px', background: 'rgba(0,0,0,0.05)', 
              color: '#6b6b8a', fontSize: '10px', fontWeight: 700 
            }}>
              DRAFT
            </span>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a', marginBottom: '6px' }}>{exam.title}</h3>
          <p style={{ 
            fontSize: '14px', color: '#6b6b8a', lineHeight: '1.5',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>
            {exam.description || 'No description available.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', color: '#9999b0', fontWeight: 700, textTransform: 'uppercase' }}>Duration</span>
            <span style={{ fontSize: '13px', color: '#1e1e3a', fontWeight: 700 }}>{exam.durationMinutes}m</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', color: '#9999b0', fontWeight: 700, textTransform: 'uppercase' }}>Questions</span>
            <span style={{ fontSize: '13px', color: '#1e1e3a', fontWeight: 700 }}>{exam._count.questions}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 'auto' }}>
            <span style={{ fontSize: '10px', color: '#9999b0', fontWeight: 700, textTransform: 'uppercase' }}>{isUpcoming ? 'Starts At' : 'Deadline'}</span>
            <span style={{ fontSize: '13px', color: isExpired ? '#ef4444' : '#1e1e3a', fontWeight: 700 }}>
              {new Date(isUpcoming ? exam.startDate! : exam.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <button
          onClick={() => router.push(`/exams/${exam.id}`)}
          style={{
            width: '100%', padding: '12px', borderRadius: '14px', border: 'none',
            background: (isExpired || isUpcoming) && !isAdminOrManager ? '#c5c7cf' : '#fff',
            color: (isExpired || isUpcoming) && !isAdminOrManager ? '#6b6b8a' : '#3636e8',
            fontSize: '14px', fontWeight: 700, cursor: (isExpired || isUpcoming) && !isAdminOrManager ? 'default' : 'pointer',
            boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
            transition: 'all 0.2s', marginTop: '4px'
          }}
          disabled={(isExpired || isUpcoming) && !isAdminOrManager}
        >
          {isAdminOrManager ? 'Manage Exam' : isUpcoming ? 'Not Started' : isExpired ? 'Expired' : 'Start Assessment'}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: '#9999b0', fontSize: '15px' }}>Loading exams...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '32px' }}>
        {isAdminOrManager && (
          <button 
            onClick={() => router.push('/exams/create')}
            style={neuButton}
          >
            Create New Exam
          </button>
        )}
      </div>

      {activeExams.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
           <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              Active Exams
           </h2>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {activeExams.map(renderExamCard)}
           </div>
        </section>
      )}

      {upcomingExams.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
           <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#3636e8', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3636e8' }} />
              Upcoming Exams
           </h2>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {upcomingExams.map(renderExamCard)}
           </div>
        </section>
      )}

      {expiredExams.length > 0 && (
        <section>
           <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#6b6b8a', marginBottom: '20px' }}>Past Exams</h2>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {expiredExams.map(renderExamCard)}
           </div>
        </section>
      )}

      {exams.length === 0 && (
        <div style={{ ...neuCard, textAlign: 'center', padding: '64px' }}>
          <div style={{ fontSize: '16px', color: '#6b6b8a', marginBottom: '8px', fontWeight: 700 }}>No exams found</div>
          <p style={{ fontSize: '14px', color: '#9999b0' }}>{isAdminOrManager ? 'Start by creating an exam for your courses.' : 'You have no active exams at the moment.'}</p>
        </div>
      )}
    </div>
  )
}
