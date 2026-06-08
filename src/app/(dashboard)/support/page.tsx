'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ManagerUserModal from '@/components/ManagerUserModal'

interface Ticket {
  id: string
  title: string
  description: string
  type: string
  status: string
  priority: string
  classId?: string
  class?: { id: string; name: string; color: string }
  user: { id: string; name: string; role: string }
  assignedTo?: { id: string; name: string; role: string } | null
  replies: Reply[]
  createdAt: string
  updatedAt: string
}
interface Reply {
  id: string
  content: string
  imageUrl?: string | null
  createdAt: string
  sender: { id: string; name: string; role: string }
}
interface ChatMsg {
  id: string
  content: string
  imageUrl?: string | null
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
interface ClassItem { id: string; name: string; color: string }
interface Faq { id: string; question: string; answer: string; order: number }
interface AdminUser { id: string; name: string; role: string }

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'var(--info)', IN_PROGRESS: 'var(--warning)', RESOLVED: 'var(--success)', CLOSED: 'var(--text-muted)',
}
const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'var(--success)', MEDIUM: 'var(--warning)', HIGH: 'var(--danger)',
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

function formatMessageDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TicketStatusIcon({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || 'var(--text-muted)'
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
  const neu = { background: 'var(--surface-2)', boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff' }
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '50px', ...neu }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
      Back
    </button>
  )
}

// ── Refactored Modals Moved Outside to prevent focus loss during typing ────

function CreateTicketModal({ 
  onClose, form, setForm, classes, userRole, submitTicket 
}: { 
  onClose: () => void, form: any, setForm: (f: any) => void, classes: ClassItem[], userRole: string, submitTicket: () => void 
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Raise a Support Ticket</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Issue Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['GENERAL', 'SUBJECT'].map(t => (
                <button key={t} onClick={() => setForm((f: any) => ({ ...f, type: t }))} style={{ flex: 1, padding: '10px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', background: form.type === t ? 'var(--primary)' : 'var(--surface-2)', color: form.type === t ? '#fff' : 'var(--text-secondary)', boxShadow: form.type === t ? '4px 4px 10px rgba(54,54,232,0.3)' : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff' }}>
                  {t === 'GENERAL' ? '📋 General Support' : '📚 Subject Related'}
                </button>
              ))}
            </div>
          </div>
          {form.type === 'SUBJECT' && (
            <div className="form-group">
              <label className="form-label">Select Subject</label>
              <select className="form-input" value={form.classId} onChange={e => setForm((f: any) => ({ ...f, classId: e.target.value }))}>
                <option value="">Choose a subject...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {userRole !== 'STUDENT' && (
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="Brief description of the issue" />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-input" rows={4} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Explain your issue in detail..." style={{ resize: 'vertical' }} />
          </div>
          {userRole !== 'STUDENT' && (
            <div className="form-group">
              <label className="form-label">Priority</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                  <button key={p} onClick={() => setForm((f: any) => ({ ...f, priority: p }))} style={{ flex: 1, padding: '8px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700', background: form.priority === p ? PRIORITY_COLORS[p] : 'var(--surface-2)', color: form.priority === p ? '#fff' : 'var(--text-secondary)', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff' }}>{p}</button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={submitTicket} className="btn btn-primary">Submit Ticket</button>
        </div>
      </div>
    </div>
  )
}

function StartChatModal({ 
  onClose, value, onChange, onSubmit 
}: { 
  onClose: () => void, value: string, onChange: (val: string) => void, onSubmit: (val: string) => void 
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Start Live Support Chat</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            To help us assist you better, please describe your issue in detail before starting the chat.
          </p>
          <div className="form-group">
            <label className="form-label">Issue Description *</label>
            <textarea 
              className="form-input" 
              rows={4} 
              value={value} 
              onChange={e => onChange(e.target.value)} 
              placeholder="Explain your issue in detail..." 
              style={{ resize: 'vertical' }} 
            />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button 
            onClick={() => onSubmit(value)} 
            className="btn btn-primary" 
            disabled={!value.trim()}
            style={{ opacity: !value.trim() ? 0.6 : 1 }}
          >
            Start Chat
          </button>
        </div>
      </div>
    </div>
  )
}

function FaqFormModal({ 
  onClose, faqForm, setFaqForm, editingFaq, saveFaq 
}: { 
  onClose: () => void, faqForm: any, setFaqForm: (f: any) => void, editingFaq: Faq | null, saveFaq: () => void 
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '16px', fontWeight: '800' }}>{editingFaq ? 'Edit FAQ' : 'Add FAQ Item'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Question *</label>
            <input className="form-input" value={faqForm.question} onChange={e => setFaqForm((f: any) => ({ ...f, question: e.target.value }))} placeholder="Enter the frequently asked question..." />
          </div>
          <div className="form-group">
            <label className="form-label">Answer *</label>
            <textarea className="form-input" rows={4} value={faqForm.answer} onChange={e => setFaqForm((f: any) => ({ ...f, answer: e.target.value }))} placeholder="Provide a clear answer..." style={{ resize: 'vertical' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={saveFaq} className="btn btn-primary">{editingFaq ? 'Save Changes' : 'Add FAQ'}</button>
        </div>
      </div>
    </div>
  )
}

export default function SupportPage() {
  const router = useRouter()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)
  useEffect(() => {
    setIsMobile(window.innerWidth <= 768)
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [view, setView] = useState<'home' | 'allTickets' | 'chat' | 'chatHistory'>('home')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [replyText, setReplyText] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'GENERAL', classId: '', priority: 'MEDIUM' })
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
  const [showChatStart, setShowChatStart] = useState(false)
  const [chatInitText, setChatInitText] = useState('')
  const [selectedUserDetailsId, setSelectedUserDetailsId] = useState<string | null>(null)
  const [showManagerChatStart, setShowManagerChatStart] = useState(false)
  // Image upload state
  const [pendingChatImage, setPendingChatImage] = useState<File | null>(null)
  const [pendingChatImagePreview, setPendingChatImagePreview] = useState<string | null>(null)
  const [pendingReplyImage, setPendingReplyImage] = useState<File | null>(null)
  const [pendingReplyImagePreview, setPendingReplyImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const chatImageRef = useRef<HTMLInputElement>(null)
  const replyImageRef = useRef<HTMLInputElement>(null)

  const neu = { background: 'var(--surface-2)', boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff' }
  const neuInset = { background: 'var(--surface-2)', boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #ffffff' }
  const card = { background: 'var(--surface)', borderRadius: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.04)' }

  const loadTickets = useCallback(async () => {
    const [tr, cr] = await Promise.all([
      fetch('/api/support/tickets').then(r => r.json()),
      fetch('/api/classes').then(r => r.json()),
    ])
    setTickets(Array.isArray(tr) ? tr : [])
    setClasses((cr.classes || cr || []).map((c: ClassItem) => ({ id: c.id, name: c.name, color: c.color })))
  }, [])

  const loadFaqs = useCallback(async () => {
    const staticFaqs: Faq[] = [
      { id: '1', question: 'What is the difference between PLUS and PRO Batch?', answer: 'PLUS Batch includes full access to recorded lectures and course materials. PRO Batch includes everything in PLUS, plus direct entry to Live Classes, priority 1:1 doubt support, and interactive Q&A sessions with teachers.', order: 0 },
      { id: '2', question: 'Can I upgrade from PLUS to PRO later?', answer: 'Yes, you can upgrade at any time! Simply visit the course store, find your course, and you will see a discounted "Upgrade to PRO" option that only charges the price difference.', order: 1 },
      { id: '3', question: 'How long do I have access to the course?', answer: 'Most courses provide access until the end of the academic term (e.g., End Term 1 or Term 2). You can find the exact expiry date in the footer of the course card in the store.', order: 2 },
      { id: '4', question: 'Is there a mobile app available?', answer: 'We are currently optimized for mobile browsers. You can "Add to Home Screen" on your phone to use it like an app. A native mobile app is in our roadmap!', order: 3 },
      { id: '5', question: 'What payment methods do you accept?', answer: 'We accept all major Credit/Debit cards, UPI (PhonePe, Google Pay, Paytm), Net Banking, and popular Wallets via our secure Razorpay integration.', order: 4 },
      { id: '6', question: 'What should I do if my payment fails but money is deducted?', answer: 'Don\'t worry! Usually, it settles automatically within 24-48 hours. If you don\'t see your course in the "Study" section within 2 hours, please raise a support ticket with your transaction ID.', order: 5 },
      { id: '7', question: 'Can I get a refund?', answer: 'Refund policies vary by course. Generally, we offer a 2-day "no questions asked" refund if you haven\'t consumed more than 10% of the content. Check the specific course terms for details.', order: 6 },
      { id: '8', question: 'How do I access the Live Classes?', answer: 'If you have a PRO Batch enrollment, go to the "Live" tab in your dashboard. You will see upcoming sessions and a "Join Now" button when a class is live.', order: 7 },
      { id: '9', question: 'Where can I find my course certificates?', answer: 'Once you complete 100% of the course content and pass the final assessment, your certificate will be available for download in the "Profile" or "Course Details" section.', order: 8 },
      { id: '10', question: 'I forgot my password, how do I reset it?', answer: 'Click on the "Forgot Password" link on the login page. We will send a secure reset link to your registered email address.', order: 9 },
      { id: '11', question: 'Can I share my account with a friend?', answer: 'Account sharing is strictly prohibited. Our system monitors concurrent logins and IP changes. Multiple simultaneous logins may lead to permanent account suspension.', order: 10 },
      { id: '12', question: 'What are "Free Resources"?', answer: 'Free Resources include guest lectures, demo notes, and sample papers available to all registered users without any purchase.', order: 11 },
      { id: '13', question: 'How can I contact my instructor?', answer: 'PRO Batch users can use the "Doubt" section inside each lesson or the dedicated Q&A feature during Live Classes to interact directly with instructors.', order: 12 },
      { id: '14', question: 'Do you provide offline access to videos?', answer: 'Currently, videos require an active internet connection to prevent piracy. However, you can download course PDFs and materials for offline viewing.', order: 13 },
      { id: '15', question: 'What is the "Community" tab?', answer: 'The Community tab is a discussion forum where you can interact with fellow students, share insights, and participate in subject-specific groups.', order: 14 },
      { id: '16', question: 'How do I track my progress?', answer: 'Your progress is tracked automatically. You can see your completion percentage on the dashboard and inside each individual course module.', order: 15 },
      { id: '17', question: 'Are the recordings available immediately after a Live Class?', answer: 'Yes, recordings are usually processed and made available in the "Recorded" section within 4-6 hours after the Live Class ends.', order: 16 },
      { id: '18', question: 'Can I change my registered email address?', answer: 'For security reasons, email changes require manual verification. Please raise a support ticket from your current account to request a change.', order: 17 },
      { id: '19', question: 'What browsers are recommended?', answer: 'We recommend using the latest versions of Google Chrome, Mozilla Firefox, or Microsoft Edge for the best experience.', order: 18 },
      { id: '20', question: 'How do I report a technical bug?', answer: 'Please raise a "Technical Support" ticket with a screenshot of the error and your device/browser details. Our team will investigate it promptly.', order: 19 }
    ]
    try {
      const res = await fetch('/api/support/faq')
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setFaqs(data)
      } else {
        // DB is empty — show static defaults for students, managers see empty state to add their own
        setFaqs(staticFaqs)
      }
    } catch {
      setFaqs(staticFaqs)
    }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const role = d.user?.role || 'STUDENT'
      setUserRole(role)
      setUserId(d.user?.id || '')
      if (role === 'MANAGER') {
        fetch('/api/users/staff').then(r => r.json()).then((d: any) => {
          const staffList = d.staff || []
          setAdmins(staffList.filter((u: any) => u.role === 'MANAGER'))
        })
      }
    })
    loadTickets()
    loadFaqs()
  }, [loadTickets, loadFaqs])

  // Poll chat messages
  useEffect(() => {
    if (!activeChatId) return
    const poll = () => fetch(`/api/support/live-chats/${activeChatId}/messages`)
      .then(r => r.json()).then(d => setChatMsgs(Array.isArray(d) ? d : []))
    poll()
    const t = setInterval(poll, 3000)
    return () => clearInterval(t)
  }, [activeChatId])

  // Poll chat list when in chat view
  useEffect(() => {
    if (view !== 'chat') return
    const poll = () => fetch('/api/support/live-chats').then(r => r.json()).then(d => setAllChats(Array.isArray(d) ? d : []))
    poll()
    const t = setInterval(poll, 4000)
    return () => clearInterval(t)
  }, [view])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs])
  useEffect(() => { repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [selected?.replies])

  // ── ticket actions ──────────────────────────────────────────────────────
  async function submitTicket() {
    if ((userRole !== 'STUDENT' && !form.title.trim()) || !form.description.trim()) return
    await fetch('/api/support/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setShowCreate(false)
    setForm({ title: '', description: '', type: 'GENERAL', classId: '', priority: 'MEDIUM' })
    loadTickets()
  }

  async function sendReply() {
    if ((!replyText.trim() && !pendingReplyImage) || !selected) return
    setUploadingImage(true)
    try {
      let imageUrl: string | null = null
      if (pendingReplyImage) imageUrl = await uploadImage(pendingReplyImage)
      await fetch(`/api/support/tickets/${selected.id}/replies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: replyText, imageUrl }) })
      setReplyText('')
      clearReplyImage()
      const fresh = await fetch('/api/support/tickets').then(r => r.json())
      setTickets(Array.isArray(fresh) ? fresh : [])
      setSelected((Array.isArray(fresh) ? fresh : []).find((t: Ticket) => t.id === selected.id) || null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send reply')
    }
    setUploadingImage(false)
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
    const allowed = await confirm({
      title: 'Delete Ticket?',
      message: 'This will permanently delete the ticket and all replies.',
      confirmLabel: 'Delete Ticket',
      tone: 'danger',
    })
    if (!allowed) return
    await fetch(`/api/support/tickets/${ticketId}`, { method: 'DELETE' })
    setTickets(prev => prev.filter(t => t.id !== ticketId))
    if (selected?.id === ticketId) setSelected(null)
  }

  // ── chat actions ────────────────────────────────────────────────────────
  async function startChat(initialMessage?: string) {
    const chat = await fetch('/api/support/live-chats', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialMessage })
    }).then(r => r.json())
    setAllChats(prev => [chat, ...prev])
    setActiveChatId(chat.id)
    setView('chat')
    setShowChatStart(false)
    setChatInitText('')
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

  function handleChatImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image too large. Max 5MB.'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { alert('Only JPG, PNG, WEBP allowed.'); return }
    setPendingChatImage(file)
    setPendingChatImagePreview(URL.createObjectURL(file))
  }

  function clearChatImage() {
    setPendingChatImage(null)
    if (pendingChatImagePreview) URL.revokeObjectURL(pendingChatImagePreview)
    setPendingChatImagePreview(null)
    if (chatImageRef.current) chatImageRef.current.value = ''
  }

  function handleReplyImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image too large. Max 5MB.'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { alert('Only JPG, PNG, WEBP allowed.'); return }
    setPendingReplyImage(file)
    setPendingReplyImagePreview(URL.createObjectURL(file))
  }

  function clearReplyImage() {
    setPendingReplyImage(null)
    if (pendingReplyImagePreview) URL.revokeObjectURL(pendingReplyImagePreview)
    setPendingReplyImagePreview(null)
    if (replyImageRef.current) replyImageRef.current.value = ''
  }

  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload/chat-image', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Upload failed')
    return data.url
  }

  async function sendChatMsg() {
    if ((!chatInput.trim() && !pendingChatImage) || !activeChatId) return
    setUploadingImage(true)
    try {
      let imageUrl: string | null = null
      if (pendingChatImage) imageUrl = await uploadImage(pendingChatImage)
      await fetch(`/api/support/live-chats/${activeChatId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: chatInput, imageUrl }) })
      setChatInput('')
      clearChatImage()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send message')
    }
    setUploadingImage(false)
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
    const allowed = await confirm({
      title: 'Delete FAQ?',
      message: 'This FAQ item will be removed permanently.',
      confirmLabel: 'Delete FAQ',
      tone: 'danger',
    })
    if (!allowed) return
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
    const allowed = await confirm({
      title: 'Delete Chat History?',
      message: 'This chat transcript will be removed permanently.',
      confirmLabel: 'Delete Transcript',
      tone: 'danger',
    })
    if (!allowed) return
    await fetch(`/api/support/chat-history/${id}`, { method: 'DELETE' })
    setHistoryChats(prev => prev.filter(c => c.id !== id))
    if (selectedHistory?.id === id) { setSelectedHistory(null); setHistoryMsgs([]) }
  }


  // ══════════════════════════════════════════════════════════════════════════
  // HOME VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'home') {
    return (
      <div className="page-container fade-in" style={{ maxHeight: 'calc(100vh - 72px)', overflowY: 'auto', overflowX: 'hidden' }}>
        <style>{`
          .mobile-back-header {
            display: none;
          }
          .support-grid {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 24px;
            margin-bottom: 24px;
            align-items: flex-start;
          }
          .faq-card-col {
            display: flex;
            flex-direction: column;
            order: 0;
            padding: 28px;
          }
          .chat-actions-col {
            display: flex;
            flex-direction: column;
            gap: 24px;
            order: 0;
          }
          .chat-box-pad {
            padding: 28px;
          }
          .ticket-box-pad {
            padding: 24px;
          }
          @media (max-width: 768px) {
            .mobile-back-header {
              display: flex !important;
            }
            .page-container {
              padding: 16px 14px 24px !important;
              overflow-x: hidden !important;
            }
            .support-grid {
              grid-template-columns: 1fr !important;
              gap: 16px !important;
            }
            .faq-card-col {
              order: 2 !important;
              padding: 16px !important;
            }
            .chat-actions-col {
              order: 1 !important;
              gap: 16px !important;
            }
            .chat-box-pad {
              padding: 16px !important;
            }
            .ticket-box-pad {
              padding: 16px !important;
            }
          }
        `}</style>
        {confirmDialog}

        {/* Mobile-only Header with Back Button */}
        <div className="mobile-back-header" style={{
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          padding: '8px 4px 16px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'var(--surface-2)',
              boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
              border: 'none',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              transition: 'transform 0.15s ease',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div>
            <span style={{ display: 'block', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Outfit', 'Nunito', sans-serif", letterSpacing: '-0.3px', lineHeight: '1.2' }}>
              Contact & Support
            </span>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Raise a ticket or chat with support
            </span>
          </div>
        </div>

        <div className="support-grid">

          {/* FAQ Card (Left Side on desktop, last on mobile) */}
          <div className="faq-card-col" style={{ ...card }}>
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
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>Frequently Asked Questions</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '18px' }}>
              Instant answers to common queries. Browse our knowledge base for solutions.
            </p>

            {/* FAQ accordion */}
            <div style={{ flex: 1 }}>
              {faqs.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No FAQs yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {faqs.map(f => (
                    <div key={f.id} style={{ borderRadius: '16px', border: '1.5px solid #f0f1f5', overflow: 'hidden' }}>
                      <div 
                        onClick={() => setExpandedFaq(expandedFaq === f.id ? null : f.id)}
                        style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandedFaq === f.id ? '#f8f9ff' : '#fff', transition: 'background 0.2s' }}
                      >
                        <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>{f.question}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {userRole === 'MANAGER' && (
                            <>
                              <button onClick={e => { e.stopPropagation(); setFaqForm({ question: f.question, answer: f.answer }); setEditingFaq(f); setShowFaqForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                              </button>
                              <button onClick={e => { e.stopPropagation(); deleteFaq(f.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                              </button>
                            </>
                          )}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9999b0" strokeWidth="2.5" style={{ transform: expandedFaq === f.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>
                      {expandedFaq === f.id && (
                        <div style={{ padding: '0 18px 16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', background: '#f8f9ff', whiteSpace: 'pre-wrap' }}>
                          {f.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Chat + Tickets) — first on mobile */}
          <div className="chat-actions-col">
            
            {/* Live Chat Card */}
            <div className="chat-box-pad" style={{ ...card, textAlign: 'center' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#f0f0fa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>Live Support Chat</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '18px' }}>
                Chat with our team in real-time for immediate concerns.
              </p>
              <button
                onClick={() => (userRole === 'STUDENT' || userRole === 'ADMIN') ? setShowChatStart(true) : setView('chat')}
                style={{ background: 'linear-gradient(135deg, #3636e8, #5b5bf0)', color: '#fff', borderRadius: '50px', padding: '13px 28px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14.5px', fontWeight: '700', boxShadow: '0 4px 16px rgba(54,54,232,0.35)', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                {(userRole === 'STUDENT' || userRole === 'ADMIN') ? 'Start Live Chat' : 'Manage Live Chats'}
              </button>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Average response time: &lt; 2 minutes</p>
            </div>

            {/* Raise a Ticket Box (History merged inside) */}
            <div className="ticket-box-pad" style={{ width: '100%', borderRadius: '24px', background: '#f7f7ff', border: '1.5px solid #d9dcff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.03em', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Raise a Ticket
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Send a ticket for follow-up issues.
                  </div>
                </div>
                {(userRole === 'STUDENT' || userRole === 'ADMIN') ? (
                  <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ borderRadius: '50px', padding: '10px 20px' }}>+ New Ticket</button>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Review tickets below</div>
                )}
              </div>

              {/* History Section inside the box */}
              <div style={{ marginTop: '20px', borderTop: '1px solid #d9dcff', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>Recent History</h3>
                  <button onClick={() => { setSelected(null); setView('allTickets') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '12px', fontWeight: '700', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    View All →
                  </button>
                </div>

                {tickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '12px' }}>No tickets raised yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {tickets.slice(0, 5).map((t) => (
                      <div key={t.id} onClick={() => { setSelected(t); setView('allTickets') }}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--surface)', borderRadius: '16px', cursor: 'pointer', border: '1px solid #e8eaf0' }}
                      >
                        <TicketStatusIcon status={t.status} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{getRelativeTime(t.updatedAt, t.status)}</div>
                        </div>
                        <span style={{ ...pill(STATUS_COLORS[t.status]), fontSize: '10px', padding: '2px 8px' }}>{t.status.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {userRole === 'MANAGER' && (
              <button onClick={loadChatHistory} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px', alignSelf: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                View Chat History
              </button>
            )}
          </div>
        </div>

        {showCreate && (
          <CreateTicketModal 
            onClose={() => setShowCreate(false)} 
            form={form} 
            setForm={setForm} 
            classes={classes} 
            userRole={userRole} 
            submitTicket={submitTicket} 
          />
        )}
        {showFaqForm && (
          <FaqFormModal 
            onClose={() => { setShowFaqForm(false); setEditingFaq(null) }} 
            faqForm={faqForm} 
            setFaqForm={setFaqForm} 
            editingFaq={editingFaq} 
            saveFaq={saveFaq} 
          />
        )}
        {showChatStart && (
          <StartChatModal 
            onClose={() => setShowChatStart(false)} 
            value={chatInitText} 
            onChange={setChatInitText} 
            onSubmit={startChat} 
          />
        )}
        {selectedUserDetailsId && (
          <ManagerUserModal 
            userId={selectedUserDetailsId} 
            onClose={() => setSelectedUserDetailsId(null)} 
            onUpdate={loadTickets}
          />
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ALL TICKETS VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'allTickets') {
    return (
      <div className="page-container fade-in" style={{ maxHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>
        {confirmDialog}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <BackButton onClick={() => { if (isMobile && selected) { setSelected(null) } else { setView('home'); setSelected(null) } }} />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
            {(userRole === 'STUDENT' || userRole === 'ADMIN') && <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+ New Ticket</button>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (selected ? '1fr 1.3fr' : '1fr'), gap: '20px', flex: 1, minHeight: 0 }}>
          {/* Ticket list */}
          <div style={{ display: (isMobile && selected) ? 'none' : 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {tickets.length === 0 ? (
              <div className="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                <p style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>No tickets</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{(userRole === 'STUDENT' || userRole === 'ADMIN') ? 'Create a ticket to get help. If assigned tickets, they will appear here.' : 'No tickets have been raised.'}</p>
              </div>
            ) : tickets.map(t => (
              <div key={t.id} onClick={() => setSelected(selected?.id === t.id ? null : t)}
                style={{ padding: '14px 18px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s', ...neu, outline: selected?.id === t.id ? '2px solid #3636e8' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={pill(STATUS_COLORS[t.status])}>{t.status.replace('_', ' ')}</span>
                      <span style={pill(PRIORITY_COLORS[t.priority])}>{t.priority}</span>
                      {t.class && <span style={pill(t.class.color)}>{t.class.name}</span>}
                      {t.assignedTo && (
                        <span style={{ ...pill('var(--primary)'), display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          {t.assignedTo.name}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(t.updatedAt).toLocaleDateString('en-GB')}</span>
                    {userRole === 'MANAGER' && (
                      <button onClick={e => { e.stopPropagation(); deleteTicket(t.id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '2px', display: 'flex' }} title="Delete ticket">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  {t.replies.length} repl{t.replies.length !== 1 ? 'ies' : 'y'} · by <span 
                    onClick={(e) => {
                      if (userRole === 'MANAGER') {
                        e.stopPropagation()
                        setSelectedUserDetailsId(t.user.id)
                      }
                    }}
                    style={{ 
                      cursor: userRole === 'MANAGER' ? 'pointer' : 'default',
                      textDecoration: userRole === 'MANAGER' ? 'underline' : 'none',
                      color: userRole === 'MANAGER' ? 'var(--primary)' : 'inherit'
                    }}
                  >{t.user.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Ticket thread */}
          {selected && (
            <div style={{ borderRadius: '24px', ...neu, display: (isMobile && !selected) ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 200px)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1.5px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{selected.title}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span style={pill(STATUS_COLORS[selected.status])}>{selected.status.replace('_', ' ')}</span>
                      <span style={pill(PRIORITY_COLORS[selected.priority])}>{selected.priority}</span>
                      {selected.assignedTo && (
                        <span style={{ ...pill('var(--primary)'), display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          → {selected.assignedTo.name}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      )}
                      {selected.class && userRole === 'MANAGER' && <span style={pill(selected.class.color)}>📚 {selected.class.name}</span>}
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>

                {/* Manager controls */}
                {userRole === 'MANAGER' && (
                  <>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
                        <button key={s} onClick={() => updateStatus(selected.id, s)} style={{ padding: '4px 10px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: '700', background: selected.status === s ? STATUS_COLORS[s] : 'var(--surface-2)', color: selected.status === s ? '#fff' : 'var(--text-muted)', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff' }}>
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                    {admins.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', flexShrink: 0 }}>Assign to:</span>
                        <select
                          value={selected.assignedTo?.id || ''}
                          onChange={e => assignTicket(selected.id, e.target.value)}
                          style={{ flex: 1, padding: '6px 10px', borderRadius: '10px', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '12.5px', background: 'var(--surface-2)', boxShadow: '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff', color: 'var(--text-primary)', cursor: 'pointer' }}
                        >
                          <option value="">Unassigned</option>
                          {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    )}
                  </>
                )}


              </div>

              <div style={{ padding: '14px 20px', borderBottom: '1.5px solid rgba(0,0,0,0.05)', background: '#f0f1f5' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>
                  Original request — <span 
                    onClick={() => {
                      if (userRole === 'MANAGER') setSelectedUserDetailsId(selected.user.id)
                    }}
                    style={{ 
                      cursor: userRole === 'MANAGER' ? 'pointer' : 'default',
                      textDecoration: userRole === 'MANAGER' ? 'underline' : 'none',
                      color: userRole === 'MANAGER' ? 'var(--primary)' : 'inherit'
                    }}
                  >{selected.user.name}</span>
                </div>
                <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: '1.6' }}>{selected.description}</div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selected.replies.map((r, idx) => {
                  const isMe = r.sender.id === userId
                  const isAdmin = r.sender.role !== 'STUDENT'
                  const showAvatar = idx === 0 || selected.replies[idx - 1]?.sender.id !== r.sender.id
                  return (
                    <div key={r.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-start', marginBottom: showAvatar ? '8px' : '2px' }}>
                      {!isMe && (
                        <div 
                          onClick={() => userRole === 'MANAGER' && setSelectedUserDetailsId(r.sender.id)}
                          style={{ 
                            width: '28px', height: '28px', borderRadius: '50%', 
                            background: isAdmin ? 'var(--primary)' : 'var(--surface-2)', 
                            boxShadow: isAdmin ? '0 2px 8px rgba(54,54,232,0.2)' : '2px 2px 5px #c5c7cf', 
                            display: showAvatar ? 'flex' : 'none', 
                            alignItems: 'center', justifyContent: 'center', 
                            fontSize: '10px', fontWeight: '700', 
                            color: isAdmin ? '#fff' : 'var(--text-secondary)', flexShrink: 0,
                            cursor: userRole === 'MANAGER' ? 'pointer' : 'default'
                          }}
                        >
                          {r.sender.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {!isMe && !showAvatar && <div style={{ width: '28px', flexShrink: 0 }} />}
                      <div style={{ maxWidth: '78%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ 
                          padding: r.imageUrl ? '6px 6px 20px 6px' : '8px 12px 20px 12px', 
                          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', 
                          background: isMe ? '#dcf8c6' : isAdmin ? '#f0f0ff' : '#ffffff', 
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)', 
                          color: 'var(--text-primary)',
                          border: isMe ? 'none' : '1px solid #e8eaf0',
                          minWidth: '60px'
                        }}>
                          {!isMe && showAvatar && (
                            <div style={{ fontSize: '11px', fontWeight: '800', marginBottom: '4px', color: isAdmin ? 'var(--primary)' : '#888', textTransform: 'uppercase' }}>
                              <span 
                                onClick={() => {
                                  if (userRole === 'MANAGER') setSelectedUserDetailsId(r.sender.id)
                                }}
                                style={{ 
                                  cursor: userRole === 'MANAGER' ? 'pointer' : 'default',
                                  textDecoration: userRole === 'MANAGER' ? 'underline' : 'none'
                                }}
                              >{r.sender.name}</span>
                              {isAdmin && (
                                <span style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '3px',
                                  marginLeft: '6px',
                                  padding: '1px 6px',
                                  borderRadius: '50px',
                                  background: 'linear-gradient(135deg, #3636e8, #6366f1)',
                                  color: '#fff',
                                  fontSize: '9px',
                                  fontWeight: '800',
                                  textTransform: 'capitalize'
                                }}>
                                  {r.sender.role.toLowerCase()}
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </span>
                              )}
                            </div>
                          )}
                          {r.imageUrl && (
                            <img
                              src={r.imageUrl}
                              alt="Attached image"
                              onClick={() => setLightboxUrl(r.imageUrl!)}
                              style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '10px', cursor: 'pointer', display: 'block', objectFit: 'cover', marginBottom: r.content ? '6px' : '0' }}
                            />
                          )}
                          {r.content && <div style={{ fontSize: '13.5px', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.content}</div>}
                          
                          {/* Time inside bubble */}
                          <div style={{ position: 'absolute', bottom: '4px', right: '8px', fontSize: '10px', color: '#999', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMe && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={repliesEndRef} />
              </div>

              {selected.status !== 'CLOSED' && (
                <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.06)' }}>
                  {pendingReplyImagePreview && (
                    <div style={{ marginBottom: '10px', position: 'relative', display: 'inline-flex', alignItems: 'flex-end', gap: '8px', padding: '10px 14px', borderRadius: '16px', background: '#f0f0ff', border: '2px solid #3636e830', boxShadow: '0 4px 12px rgba(54,54,232,0.1)' }}>
                      <img src={pendingReplyImagePreview} alt="Preview" style={{ maxHeight: '80px', maxWidth: '160px', borderRadius: '10px', objectFit: 'cover' }} />
                      <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>📎 Ready to send</div>
                      <button onClick={clearReplyImage} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--danger)', color: '#fff', border: '2px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }}>✕</button>
                    </div>
                  )}
                  {uploadingImage && <div style={{ marginBottom: '6px', fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>Uploading...</div>}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" ref={replyImageRef} onChange={handleReplyImageSelect} style={{ display: 'none' }} />
                    <button onClick={() => replyImageRef.current?.click()} disabled={uploadingImage} title="Attach image" style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: pendingReplyImage ? '#3636e818' : 'var(--surface-2)', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: pendingReplyImage ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </button>
                    <input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()} placeholder="Type your reply..." disabled={uploadingImage} style={{ flex: 1, padding: '10px 16px', borderRadius: '50px', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '13.5px', ...neuInset, color: 'var(--text-primary)' }} />
                    <button onClick={sendReply} disabled={(!replyText.trim() && !pendingReplyImage) || uploadingImage} className="btn btn-primary btn-sm" style={{ borderRadius: '50px', padding: '10px 18px', opacity: (!replyText.trim() && !pendingReplyImage) || uploadingImage ? 0.6 : 1 }}>Send</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} form={form} setForm={setForm} classes={classes} userRole={userRole} submitTicket={submitTicket} />}
        {showChatStart && <StartChatModal onClose={() => setShowChatStart(false)} value={chatInitText} onChange={setChatInitText} onSubmit={startChat} />}
        {selectedUserDetailsId && (
          <ManagerUserModal 
            userId={selectedUserDetailsId} 
            onClose={() => setSelectedUserDetailsId(null)} 
            onUpdate={loadTickets}
          />
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHAT HISTORY VIEW (Manager only)
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'chatHistory') {
    return (
      <div className="page-container fade-in" style={{ maxHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>
        {confirmDialog}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <BackButton onClick={() => { if (isMobile && selectedHistory) { setSelectedHistory(null) } else { setView('home'); setSelectedHistory(null) } }} />
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>{historyChats.length} transcript{historyChats.length !== 1 ? 's' : ''}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (selectedHistory ? '320px 1fr' : '1fr'), gap: '20px', flex: 1, minHeight: 0 }}>
          {/* History list */}
          <div style={{ display: (isMobile && selectedHistory) ? 'none' : 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            {historyChats.length === 0 ? (
              <div className="empty-state">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                <p style={{ fontWeight: '700', marginTop: '10px' }}>No chat history</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Closed chat transcripts will appear here.</p>
              </div>
            ) : historyChats.map(c => (
              <div key={c.id}
                onClick={() => viewHistory(c)}
                style={{ padding: '14px 16px', borderRadius: '18px', cursor: 'pointer', ...neu, outline: selectedHistory?.id === c.id ? '2px solid #3636e8' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div 
                      onClick={(e) => {
                        if (userRole === 'MANAGER') {
                          e.stopPropagation()
                          setSelectedUserDetailsId(c.student.id)
                        }
                      }}
                      style={{ 
                        fontSize: '13.5px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '2px',
                        cursor: userRole === 'MANAGER' ? 'pointer' : 'default',
                        textDecoration: userRole === 'MANAGER' ? 'underline' : 'none'
                      }}
                    >{c.student.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {c.agent ? `Agent: ${c.agent.name}` : 'No agent joined'}
                      {c._count && ` · ${c._count.messages} messages`}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date((c as ChatSession & { updatedAt?: string }).updatedAt || '').toLocaleString()}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteHistory(c.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '2px', flexShrink: 0 }} title="Delete transcript">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Transcript viewer */}
          {selectedHistory && (
            <div style={{ borderRadius: '24px', ...neu, display: (isMobile && !selectedHistory) ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)' }}>Chat with {selectedHistory.student.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {selectedHistory.agent ? `Agent: ${selectedHistory.agent.name}` : 'No agent'} · Transcript
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={pill('var(--text-muted)')}>Closed</span>
                  <button onClick={() => { setSelectedHistory(null); setHistoryMsgs([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {historyMsgs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '20px' }}>No messages in this transcript.</div>
                ) : historyMsgs.map(m => {
                  const isStudent = m.sender.role === 'STUDENT'
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isStudent ? 'flex-start' : 'flex-end', gap: '8px', alignItems: 'flex-end' }}>
                      {isStudent && <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--surface-2)', boxShadow: '2px 2px 5px #c5c7cf', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', flexShrink: 0 }}>{m.sender.name.charAt(0)}</div>}
                      <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: isStudent ? '18px 18px 18px 4px' : '18px 18px 4px 18px', background: isStudent ? 'var(--surface-2)' : '#f0f0ff', boxShadow: '3px 3px 8px #c5c7cf, -3px -3px 8px #ffffff', color: 'var(--text-primary)' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '3px', color: isStudent ? 'var(--text-muted)' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {m.sender.name}
                          {!isStudent && (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '2px',
                              padding: '1px 5px',
                              borderRadius: '50px',
                              background: 'linear-gradient(135deg, #3636e8, #6366f1)',
                              color: '#fff',
                              fontSize: '8px',
                              fontWeight: '800',
                              textTransform: 'capitalize'
                            }}>
                              {m.sender.role.toLowerCase()}
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                          )}
                        </div>
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
      <style>{`
        .msg-row:hover .msg-actions { opacity: 1 !important; }
      `}</style>
      {confirmDialog}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton onClick={() => { if (isMobile && activeChatId) { setActiveChatId(null) } else { setView('home'); setActiveChatId(null) } }} />
        {userRole === 'STUDENT' && (
          <button onClick={() => setShowChatStart(true)} className="btn btn-primary btn-sm" style={{ borderRadius: '50px' }}>+ New Chat</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (allChats.length > 0 || userRole !== 'STUDENT' ? '280px 1fr' : '1fr'), gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Chat list */}
        <div style={{ display: (isMobile && activeChatId) ? 'none' : 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>
            {allChats.length} chat{allChats.length !== 1 ? 's' : ''}
          </div>
          {allChats.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              <p style={{ fontWeight: '700', marginTop: '10px' }}>No active chats</p>
              {userRole === 'STUDENT' && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Click "+ New Chat" to start.</p>}
            </div>
          ) : allChats.map(c => {
            const expiresAt = c.expiresAt ? new Date(c.expiresAt) : null
            const msLeft = expiresAt ? expiresAt.getTime() - Date.now() : null
            const hoursLeft = msLeft ? Math.max(0, Math.floor(msLeft / 3600000)) : null
            return (
              <div key={c.id} onClick={() => setActiveChatId(c.id)}
                style={{ padding: '12px 16px', borderRadius: '18px', cursor: 'pointer', ...neu, outline: activeChatId === c.id ? '2px solid #3636e8' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                    {userRole === 'STUDENT' ? 'Support Chat' : c.student.name}
                  </span>
                  <span style={pill(c.status === 'WAITING' ? 'var(--warning)' : 'var(--success)')}>{c.status}</span>
                </div>
                {hoursLeft !== null && (
                  <div style={{ fontSize: '11px', color: hoursLeft < 2 ? 'var(--danger)' : 'var(--text-muted)', marginBottom: '6px' }}>
                    Expires in {hoursLeft}h
                  </div>
                )}
                {userRole !== 'STUDENT' && c.status === 'WAITING' && (
                  <button onClick={e => { e.stopPropagation(); joinChat(c.id) }} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', borderRadius: '50px', marginTop: '4px' }}>
                    Join Chat
                  </button>
                )}
                {(userRole === 'MANAGER' || (userRole !== 'STUDENT' && c.status === 'ACTIVE')) && (
                  <button onClick={e => { e.stopPropagation(); closeChat(c.id) }} style={{ width: '100%', marginTop: '4px', padding: '4px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'inherit' }}>
                    Close chat
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Chat window */}
        <div style={{ borderRadius: '24px', ...neu, display: (isMobile && !activeChatId) ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!activeChatId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--surface-2)', boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>Live Support Chat</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                {userRole === 'STUDENT' ? 'Select a chat or start a new one.' : 'Select a chat from the list to respond.'}
              </p>
            </div>
          ) : (() => {
            const activeChat = allChats.find(c => c.id === activeChatId)
            return (
              <>
                <div style={{ padding: '14px 20px', borderBottom: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)' }}>
                      {userRole === 'STUDENT' ? 'Support Chat' : activeChat?.student.name || 'Chat'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {activeChat?.agent ? `Agent: ${activeChat.agent.name}` : 'Waiting for an agent...'}
                      {activeChat?.expiresAt && ` · Expires ${new Date(activeChat.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={pill('var(--success)')}>Active</span>
                    <button onClick={() => setActiveChatId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {chatMsgs.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '20px' }}>Chat started. Waiting for messages...</div>
                  )}
                  {chatMsgs.map((m, idx) => {
                    const isMe = m.sender.id === userId
                    const isAdmin = m.sender.role !== 'STUDENT'
                    const showAvatar = idx === 0 || chatMsgs[idx - 1]?.sender.id !== m.sender.id
                    return (
                      <div key={m.id} className="msg-row" style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end', marginBottom: showAvatar ? '6px' : '1px' }}>
                        {!isMe && (
                          <div style={{ 
                            width: '28px', height: '28px', borderRadius: '50%', 
                            background: isAdmin ? 'var(--primary)' : 'var(--surface-2)', 
                            boxShadow: isAdmin ? '0 2px 8px rgba(54,54,232,0.2)' : '2px 2px 5px #c5c7cf', 
                            display: showAvatar ? 'flex' : 'none', 
                            alignItems: 'center', justifyContent: 'center', 
                            fontSize: '10px', fontWeight: '700', 
                            color: isAdmin ? '#fff' : 'var(--text-secondary)', flexShrink: 0 
                          }}>
                            {m.sender.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {!isMe && !showAvatar && <div style={{ width: '28px', flexShrink: 0 }} />}
                        <div style={{ maxWidth: '75%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                          <div style={{ 
                            padding: m.imageUrl ? '5px 5px 15px 5px' : '7px 12px 15px 12px', 
                            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', 
                            background: isMe ? '#dcf8c6' : isAdmin ? '#f0f0ff' : '#ffffff', 
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)', 
                            color: 'var(--text-primary)',
                            border: isMe ? 'none' : '1px solid #e8eaf0',
                            minWidth: '60px'
                          }}>
                            {!isMe && showAvatar && (
                              <div style={{ fontSize: '11px', fontWeight: '800', marginBottom: '4px', color: isAdmin ? 'var(--primary)' : '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {m.sender.name}
                                {isAdmin && (
                                  <span style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '3px',
                                    padding: '1px 6px',
                                    borderRadius: '50px',
                                    background: 'linear-gradient(135deg, #3636e8, #6366f1)',
                                    color: '#fff',
                                    fontSize: '9px',
                                    fontWeight: '800',
                                    textTransform: 'capitalize'
                                  }}>
                                    {m.sender.role.toLowerCase()}
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  </span>
                                )}
                              </div>
                            )}
                            {m.imageUrl && (
                              <img
                                src={m.imageUrl}
                                alt="Shared image"
                                onClick={() => setLightboxUrl(m.imageUrl!)}
                                style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '10px', cursor: 'pointer', display: 'block', objectFit: 'cover', marginBottom: m.content ? '6px' : '0' }}
                              />
                            )}
                            {m.content && <div style={{ fontSize: '13.5px', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>}
                            
                            {/* Time inside bubble */}
                            <div style={{ position: 'absolute', bottom: '2px', right: '8px', fontSize: '10px', color: '#999', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isMe && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.06)' }}>
                  {pendingChatImagePreview && (
                    <div style={{ marginBottom: '10px', position: 'relative', display: 'inline-flex', alignItems: 'flex-end', gap: '8px', padding: '10px 14px', borderRadius: '16px', background: '#f0f0ff', border: '2px solid #3636e830', boxShadow: '0 4px 12px rgba(54,54,232,0.1)' }}>
                      <img src={pendingChatImagePreview} alt="Preview" style={{ maxHeight: '80px', maxWidth: '160px', borderRadius: '10px', objectFit: 'cover' }} />
                      <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>📎 Ready to send</div>
                      <button onClick={clearChatImage} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--danger)', color: '#fff', border: '2px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }}>✕</button>
                    </div>
                  )}
                  {uploadingImage && <div style={{ marginBottom: '6px', fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>Uploading...</div>}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" ref={chatImageRef} onChange={handleChatImageSelect} style={{ display: 'none' }} />
                    <button onClick={() => chatImageRef.current?.click()} disabled={uploadingImage} title="Attach image" style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: pendingChatImage ? '#3636e818' : 'var(--surface-2)', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: pendingChatImage ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </button>
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMsg()} placeholder="Type a message..." disabled={uploadingImage} style={{ flex: 1, padding: '10px 16px', borderRadius: '50px', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '13.5px', ...neuInset, color: 'var(--text-primary)' }} />
                    <button onClick={sendChatMsg} disabled={(!chatInput.trim() && !pendingChatImage) || uploadingImage} className="btn btn-primary" style={{ borderRadius: pendingChatImage ? '50px' : '50%', padding: pendingChatImage ? '10px 20px' : '10px 13px', opacity: (!chatInput.trim() && !pendingChatImage) || uploadingImage ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {pendingChatImage && <span style={{ fontWeight: '700', fontSize: '13px' }}>Send</span>}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      </div>
      {showChatStart && (
        <StartChatModal 
          onClose={() => setShowChatStart(false)} 
          value={chatInitText} 
          onChange={setChatInitText} 
          onSubmit={startChat} 
        />
      )}

      {/* Lightbox for full-size image viewing */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: '40px',
          }}
        >
          <img
            src={lightboxUrl}
            alt="Full size"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', cursor: 'default' }}
          />
          <button
            onClick={async (e) => { e.stopPropagation(); try { const res = await fetch(lightboxUrl!); const blob = await res.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `chat-image-${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href); } catch { window.open(lightboxUrl!, '_blank') } }}
            title="Download image"
            style={{
              position: 'absolute', top: '20px', right: '72px',
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button
            onClick={() => setLightboxUrl(null)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', fontSize: '20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>
      )}
    </div>
  )
}
