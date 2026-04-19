'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isFinalTest } from '@/lib/exam-policy'
import { RichTextDisplay } from '@/components/ui/RichTextDisplay'

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
  const [bankSubjectFilter, setBankSubjectFilter] = useState('')
  const [userSubjects, setUserSubjects] = useState<string[]>([])
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [useScheduleWindow, setUseScheduleWindow] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [examType, setExamType] = useState('FINAL_TEST')
  const [questions, setQuestions] = useState<Question[]>([
    { text: '', type: 'MCQ', options: ['', ''], correctAnswer: '', explanation: '', marks: 1 }
  ])
  const requiresSchedule = !isFinalTest(examType) || useScheduleWindow

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        const role = data.user?.role || ''
        const subjects = Array.from(new Set([
          ...(data.user?.enrollments?.map((e: any) => e.course?.subject) || []),
          ...(data.user?.instructorAssignments?.map((a: any) => a.course?.subject) || [])
        ])).filter(Boolean) as string[]
        setUserSubjects(subjects)
        const userSubjects = subjects
        
        fetch('/api/courses').then(res => res.json()).then(coursesData => {
          let list = Array.isArray(coursesData) ? coursesData : []
          if (role === 'ADMIN') {
            list = list.filter(c => userSubjects.includes(c.subject))
          }
          setCourses(list)
        })
      })
  }, [])

  const fetchBankQuestions = async (subjectOverride?: string) => {
    const subject = subjectOverride !== undefined ? subjectOverride : bankSubjectFilter
    if (!subject) {
      setBankQuestions([])
      return
    }

    try {
      const res = await fetch(`/api/content-bank?subject=${encodeURIComponent(subject)}`)
      const data = await res.json()
      setBankQuestions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch bank questions', error)
      setBankQuestions([])
    }
  }

  // Removed subject logic as it's unified now

  const handleAddQuestion = () => {
    setQuestions([{ text: '', type: 'MCQ', options: ['', ''], correctAnswer: '', explanation: '', marks: 1 }, ...questions])
  }

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    
    // Auto-set options when changing type to TRUE_FALSE
    if (field === 'type' && value === 'TRUE_FALSE') {
      newQuestions[index].options = ['True', 'False']
    } else if (field === 'type' && value === 'MCQ' && newQuestions[index].options.length === 2 && newQuestions[index].options[0] === 'True') {
      // If switching from TRUE_FALSE to MCQ, reset to empty options
      newQuestions[index].options = ['', '']
    }
    
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
        startDate: requiresSchedule ? startDate : '',
        expiresAt: requiresSchedule ? expiresAt : '',
        durationMinutes: parseInt(durationMinutes),
        examType,
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Exam Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Midterm Physics" style={neuInput} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Exam Type</label>
                  <select value={examType} onChange={e => setExamType(e.target.value)} style={neuInput}>
                    <option value="FINAL_TEST">Final Test (Strict Rules)</option>
                    <option value="GENERAL_TEST">General Test (Practice)</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief overview of the exam..." rows={3} style={{ ...neuInput, resize: 'vertical' }} />
              </div>

              {isFinalTest(examType) && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 700, color: '#6b6b8a' }}>
                  <input
                    type="checkbox"
                    checked={useScheduleWindow}
                    onChange={e => setUseScheduleWindow(e.target.checked)}
                  />
                  Use custom start and end schedule for this final test
                </label>
              )}
              
              <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: examType === 'FINAL_TEST' ? '#ef444410' : '#10b98110', borderLeft: `4px solid ${examType === 'FINAL_TEST' ? '#ef4444' : '#10b981'}` }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: examType === 'FINAL_TEST' ? '#ef4444' : '#10b981', marginBottom: '8px' }}>
                  {examType === 'FINAL_TEST' ? 'Final Test Rules' : 'General Test Rules'}
                </h3>
                <ul style={{ fontSize: '13px', color: '#6b6b8a', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {examType === 'FINAL_TEST' ? (
                    <>
                      <li>Strict time limit enforced.</li>
                      <li>Only one attempt allowed.</li>
                      <li>Correct answers hidden until exam is ended AND results are published.</li>
                      <li>If no custom schedule is set, the exam starts immediately and stays active for 7 days.</li>
                    </>
                  ) : (
                    <>
                      <li>No strict time limit enforced during taking.</li>
                      <li>Multiple attempts allowed (with 5 min cooldown).</li>
                      <li>Full result and correct answers shown immediately after submission.</li>
                    </>
                  )}
                </ul>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: requiresSchedule ? '1fr 1fr 1fr' : '1fr', gap: '16px' }}>
                {requiresSchedule && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>
                        Start Date {isFinalTest(examType) ? '(Optional)' : ''}
                      </label>
                      <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} style={neuInput} required={!isFinalTest(examType)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>
                        End Date {isFinalTest(examType) ? '(Optional)' : ''}
                      </label>
                      <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} style={neuInput} required={!isFinalTest(examType)} />
                    </div>
                  </>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b6b8a', marginBottom: '6px' }}>Duration (min)</label>
                  <input type="number" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} style={neuInput} required min="1" />
                </div>
              </div>
                <button 
                type="button" 
                onClick={() => {
                  if (!title || !courseId || !durationMinutes || (requiresSchedule && (!startDate || !expiresAt))) {
                    alert('Please fill all mandatory fields before proceeding.')
                    return
                  }
                  if (requiresSchedule && new Date(expiresAt) <= new Date(startDate)) {
                    alert('End date must be later than start date.')
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
                  <button type="button" onClick={() => { setShowBank(true); fetchBankQuestions(bankSubjectFilter) }} style={{ ...secondaryButton, background: '#3636e815' }}>Browse Content Bank</button>
                  <button type="button" onClick={handleAddQuestion} style={secondaryButton}>+ Add Question</button>
                </div>
              </div>

              {/* Content Bank Picker Modal - Upgraded UI */}
              {showBank && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(232, 234, 240, 0.8)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                  <div style={{ ...neuCard, maxWidth: '1100px', width: '100%', maxHeight: '85vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.8)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                       <div>
                         <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#3636e8' }}>Browse Content Bank</h3>
                         <p style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: 500, marginTop: '4px' }}>
                           {bankSubjectFilter ? (
                             <>Showing questions for: <span style={{ color: '#1e1e3a', fontWeight: 800 }}>{bankSubjectFilter}</span></>
                           ) : (
                             <>Please select a subject to view questions.</>
                           )}
                         </p>
                       </div>
                       <button onClick={() => setShowBank(false)} style={{ background: '#ef444410', border: 'none', color: '#ef4444', padding: '8px 16px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '12px' }}>Close Bank</button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input 
                          type="text" 
                          placeholder="Search questions by text or keyword..." 
                          value={bankSearch}
                          onChange={e => setBankSearch(e.target.value)}
                          style={{ ...neuInput, paddingLeft: '44px' }}
                        />
                        <svg style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9999b0' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                        </svg>
                      </div>
                      <select
                        value={bankSubjectFilter}
                        onChange={e => { setBankSubjectFilter(e.target.value); fetchBankQuestions(e.target.value) }}
                        style={{ ...neuInput, width: '220px', cursor: 'pointer' }}
                      >
                        <option value="">Select Subject...</option>
                        {userSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                       {bankQuestions.filter(q => q.text.toLowerCase().includes(bankSearch.toLowerCase())).map(q => (
                         <div key={q.id} style={{ padding: '20px', background: 'rgba(255,255,255,0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                            <div style={{ flex: 1 }}>
                               <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                                 <span style={{ fontSize: '10px', fontWeight: 900, color: '#3636e8', background: '#3636e810', padding: '2px 8px', borderRadius: '6px' }}>{q.type}</span>
                                 <span style={{ fontSize: '10px', fontWeight: 900, color: '#6b6b8a', background: '#00000005', padding: '2px 8px', borderRadius: '6px' }}>{q.marks || 1} Marks</span>
                               </div>
                               <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e1e3a', lineHeight: '1.4' }}><RichTextDisplay text={q.text} /></div>
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
                                  marks: q.marks || 1,
                                  imageUrl: q.imageUrl,
                                  questionBankId: q.id 
                                } as any])
                                setShowBank(false)
                              }}
                              style={{ 
                                padding: '10px 20px', borderRadius: '12px', border: 'none', 
                                background: '#3636e8', color: '#fff', fontSize: '13px', fontWeight: 800, 
                                cursor: 'pointer', boxShadow: '0 4px 12px rgba(54,54,232,0.2)',
                                transition: 'transform 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                              Add to Exam
                            </button>
                         </div>
                       ))}
                       {bankQuestions.length === 0 && bankSubjectFilter && (
                         <div style={{ textAlign: 'center', padding: '40px', color: '#9999b0', background: 'rgba(0,0,0,0.02)', borderRadius: '16px' }}>
                           <p style={{ fontSize: '14px', fontWeight: 600 }}>No questions found in "{bankSubjectFilter}" bank.</p>
                           <p style={{ fontSize: '12px', marginTop: '4px' }}>Please go to the Content Bank page to add some questions first.</p>
                         </div>
                       )}
                       {bankQuestions.length === 0 && !bankSubjectFilter && (
                         <div style={{ textAlign: 'center', padding: '40px', color: '#9999b0', background: 'rgba(0,0,0,0.02)', borderRadius: '16px' }}>
                           <p style={{ fontSize: '14px', fontWeight: 600 }}>Select a subject from the dropdown above to browse related content.</p>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              )}

              {questions.map((q, idx) => (
                <div key={idx} style={{ ...neuCard, background: '#f8f9fc', border: '1px solid rgba(255,255,255,0.8)', padding: '24px', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '18px', fontWeight: 900, color: '#3636e8', margin: 0 }}>Question #{idx + 1}</h4>
                    <button type="button" onClick={() => handleRemoveQuestion(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remove</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Header Row: Text and Type */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '24px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <label style={{ fontSize: '14px', fontWeight: 800, color: '#6b6b8a' }}>Question Text</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase' }}>Format as:</span>
                            <select
                              onChange={(e) => {
                                const lang = e.target.value;
                                if (!lang) return;
                                
                                let currentText = q.text.trim();
                                let newText = '';
                                
                                // Check if already wrapped in some code block
                                const codeBlockRegex = /^```(?:\w+)?\n([\s\S]*?)```$/;
                                const match = currentText.match(codeBlockRegex);
                                
                                if (match) {
                                  // Update language of existing block
                                  newText = `\`\`\`${lang}\n${match[1].trim()}\n\`\`\``;
                                } else if (currentText) {
                                  // Wrap existing plain text
                                  newText = `\`\`\`${lang}\n${currentText}\n\`\`\``;
                                } else {
                                  // Insert empty template
                                  newText = `\`\`\`${lang}\n\n\`\`\``;
                                }
                                
                                handleQuestionChange(idx, 'text', newText);
                                e.target.value = ''; // Reset select
                              }}
                              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cfd6e1', background: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: '#3636e8' }}
                            >
                              <option value="">Select Language...</option>
                              <option value="python">Python</option>
                              <option value="java">Java</option>
                              <option value="cpp">C++</option>
                              <option value="javascript">JavaScript</option>
                              <option value="csharp">C#</option>
                              <option value="html">HTML</option>
                              <option value="css">CSS</option>
                              <option value="sql">SQL</option>
                            </select>
                          </div>
                        </div>
                        <textarea 
                          value={q.text} 
                          onChange={e => handleQuestionChange(idx, 'text', e.target.value)} 
                          placeholder="Type your question here..." 
                          style={{ ...neuInput, height: '100px', resize: 'vertical' }} 
                          required 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: '#6b6b8a', marginBottom: '8px' }}>Type</label>
                        <select value={q.type} onChange={e => handleQuestionChange(idx, 'type', e.target.value)} style={neuInput}>
                          <option value="MCQ">Multiple Choice</option>
                          <option value="MSQ">Multiple Select (MSQ)</option>
                          <option value="TRUE_FALSE">True / False</option>
                          <option value="NAT">Numerical (NAT)</option>
                        </select>
                      </div>
                    </div>

                    {/* Image Upload Row */}
                    <div style={{ background: 'rgba(255,255,255,0.4)', padding: '20px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.6)' }}>
                       <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: '#6b6b8a', marginBottom: '10px' }}>Question Image (Optional)</label>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                         <label style={{ ...secondaryButton, padding: '8px 20px', fontSize: '13px', cursor: 'pointer', display: 'inline-block' }}>
                           Choose File
                           <input 
                              type="file" 
                              accept="image/*" 
                              hidden
                              onChange={(e) => e.target.files?.[0] && handleImageUpload(idx, e.target.files[0])}
                           />
                         </label>
                         <span style={{ fontSize: '13px', color: '#9999b0' }}>{q.imageUrl ? 'Image uploaded successfuly' : 'No file chosen'}</span>
                       </div>
                       {q.imageUrl && (
                         <div style={{ marginTop: '16px', position: 'relative', width: '200px' }}>
                            <img src={q.imageUrl} alt="Preview" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '14px', boxShadow: '4px 4px 12px rgba(0,0,0,0.1)' }} />
                            <button type="button" onClick={() => handleQuestionChange(idx, 'imageUrl', '')} style={{ position: 'absolute', top: '-12px', right: '-12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>×</button>
                         </div>
                       )}
                    </div>

                    {/* Options Logic */}
                    {(q.type === 'MCQ' || q.type === 'MSQ' || q.type === 'TRUE_FALSE') && (
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: '#6b6b8a', marginBottom: '16px' }}>Options & Correct Answer</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          {q.type === 'TRUE_FALSE' ? (
                            ['True', 'False'].map(opt => (
                              <div key={opt} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input 
                                  type="radio" 
                                  checked={q.correctAnswer === opt} 
                                  onChange={() => handleQuestionChange(idx, 'correctAnswer', opt)} 
                                  style={{ width: '22px', height: '22px', accentColor: '#3636e8', cursor: 'pointer' }} 
                                />
                                <div style={{ ...neuInput, background: q.correctAnswer === opt ? '#3636e810' : '#e8eaf0', color: q.correctAnswer === opt ? '#3636e8' : '#1e1e3a', fontWeight: 700 }}>{opt}</div>
                              </div>
                            ))
                          ) : (
                            q.options.map((opt, oIdx) => (
                              <div key={oIdx} style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
                                <input 
                                  type={q.type === 'MSQ' ? "checkbox" : "radio"} 
                                  checked={q.type === 'MSQ' ? (() => { try { return JSON.parse(q.correctAnswer || '[]').includes(opt); } catch { return false; } })() : (q.correctAnswer === opt && opt !== '')}
                                  onChange={() => {
                                    if (q.type === 'MSQ') {
                                      let arr: string[] = [];
                                      try { arr = JSON.parse(q.correctAnswer || '[]'); } catch { arr = []; }
                                      if (!Array.isArray(arr)) arr = [];
                                      if (arr.includes(opt)) {
                                          arr = arr.filter(o => o !== opt);
                                      } else if (opt !== '') {
                                          arr.push(opt);
                                      }
                                      handleQuestionChange(idx, 'correctAnswer', JSON.stringify(arr));
                                    } else {
                                      handleQuestionChange(idx, 'correctAnswer', opt);
                                    }
                                  }} 
                                  style={{ width: '22px', height: '22px', accentColor: '#3636e8', cursor: 'pointer' }} 
                                />
                                <input 
                                  type="text" 
                                  value={opt} 
                                  onChange={e => {
                                    const newOpts = [...q.options]
                                    newOpts[oIdx] = e.target.value
                                    handleQuestionChange(idx, 'options', newOpts)
                                  }} 
                                  placeholder={`Option ${oIdx + 1}`} 
                                  style={neuInput} 
                                />
                                {q.options.length > 2 && (
                                  <button type="button" onClick={() => handleQuestionChange(idx, 'options', q.options.filter((_, i) => i !== oIdx))} style={{ position: 'absolute', right: '-30px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '20px', fontWeight: 300 }}>×</button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                        {(q.type === 'MCQ' || q.type === 'MSQ') && q.options.length < 6 && (
                          <button type="button" onClick={() => handleQuestionChange(idx, 'options', [...q.options, ''])} style={{ marginTop: '20px', background: 'none', border: '2px dashed #3636e8', color: '#3636e8', padding: '10px 24px', borderRadius: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>+ Add Option</button>
                        )}
                      </div>
                    )}

                    {/* Footer Row: Explanation & Marks */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '24px', alignItems: 'end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: '#6b6b8a', marginBottom: '8px' }}>Explanation (Optional)</label>
                        <input 
                          type="text" 
                          value={q.explanation} 
                          onChange={e => handleQuestionChange(idx, 'explanation', e.target.value)} 
                          placeholder="Why is this correct?" 
                          style={neuInput} 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: '#6b6b8a', marginBottom: '8px' }}>Marks</label>
                        <input 
                          type="number" 
                          value={q.marks || 1} 
                          onChange={e => handleQuestionChange(idx, 'marks', parseInt(e.target.value))} 
                          style={neuInput} 
                          min="1" 
                        />
                      </div>
                    </div>

                    {q.type === 'NAT' && (
                      <div style={{ background: 'rgba(16,185,129,0.05)', padding: '20px', borderRadius: '18px', border: '1px solid rgba(16,185,129,0.1)' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: '#10b981', marginBottom: '8px' }}>Correct Numerical Answer</label>
                        <input 
                          type="number"
                          step="any"
                          value={q.correctAnswer} 
                          onChange={e => handleQuestionChange(idx, 'correctAnswer', e.target.value)} 
                          placeholder="e.g. 42.5" 
                          style={{ ...neuInput, background: '#fff' }} 
                        />
                      </div>
                    )}
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
