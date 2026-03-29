'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'

export default function FreeCoursesPage() {
  const fetcher = (url: string) => fetch(url).then(r => r.json())
  const { data: courses, isLoading } = useSWR<any[]>('/api/free-resources/courses', fetcher)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleEnroll = async (courseId: string, currentlyEnrolled: boolean) => {
    setLoadingId(courseId)
    try {
      if (currentlyEnrolled) {
        // Unenroll
        const res = await fetch(`/api/free-resources/enroll?courseId=${courseId}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Failed to unenroll')
      } else {
        // Enroll
        const res = await fetch('/api/free-resources/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId }),
        })
        if (!res.ok) throw new Error('Failed to enroll')
      }
      mutate('/api/free-resources/courses')
    } catch (error) {
      console.error(error)
      alert('Error updating enrollment status.')
    } finally {
      setLoadingId(null)
    }
  }

  if (isLoading) {
    return <div className="page-container fade-in"><div style={{ padding: '40px', textAlign: 'center', color: '#9999b0' }}>Loading Free Courses...</div></div>
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="page-container fade-in">
        <div className="page-header">
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1e1e3a', margin: 0 }}>Free Courses</h1>
        </div>
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: '#6b6b8a' }}>
          No free courses available at the moment.
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1e1e3a', margin: 0 }}>Free Courses</h1>
        <p style={{ margin: '8px 0 0', color: '#6b6b8a', fontSize: '14px' }}>Explore and self-enroll in free educational content.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {courses.map(course => (
          <div key={course.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                background: course.color || '#e8eaf0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: course.color ? '#fff' : '#6366f1', fontSize: '20px', fontWeight: '700'
              }}>
                {course.icon || course.name?.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e1e3a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {course.name}
                </div>
                {course.subject && (
                  <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: '600' }}>
                    {course.subject}
                  </div>
                )}
              </div>
            </div>

            {course.description && (
               <p style={{ fontSize: '13px', color: '#6b6b8a', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                 {course.description}
               </p>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
               <div style={{ background: '#f3f4f6', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', color: '#4b5563', fontWeight: '500' }}>
                 {course._count?.lectures || 0} Lectures
               </div>
               <div style={{ background: '#f3f4f6', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', color: '#4b5563', fontWeight: '500' }}>
                 {course._count?.materials || 0} Materials
               </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              {course.isEnrolled ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    disabled={loadingId === course.id}
                    className="btn" 
                    style={{ flex: 1, background: '#10b981', color: 'white', border: 'none' }}
                    onClick={() => {
                        window.location.href = `/courses/${course.id}`
                    }}
                  >
                    Open Course
                  </button>
                  <button 
                    disabled={loadingId === course.id}
                    className="btn btn-ghost" 
                    title="Unenroll"
                    onClick={() => handleEnroll(course.id, true)}
                    style={{ padding: '0 12px', color: '#ef4444', borderColor: '#fee2e2' }}
                  >
                    {loadingId === course.id ? '...' : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    )}
                  </button>
                </div>
              ) : (
                <button 
                  disabled={loadingId === course.id}
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={() => handleEnroll(course.id, false)}
                >
                  {loadingId === course.id ? 'Enrolling...' : 'Enroll for Free'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
