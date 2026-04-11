'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'

const COURSE_ICONS: Record<string, React.ReactNode> = {
  BookOpen: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  Brain: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20"/><path d="M2 12h20"/></svg>,
  Globe: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  Database: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Monitor: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Wifi: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1"/></svg>,
}

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
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: '#6b6b8a' }}>
          No free courses available at the moment.
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in">


      <div className="grid-3" style={{ marginTop: '24px' }}>
        {courses.map(course => (
          <div
            key={course.id}
            style={{
              background: '#e8eaf0',
              borderRadius: '28px',
              boxShadow: '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
            }}
          >
            {/* Gradient Banner */}
            <div style={{
              height: '100px',
              background: `linear-gradient(135deg, ${course.color || '#6366f1'}ee, ${course.color || '#6366f1'}99)`,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{ position: 'absolute', width: '130px', height: '130px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', top: '-50px', right: '-30px' }} />
              <div style={{ position: 'absolute', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', bottom: '-20px', left: '24px' }} />
              <div style={{
                width: '58px',
                height: '58px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1,
              }}>
                {COURSE_ICONS[course.icon] || COURSE_ICONS.BookOpen}
              </div>
            </div>

            {/* Card Body */}
            <div style={{ padding: '18px 20px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#1e1e3a',
                marginBottom: '4px',
                lineHeight: '1.3',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {course.name}
              </h3>

              {course.subject && (
                <span style={{
                  display: 'inline-block',
                  padding: '3px 12px',
                  borderRadius: '50px',
                  background: (course.color || '#6366f1') + '18',
                  color: (course.color || '#6366f1'),
                  fontSize: '12px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  letterSpacing: '0.02em',
                  width: 'fit-content',
                }}>
                  {course.subject}
                </span>
              )}

              {course.teacherName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: (course.color || '#6366f1') + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: '700', color: (course.color || '#6366f1'),
                  }}>
                    {course.teacherName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '12.5px', color: '#9999b0', fontWeight: '500' }}>
                    {course.teacherName}
                  </span>
                </div>
              )}

              {/* Stats row */}
              <div style={{
                display: 'flex',
                gap: '10px',
                paddingTop: '12px',
                borderTop: '1.5px solid rgba(0,0,0,0.06)',
                marginTop: 'auto',
                marginBottom: '16px'
              }}>
                <div style={{
                  flex: 1, padding: '8px 10px', borderRadius: '14px',
                  background: '#e8eaf0', boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>{course._count?.topics || 0}</div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600' }}>Topics</div>
                </div>
                <div style={{
                  flex: 1, padding: '8px 10px', borderRadius: '14px',
                  background: '#e8eaf0', boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>{course._count?.lectures || 0}</div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600' }}>Lectures</div>
                </div>
                <div style={{
                  flex: 1, padding: '8px 10px', borderRadius: '14px',
                  background: '#e8eaf0', boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>{course._count?.materials || 0}</div>
                  <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600' }}>Materials</div>
                </div>
              </div>

              {/* Managing Tools */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {course.isEnrolled ? (
                  <>
                    <button 
                      disabled={loadingId === course.id}
                      className="btn" 
                      style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', borderRadius: '50px', fontWeight: '700' }}
                      onClick={() => { window.location.href = `/courses/${course.id}` }}
                    >
                      Open Course
                    </button>
                    <button 
                      disabled={loadingId === course.id}
                      className="btn btn-ghost" 
                      title="Unenroll"
                      onClick={() => handleEnroll(course.id, true)}
                      style={{ padding: '0 16px', color: '#ef4444', borderColor: '#fee2e2', borderRadius: '50px' }}
                    >
                      {loadingId === course.id ? '...' : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      )}
                    </button>
                  </>
                ) : (
                  <button 
                    disabled={loadingId === course.id}
                    className="btn btn-primary" 
                    style={{ flex: 1, borderRadius: '50px', fontWeight: '700', background: '#3636e8', border: 'none' }}
                    onClick={() => handleEnroll(course.id, false)}
                  >
                    {loadingId === course.id ? 'Enrolling...' : 'Enroll for Free'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
