'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import ExamTimingStatus from '@/components/exams/ExamTimingStatus'
import { getExamTimingState } from '@/lib/date-utils'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function TestSeriesDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [now, setNow] = useState(() => new Date())
  const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'stats'>('exams')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddExamModal, setShowAddExamModal] = useState(false)
  const [showCreateExamModal, setShowCreateExamModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isPreview, setIsPreview] = useState(false)

  const { data: tsData, mutate: mutateTS, isLoading: loadingTS } = useSWR(`/api/test-series/${params.id}`, fetcher)
  const { data: allExamsData } = useSWR('/api/exams', fetcher)
  const { data: meData } = useSWR('/api/auth/me', fetcher)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const ts = tsData?.testSeries
  const userRole = meData?.user?.role || meData?.role || ''
  const isManager = userRole === 'MANAGER' || userRole === 'ADMIN'
  const allExams = Array.isArray(allExamsData) ? allExamsData : []
  
  const availableExams = allExams.filter((e: any) => !e.testSeriesId)

  const handleUpdateTS = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    
    setSaving(true)
    try {
      const res = await fetch(`/api/test-series/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          isActive: data.isActive === 'true'
        })
      })
      if (res.ok) {
        setShowEditModal(false)
        mutateTS()
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to update')
      }
    } catch {
      alert('Error updating')
    } finally {
      setSaving(false)
    }
  }

  const handleAddExamToSeries = async (examId: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testSeriesId: params.id })
      })
      if (res.ok) {
        setShowAddExamModal(false)
        mutateTS()
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to add exam')
      }
    } catch {
      alert('Error adding exam')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveExamFromSeries = async (examId: string) => {
    if (!confirm('Remove this exam from the series?')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testSeriesId: null })
      })
      if (res.ok) mutateTS()
      else {
        const d = await res.json()
        alert(d.error || 'Failed to remove')
      }
    } catch {
      alert('Error removing')
    } finally {
      setSaving(false)
    }
  }

  const handleCloneExam = async (examId: string) => {
    if (!confirm('Duplicate this exam within the series?')) return
    setSaving(true)
    try {
      const res = await fetch('/api/exams/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, destinationType: 'testSeries', destinationId: params.id })
      })
      if (res.ok) mutateTS()
      else alert('Failed to duplicate exam')
    } catch {
      alert('Error duplicating')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePublish = async (examId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentStatus })
      })
      if (res.ok) mutateTS()
    } catch (err) { console.error(err) }
  }

  const handleCreateExamInSeries = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const payload = Object.fromEntries(formData.entries())
    setSaving(true)
    try {
      const form = new FormData()
      form.append('payload', JSON.stringify({ ...payload, testSeriesId: params.id, examType: 'PRACTICE_TEST', questions: [] }))
      const res = await fetch('/api/exams', { method: 'POST', body: form })
      if (res.ok) {
        const newExam = await res.json()
        router.push(`/exams/${newExam.id}`)
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to create')
      }
    } catch {
      alert('Error creating')
    } finally {
      setSaving(false)
    }
  }

  const neu: React.CSSProperties = { borderRadius: '24px', background: 'var(--surface-2)', boxShadow: '8px 8px 16px var(--neu-dark), -8px -8px 16px var(--neu-light)', padding: '32px' }
  const neuBtn: React.CSSProperties = { padding: '12px 24px', borderRadius: '14px', border: 'none', background: 'var(--surface)', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer', boxShadow: '4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)', transition: 'all 0.2s' }
  const tabStyle = (active: boolean): React.CSSProperties => ({ padding: '12px 24px', borderRadius: '12px', background: active ? 'var(--primary)' : 'transparent', color: active ? '#fff' : 'var(--text-secondary)', fontWeight: 800, cursor: 'pointer', border: 'none', transition: 'all 0.2s' })

  if (loadingTS) return <div style={{ padding: '100px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700 }}>Loading Test Series...</div>
  if (!ts) return <div style={{ padding: '100px', textAlign: 'center', color: 'var(--danger)', fontWeight: 800 }}>Test Series not found</div>

  // Student Preview Mode
  if (isPreview) {
    return (
      <div style={{ padding: '32px 48px', maxWidth: '1000px', margin: '0 auto' }}>
        <button onClick={() => setIsPreview(false)} style={{ ...neuBtn, marginBottom: '32px', background: 'var(--text-primary)', color: '#fff' }}>← Exit Student Preview</button>
        <div style={neu}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 900 }}>{ts.title}</h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{ts.description}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 800 }}>PRICE</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--success)' }}>₹{ts.price}</div>
            </div>
          </div>
          <div style={{ borderTop: '2px solid rgba(0,0,0,0.05)', paddingTop: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Exams in this series ({ts.exams?.length || 0})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {ts.exams.map((exam: any) => (
                <div key={exam.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '16px', background: 'rgba(0,0,0,0.02)' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px' }}>{exam.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{exam.durationMinutes} mins • {exam._count?.questions} Questions</div>
                  </div>
                  <button style={{ padding: '8px 20px', borderRadius: '50px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Start Exam</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 48px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => router.push('/exams')} style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--surface)', border: 'none', boxShadow: '4px 4px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 950, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{ts.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ padding: '3px 10px', borderRadius: '50px', background: ts.isActive ? 'var(--success-light)' : 'var(--bg)', color: ts.isActive ? 'var(--success)' : 'var(--text-secondary)', fontSize: '10px', fontWeight: 900 }}>{ts.isActive ? 'ACTIVE SERIES' : 'DRAFT SERIES'}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>ID: {ts.id}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setIsPreview(true)} style={{ ...neuBtn, background: 'var(--text-primary)', color: '#fff' }}>👁️ Student Preview</button>
          <button onClick={() => setShowEditModal(true)} style={neuBtn}>⚙️ Settings</button>
          <button onClick={() => setShowCreateExamModal(true)} style={{ ...neuBtn, background: 'var(--primary)', color: '#fff' }}>+ Create Exam</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.03)', padding: '6px', borderRadius: '16px', width: 'fit-content', marginBottom: '32px' }}>
        <button onClick={() => setActiveTab('exams')} style={tabStyle(activeTab === 'exams')}>Included Exams ({ts.exams?.length || 0})</button>
        <button onClick={() => setActiveTab('students')} style={tabStyle(activeTab === 'students')}>Students ({ts._count?.accesses || 0})</button>
        <button onClick={() => setActiveTab('stats')} style={tabStyle(activeTab === 'stats')}>Analytics</button>
      </div>

      {activeTab === 'exams' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '32px' }}>
          {ts.exams.map((exam: any) => {
            const timingState = getExamTimingState(exam.startDate, exam.expiresAt, now)
            return (
              <div key={exam.id} style={{ ...neu, padding: '28px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '50px', background: exam.isPublished ? '#eff6ff' : 'var(--surface)', color: exam.isPublished ? 'var(--info)' : 'var(--text-muted)', fontSize: '10px', fontWeight: 900 }}>{exam.isPublished ? 'PUBLISHED' : 'DRAFT'}</span>
                    <span style={{ padding: '4px 12px', borderRadius: '50px', background: '#f5f3ff', color: '#7c3aed', fontSize: '10px', fontWeight: 900 }}>{exam._count?.questions || 0} Qs</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button title="Clone Exam" onClick={() => handleCloneExam(exam.id)} style={{ padding: '8px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>📋</button>
                    <button title="Remove from Series" onClick={() => handleRemoveExamFromSeries(exam.id)} style={{ padding: '8px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>🗑️</button>
                  </div>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 850, color: 'var(--text-primary)', marginBottom: '8px' }}>{exam.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{exam.description || 'No description provided.'}</p>
                <div style={{ marginBottom: '24px' }}>
                  <ExamTimingStatus startDate={exam.startDate} expiresAt={exam.expiresAt} compact />
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                  <button onClick={() => router.push(`/exams/${exam.id}`)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '14px' }}>Manage Questions</button>
                  <button onClick={() => handleTogglePublish(exam.id, exam.isPublished)} style={{ padding: '12px 20px', borderRadius: '12px', background: exam.isPublished ? '#fff' : 'var(--success)', color: exam.isPublished ? 'var(--danger)' : '#fff', border: exam.isPublished ? '2px solid #fee2e2' : 'none', fontWeight: 800, cursor: 'pointer', fontSize: '14px' }}>{exam.isPublished ? 'Unpublish' : 'Publish'}</button>
                </div>
              </div>
            )
          })}
          <div onClick={() => setShowAddExamModal(true)} style={{ ...neu, border: '3px dashed #cbd5e1', boxShadow: 'none', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '40px', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>➕</div>
            <div style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>Import Existing Exam</div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div style={neu}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '24px' }}>Subscribed Students</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Student</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Purchase Date</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Expires At</th>
                  <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {ts.accesses?.length > 0 ? ts.accesses.map((acc: any) => (
                  <tr key={acc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{acc.user?.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{acc.user?.email}</div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{new Date(acc.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{new Date(acc.expiresAt).toLocaleDateString()}</td>
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: 700, color: 'var(--success)' }}>₹{acc.amount}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No students have purchased this series yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          <div style={neu}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '16px' }}>Revenue Performance</h3>
            <div style={{ fontSize: '40px', fontWeight: 950, color: 'var(--success)' }}>₹{ts.accesses?.reduce((sum: number, a: any) => sum + a.amount, 0) || 0}</div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>Total gross revenue from this test series.</p>
          </div>
          <div style={neu}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '16px' }}>Student Engagement</h3>
            <div style={{ fontSize: '40px', fontWeight: 950, color: 'var(--primary)' }}>{ts._count?.accesses || 0}</div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>Unique students with active access.</p>
          </div>
          <div style={neu}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '16px' }}>Content Depth</h3>
            <div style={{ fontSize: '40px', fontWeight: 950, color: 'var(--warning)' }}>{ts.exams?.reduce((sum: number, e: any) => sum + (e._count?.questions || 0), 0) || 0}</div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>Total questions across all exams.</p>
          </div>
        </div>
      )}

      {/* Modals */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '24px', padding: 'clamp(20px, 5vw, 40px)', width: '100%', maxWidth: 'min(550px, calc(100vw - 32px))', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 950, marginBottom: '24px' }}>Series Settings</h2>
            <form onSubmit={handleUpdateTS} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Series Title</label>
                <input name="title" defaultValue={ts.title} required style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', fontSize: '15px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Description</label>
                <textarea name="description" defaultValue={ts.description || ''} rows={4} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', fontSize: '15px', resize: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Price (₹)</label>
                  <input name="price" type="number" defaultValue={ts.price} required style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', fontSize: '15px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Validity (Days)</label>
                  <input name="validityDays" type="number" defaultValue={ts.validityDays} required style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', fontSize: '15px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)', padding: '16px', borderRadius: '16px' }}>
                <input type="checkbox" name="isActive" id="ts-active" defaultChecked={ts.isActive} value="true" style={{ width: '20px', height: '20px' }} />
                <label htmlFor="ts-active" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>Active & Visible to Students</label>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'var(--surface)', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Settings'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddExamModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '24px', padding: 'clamp(20px, 5vw, 40px)', width: '100%', maxWidth: 'min(650px, calc(100vw - 32px))', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 950, marginBottom: '24px' }}>Import Existing Exam</h2>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '12px' }}>
              {availableExams.length > 0 ? availableExams.map((exam: any) => (
                <div key={exam.id} style={{ padding: '20px', borderRadius: '20px', border: '2px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '16px', color: 'var(--text-primary)' }}>{exam.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{exam._count?.questions || 0} Questions • Created {new Date(exam.createdAt).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => handleAddExamToSeries(exam.id)} disabled={saving} style={{ padding: '10px 20px', borderRadius: '12px', background: 'var(--primary)', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>Import</button>
                </div>
              )) : <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontWeight: 700 }}>No available exams found.</div>}
            </div>
            <button onClick={() => setShowAddExamModal(false)} style={{ marginTop: '24px', padding: '16px', borderRadius: '16px', background: 'var(--surface)', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {showCreateExamModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '24px', padding: 'clamp(20px, 5vw, 40px)', width: '100%', maxWidth: 'min(550px, calc(100vw - 32px))', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 950, marginBottom: '24px' }}>New Exam in Series</h2>
            <form onSubmit={handleCreateExamInSeries} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Exam Title</label>
                <input name="title" required placeholder="e.g. Mock Test 01" style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', fontSize: '15px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Duration (Min)</label>
                  <input name="durationMinutes" type="number" defaultValue="180" required style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', fontSize: '15px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Expiry Date</label>
                  <input name="expiresAt" type="datetime-local" required style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', fontSize: '15px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowCreateExamModal(false)} style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'var(--surface)', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>{saving ? 'Creating...' : 'Create & Design'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
