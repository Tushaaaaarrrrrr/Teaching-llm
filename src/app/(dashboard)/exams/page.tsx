'use client'

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ExamTimingStatus from '@/components/exams/ExamTimingStatus'
import { getExamTimingState } from '@/lib/date-utils'

interface Exam {
  id: string
  title: string
  description: string | null
  courseId: string | null
  testSeriesId: string | null
  expiresAt: string
  startDate: string | null
  durationMinutes: number
  isPublished: boolean
  createdAt: string
  examType: string
  course: { name: string; color: string } | null
  testSeries?: { id: string; title: string } | null
  _count: { questions: number }
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ExamsPage() {
  const router = useRouter()
  const [now, setNow] = useState(() => new Date())
  const [showCopyModal, setShowCopyModal] = useState<Exam | null>(null)
  const [copyDestType, setCopyDestType] = useState<'course' | 'testSeries'>('course')
  const [copyDestId, setCopyDestId] = useState('')
  const [copying, setCopying] = useState(false)
  const [showCreateTSModal, setShowCreateTSModal] = useState(false)
  const [creatingSeries, setCreatingSeries] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const { data: examsData, isLoading: loading, mutate: mutateExams } = useSWR('/api/exams', fetcher, { refreshInterval: 30000, revalidateOnFocus: true })
  const { data: meData } = useSWR('/api/auth/me', fetcher)
  const { data: tsData, mutate: mutateTS } = useSWR('/api/test-series', fetcher, { revalidateOnFocus: false })
  const { data: coursesData } = useSWR('/api/courses', fetcher, { revalidateOnFocus: false })

  const exams: Exam[] = Array.isArray(examsData) ? examsData : []
  const userRole = meData?.user?.role || meData?.role || ''
  const isManager = userRole === 'MANAGER' || userRole === 'ADMIN'
  const testSeriesList = tsData?.testSeries || []
  const courses = Array.isArray(coursesData) ? coursesData : []

  // Split exams
  const courseExams = exams.filter(e => e.courseId && !e.testSeriesId)
  const tsExams = exams.filter(e => e.testSeriesId)

  const upcomingExams = courseExams.filter(e => getExamTimingState(e.startDate, e.expiresAt, now) === 'before')
  const activeExams = courseExams.filter(e => { const s = getExamTimingState(e.startDate, e.expiresAt, now); return s === 'active' || s === 'ending' })
  const expiredExams = courseExams.filter(e => getExamTimingState(e.startDate, e.expiresAt, now) === 'ended')

  const neu: React.CSSProperties = { borderRadius: '20px', background: '#e8eaf0', boxShadow: '6px 6px 14px #c5c7cf, -6px -6px 14px #ffffff', padding: '24px' }
  const neuBtn: React.CSSProperties = { padding: '12px 28px', borderRadius: '50px', border: 'none', background: '#3636e8', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '4px 4px 10px rgba(54,54,232,0.35), -2px -2px 6px rgba(255,255,255,0.7)', transition: 'all 0.2s ease' }

  const handleCopy = async () => {
    if (!showCopyModal || !copyDestId) return
    setCopying(true)
    try {
      const res = await fetch('/api/exams/copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ examId: showCopyModal.id, destinationType: copyDestType, destinationId: copyDestId }) })
      const data = await res.json()
      if (res.ok) { alert(data.message || 'Copied!'); setShowCopyModal(null); setCopyDestId(''); mutateExams() }
      else alert(data.error || 'Failed to copy')
    } catch { alert('Error copying exam') }
    finally { setCopying(false) }
  }

  const handleCreateTS = async () => {
    const title = (document.getElementById('ts-title') as HTMLInputElement)?.value
    const desc = (document.getElementById('ts-desc') as HTMLInputElement)?.value
    const price = (document.getElementById('ts-price') as HTMLInputElement)?.value
    const validity = (document.getElementById('ts-validity') as HTMLInputElement)?.value
    if (!title) { alert('Title required'); return }
    setCreatingSeries(true)
    try {
      const res = await fetch('/api/test-series', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description: desc, price: price || 0, validityDays: validity || 365 }) })
      if (res.ok) { setShowCreateTSModal(false); mutateTS() }
      else { const d = await res.json(); alert(d.error || 'Failed') }
    } catch { alert('Error creating test series') }
    finally { setCreatingSeries(false) }
  }

  const renderExamCard = (exam: Exam) => {
    const timingState = getExamTimingState(exam.startDate, exam.expiresAt, now)
    const isUpcoming = timingState === 'before'
    const isExpired = timingState === 'ended'
    const label = exam.course?.name || exam.testSeries?.title || 'Test Series'
    const color = exam.course?.color || '#f59e0b'

    return (
      <div key={exam.id} style={{ ...neu, display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ padding: '4px 12px', borderRadius: '50px', background: `${color}18`, color, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>{label}</span>
            <span style={{ padding: '4px 14px', borderRadius: '50px', background: exam.examType === 'FINAL_TEST' ? '#ef444410' : '#8b5cf612', color: exam.examType === 'FINAL_TEST' ? '#ef4444' : '#8b5cf6', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', border: `1px solid ${exam.examType === 'FINAL_TEST' ? '#ef444420' : '#8b5cf625'}`, letterSpacing: '0.02em' }}>
              {exam.examType === 'FINAL_TEST' ? 'Final Test' : 'Practice Test'}
            </span>
            {exam.testSeriesId && <span style={{ padding: '4px 10px', borderRadius: '50px', background: '#fef3c7', color: '#92400e', fontSize: '10px', fontWeight: 800 }}>TEST SERIES</span>}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {isManager && (
              <button onClick={(e) => { e.stopPropagation(); setShowCopyModal(exam); setCopyDestType('course'); setCopyDestId('') }}
                style={{ padding: '4px 10px', borderRadius: '50px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>📋 Copy</button>
            )}
            {isUpcoming ? (
              <span style={{ padding: '4px 10px', borderRadius: '50px', background: '#3636e812', color: '#3636e8', fontSize: '10px', fontWeight: 800 }}>UPCOMING</span>
            ) : !exam.isPublished && (
              <span style={{ padding: '4px 10px', borderRadius: '50px', background: 'rgba(0,0,0,0.05)', color: '#6b6b8a', fontSize: '10px', fontWeight: 700 }}>DRAFT</span>
            )}
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a', marginBottom: '6px' }}>{exam.title}</h3>
          <p style={{ fontSize: '14px', color: '#6b6b8a', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{exam.description || 'No description available.'}</p>
        </div>
        <ExamTimingStatus startDate={exam.startDate} expiresAt={exam.expiresAt} compact />
        <div style={{ display: 'flex', gap: '16px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '10px', color: '#9999b0', fontWeight: 700, textTransform: 'uppercase' }}>Duration</span><span style={{ fontSize: '13px', color: '#1e1e3a', fontWeight: 700 }}>{exam.durationMinutes}m</span></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '10px', color: '#9999b0', fontWeight: 700, textTransform: 'uppercase' }}>Questions</span><span style={{ fontSize: '13px', color: '#1e1e3a', fontWeight: 700 }}>{exam._count.questions}</span></div>
        </div>
        <button onClick={() => router.push(`/exams/${exam.id}`)} disabled={(isExpired || isUpcoming) && !isManager}
          style={{ width: '100%', padding: '12px', borderRadius: '14px', border: 'none', background: (isExpired || isUpcoming) && !isManager ? '#c5c7cf' : '#fff', color: (isExpired || isUpcoming) && !isManager ? '#6b6b8a' : '#3636e8', fontSize: '14px', fontWeight: 700, cursor: (isExpired || isUpcoming) && !isManager ? 'default' : 'pointer', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff', transition: 'all 0.2s', marginTop: '4px' }}>
          {isManager ? 'Manage Exam' : isUpcoming ? 'Not Started' : isExpired ? 'Expired' : 'Start Assessment'}
        </button>
      </div>
    )
  }

  if (loading) return <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><div style={{ color: '#9999b0', fontSize: '15px' }}>Loading exams...</div></div>

  return (
    <div style={{ padding: '24px 32px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '32px', gap: '12px' }}>
        {isManager && <button onClick={() => router.push('/exams/test-series/create')} style={{ ...neuBtn, background: '#f59e0b', boxShadow: '4px 4px 10px rgba(245,158,11,0.35), -2px -2px 6px rgba(255,255,255,0.7)' }}>+ Test Series</button>}
        {isManager && <button onClick={() => router.push('/exams/create')} style={neuBtn}>Create New Exam</button>}
      </div>

      {/* Test Series Section */}
      {testSeriesList.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />📝 Test Series
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            {testSeriesList.map((ts: any) => {
              const hasAccess = ts.myAccess || isManager
              const isExpiredAccess = ts.myAccess && new Date(ts.myAccess.expiresAt) < new Date()
              const myExams = tsExams.filter(e => e.testSeriesId === ts.id)
              return (
                <div key={ts.id} style={{ ...neu, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a', marginBottom: '4px' }}>{ts.title}</h3>
                      <p style={{ fontSize: '13px', color: '#6b6b8a' }}>{ts.description || 'Test series'}</p>
                    </div>
                    {hasAccess && !isExpiredAccess && <span style={{ padding: '4px 10px', borderRadius: '50px', background: '#d1fae5', color: '#059669', fontSize: '10px', fontWeight: 800 }}>UNLOCKED</span>}
                    {isExpiredAccess && <span style={{ padding: '4px 10px', borderRadius: '50px', background: '#fef2f2', color: '#dc2626', fontSize: '10px', fontWeight: 800 }}>EXPIRED</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                    <div><span style={{ fontSize: '10px', color: '#9999b0', fontWeight: 700 }}>EXAMS</span><div style={{ fontSize: '14px', fontWeight: 800 }}>{ts._count?.exams || 0}</div></div>
                    <div><span style={{ fontSize: '10px', color: '#9999b0', fontWeight: 700 }}>VALIDITY</span><div style={{ fontSize: '14px', fontWeight: 800 }}>{ts.validityDays} days</div></div>
                    {ts.price > 0 && <div><span style={{ fontSize: '10px', color: '#9999b0', fontWeight: 700 }}>PRICE</span><div style={{ fontSize: '14px', fontWeight: 800, color: '#4f46e5' }}>₹{ts.price}</div></div>}
                  </div>
                  {hasAccess && !isExpiredAccess && myExams.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '12px', marginBottom: '12px' }}>
                      {myExams.slice(0, 3).map(e => (
                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{e.title}</span>
                          <button onClick={() => router.push(`/exams/${e.id}`)} style={{ padding: '4px 12px', borderRadius: '50px', background: '#3636e8', color: '#fff', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Start</button>
                        </div>
                      ))}
                      {myExams.length > 3 && <div style={{ fontSize: '12px', color: '#6b6b8a', fontWeight: 600, marginTop: '4px' }}>+{myExams.length - 3} more exams</div>}
                    </div>
                  )}
                  {isManager && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button onClick={() => router.push(`/exams/test-series/${ts.id}`)}
                        style={{ flex: 1, padding: '8px', borderRadius: '10px', background: '#3636e812', border: '1px solid #3636e825', color: '#3636e8', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>⚙️ Manage</button>
                      <button onClick={async () => { if (!confirm(`Delete "${ts.title}"?`)) return; await fetch(`/api/test-series/${ts.id}`, { method: 'DELETE' }); mutateTS() }}
                        style={{ padding: '8px 12px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>🗑️</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {activeExams.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />Active Exams</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>{activeExams.map(renderExamCard)}</div>
        </section>
      )}
      {upcomingExams.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#3636e8', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3636e8' }} />Upcoming Exams</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>{upcomingExams.map(renderExamCard)}</div>
        </section>
      )}
      {expiredExams.length > 0 && (
        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#6b6b8a', marginBottom: '20px' }}>Past Exams</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>{expiredExams.map(renderExamCard)}</div>
        </section>
      )}
      {exams.length === 0 && testSeriesList.length === 0 && (
        <div style={{ ...neu, textAlign: 'center', padding: '64px' }}>
          <div style={{ fontSize: '16px', color: '#6b6b8a', marginBottom: '8px', fontWeight: 700 }}>No exams found</div>
          <p style={{ fontSize: '14px', color: '#9999b0' }}>{isManager ? 'Start by creating an exam or a test series.' : 'You have no active exams at the moment.'}</p>
        </div>
      )}

      {/* Copy Exam Modal */}
      {showCopyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={() => setShowCopyModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>📋 Copy Exam</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Copying: <strong>{showCopyModal.title}</strong></p>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Destination Type</label>
              <select value={copyDestType} onChange={e => { setCopyDestType(e.target.value as any); setCopyDestId('') }} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', marginTop: '6px', fontSize: '14px' }}>
                <option value="course">Course</option>
                <option value="testSeries">Test Series</option>
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Select {copyDestType === 'course' ? 'Course' : 'Test Series'}</label>
              <select value={copyDestId} onChange={e => setCopyDestId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', marginTop: '6px', fontSize: '14px' }}>
                <option value="">Choose...</option>
                {copyDestType === 'course'
                  ? courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)
                  : testSeriesList.map((ts: any) => <option key={ts.id} value={ts.id}>{ts.title}</option>)
                }
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowCopyModal(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#f1f5f9', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button disabled={!copyDestId || copying} onClick={handleCopy} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#3636e8', color: '#fff', border: 'none', fontWeight: 700, cursor: copyDestId ? 'pointer' : 'not-allowed', opacity: copyDestId ? 1 : 0.5 }}>{copying ? 'Copying...' : 'Copy Exam'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Test Series Modal */}
      {showCreateTSModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={() => setShowCreateTSModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>📝 Create Test Series</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input id="ts-title" placeholder="Test Series Title *" style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} />
              <input id="ts-desc" placeholder="Description (optional)" style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input id="ts-price" type="number" placeholder="Price (₹)" defaultValue="0" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} />
                <input id="ts-validity" type="number" placeholder="Validity (days)" defaultValue="365" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowCreateTSModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#f1f5f9', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button disabled={creatingSeries} onClick={handleCreateTS} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>{creatingSeries ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
