'use client'

import { useEffect, useState } from 'react'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

interface QuestionForm {
  text: string
  type: string
  options: string[]
  correctAnswer: string
  explanation: string
  marks: number
  imageUrl: string
  subject: string
}

export default function ContentBankPage() {
  const { confirm, confirmDialog } = useConfirmDialog()
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [user, setUser] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  
  const initialForm: QuestionForm = {
    text: '', 
    type: 'MCQ', 
    subject: '', 
    options: ['', ''], 
    correctAnswer: '', 
    explanation: '', 
    imageUrl: '',
    marks: 1
  }
  const [form, setForm] = useState<QuestionForm>(initialForm)

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

  const handleImageUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'content-bank')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.url) {
        setForm({ ...form, imageUrl: data.url })
      }
    } catch (error) {
      console.error('Image upload failed', error)
    }
  }

  async function handleSave() {
    if (!form.text || !form.subject || !form.correctAnswer) return alert('Please fill required fields (Question Text, Subject, and Correct Answer)')
    
    setSaving(true)
    try {
      const payload = {
        ...form,
        options: (form.type === 'MCQ' || form.type === 'TRUE_FALSE') ? JSON.stringify(form.options) : null
      }

      const res = await fetch(editingQuestionId ? `/api/content-bank/${editingQuestionId}` : '/api/content-bank', {
        method: editingQuestionId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        setShowModal(false)
        setForm(initialForm)
        setEditingQuestionId(null)
        loadQuestions()
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to save')
      }
    } catch (e) { 
      console.error(e) 
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(question: any) {
    let parsedOptions = ['', '']
    if (question.type === 'TRUE_FALSE') {
      parsedOptions = ['True', 'False']
    } else if (question.options) {
      try {
        const opts = JSON.parse(question.options)
        if (Array.isArray(opts) && opts.length > 0) {
          parsedOptions = opts
        }
      } catch {
        parsedOptions = ['', '']
      }
    }

    setForm({
      text: question.text || '',
      type: question.type || 'MCQ',
      subject: question.subject || '',
      options: parsedOptions,
      correctAnswer: question.correctAnswer || '',
      explanation: question.explanation || '',
      imageUrl: question.imageUrl || '',
      marks: question.marks || 1
    })
    setEditingQuestionId(question.id)
    setShowModal(true)
  }

  async function handleDelete(questionId: string) {
    const allowed = await confirm({
      title: 'Delete Question?',
      message: 'This question will be permanently removed from the content bank.',
      confirmLabel: 'Delete Question',
      tone: 'danger',
    })
    if (!allowed) return

    setDeletingId(questionId)
    try {
      const res = await fetch(`/api/content-bank/${questionId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        loadQuestions()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete question')
      }
    } catch (error) {
      console.error(error)
      alert('An error occurred while deleting')
    } finally {
      setDeletingId(null)
    }
  }

  // Shared Styles from Exam system
  const neuCard: React.CSSProperties = {
    borderRadius: '20px', background: '#e8eaf0',
    boxShadow: '6px 6px 14px #c5c7cf, -6px -6px 14px #ffffff',
    padding: '24px',
  }

  const neuInput: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: '14px', border: 'none',
    background: '#e8eaf0', boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
    fontSize: '14px', color: '#1e1e3a', outline: 'none',
  }

  const neuButton: React.CSSProperties = {
    padding: '12px 28px', borderRadius: '50px', border: 'none',
    background: '#3636e8', color: '#fff', fontSize: '14px', fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '4px 4px 10px rgba(54,54,232,0.35), -2px -2px 6px rgba(255,255,255,0.7)',
    transition: 'all 0.2s ease',
  }

  const secondaryButton: React.CSSProperties = {
    ...neuButton,
    background: '#fff',
    color: '#3636e8',
    boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
  }

  if (loading && !user) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Content Bank...</div>

  return (
    <div style={{ padding: '24px 32px 48px' }}>
      {confirmDialog}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => {
              setForm(initialForm)
              setEditingQuestionId(null)
              setShowModal(true)
            }}
            style={neuButton}
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
                 <div style={{ display: 'flex', gap: '8px' }}>
                   <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', background: '#fff', padding: '4px 10px', borderRadius: '50px' }}>{q.marks} Marks</span>
                   <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b6b8a' }}>ID: {q.id.slice(-6)}</span>
                 </div>
              </div>
              
              {q.imageUrl && (
                <img src={q.imageUrl} alt="Question" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }} />
              )}
              
              <p style={{ fontWeight: 700, color: '#1e1e3a', marginBottom: '16px', lineHeight: '1.4' }}>{q.text}</p>
              
              <div style={{ fontSize: '12px', color: '#6b6b8a', background: 'rgba(255,255,255,0.4)', padding: '12px', borderRadius: '12px' }}>
                 <div style={{ fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px' }}>Type: {q.type}</div>
                 {q.options && (
                   <div style={{ marginTop: '4px' }}>
                      <span style={{ fontWeight: 700 }}>Options:</span> {(() => {
                        try { 
                          const opts = JSON.parse(q.options)
                          return Array.isArray(opts) ? opts.join(', ') : q.options 
                        } catch(e) { return q.options }
                      })()}
                   </div>
                 )}
                 <div style={{ marginTop: '8px', color: '#10b981', fontWeight: 700 }}>
                    <span style={{ fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', fontSize: '10px' }}>Correct Answer:</span> {q.correctAnswer}
                 </div>
                 {q.explanation && (
                   <div style={{ marginTop: '8px', color: '#6b6b8a', fontStyle: 'italic' }}>
                      <span style={{ fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', fontSize: '10px', fontStyle: 'normal' }}>Explanation:</span> {q.explanation}
                   </div>
                 )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={() => handleEdit(q)}
                  style={{ ...secondaryButton, padding: '10px 18px', fontSize: '13px' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  disabled={deletingId === q.id}
                  style={{ ...secondaryButton, padding: '10px 18px', fontSize: '13px', color: '#ef4444' }}
                >
                  {deletingId === q.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
           </div>
         ))}
      </div>

      {filteredQuestions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9999b0' }}>
           <p style={{ fontSize: '18px', fontWeight: 600 }}>No results found</p>
        </div>
      )}

      {/* Add Question Modal - Revamped to match Premium Design */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(232, 234, 240, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
           <div style={{ ...neuCard, width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.8)', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#3636e8' }}>{editingQuestionId ? 'Edit Question' : 'New Question'}</h2>
                <button onClick={() => {
                  setShowModal(false)
                  setEditingQuestionId(null)
                  setForm(initialForm)
                }} style={{ background: 'none', border: 'none', color: '#6b6b8a', fontSize: '28px', cursor: 'pointer', fontWeight: 300 }}>×</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 {/* Subject & Type Row */}
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#6b6b8a', marginBottom: '6px' }}>Subject</label>
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
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#6b6b8a', marginBottom: '6px' }}>Type</label>
                        <select value={form.type} onChange={e => setForm({...form, type: e.target.value, options: e.target.value === 'TRUE_FALSE' ? ['True', 'False'] : ['', ''], correctAnswer: ''})} style={neuInput}>
                           <option value="MCQ">Multiple Choice</option>
                           <option value="TRUE_FALSE">True / False</option>
                           <option value="SUBJECTIVE">Subjective</option>
                        </select>
                    </div>
                 </div>

                 {/* Question text */}
                 <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#6b6b8a', marginBottom: '6px' }}>Question Text</label>
                    <textarea value={form.text} onChange={e => setForm({...form, text: e.target.value})} placeholder="Type your question..." style={{ ...neuInput, height: '80px', resize: 'none' }} />
                 </div>

                 {/* Image Upload */}
                 <div style={{ background: 'rgba(255,255,255,0.4)', padding: '16px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.6)' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#6b6b8a', marginBottom: '8px' }}>Question Image (Optional)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <label style={{ ...secondaryButton, padding: '8px 20px', fontSize: '13px', cursor: 'pointer', display: 'inline-block' }}>
                        Choose File
                        <input 
                           type="file" 
                           accept="image/*" 
                           hidden
                           onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                        />
                      </label>
                      <span style={{ fontSize: '13px', color: '#9999b0' }}>{form.imageUrl ? 'Image uploaded successfuly' : 'No file chosen'}</span>
                    </div>
                    {form.imageUrl && (
                      <div style={{ marginTop: '16px', position: 'relative', width: '200px' }}>
                         <img src={form.imageUrl} alt="Preview" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '14px', boxShadow: '4px 4px 12px rgba(0,0,0,0.1)' }} />
                         <button onClick={() => setForm({...form, imageUrl: ''})} style={{ position: 'absolute', top: '-12px', right: '-12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>×</button>
                      </div>
                    )}
                 </div>

                 {/* Options Logic */}
                 {(form.type === 'MCQ' || form.type === 'TRUE_FALSE') && (
                   <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#6b6b8a', marginBottom: '12px' }}>Options</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                         {form.type === 'TRUE_FALSE' ? (
                           ['True', 'False'].map(opt => (
                             <div key={opt} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                               <input type="radio" checked={form.correctAnswer === opt} onChange={() => setForm({...form, correctAnswer: opt})} style={{ width: '22px', height: '22px', accentColor: '#3636e8', cursor: 'pointer' }} />
                               <div style={{ ...neuInput, background: form.correctAnswer === opt ? '#3636e810' : '#e8eaf0', color: form.correctAnswer === opt ? '#3636e8' : '#1e1e3a', fontWeight: 700 }}>{opt}</div>
                             </div>
                           ))
                         ) : (
                           form.options.map((opt, oIdx) => (
                             <div key={oIdx} style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
                               <input 
                                 type="radio" 
                                 checked={form.correctAnswer === opt && opt !== ''} 
                                 onChange={() => setForm({...form, correctAnswer: opt})} 
                                 style={{ width: '22px', height: '22px', accentColor: '#3636e8', cursor: 'pointer' }} 
                               />
                               <input 
                                 type="text" 
                                 value={opt} 
                                 onChange={e => {
                                   const newOpts = [...form.options]
                                   newOpts[oIdx] = e.target.value
                                   setForm({...form, options: newOpts})
                                 }} 
                                 placeholder={`Option ${oIdx + 1}`} 
                                 style={neuInput} 
                               />
                               {form.options.length > 2 && (
                                 <button onClick={() => {
                                   const newOpts = form.options.filter((_, i) => i !== oIdx)
                                   setForm({...form, options: newOpts})
                                 }} style={{ position: 'absolute', right: '-30px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '20px', fontWeight: 300 }}>×</button>
                               )}
                             </div>
                           ))
                         )}
                      </div>
                      {form.type === 'MCQ' && form.options.length < 6 && (
                        <button onClick={() => setForm({...form, options: [...form.options, '']})} style={{ marginTop: '20px', background: 'none', border: '2px dashed #3636e8', color: '#3636e8', padding: '10px 24px', borderRadius: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>+ Add Option</button>
                      )}
                   </div>
                 )}

                 {/* Footer logic: Explanation & Marks */}
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '16px', alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#6b6b8a', marginBottom: '6px' }}>Explanation (Optional)</label>
                        <input type="text" value={form.explanation} onChange={e => setForm({...form, explanation: e.target.value})} placeholder="Why is this correct?" style={neuInput} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#6b6b8a', marginBottom: '6px' }}>Marks</label>
                        <input type="number" value={form.marks} onChange={e => setForm({...form, marks: parseInt(e.target.value)})} style={neuInput} min="1" />
                    </div>
                 </div>

                 {form.type === 'SUBJECTIVE' && (
                    <div style={{ background: 'rgba(54,54,232,0.05)', padding: '16px', borderRadius: '18px', border: '1px solid rgba(54,54,232,0.1)' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#3636e8', marginBottom: '6px' }}>Reference Answer / Keywords</label>
                        <textarea value={form.correctAnswer} onChange={e => setForm({...form, correctAnswer: e.target.value})} placeholder="What should a perfect answer contain?" style={{ ...neuInput, height: '70px', resize: 'none', background: '#fff' }} />
                    </div>
                 )}

                 <div style={{ display: 'flex', gap: '16px', marginTop: '10px', padding: '16px 0 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <button onClick={() => {
                      setShowModal(false)
                      setEditingQuestionId(null)
                      setForm(initialForm)
                    }} style={{ ...secondaryButton, flex: 1, padding: '12px' }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{ ...neuButton, flex: 2, padding: '12px' }}>{saving ? (editingQuestionId ? 'Updating...' : 'Publishing...') : (editingQuestionId ? 'Update Question' : 'Save Question to Bank')}</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
