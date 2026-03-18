'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import useSWR from 'swr'

interface Ticket {
  id: string
  title: string
  description: string
  type: string
  status: string
  priority: string
  courseId?: string
  course?: { id: string; name: string; color: string }
  user: { id: string; name: string; role: string }
  assignedTo?: { id: string; name: string; role: string } | null
  replies: Reply[]
  createdAt: string
  updatedAt: string
}
interface Reply {
  id: string
  content: string
  createdAt: string
  sender: { id: string; name: string; role: string }
}
interface ChatMsg {
  id: string
  content: string
  createdAt: string
  sender: { id: string; name: string; role: string }
}
interface ChatSession {
  id: string
  status: string
  expiresAt?: string
  student: { id: string; name: string }
  agent?: { id: string; name: string; role: string }
  _count?: { messages: number }
  messages?: ChatMsg[]
}
interface CourseItem { id: string; name: string; color: string }
interface Faq { id: string; question: string; answer: string; order: number }
interface AdminUser { id: string; name: string; role: string }

const WORK_LOG_ACTIONS = [
  'COURSE_CREATED', 'COURSE_UPDATED', 'COURSE_DELETED',
  'TOPIC_CREATED', 'TOPIC_UPDATED', 'TOPIC_DELETED',
  'CONTENT_CREATED', 'CONTENT_UPDATED', 'CONTENT_DELETED',
  'LECTURE_CREATED', 'LECTURE_UPDATED', 'LECTURE_DELETED',
  'MATERIAL_CREATED', 'MATERIAL_UPDATED', 'MATERIAL_DELETED',
  'SESSION_CREATED', 'SESSION_UPDATED', 'SESSION_DELETED',
]

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#3b82f6', IN_PROGRESS: '#f59e0b', RESOLVED: '#10b981', CLOSED: '#9999b0',
}
const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444',
}

function pill(bg: string) {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '3px 11px', borderRadius: '50px',
    background: bg + '18', color: bg,
    fontSize: '11px', fontWeight: '700', letterSpacing: '0.4px',
    border: `1px solid ${bg}33`,
  } as React.CSSProperties
}

function getRelativeTime(dateStr: string, status: string): string {
  const verb = status === 'RESOLVED' ? 'Resolved' : status === 'CLOSED' ? 'Closed' : status === 'IN_PROGRESS' ? 'Updated' : 'Opened'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
  if (mins < 2) return `${verb} just now`
  if (hours < 1) return `${verb} ${mins}m ago`
  if (hours < 24) return `${verb} ${hours}h ago`
  if (days === 1) return `${verb} yesterday`
  if (days < 7) return `${verb} ${days} days ago`
  return `${verb} ${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`
}

function shortId(id: string): string {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return String(8000 + (hash % 2000))
}

function TicketStatusIcon({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || '#9999b0'
  return (
    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: c + '15', border: `1.5px solid ${c}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {status === 'RESOLVED' && <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
      {status === 'IN_PROGRESS' && <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
      {status === 'OPEN' && <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
      {status === 'CLOSED' && <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  const neu = { background: '#e8eaf0', boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff' }
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b8a', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '50px', ...neu }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
      Back
    </button>
  )
}

export default function SupportPage() {
  const [view, setView] = useState<'home' | 'allTickets' | 'chat' | 'chatHistory'>('home')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [replyText, setReplyText] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'GENERAL', courseId: '', priority: 'MEDIUM' })
  const fetcher = (url: string) => fetch(url).then(r => r.json())
  const [userRole, setUserRole] = useState('STUDENT')
  const [userId, setUserId] = useState('')

  // FAQ
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)
  const [showFaqForm, setShowFaqForm] = useState(false)
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null)
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' })

  // Ticket assignment
  const [admins, setAdmins] = useState<AdminUser[]>([])

  // Live Chat
  const [allChats, setAllChats] = useState<ChatSession[]>([])
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const repliesEndRef = useRef<HTMLDivElement>(null)

  // Chat History (manager only)
  const [historyChats, setHistoryChats] = useState<ChatSession[]>([])
  const [selectedHistory, setSelectedHistory] = useState<ChatSession | null>(null)
  const [historyMsgs, setHistoryMsgs] = useState<ChatMsg[]>([])

  const neu = { background: '#e8eaf0', boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff' }
  const neuInset = { background: '#e8eaf0', boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #ffffff' }
  const card = { background: '#ffffff', borderRadius: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.04)' }

  // SWR for Tickets
  const { data: ticketsData, mutate: mutateTickets } = useSWR('/api/support/tickets', fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true
  })
  useEffect(() => { if (ticketsData) setTickets(Array.isArray(ticketsData) ? ticketsData : []) }, [ticketsData])

  // SWR for All Active Chats (Admin/Manager view)
  const { data: chatsData, mutate: mutateAllChats } = useSWR(
    view === 'chat' ? '/api/support/live-chats' : null,
    fetcher,
    { refreshInterval: 4000 }
  )
  useEffect(() => { if (chatsData) setAllChats(Array.isArray(chatsData) ? chatsData : []) }, [chatsData])

  // SWR for Current Chat Messages
  const { data: swrChatMsgs, mutate: mutateChatMsgs } = useSWR(
    activeChatId ? `/api/support/live-chats/${activeChatId}/messages` : null,
    fetcher,
    { refreshInterval: 3000 }
  )
  useEffect(() => { if (swrChatMsgs) setChatMsgs(Array.isArray(swrChatMsgs) ? swrChatMsgs : []) }, [swrChatMsgs])

  const loadTickets = useCallback(async () => {
    mutateTickets()
    const cr = await fetch('/api/courses').then(r => r.json())
    setCourses((cr.courses || cr || []).map((c: CourseItem) => ({ id: c.id, name: c.name, color: c.color })))
  }, [mutateTickets])

  const loadFaqs = useCallback(async () => {
    const data = await fetch('/api/support/faq').then(r => r.json())
    setFaqs(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const role = d.user?.role || 'STUDENT'
      setUserRole(role)
      setUserId(d.user?.id || '')
      if (role === 'MANAGER') {
        fetch('/api/users').then(r => r.json()).then((users: AdminUser[]) => {
          setAdmins(users.filter(u => u.role === 'ADMIN'))
        })
      }
    })
    loadTickets()
    loadFaqs()
  }, [loadTickets, loadFaqs])

  // SWR handles polling now

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs])
  useEffect(() => { repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [selected?.replies])

  // ── ticket actions ──────────────────────────────────────────────────────
  async function submitTicket() {
    if (!form.title.trim() || !form.description.trim()) return
    await fetch('/api/support/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setShowCreate(false)
    setForm({ title: '', description: '', type: 'GENERAL', courseId: '', priority: 'MEDIUM' })
    loadTickets()
  }

  async function sendReply() {
    if (!replyText.trim() || !selected) return
    await fetch(`/api/support/tickets/${selected.id}/replies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: replyText }) })
    setReplyText('')
    const fresh = await fetch('/api/support/tickets').then(r => r.json())
    setTickets(Array.isArray(fresh) ? fresh : [])
    setSelected((Array.isArray(fresh) ? fresh : []).find((t: Ticket) => t.id === selected.id) || null)
  }

  async function updateStatus(ticketId: string, status: string) {
    await fetch(`/api/support/tickets/${ticketId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    loadTickets()
    if (selected?.id === ticketId) setSelected(prev => prev ? { ...prev, status } : null)
  }

  async function assignTicket(ticketId: string, assignedToId: string) {
    const fresh = await fetch(`/api/support/tickets/${ticketId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignedToId: assignedToId || null }) }).then(r => r.json())
    setTickets(prev => prev.map(t => t.id === ticketId ? fresh : t))
    if (selected?.id === ticketId) setSelected(fresh)
  }

  async function deleteTicket(ticketId: string) {
    if (!confirm('Delete this ticket and all its replies permanently?')) return
    await fetch(`/api/support/tickets/${ticketId}`, { method: 'DELETE' })
    setTickets(prev => prev.filter(t => t.id !== ticketId))
    if (selected?.id === ticketId) setSelected(null)
  }

  // ── chat actions ────────────────────────────────────────────────────────
  async function startChat() {
    const chat = await fetch('/api/support/live-chats', { method: 'POST' }).then(r => r.json())
    setAllChats(prev => [chat, ...prev])
    setActiveChatId(chat.id)
    setView('chat')
  }

  async function joinChat(chatId: string) {
    await fetch(`/api/support/live-chats/${chatId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join' }) })
    setActiveChatId(chatId)
    setAllChats(prev => prev.map(c => c.id === chatId ? { ...c, status: 'ACTIVE' } : c))
  }

  async function closeChat(chatId: string) {
    await fetch(`/api/support/live-chats/${chatId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'close' }) })
    setAllChats(prev => prev.filter(c => c.id !== chatId))
    if (activeChatId === chatId) setActiveChatId(null)
  }

  async function sendChatMsg() {
    if (!chatInput.trim() || !activeChatId) return
    const content = chatInput
    setChatInput('')
    await fetch(`/api/support/live-chats/${activeChatId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
    mutateChatMsgs()
  }

  // ── FAQ actions ──────────────────────────────────────────────────────────
  async function saveFaq() {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) return
    if (editingFaq) {
      await fetch(`/api/support/faq/${editingFaq.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...faqForm, order: editingFaq.order }) })
    } else {
      await fetch('/api/support/faq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...faqForm, order: faqs.length }) })
    }
    setShowFaqForm(false); setEditingFaq(null); setFaqForm({ question: '', answer: '' })
    loadFaqs()
  }

  async function deleteFaq(id: string) {
    if (!confirm('Delete this FAQ item?')) return
    await fetch(`/api/support/faq/${id}`, { method: 'DELETE' })
    setFaqs(prev => prev.filter(f => f.id !== id))
  }

  // ── chat history (manager) ───────────────────────────────────────────────
  async function loadChatHistory() {
    const data = await fetch('/api/support/chat-history').then(r => r.json())
    setHistoryChats(Array.isArray(data) ? data : [])
    setView('chatHistory')
  }

  async function viewHistory(s: ChatSession) {
    setSelectedHistory(s)
    const msgs = await fetch(`/api/support/chat-history/${s.id}`).then(r => r.json())
    setHistoryMsgs(Array.isArray(msgs) ? msgs : [])
  }

  async function deleteHistory(id: string) {
    if (!confirm('Permanently delete this chat transcript?')) return
    await fetch(`/api/support/chat-history/${id}`, { method: 'DELETE' })
    setHistoryChats(prev => prev.filter(c => c.id !== id))
    if (selectedHistory?.id === id) { setSelectedHistory(null); setHistoryMsgs([]) }
  }

  // ── Create ticket modal ─────────────────────────────────────────────────
  const CreateTicketModal = () => (
    <div className="modal-overlay" onClick={() => setShowCreate(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Raise a Support Ticket</h3>
          <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9999b0' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Issue Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['GENERAL', 'SUBJECT'].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{ flex: 1, padding: '10px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', background: form.type === t ? '#3636e8' : '#e8eaf0', color: form.type === t ? '#fff' : '#6b6b8a', boxShadow: form.type === t ? '4px 4px 10px rgba(54,54,232,0.3)' : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff' }}>
                  {t === 'GENERAL' ? '📋 General Support' : '📚 Subject Related'}
                </button>
              ))}
            </div>
          </div>
          {form.type === 'SUBJECT' && (
            <div className="form-group">
              <label className="form-label">Select Course</label>
              <select className="form-input" value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))}>
                <option value="">Choose a course...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" maxLength={200} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief description of the issue" />
            <div style={{ textAlign: 'right', fontSize: '10px', color: '#9999b0', marginTop: '2px' }}>{form.title.length}/200</div>
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-input" rows={4} maxLength={5000} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Explain your issue in detail..." style={{ resize: 'vertical' }} />
            <div style={{ textAlign: 'right', fontSize: '10px', color: form.description.length > 4800 ? '#ef4444' : '#9999b0', marginTop: '2px' }}>{form.description.length}/5,000</div>
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))} style={{ flex: 1, padding: '8px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700', background: form.priority === p ? PRIORITY_COLORS[p] : '#e8eaf0', color: form.priority === p ? '#fff' : '#6b6b8a', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff' }}>{p}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={() => setShowCreate(false)} className="btn btn-ghost">Cancel</button>
          <button onClick={submitTicket} className="btn btn-primary">Submit Ticket</button>
        </div>
      </div>
    </div>
  )

  // ── FAQ form modal ──────────────────────────────────────────────────────
  const FaqFormModal = () => (
    <div className="modal-overlay" onClick={() => { setShowFaqForm(false); setEditingFaq(null) }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '16px', fontWeight: '800' }}>{editingFaq ? 'Edit FAQ' : 'Add FAQ Item'}</h3>
          <button onClick={() => { setShowFaqForm(false); setEditingFaq(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9999b0' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Question *</label>
            <input className="form-input" value={faqForm.question} onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))} placeholder="Enter the frequently asked question..." />
          </div>
          <div className="form-group">
            <label className="form-label">Answer *</label>
            <textarea className="form-input" rows={4} value={faqForm.answer} onChange={e => setFaqForm(f => ({ ...f, answer: e.target.value }))} placeholder="Provide a clear answer..." style={{ resize: 'vertical' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={() => { setShowFaqForm(false); setEditingFaq(null) }} className="btn btn-ghost">Cancel</button>
          <button onClick={saveFaq} className="btn btn-primary">{editingFaq ? 'Save Changes' : 'Add FAQ'}</button>
        </div>
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════════
  // HOME VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'home') {
    return (
      <div className="page-container fade-in" style={{ maxHeight: 'calc(100vh - 72px)', overflowY: 'auto' }}>

        {/* Top row: FAQ card + Live Chat card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

          {/* FAQ Card */}
          <div style={{ ...card, padding: '28px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#f0f0fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              {userRole === 'MANAGER' && (
                <button onClick={() => { setFaqForm({ question: '', answer: '' }); setEditingFaq(null); setShowFaqForm(true) }} className="btn btn-primary btn-sm" style={{ borderRadius: '50px' }}>
                  + Add FAQ
                </button>
              )}
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#1e1e3a', marginBottom: '6px' }}>Frequently Asked Questions</h2>
            <p style={{ fontSize: '13px', color: '#6b6b8a', lineHeight: '1.6', marginBottom: '18px' }}>
              Instant answers to common queries. Browse our knowledge base for solutions.
            </p>

            {/* FAQ accordion */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
              {faqs.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9999b0', textAlign: 'center', padding: '20px 0' }}>
                  {userRole === 'MANAGER' ? 'No FAQs yet. Click "+ Add FAQ" to create one.' : 'No FAQs available yet.'}
                </p>
              ) : faqs.map(f => (
                <div key={f.id} style={{ background: '#f8f8fc', borderRadius: '14px', overflow: 'hidden', border: '1px solid #eeeef5' }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}
                    onClick={() => setExpandedFaq(expandedFaq === f.id ? null : f.id)}
                  >
                    <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e1e3a', flex: 1, marginRight: '8px' }}>{f.question}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {userRole === 'MANAGER' && (
                        <>
                          <button onClick={e => { e.stopPropagation(); setFaqForm({ question: f.question, answer: f.answer }); setEditingFaq(f); setShowFaqForm(true) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b8a', padding: '2px', display: 'flex' }} title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button onClick={e => { e.stopPropagation(); deleteFaq(f.id) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', display: 'flex' }} title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                          </button>
                        </>
                      )}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9999b0" strokeWidth="2.5" style={{ transform: expandedFaq === f.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                  {expandedFaq === f.id && (
                    <div style={{ padding: '0 16px 14px', fontSize: '13px', color: '#6b6b8a', lineHeight: '1.65', borderTop: '1px solid #eeeef5' }}>
                      <div style={{ paddingTop: '10px' }}>{f.answer}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Live Chat Card */}
          <div style={{ ...card, padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ebebff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#1e1e3a', marginBottom: '10px' }}>Need Immediate Help?</h2>
            <p style={{ fontSize: '13.5px', color: '#6b6b8a', lineHeight: '1.65', marginBottom: '22px' }}>
              Our support team is online and ready to help. Each session is private and expires after 24 hours.
            </p>
            <button
              onClick={() => userRole === 'STUDENT' ? startChat() : setView('chat')}
              style={{ background: 'linear-gradient(135deg, #3636e8, #5b5bf0)', color: '#fff', borderRadius: '50px', padding: '13px 28px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14.5px', fontWeight: '700', boxShadow: '0 4px 16px rgba(54,54,232,0.35)', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              {userRole === 'STUDENT' ? 'Start Live Chat Support' : 'Manage Live Chats'}
            </button>
            <p style={{ fontSize: '12px', color: '#9999b0', marginBottom: userRole === 'MANAGER' ? '12px' : '0' }}>Average response time: &lt; 2 minutes</p>
            {userRole === 'MANAGER' && (
              <button onClick={loadChatHistory} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3636e8', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                View Chat History
              </button>
            )}
          </div>
        </div>

        {/* Recent Support Tickets */}
        <div style={{ ...card, padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#1e1e3a' }}>Recent Support Tickets</h3>
            <button onClick={() => { setSelected(null); setView('allTickets') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9999b0', fontSize: '13px', fontFamily: 'inherit', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              View All History
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M7 7h10v10" /></svg>
            </button>
          </div>

          {tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9999b0' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c5c7cf" strokeWidth="1.5" style={{ marginBottom: '10px' }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#1e1e3a', marginBottom: '4px' }}>No tickets yet</p>
              <p style={{ fontSize: '13px' }}>{userRole === 'STUDENT' ? 'Create a ticket to get help from our support team.' : 'No tickets have been raised yet.'}</p>
              {userRole === 'STUDENT' && (
                <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ marginTop: '16px', borderRadius: '50px' }}>+ Raise a Ticket</button>
              )}
            </div>
          ) : (
            <>
              {tickets.slice(0, 5).map((t, idx) => (
                <div key={t.id} onClick={() => { setSelected(t); setView('allTickets') }}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '15px 0', borderBottom: idx < Math.min(tickets.length, 5) - 1 ? '1px solid #f0f1f5' : 'none', cursor: 'pointer', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <TicketStatusIcon status={t.status} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#1e1e3a', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ fontSize: '12px', color: '#9999b0', fontWeight: '600' }}>
                      Ticket #LLM-{shortId(t.id)} · {getRelativeTime(t.updatedAt, t.status)}
                      {t.assignedTo && <span style={{ color: '#3636e8' }}> · Assigned to {t.assignedTo.name}</span>}
                    </div>
                  </div>
                  <span style={pill(STATUS_COLORS[t.status])}>{t.status.replace('_', ' ')}</span>
                </div>
              ))}
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {userRole === 'STUDENT' && <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ borderRadius: '50px' }}>+ Raise a Ticket</button>}
                {tickets.length > 5 && <button onClick={() => setView('allTickets')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3636e8', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}>+{tickets.length - 5} more →</button>}
              </div>
            </>
          )}
        </div>

        {showCreate && <CreateTicketModal />}
        {showFaqForm && <FaqFormModal />}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ALL TICKETS VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'allTickets') {
    return (
      <div className="page-container fade-in" style={{ maxHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <BackButton onClick={() => { setView('home'); setSelected(null) }} />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#9999b0', fontWeight: '600' }}>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
            {userRole === 'STUDENT' && <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+ New Ticket</button>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.3fr' : '1fr', gap: '20px', flex: 1, minHeight: 0 }}>
          {/* Ticket list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {tickets.length === 0 ? (
              <div className="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                <p style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>No tickets</p>
                <p style={{ fontSize: '13px', color: '#9999b0' }}>{userRole === 'STUDENT' ? 'Create a ticket to get help.' : userRole === 'ADMIN' ? 'No tickets assigned to you yet.' : 'No tickets have been raised.'}</p>
              </div>
            ) : tickets.map(t => (
              <div key={t.id} onClick={() => setSelected(selected?.id === t.id ? null : t)}
                style={{ padding: '14px 18px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s', ...neu, outline: selected?.id === t.id ? '2px solid #3636e8' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#1e1e3a', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={pill(STATUS_COLORS[t.status])}>{t.status.replace('_', ' ')}</span>
                      <span style={pill(PRIORITY_COLORS[t.priority])}>{t.priority}</span>
                      {t.course && <span style={pill(t.course.color)}>{t.course.name}</span>}
                      {t.assignedTo && <span style={pill('#3636e8')}>{t.assignedTo.name}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: '#9999b0', marginTop: '2px' }}>{new Date(t.updatedAt).toLocaleDateString()}</span>
                    {userRole === 'MANAGER' && (
                      <button onClick={e => { e.stopPropagation(); deleteTicket(t.id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', display: 'flex' }} title="Delete ticket">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '12.5px', color: '#9999b0', marginTop: '6px' }}>
                  {t.replies.length} repl{t.replies.length !== 1 ? 'ies' : 'y'} · by {t.user.name}
                </div>
              </div>
            ))}
          </div>

          {/* Ticket thread */}
          {selected && (
            <div style={{ borderRadius: '24px', ...neu, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 'calc(100vh - 200px)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1.5px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>{selected.title}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span style={pill(STATUS_COLORS[selected.status])}>{selected.status.replace('_', ' ')}</span>
                      <span style={pill(PRIORITY_COLORS[selected.priority])}>{selected.priority}</span>
                      {selected.assignedTo && <span style={pill('#3636e8')}>→ {selected.assignedTo.name}</span>}
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9999b0' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>

                {/* Manager controls */}
                {userRole === 'MANAGER' && (
                  <>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
                        <button key={s} onClick={() => updateStatus(selected.id, s)} style={{ padding: '4px 10px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: '700', background: selected.status === s ? STATUS_COLORS[s] : '#e8eaf0', color: selected.status === s ? '#fff' : '#9999b0', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff' }}>
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                    {admins.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                        <span style={{ fontSize: '12px', color: '#6b6b8a', fontWeight: '600', flexShrink: 0 }}>Assign to:</span>
                        <select
                          value={selected.assignedTo?.id || ''}
                          onChange={e => assignTicket(selected.id, e.target.value)}
                          style={{ flex: 1, padding: '6px 10px', borderRadius: '10px', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '12.5px', background: '#e8eaf0', boxShadow: '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff', color: '#1e1e3a', cursor: 'pointer' }}
                        >
                          <option value="">Unassigned</option>
                          {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {/* Admin can change status on their assigned tickets */}
                {userRole === 'ADMIN' && selected.assignedTo?.id === userId && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                    {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
                      <button key={s} onClick={() => updateStatus(selected.id, s)} style={{ padding: '4px 10px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: '700', background: selected.status === s ? STATUS_COLORS[s] : '#e8eaf0', color: selected.status === s ? '#fff' : '#9999b0', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff' }}>
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ padding: '14px 20px', borderBottom: '1.5px solid rgba(0,0,0,0.05)', background: '#f0f1f5' }}>
                <div style={{ fontSize: '12px', color: '#9999b0', marginBottom: '4px', fontWeight: '600' }}>Original request — {selected.user.name}</div>
                <div style={{ fontSize: '13.5px', color: '#1e1e3a', lineHeight: '1.6' }}>{selected.description}</div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selected.replies.map(r => {
                  const isMe = r.sender.id === userId
                  const isAdmin = r.sender.role !== 'STUDENT'
                  return (
                    <div key={r.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? '#3636e8' : isAdmin ? '#f0f0ff' : '#e8eaf0', boxShadow: isMe ? '3px 3px 8px rgba(54,54,232,0.3)' : '3px 3px 8px #c5c7cf, -3px -3px 8px #ffffff', color: isMe ? '#fff' : '#1e1e3a' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '4px', opacity: isMe ? 0.8 : 1, color: isMe ? '#c5c8ff' : isAdmin ? '#3636e8' : '#9999b0' }}>{r.sender.name}{isAdmin && ' · Staff'}</div>
                        <div style={{ fontSize: '13.5px', lineHeight: '1.5' }}>{r.content}</div>
                        <div style={{ fontSize: '10.5px', marginTop: '4px', opacity: 0.6, textAlign: 'right' }}>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  )
                })}
                <div ref={repliesEndRef} />
              </div>

              {selected.status !== 'CLOSED' && (
                <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input maxLength={2000} value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()} placeholder="Type your reply..." style={{ flex: 1, padding: '10px 16px', borderRadius: '50px', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '13.5px', ...neuInset, color: '#1e1e3a' }} />
                    <button onClick={sendReply} className="btn btn-primary btn-sm" style={{ borderRadius: '50px', padding: '10px 18px' }}>Send</button>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '10px', color: replyText.length > 1900 ? '#ef4444' : '#9999b0', paddingRight: '12px' }}>{replyText.length}/2,000</div>
                </div>
              )}
            </div>
          )}
        </div>

        {showCreate && <CreateTicketModal />}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHAT HISTORY VIEW (Manager only)
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'chatHistory') {
    return (
      <div className="page-container fade-in" style={{ maxHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <BackButton onClick={() => { setView('home'); setSelectedHistory(null) }} />
          <span style={{ fontSize: '13px', color: '#9999b0', fontWeight: '600' }}>{historyChats.length} transcript{historyChats.length !== 1 ? 's' : ''}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selectedHistory ? '320px 1fr' : '1fr', gap: '20px', flex: 1, minHeight: 0 }}>
          {/* History list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            {historyChats.length === 0 ? (
              <div className="empty-state">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                <p style={{ fontWeight: '700', marginTop: '10px' }}>No chat history</p>
                <p style={{ fontSize: '13px', color: '#9999b0' }}>Closed chat transcripts will appear here.</p>
              </div>
            ) : historyChats.map(c => (
              <div key={c.id}
                onClick={() => viewHistory(c)}
                style={{ padding: '14px 16px', borderRadius: '18px', cursor: 'pointer', ...neu, outline: selectedHistory?.id === c.id ? '2px solid #3636e8' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e1e3a', marginBottom: '3px' }}>{c.student.name}</div>
                    <div style={{ fontSize: '12px', color: '#9999b0' }}>
                      {c.agent ? `Agent: ${c.agent.name}` : 'No agent joined'}
                      {c._count && ` · ${c._count.messages} messages`}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#9999b0', marginTop: '2px' }}>{new Date((c as ChatSession & { updatedAt?: string }).updatedAt || '').toLocaleString()}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteHistory(c.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', flexShrink: 0 }} title="Delete transcript">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Transcript viewer */}
          {selectedHistory && (
            <div style={{ borderRadius: '24px', ...neu, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '15px', color: '#1e1e3a' }}>Chat with {selectedHistory.student.name}</div>
                  <div style={{ fontSize: '12px', color: '#9999b0', marginTop: '2px' }}>
                    {selectedHistory.agent ? `Agent: ${selectedHistory.agent.name}` : 'No agent'} · Transcript
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={pill('#9999b0')}>Closed</span>
                  <button onClick={() => { setSelectedHistory(null); setHistoryMsgs([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9999b0' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {historyMsgs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9999b0', fontSize: '13px', marginTop: '20px' }}>No messages in this transcript.</div>
                ) : historyMsgs.map(m => {
                  const isStudent = m.sender.role === 'STUDENT'
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isStudent ? 'flex-start' : 'flex-end', gap: '8px', alignItems: 'flex-end' }}>
                      {isStudent && <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e8eaf0', boxShadow: '2px 2px 5px #c5c7cf', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#6b6b8a', flexShrink: 0 }}>{m.sender.name.charAt(0)}</div>}
                      <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: isStudent ? '18px 18px 18px 4px' : '18px 18px 4px 18px', background: isStudent ? '#e8eaf0' : '#f0f0ff', boxShadow: '3px 3px 8px #c5c7cf, -3px -3px 8px #ffffff', color: '#1e1e3a' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '3px', color: isStudent ? '#9999b0' : '#3636e8' }}>{m.sender.name}{!isStudent && ' · Staff'}</div>
                        <div style={{ fontSize: '13.5px', lineHeight: '1.5' }}>{m.content}</div>
                        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6, textAlign: 'right' }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LIVE CHAT VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="page-container fade-in" style={{ maxHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton onClick={() => { setView('home'); setActiveChatId(null) }} />
        {userRole === 'STUDENT' && (
          <button onClick={startChat} className="btn btn-primary btn-sm" style={{ borderRadius: '50px' }}>+ New Chat</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: allChats.length > 0 || userRole !== 'STUDENT' ? '280px 1fr' : '1fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Chat list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          <div style={{ fontSize: '13px', color: '#9999b0', fontWeight: '600', marginBottom: '4px' }}>
            {allChats.length} chat{allChats.length !== 1 ? 's' : ''}
          </div>
          {allChats.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              <p style={{ fontWeight: '700', marginTop: '10px' }}>No active chats</p>
              {userRole === 'STUDENT' && <p style={{ fontSize: '13px', color: '#9999b0' }}>Click "+ New Chat" to start.</p>}
            </div>
          ) : allChats.map(c => {
            const expiresAt = c.expiresAt ? new Date(c.expiresAt) : null
            const msLeft = expiresAt ? expiresAt.getTime() - Date.now() : null
            const hoursLeft = msLeft ? Math.max(0, Math.floor(msLeft / 3600000)) : null
            return (
              <div key={c.id} onClick={() => setActiveChatId(c.id)}
                style={{ padding: '12px 16px', borderRadius: '18px', cursor: 'pointer', ...neu, outline: activeChatId === c.id ? '2px solid #3636e8' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e1e3a' }}>
                    {userRole === 'STUDENT' ? 'Support Chat' : c.student.name}
                  </span>
                  <span style={pill(c.status === 'WAITING' ? '#f59e0b' : '#10b981')}>{c.status}</span>
                </div>
                {hoursLeft !== null && (
                  <div style={{ fontSize: '11px', color: hoursLeft < 2 ? '#ef4444' : '#9999b0', marginBottom: '6px' }}>
                    Expires in {hoursLeft}h
                  </div>
                )}
                {userRole !== 'STUDENT' && c.status === 'WAITING' && (
                  <button onClick={e => { e.stopPropagation(); joinChat(c.id) }} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', borderRadius: '50px', marginTop: '4px' }}>
                    Join Chat
                  </button>
                )}
                {(userRole === 'MANAGER' || (userRole !== 'STUDENT' && c.status === 'ACTIVE')) && (
                  <button onClick={e => { e.stopPropagation(); closeChat(c.id) }} style={{ width: '100%', marginTop: '4px', padding: '4px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', color: '#9999b0', fontFamily: 'inherit' }}>
                    Close chat
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Chat window */}
        <div style={{ borderRadius: '24px', ...neu, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!activeChatId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e8eaf0', boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: '800', color: '#1e1e3a' }}>Live Support Chat</p>
              <p style={{ fontSize: '13px', color: '#9999b0', textAlign: 'center' }}>
                {userRole === 'STUDENT' ? 'Select a chat or start a new one.' : 'Select a chat from the list to respond.'}
              </p>
            </div>
          ) : (() => {
            const activeChat = allChats.find(c => c.id === activeChatId)
            return (
              <>
                <div style={{ padding: '14px 20px', borderBottom: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: '#1e1e3a' }}>
                      {userRole === 'STUDENT' ? 'Support Chat' : activeChat?.student.name || 'Chat'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9999b0', marginTop: '2px' }}>
                      {activeChat?.agent ? `Agent: ${activeChat.agent.name}` : 'Waiting for an agent...'}
                      {activeChat?.expiresAt && ` · Expires ${new Date(activeChat.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={pill('#10b981')}>Active</span>
                    <button onClick={() => setActiveChatId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9999b0' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {chatMsgs.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#9999b0', fontSize: '13px', marginTop: '20px' }}>Chat started. Waiting for messages...</div>
                  )}
                  {chatMsgs.map(m => {
                    const isMe = m.sender.id === userId
                    const isAdmin = m.sender.role !== 'STUDENT'
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end' }}>
                        {!isMe && <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isAdmin ? '#3636e8' : '#e8eaf0', boxShadow: '2px 2px 5px #c5c7cf', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: isAdmin ? '#fff' : '#6b6b8a', flexShrink: 0 }}>{m.sender.name.charAt(0)}</div>}
                        <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? '#3636e8' : isAdmin ? '#f0f0ff' : '#e8eaf0', boxShadow: isMe ? '3px 3px 8px rgba(54,54,232,0.3)' : '3px 3px 8px #c5c7cf, -3px -3px 8px #ffffff', color: isMe ? '#fff' : '#1e1e3a' }}>
                          {!isMe && <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '3px', color: isAdmin ? '#3636e8' : '#9999b0' }}>{m.sender.name}</div>}
                          <div style={{ fontSize: '13.5px', lineHeight: '1.5' }}>{m.content}</div>
                          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6, textAlign: 'right' }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input maxLength={2000} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMsg()} placeholder="Type a message..." style={{ flex: 1, padding: '10px 16px', borderRadius: '50px', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '13.5px', ...neuInset, color: '#1e1e3a' }} />
                    <button onClick={sendChatMsg} className="btn btn-primary" style={{ borderRadius: '50%', padding: '10px 13px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '10px', color: chatInput.length > 1900 ? '#ef4444' : '#9999b0', paddingRight: '12px' }}>{chatInput.length}/2,000</div>
                </div>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
