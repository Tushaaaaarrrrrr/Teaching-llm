'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Question {
  text: string
  type: string
  options: string[]
  correctAnswer: string
  explanation: string
  marks: number
  imageUrl?: string
}

export default function CreateExamPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState<{ id: string; name: string; subject: string }[]>([])
  const [step, setStep] = useState(1)
  const [bankQuestions, setBankQuestions] = useState<any[]>([])
  const [showBank, setShowBank] = useState(false)
  const [bankSearch, setBankSearch] = useState('')
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [questions, setQuestions] = useState<Question[]>([
    { text: '', type: 'MCQ', options: ['', ''], correctAnswer: '', explanation: '', marks: 1 }
  ])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        const role = data.user?.role || ''
        const userSubjects = Array.from(new Set([
          ...(data.user?.enrollments?.map((e: any) => e.course?.subject) || []),
          ...(data.user?.instructorAssignments?.map((a: any) => a.course?.subject) || [])
        ])).filter(Boolean) as string[]
        
        fetch('/api/courses').then(res => res.json()).then(coursesData => {
          let list = Array.isArray(coursesData) ? coursesData : []
          if (role === 'ADMIN') {
            list = list.filter(c => userSubjects.includes(c.subject))
          }
          setCourses(list)
        })
      })
  }, [])

  const fetchBankQuestions = async () => {
    if (!courseId) return
    const selectedCourse = courses.find(c => c.id === courseId)
    if (!selectedCourse) return

    try {
      const res = await fetch(`/api/content-bank?subject=${encodeURIComponent(selectedCourse.subject)}`)
      const data = await res.json()
      setBankQuestions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch bank questions', error)
    }
  }

  // Removed subject logic as it's unified now

  const handleAddQuestion = () => {
    setQuestions([...questions, { text: '', type: 'MCQ', options: ['', ''], correctAnswer: '', explanation: '', marks: 1 }])
  }

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    setQuestions(newQuestions)
  }

  const handleImageUpload = async (index: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'exams')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.url) {
        handleQuestionChange(index, 'imageUrl', data.url)
      }
    } catch (error) {
      console.error('Image upload failed', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        title,
        description,
        courseId,
        startDate,
        expiresAt,
        durationMinutes: parseInt(durationMinutes),
        questions
      }

      const formData = new FormData()
      formData.append('payload', JSON.stringify(payload))

      const res = await fetch('/api/exams', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        router.push('/exams')
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to create exam')
      }
    } catch (error) {
      console.error(error)
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Shared Styles
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

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#3636e8', fontWeight: 700, cursor: 'pointer', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ← Back to Exams
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e1e3a' }}>Create New Exam</h1>
           <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: step === 1 ? '#3636e8' : '#c5c7cf' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: step === 2 ? '#3636e8' : '#c5c7cf' }} />
           </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {step === 1 && (
          <div style={neuCard}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a', marginBottom: '20px' }}>Step 1: General Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Select Course</label>
                <select value={courseId} onChange={e => setCourseId(e.target.value)} style={neuInput} required>
                  <option value="">Select a course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.subject} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Exam Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Midterm Physics" style={neuInput} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief overview of the exam..." rows={3} style={{ ...neuInput, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Start Date</label>
                   <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} style={neuInput} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Deadline</label>
                  <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} style={neuInput} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Duration (min)</label>
                  <input type="number" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} style={neuInput} required min="1" />
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  if (!title || !courseId || !startDate || !expiresAt || !durationMinutes) {
                    alert('Please fill all mandatory fields (Title, Course, Start Date, Deadline, Duration) before proceeding.')
                    return
                  }
                  setStep(2)
                }} 
                style={{ ...neuButton, marginTop: '12px' }}
              >
                Next: Question Creation
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1e3a' }}>Step 2: Questions</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setStep(1)} style={secondaryButton}>Back</button>
                  <button type="button" onClick={() => { setShowBank(true); fetchBankQuestions() }} style={{ ...secondaryButton, background: '#3636e815' }}>Browse Content Bank</button>
                  <button type="button" onClick={handleAddQuestion} style={secondaryButton}>+ Add Question</button>
                </div>
              </div>

              {/* Content Bank Picker Modal */}
              {showBank && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                  <div style={{ ...neuCard, maxWidth: '800px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                       <div>
                         <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Content Bank: {courses.find(c => c.id === courseId)?.subject}</h3>
                         <p style={{ fontSize: '12px', color: '#6b6b8a' }}>Select questions to add to your exam</p>
                       </div>
                       <button onClick={() => setShowBank(false)} style={{ background: 'none', border: 'none', color: '#6b6b8a', fontWeight: 700, cursor: 'pointer' }}>Close</button>
                    </div>

                    <input 
                      type="text" 
                      placeholder="Search bank..." 
                      value={bankSearch}
                      onChange={e => setBankSearch(e.target.value)}
                      style={{ ...neuInput, marginBottom: '20px' }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                       {bankQuestions.filter(q => q.text.toLowerCase().includes(bankSearch.toLowerCase())).map(q => (
                         <div key={q.id} style={{ padding: '16px', background: '#fff', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                               <div style={{ fontSize: '10px', fontWeight: 800, color: '#3636e8' }}>{q.type}</div>
                               <div style={{ fontSize: '14px', fontWeight: 600 }}>{q.text}</div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => {
                                setQuestions([...questions, { 
                                  text: q.text, 
                                  type: q.type, 
                                  options: q.options ? JSON.parse(q.options) : [], 
                                  correctAnswer: q.correctAnswer, 
                                  explanation: q.explanation || '', 
                                  marks: 1,
                                  imageUrl: q.imageUrl,
                                  questionBankId: q.id // Pass the ID to avoid duplicates in DB
                                } as any])
                                setShowBank(false)
                              }}
                              style={{ ...neuButton, padding: '8px 16px', fontSize: '12px' }}
                            >
                              Add to Exam
                            </button>
                         </div>
                       ))}
                       {bankQuestions.length === 0 && <p style={{ textAlign: 'center', color: '#9999b0' }}>No questions found for this subject in the bank.</p>}
                    </div>
                  </div>
                </div>
              )}

              {questions.map((q, idx) => (
                <div key={idx} style={{ ...neuCard, background: '#f0f2f7', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontWeight: 800, color: '#3636e8' }}>Question #{idx + 1}</span>
                    <button type="button" onClick={() => handleRemoveQuestion(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Remove</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b6b8a' }}>Question Text</label>
                        <input type="text" value={q.text} onChange={e => handleQuestionChange(idx, 'text', e.target.value)} placeholder="Type your question..." style={neuInput} required />
                        
                        <div style={{ marginTop: '4px' }}>
                           <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b6b8a', marginBottom: '4px' }}>Question Image (Optional)</label>
                           <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => e.target.files?.[0] && handleImageUpload(idx, e.target.files[0])}
                              style={{ fontSize: '12px' }}
                           />
                           {q.imageUrl && (
                             <div style={{ marginTop: '8px', position: 'relative', width: '120px' }}>
                                <img src={q.imageUrl} alt="Preview" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                                <button type="button" onClick={() => handleQuestionChange(idx, 'imageUrl', '')} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                             </div>
                           )}
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b6b8a', marginBottom: '4px' }}>Type</label>
                        <select value={q.type} onChange={e => handleQuestionChange(idx, 'type', e.target.value)} style={neuInput}>
                          <option value="MCQ">Multiple Choice</option>
                          <option value="TRUE_FALSE">True / False</option>
                          <option value="SUBJECTIVE">Subjective</option>
                        </select>
                      </div>
                    </div>

                    {(q.type === 'MCQ' || q.type === 'TRUE_FALSE') && (
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b6b8a', marginBottom: '8px' }}>Options</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          {q.type === 'TRUE_FALSE' ? (
                            ['True', 'False'].map(opt => (
                              <button key={opt} type="button" onClick={() => handleQuestionChange(idx, 'correctAnswer', opt)} style={{ ...neuInput, background: q.correctAnswer === opt ? '#3636e8' : '#e8eaf0', color: q.correctAnswer === opt ? '#fff' : '#1e1e3a', fontWeight: 700 }}>
                                {opt}
                              </button>
                            ))
                          ) : (
                            q.options.map((opt, oIdx) => (
                              <div key={oIdx} style={{ display: 'flex', gap: '8px' }}>
                                <input type="radio" checked={q.correctAnswer === opt && opt !== ''} onChange={() => handleQuestionChange(idx, 'correctAnswer', opt)} style={{ width: '20px' }} />
                                <input type="text" value={opt} onChange={e => {
                                  const newOpts = [...q.options]
                                  newOpts[oIdx] = e.target.value
                                  handleQuestionChange(idx, 'options', newOpts)
                                }} placeholder={`Option ${oIdx + 1}`} style={neuInput} />
                                {q.options.length > 2 && (
                                  <button type="button" onClick={() => handleQuestionChange(idx, 'options', q.options.filter((_, i) => i !== oIdx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                        {q.type === 'MCQ' && q.options.length < 5 && (
                          <button type="button" onClick={() => handleQuestionChange(idx, 'options', [...q.options, ''])} style={{ background: 'none', border: '1px dashed #3636e8', color: '#3636e8', padding: '6px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '12px' }}>+ Add Option</button>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b6b8a', marginBottom: '4px' }}>Explanation (Visible after submission)</label>
                        <input type="text" value={q.explanation} onChange={e => handleQuestionChange(idx, 'explanation', e.target.value)} placeholder="Why is this correct?" style={neuInput} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b6b8a', marginBottom: '4px' }}>Marks</label>
                        <input type="number" value={q.marks} onChange={e => handleQuestionChange(idx, 'marks', parseInt(e.target.value))} style={neuInput} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="submit" disabled={loading} style={{ ...neuButton, width: '100%', padding: '16px', fontSize: '16px', opacity: loading ? 0.7 : 1, marginTop: '12px' }}>
              {loading ? 'Processing...' : 'Finalize Exam & Notify Students'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
