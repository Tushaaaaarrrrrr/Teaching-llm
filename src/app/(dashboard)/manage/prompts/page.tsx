'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Plus, Trash, Users, ChevronDown, ChevronUp } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function PromptsAdminPage() {
  const { data, mutate, isLoading } = useSWR('/api/admin/prompts', fetcher)
  const prompts = data?.prompts || []

  const [isCreating, setIsCreating] = useState(false)
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [questions, setQuestions] = useState<any[]>([])

  const addQuestion = (type: string) => {
    setQuestions([...questions, { id: `q_${Date.now()}`, text: '', type, options: [], link: '', linkText: '' }])
  }

  const updateQuestion = (id: string, updates: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q))
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
  }

  const handleCreate = async () => {
    if (!newTitle || questions.length === 0) return alert('Title and at least 1 question are required.')
    
    // Clean up empty options
    const cleanedQuestions = questions.map(q => {
      if (q.type === 'MULTIPLE_CHOICE') {
        return { ...q, options: q.options.filter((o: string) => o.trim() !== '') }
      }
      return q
    })

    const res = await fetch('/api/admin/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        description: newDesc,
        isActive: false,
        questions: cleanedQuestions
      })
    })

    if (res.ok) {
      setNewTitle('')
      setNewDesc('')
      setQuestions([])
      setIsCreating(false)
      mutate()
    } else {
      alert('Failed to create prompt')
    }
  }

  const toggleActive = async (id: string, currentState: boolean) => {
    await fetch(`/api/admin/prompts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentState })
    })
    mutate()
  }

  const deletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt and all its responses?')) return
    await fetch(`/api/admin/prompts/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e1e3a', marginBottom: '4px' }}>User Prompts & Surveys</h1>
          <p style={{ color: '#6b6b8a', fontSize: '14px' }}>Create full-page blockers to ask users questions or drive actions.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> {isCreating ? 'Cancel' : 'Create New Prompt'}
        </button>
      </div>

      {isCreating && (
        <div className="card" style={{ padding: '24px', marginBottom: '30px', borderTop: '4px solid #6366f1' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Create New Prompt</h2>
          
          <div className="form-group">
            <label className="form-label">Title (Required)</label>
            <input type="text" className="form-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Please give us feedback" />
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea className="form-input" rows={2} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Explain why you are asking this..." />
          </div>

          <div style={{ marginTop: '24px' }}>
            <label className="form-label">Questions / CTAs</label>
            {questions.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', background: '#f8f9fa', borderRadius: '12px', border: '1px dashed #c5c7cf', color: '#9999b0', fontSize: '14px' }}>
                No questions added yet. Add one below.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {questions.map((q, i) => (
                <div key={q.id} style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', position: 'relative' }}>
                  <button onClick={() => removeQuestion(q.id)} style={{ position: 'absolute', top: '16px', right: '16px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash size={18} />
                  </button>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#6366f1', marginBottom: '8px' }}>
                    {q.type === 'YES_NO' ? 'Yes / No Question' : q.type === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 'CTA Button'}
                  </div>

                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ marginBottom: '12px', background: '#fff' }}
                    value={q.text} 
                    onChange={e => updateQuestion(q.id, { text: e.target.value })} 
                    placeholder={q.type === 'CTA_ONLY' ? "Message above button (e.g. Please click here to review us)" : "Question text..."}
                  />

                  {q.type === 'MULTIPLE_CHOICE' && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b6b8a', marginBottom: '8px' }}>Options (Comma separated)</div>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ background: '#fff' }}
                        value={q.options.join(', ')} 
                        onChange={e => updateQuestion(q.id, { options: e.target.value.split(',').map(s => s.trim()) })} 
                        placeholder="e.g. Class 11, Class 12, Dropper"
                      />
                    </div>
                  )}

                  {q.type === 'CTA_ONLY' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b6b8a', marginBottom: '8px' }}>Button Text</div>
                        <input type="text" className="form-input" style={{ background: '#fff' }} value={q.linkText} onChange={e => updateQuestion(q.id, { linkText: e.target.value })} placeholder="e.g. Give Feedback" />
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b6b8a', marginBottom: '8px' }}>URL</div>
                        <input type="url" className="form-input" style={{ background: '#fff' }} value={q.link} onChange={e => updateQuestion(q.id, { link: e.target.value })} placeholder="https://..." />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => addQuestion('YES_NO')} className="btn btn-ghost" style={{ fontSize: '13px' }}>+ Add Yes/No</button>
              <button onClick={() => addQuestion('MULTIPLE_CHOICE')} className="btn btn-ghost" style={{ fontSize: '13px' }}>+ Add Multiple Choice</button>
              <button onClick={() => addQuestion('CTA_ONLY')} className="btn btn-ghost" style={{ fontSize: '13px' }}>+ Add CTA Button</button>
            </div>
          </div>

          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleCreate} className="btn btn-primary">Save Prompt</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0' }}>Loading...</div>
      ) : prompts.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e1e3a', marginBottom: '8px' }}>No Prompts Found</h3>
          <p style={{ color: '#6b6b8a', fontSize: '14px' }}>Create your first prompt to start collecting responses.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {prompts.map((p: any) => (
            <div key={p.id} className="card" style={{ padding: '24px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e1e3a', margin: 0 }}>{p.title}</h3>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                      background: p.isActive ? '#dcfce7' : '#f3f4f8', 
                      color: p.isActive ? '#15803d' : '#6b6b8a' 
                    }}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {p.description && <p style={{ fontSize: '13px', color: '#6b6b8a', margin: 0 }}>{p.description}</p>}
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => toggleActive(p.id, p.isActive)} 
                    className="btn btn-ghost"
                    style={{ fontSize: '13px', fontWeight: 600, color: p.isActive ? '#f59e0b' : '#10b981' }}
                  >
                    {p.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => deletePrompt(p.id)} className="btn btn-ghost" style={{ color: '#ef4444' }}>
                    <Trash size={18} />
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f8', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontWeight: 600, fontSize: '14px' }}>
                  <Users size={18} /> {p._count?.responses || 0} Responses
                </div>
                
                <button 
                  onClick={() => setExpandedPromptId(expandedPromptId === p.id ? null : p.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#6b6b8a', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                >
                  {expandedPromptId === p.id ? 'Hide Responses' : 'View Responses'}
                  {expandedPromptId === p.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
              </div>

              {expandedPromptId === p.id && (
                <div style={{ marginTop: '20px', background: '#f8f9fa', padding: '20px', borderRadius: '12px' }}>
                  <PromptResponses promptId={p.id} questions={JSON.parse(p.questions)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PromptResponses({ promptId, questions }: { promptId: string, questions: any[] }) {
  const { data, isLoading } = useSWR(`/api/admin/prompts/${promptId}`, fetcher)
  
  if (isLoading) return <div style={{ fontSize: '13px', color: '#9999b0' }}>Loading responses...</div>
  
  const responses = data?.prompt?.responses || []

  if (responses.length === 0) return <div style={{ fontSize: '13px', color: '#9999b0' }}>No responses yet.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {responses.map((r: any) => {
        let answers = {}
        try { answers = JSON.parse(r.answers) } catch(e){}
        
        return (
          <div key={r.id} style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                {r.user.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e1e3a' }}>{r.user.name}</div>
                <div style={{ fontSize: '12px', color: '#9999b0' }}>{r.user.email}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {questions.map(q => (
                <div key={q.id} style={{ fontSize: '13px' }}>
                  <span style={{ color: '#6b6b8a' }}>{q.text}: </span>
                  <strong style={{ color: '#1e1e3a' }}>{answers[q.id as keyof typeof answers] || 'N/A'}</strong>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
