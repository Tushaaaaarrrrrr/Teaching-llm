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
  attempts?: Array<{ id: string; submittedAt: string | null; startedAt: string }>
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
  const visibleTestSeries = testSeriesList.filter((ts: any) => isManager || ts.myAccess)
  const courses = Array.isArray(coursesData) ? coursesData : []

  // Split exams
  const courseExams = exams.filter(e => e.courseId && !e.testSeriesId)
  const tsExams = exams.filter(e => e.testSeriesId)

  const upcomingExams = courseExams.filter(e => getExamTimingState(e.startDate, e.expiresAt, now) === 'before')
  const activeExams = courseExams.filter(e => { const s = getExamTimingState(e.startDate, e.expiresAt, now); return s === 'active' || s === 'ending' })
  const expiredExams = courseExams.filter(e => getExamTimingState(e.startDate, e.expiresAt, now) === 'ended')

  const neu: React.CSSProperties = { borderRadius: '20px', background: 'var(--surface-2)', boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)', padding: '24px' }
  const neuBtn: React.CSSProperties = { padding: '12px 28px', borderRadius: '50px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '4px 4px 10px rgba(54,54,232,0.35), -2px -2px 6px var(--neu-glow)', transition: 'all 0.2s ease' }

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
    const color = exam.course?.color || 'var(--warning)'

    const hasAttempt = exam.attempts && exam.attempts.length > 0
    const latestAttempt = hasAttempt ? exam.attempts.slice().sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0] : null
    const hasSubmitted = !!(latestAttempt && latestAttempt.submittedAt)

    return (
      <div key={exam.id} style={{ ...neu, display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ padding: '4px 12px', borderRadius: '50px', background: `${color}18`, color, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>{label}</span>
            <span style={{ padding: '4px 14px', borderRadius: '50px', background: exam.examType === 'FINAL_TEST' ? 'var(--danger-light)' : 'var(--primary-light)', color: exam.examType === 'FINAL_TEST' ? 'var(--danger)' : 'var(--accent)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', border: `1px solid ${exam.examType === 'FINAL_TEST' ? 'var(--danger-light)' : 'var(--primary-light)'}`, letterSpacing: '0.02em' }}>
              {exam.examType === 'FINAL_TEST' ? 'Final Test' : 'Practice Test'}
            </span>
            {exam.testSeriesId && <span style={{ padding: '4px 10px', borderRadius: '50px', background: 'var(--warning-light)', color: 'var(--warning)', fontSize: '10px', fontWeight: 800 }}>TEST SERIES</span>}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {isManager && (
              <button onClick={(e) => { e.stopPropagation(); setShowCopyModal(exam); setCopyDestType('course'); setCopyDestId('') }}
                style={{ padding: '4px 10px', borderRadius: '50px', background: 'var(--success-light)', border: '1px solid var(--border)', color: 'var(--success)', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>📋 Copy</button>
            )}
            {isUpcoming ? (
              <span style={{ padding: '4px 10px', borderRadius: '50px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '10px', fontWeight: 800 }}>UPCOMING</span>
            ) : !exam.isPublished && (
              <span style={{ padding: '4px 10px', borderRadius: '50px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 700 }}>DRAFT</span>
            )}
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>{exam.title}</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{exam.description || 'No description available.'}</p>
        </div>
        <ExamTimingStatus startDate={exam.startDate} expiresAt={exam.expiresAt} compact />
        <div style={{ display: 'flex', gap: '16px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Duration</span><span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>{exam.durationMinutes}m</span></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Questions</span><span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>{exam._count.questions}</span></div>
        </div>
        <button 
          onClick={() => {
            if ((isExpired || hasSubmitted) && !isManager) {
              router.push(`/exams/${exam.id}/result`)
            } else {
              router.push(`/exams/${exam.id}`)
            }
          }}
          disabled={isUpcoming && !isManager}
          style={{ 
            width: '100%', padding: '12px', borderRadius: '14px', border: 'none', 
            background: isUpcoming && !isManager ? 'var(--neu-dark)' : '#fff', 
            color: isUpcoming && !isManager ? 'var(--text-secondary)' : 'var(--primary)', 
            fontSize: '14px', fontWeight: 700, 
            cursor: isUpcoming && !isManager ? 'default' : 'pointer', 
            boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)', 
            transition: 'all 0.2s', marginTop: '4px' 
          }}
        >
          {isManager 
            ? 'Manage Exam' 
            : isUpcoming 
              ? 'Not Started' 
              : isExpired || hasSubmitted 
                ? 'Review Exam' 
                : 'Start Assessment'}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-container fade-in">
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '32px', gap: '12px' }}>
          <div className="skeleton" style={{ height: '40px', width: '130px', borderRadius: '50px' }} />
          <div className="skeleton" style={{ height: '40px', width: '140px', borderRadius: '50px' }} />
        </div>

        <section style={{ marginBottom: '48px' }}>
          <div className="skeleton" style={{ height: '24px', width: '150px', marginBottom: '20px', borderRadius: '6px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '24px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ ...neu, display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="skeleton" style={{ height: '18px', width: '80px', borderRadius: '50px' }} />
                  <div className="skeleton" style={{ height: '18px', width: '50px', borderRadius: '50px' }} />
                </div>
                <div className="skeleton" style={{ height: '24px', width: '60%', borderRadius: '6px' }} />
                <div className="skeleton" style={{ height: '14px', width: '90%', borderRadius: '4px' }} />
                <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '12px' }} />
                <div className="skeleton" style={{ height: '42px', width: '100%', borderRadius: '14px', marginTop: 'auto' }} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="skeleton" style={{ height: '24px', width: '120px', marginBottom: '20px', borderRadius: '6px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '24px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ ...neu, display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="skeleton" style={{ height: '18px', width: '80px', borderRadius: '50px' }} />
                  <div className="skeleton" style={{ height: '18px', width: '50px', borderRadius: '50px' }} />
                </div>
                <div className="skeleton" style={{ height: '24px', width: '70%', borderRadius: '6px' }} />
                <div className="skeleton" style={{ height: '14px', width: '90%', borderRadius: '4px' }} />
                <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '12px' }} />
                <div className="skeleton" style={{ height: '42px', width: '100%', borderRadius: '14px', marginTop: 'auto' }} />
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '32px', gap: '12px', flexWrap: 'wrap' }}>
        {isManager && <button onClick={() => router.push('/exams/test-series/create')} style={{ ...neuBtn, background: 'var(--warning)', boxShadow: '4px 4px 10px rgba(245,158,11,0.35), -2px -2px 6px var(--neu-glow)' }}>+ Test Series</button>}
        {isManager && <button onClick={() => router.push('/exams/create')} style={neuBtn}>Create New Exam</button>}
      </div>

      {/* Test Series Section */}
      {visibleTestSeries.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--warning)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }} />📝 Test Series
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '24px', marginBottom: '24px' }}>
            {visibleTestSeries.map((ts: any) => {
              const hasAccess = ts.myAccess || isManager
              const isExpiredAccess = ts.myAccess && new Date(ts.myAccess.expiresAt) < new Date()
              const myExams = tsExams.filter(e => e.testSeriesId === ts.id)
              return (
                <div key={ts.id} style={{ ...neu, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{ts.title}</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{ts.description || 'Test series'}</p>
                    </div>
                    {hasAccess && !isExpiredAccess && <span style={{ padding: '4px 10px', borderRadius: '50px', background: 'var(--success-light)', color: 'var(--success)', fontSize: '10px', fontWeight: 800 }}>UNLOCKED</span>}
                    {isExpiredAccess && <span style={{ padding: '4px 10px', borderRadius: '50px', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: '10px', fontWeight: 800 }}>EXPIRED</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                    <div><span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>EXAMS</span><div style={{ fontSize: '14px', fontWeight: 800 }}>{ts._count?.exams || 0}</div></div>
                    <div><span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>VALIDITY</span><div style={{ fontSize: '14px', fontWeight: 800 }}>{ts.validityDays} days</div></div>
                    {ts.price > 0 && <div><span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>PRICE</span><div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>₹{ts.price}</div></div>}
                  </div>
                  {hasAccess && !isExpiredAccess && myExams.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '12px', marginBottom: '12px' }}>
                      {myExams.slice(0, 3).map(e => (
                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>{e.title}</span>
                          <button onClick={() => router.push(`/exams/${e.id}`)} style={{ padding: '8px 20px', borderRadius: '50px', background: 'var(--primary)', color: '#fff', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(54,54,232,0.2)' }}>Start</button>
                        </div>
                      ))}
                      {myExams.length > 3 && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>+{myExams.length - 3} more exams</div>}
                    </div>
                  )}
                  {isManager && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button onClick={() => router.push(`/exams/test-series/${ts.id}`)}
                        style={{ flex: 1, padding: '8px', borderRadius: '10px', background: 'var(--primary-light)', border: '1px solid #3636e825', color: 'var(--primary)', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>⚙️ Manage</button>
                      <button onClick={async () => { if (!confirm(`Delete "${ts.title}"?`)) return; await fetch(`/api/test-series/${ts.id}`, { method: 'DELETE' }); mutateTS() }}
                        style={{ padding: '8px 12px', borderRadius: '10px', background: 'var(--danger-light)', border: '1px solid var(--border)', color: 'var(--danger)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>🗑️</button>
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
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--success)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />Active Exams</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>{activeExams.map(renderExamCard)}</div>
        </section>
      )}
      {upcomingExams.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />Upcoming Exams</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>{upcomingExams.map(renderExamCard)}</div>
        </section>
      )}
      {expiredExams.length > 0 && (
        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '20px' }}>Past Exams</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>{expiredExams.map(renderExamCard)}</div>
        </section>
      )}
      {exams.length === 0 && visibleTestSeries.length === 0 && (
        <div style={{ ...neu, textAlign: 'center', padding: '64px' }}>
          <div style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 700 }}>No exams found</div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{isManager ? 'Start by creating an exam or a test series.' : 'You have no active exams at the moment.'}</p>
        </div>
      )}

      {/* Copy Exam Modal */}
      {showCopyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={() => setShowCopyModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '20px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>📋 Copy Exam</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Copying: <strong>{showCopyModal.title}</strong></p>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Destination Type</label>
              <select value={copyDestType} onChange={e => { setCopyDestType(e.target.value as any); setCopyDestId('') }} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid var(--border)', marginTop: '6px', fontSize: '14px' }}>
                <option value="course">Course</option>
                <option value="testSeries">Test Series</option>
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Select {copyDestType === 'course' ? 'Course' : 'Test Series'}</label>
              <select value={copyDestId} onChange={e => setCopyDestId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid var(--border)', marginTop: '6px', fontSize: '14px' }}>
                <option value="">Choose...</option>
                {copyDestType === 'course'
                  ? courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)
                  : testSeriesList.map((ts: any) => <option key={ts.id} value={ts.id}>{ts.title}</option>)
                }
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowCopyModal(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button disabled={!copyDestId || copying} onClick={handleCopy} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, cursor: copyDestId ? 'pointer' : 'not-allowed', opacity: copyDestId ? 1 : 0.5 }}>{copying ? 'Copying...' : 'Copy Exam'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Test Series Modal */}
      {showCreateTSModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={() => setShowCreateTSModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '20px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>📝 Create Test Series</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input id="ts-title" placeholder="Test Series Title *" style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid var(--border)', fontSize: '14px' }} />
              <input id="ts-desc" placeholder="Description (optional)" style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid var(--border)', fontSize: '14px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input id="ts-price" type="number" placeholder="Price (₹)" defaultValue="0" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid var(--border)', fontSize: '14px' }} />
                <input id="ts-validity" type="number" placeholder="Validity (days)" defaultValue="365" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid var(--border)', fontSize: '14px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowCreateTSModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button disabled={creatingSeries} onClick={handleCreateTS} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--warning)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>{creatingSeries ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
