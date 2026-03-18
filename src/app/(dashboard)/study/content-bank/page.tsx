'use client'

import { useEffect, useState } from 'react'

export default function ContentBankPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [user, setUser] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    text: '', type: 'MCQ', subject: '', options: '', correctAnswer: '', explanation: '', imageUrl: ''
  })

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data.user) {
        setUser(data.user)
        if (data.user.role !== 'MANAGER' && data.user.role !== 'ADMIN') {
          window.location.href = '/dashboard'
        }
      }
    })
    loadQuestions()
  }, [])

  function loadQuestions() {
    setLoading(true)
    fetch('/api/content-bank').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setQuestions(data)
      setLoading(false)
    })
  }

  const userSubjects = Array.from(new Set([
    ...(user?.enrollments?.map((e: any) => e.course?.subject) || []),
    ...(user?.instructorAssignments?.map((a: any) => a.course?.subject) || [])
  ])).filter(Boolean) as string[]
  const isAdmin = user?.role === 'ADMIN'

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(search.toLowerCase()) || 
                          q.subject.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (isAdmin) {
      return userSubjects.includes(q.subject)
    }
    return true
  })

  async function handleSave() {
    if (!form.text || !form.subject || !form.correctAnswer) return alert('Please fill required fields')
    setSaving(true)
    try {
      const res = await fetch('/api/content-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        setShowModal(false)
        setForm({ text: '', type: 'MCQ', subject: '', options: '', correctAnswer: '', explanation: '', imageUrl: '' })
        loadQuestions()
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to save')
      }
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const neuCard: React.CSSProperties = {
    borderRadius: '20px', background: '#e8eaf0',
    boxShadow: '6px 6px 14px #c5c7cf, -6px -6px 14px #ffffff',
    padding: '24px',
  }

  const neuInput: React.CSSProperties = {
    width: '100%', padding: '12px 20px', borderRadius: '15px', border: 'none',
    background: '#e8eaf0', boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #ffffff',
    fontSize: '14px', outline: 'none',
  }

  if (loading && !user) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Content Bank...</div>

  return (
    <div style={{ padding: '24px 32px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div />
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setShowModal(true)}
            style={{
              padding: '12px 24px', borderRadius: '50px', border: 'none',
              background: '#3636e8', color: '#fff', fontWeight: '700', fontSize: '14px',
              boxShadow: '4px 4px 10px rgba(54,54,232,0.3)', cursor: 'pointer'
            }}
          >
            + Add Question
          </button>
          <div style={{ width: '300px' }}>
            <input 
              type="text" 
              placeholder="Search questions..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={neuInput}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
         {filteredQuestions.map((q) => (
           <div key={q.id} style={neuCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                 <span style={{ fontSize: '11px', fontWeight: 800, color: '#3636e8', background: '#fff', padding: '4px 10px', borderRadius: '50px' }}>{q.subject}</span>
                 <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b6b8a' }}>ID: {q.id.slice(-6)}</span>
              </div>
              
              {q.imageUrl && (
                <img src={q.imageUrl} alt="Question" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }} />
              )}
              
              <p style={{ fontWeight: 700, color: '#1e1e3a', marginBottom: '16px', lineHeight: '1.4' }}>{q.text}</p>
              
              <div style={{ fontSize: '12px', color: '#6b6b8a', background: 'rgba(255,255,255,0.4)', padding: '12px', borderRadius: '12px' }}>
                 <div style={{ fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px' }}>Type: {q.type}</div>
                 {q.options && (
                   <div style={{ marginTop: '4px' }}>
                      Options: {(() => {
                        try { return JSON.parse(q.options).join(', ') } catch(e) { return q.options }
                      })()}
                   </div>
                 )}
                 <div style={{ marginTop: '8px', color: '#10b981', fontWeight: 700 }}>
                    Correct: {q.correctAnswer}
                 </div>
              </div>
           </div>
         ))}
      </div>

      {filteredQuestions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9999b0' }}>
           <p style={{ fontSize: '18px', fontWeight: 600 }}>No results found</p>
        </div>
      )}

      {/* Add Question Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,30,58,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
           <div style={{ ...neuCard, width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a', marginBottom: '20px' }}>Add Independent Question</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Subject</label>
                    {isAdmin ? (
                      <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} style={neuInput}>
                        <option value="">Select Subject</option>
                        {userSubjects.map((s: string) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <input type="text" placeholder="e.g. Physics" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} style={neuInput} />
                    )}
                 </div>
                 <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Question Text</label>
                    <textarea value={form.text} onChange={e => setForm({...form, text: e.target.value})} style={{ ...neuInput, height: '80px', resize: 'none' }} />
                 </div>
                 <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                       <label style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Type</label>
                       <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={neuInput}>
                          <option value="MCQ">MCQ</option>
                          <option value="SHORT">Short Answer</option>
                          <option value="LONG">Descriptive</option>
                       </select>
                    </div>
                    <div style={{ flex: 1 }}>
                       <label style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Correct Answer</label>
                       <input type="text" value={form.correctAnswer} onChange={e => setForm({...form, correctAnswer: e.target.value})} style={neuInput} />
                    </div>
                 </div>
                 {form.type === 'MCQ' && (
                   <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Options (JSON Array, e.g. ["A","B"])</label>
                      <input type="text" value={form.options} onChange={e => setForm({...form, options: e.target.value})} style={neuInput} />
                   </div>
                 )}
                 <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '50px', border: 'none', background: '#ccc', color: '#1e1e3a', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: '50px', border: 'none', background: '#3636e8', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Question'}</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
