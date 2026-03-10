'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

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
  student: { id: string; name: string }
  agent?: { id: string; name: string; role: string }
}

interface ClassItem { id: string; name: string; color: string }

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  RESOLVED: '#10b981',
  CLOSED: '#9999b0',
}
const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
}

function pill(bg: string, color = '#fff') {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '3px 12px', borderRadius: '50px',
    background: bg + '22', color: bg,
    fontSize: '11.5px', fontWeight: '700',
  } as React.CSSProperties
}

export default function SupportPage() {
  const [tab, setTab] = useState<'tickets' | 'live'>('tickets')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [replyText, setReplyText] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'GENERAL', classId: '', priority: 'MEDIUM' })
  const [userRole, setUserRole] = useState('STUDENT')
  const [userId, setUserId] = useState('')

  // Live Chat
  const [chatSession, setChatSession] = useState<ChatSession | null>(null)
  const [allChats, setAllChats] = useState<ChatSession[]>([])
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const repliesEndRef = useRef<HTMLDivElement>(null)

  const loadTickets = useCallback(async () => {
    const [tr, cr] = await Promise.all([
      fetch('/api/support/tickets').then(r => r.json()),
      fetch('/api/classes').then(r => r.json()),
    ])
    setTickets(tr)
    setClasses((cr.classes || cr || []).map((c: ClassItem) => ({ id: c.id, name: c.name, color: c.color })))
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUserRole(d.user?.role || 'STUDENT')
      setUserId(d.user?.id || '')
    })
    loadTickets()
  }, [loadTickets])

  // Poll chat messages
  useEffect(() => {
    if (!activeChatId) return
    const poll = () => fetch(`/api/support/live-chats/${activeChatId}/messages`)
      .then(r => r.json()).then(setChatMsgs)
    poll()
    const t = setInterval(poll, 3000)
    return () => clearInterval(t)
  }, [activeChatId])

  // Poll chats list for admin/manager
  useEffect(() => {
    if (tab !== 'live') return
    const poll = () => {
      if (userRole === 'STUDENT') {
        fetch('/api/support/live-chats').then(r => r.json()).then((data: ChatSession[]) => {
          if (data.length > 0) {
            setChatSession(data[0])
            setActiveChatId(data[0].id)
          }
        })
      } else {
        fetch('/api/support/live-chats').then(r => r.json()).then(setAllChats)
      }
    }
    poll()
    const t = setInterval(poll, 4000)
    return () => clearInterval(t)
  }, [tab, userRole])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs])
  useEffect(() => { repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [selected?.replies])

  async function submitTicket() {
    if (!form.title.trim() || !form.description.trim()) return
    await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowCreate(false)
    setForm({ title: '', description: '', type: 'GENERAL', classId: '', priority: 'MEDIUM' })
    loadTickets()
  }

  async function sendReply() {
    if (!replyText.trim() || !selected) return
    await fetch(`/api/support/tickets/${selected.id}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: replyText }),
    })
    setReplyText('')
    const fresh = await fetch('/api/support/tickets').then(r => r.json())
    setTickets(fresh)
    setSelected(fresh.find((t: Ticket) => t.id === selected.id) || null)
  }

  async function updateStatus(ticketId: string, status: string) {
    await fetch(`/api/support/tickets/${ticketId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadTickets()
    if (selected?.id === ticketId) setSelected(prev => prev ? { ...prev, status } : null)
  }

  async function startChat() {
    const chat = await fetch('/api/support/live-chats', { method: 'POST' }).then(r => r.json())
    setChatSession(chat)
    setActiveChatId(chat.id)
  }

  async function joinChat(chatId: string) {
    await fetch(`/api/support/live-chats/${chatId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join' }),
    })
    setActiveChatId(chatId)
    setAllChats(prev => prev.map(c => c.id === chatId ? { ...c, status: 'ACTIVE' } : c))
  }

  async function sendChatMsg() {
    if (!chatInput.trim() || !activeChatId) return
    await fetch(`/api/support/live-chats/${activeChatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: chatInput }),
    })
    setChatInput('')
  }

  const neu = { background: '#e8eaf0', boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff' }
  const neuInset = { background: '#e8eaf0', boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #ffffff' }

  return (
    <div className="page-container fade-in" style={{ maxHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>

      {/* Page Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { key: 'tickets', label: 'Support Tickets', icon: '🎫' },
          { key: 'live', label: 'Live Chat', icon: '💬' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as 'tickets' | 'live')} style={{
            padding: '10px 22px', borderRadius: '50px', border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700',
            transition: 'all 0.2s ease',
            background: tab === t.key ? '#3636e8' : '#e8eaf0',
            color: tab === t.key ? '#fff' : '#6b6b8a',
            boxShadow: tab === t.key
              ? '4px 4px 10px rgba(54,54,232,0.35), -2px -2px 6px rgba(255,255,255,0.7)'
              : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TICKETS TAB ── */}
      {tab === 'tickets' && (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.3fr' : '1fr', gap: '20px', flex: 1, minHeight: 0 }}>

          {/* Ticket list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#9999b0', fontWeight: '600' }}>
                {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
              </span>
              {userRole === 'STUDENT' && (
                <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">
                  + New Ticket
                </button>
              )}
            </div>

            {tickets.length === 0 ? (
              <div className="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <p style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>No tickets yet</p>
                <p style={{ fontSize: '13px', color: '#9999b0' }}>
                  {userRole === 'STUDENT' ? 'Create a ticket to get help.' : 'No tickets have been raised.'}
                </p>
              </div>
            ) : tickets.map(t => (
              <div key={t.id}
                onClick={() => setSelected(selected?.id === t.id ? null : t)}
                style={{
                  padding: '14px 18px', borderRadius: '20px', cursor: 'pointer',
                  transition: 'all 0.2s', ...neu,
                  outline: selected?.id === t.id ? '2px solid #3636e8' : 'none',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#1e1e3a', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={pill(STATUS_COLORS[t.status])}>{t.status}</span>
                      <span style={pill(PRIORITY_COLORS[t.priority])}>{t.priority}</span>
                      {t.class && <span style={pill(t.class.color)}>{t.class.name}</span>}
                      {t.type === 'GENERAL' && <span style={pill('#9999b0')}>General</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9999b0', flexShrink: 0, marginTop: '2px' }}>
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#9999b0', marginTop: '6px' }}>
                  {t.replies.length} repl{t.replies.length !== 1 ? 'ies' : 'y'} · by {t.user.name}
                </div>
              </div>
            ))}
          </div>

          {/* Ticket thread panel */}
          {selected && (
            <div style={{ borderRadius: '24px', ...neu, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 'calc(100vh - 200px)' }}>
              {/* Thread header */}
              <div style={{ padding: '16px 20px', borderBottom: '1.5px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>{selected.title}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span style={pill(STATUS_COLORS[selected.status])}>{selected.status}</span>
                      <span style={pill(PRIORITY_COLORS[selected.priority])}>{selected.priority}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9999b0' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                {userRole !== 'STUDENT' && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                    {['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s => (
                      <button key={s} onClick={() => updateStatus(selected.id, s)} style={{
                        padding: '4px 10px', borderRadius: '50px', border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: '11px', fontWeight: '700',
                        background: selected.status === s ? STATUS_COLORS[s] : '#e8eaf0',
                        color: selected.status === s ? '#fff' : '#9999b0',
                        boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                      }}>{s}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Original message */}
              <div style={{ padding: '14px 20px', borderBottom: '1.5px solid rgba(0,0,0,0.05)', background: '#f0f1f5' }}>
                <div style={{ fontSize: '12px', color: '#9999b0', marginBottom: '4px', fontWeight: '600' }}>Original request — {selected.user.name}</div>
                <div style={{ fontSize: '13.5px', color: '#1e1e3a', lineHeight: '1.6' }}>{selected.description}</div>
              </div>

              {/* Replies */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selected.replies.map(r => {
                  const isMe = r.sender.id === userId
                  const isAdmin = r.sender.role !== 'STUDENT'
                  return (
                    <div key={r.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '78%', padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMe ? '#3636e8' : isAdmin ? '#f0f0ff' : '#e8eaf0',
                        boxShadow: isMe
                          ? '3px 3px 8px rgba(54,54,232,0.3)'
                          : '3px 3px 8px #c5c7cf, -3px -3px 8px #ffffff',
                        color: isMe ? '#fff' : '#1e1e3a',
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '4px', opacity: isMe ? 0.8 : 1, color: isMe ? '#c5c8ff' : isAdmin ? '#3636e8' : '#9999b0' }}>
                          {r.sender.name} {isAdmin && '· Staff'}
                        </div>
                        <div style={{ fontSize: '13.5px', lineHeight: '1.5' }}>{r.content}</div>
                        <div style={{ fontSize: '10.5px', marginTop: '4px', opacity: 0.6, textAlign: 'right' }}>
                          {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={repliesEndRef} />
              </div>

              {/* Reply input */}
              {selected.status !== 'CLOSED' && (
                <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', gap: '8px' }}>
                  <input
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                    placeholder="Type your reply..."
                    style={{ flex: 1, padding: '10px 16px', borderRadius: '50px', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '13.5px', ...neuInset, color: '#1e1e3a' }}
                  />
                  <button onClick={sendReply} className="btn btn-primary btn-sm" style={{ borderRadius: '50px', padding: '10px 18px' }}>Send</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── LIVE CHAT TAB ── */}
      {tab === 'live' && (
        <div style={{ display: 'grid', gridTemplateColumns: userRole !== 'STUDENT' && !activeChatId ? '1fr' : userRole !== 'STUDENT' ? '280px 1fr' : '1fr', gap: '20px', flex: 1, minHeight: 0 }}>

          {/* Agent: chat list */}
          {userRole !== 'STUDENT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
              <div style={{ fontSize: '13px', color: '#9999b0', fontWeight: '600', marginBottom: '4px' }}>
                {allChats.length} active chat{allChats.length !== 1 ? 's' : ''}
              </div>
              {allChats.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  <p style={{ fontWeight: '700', marginTop: '10px' }}>No active chats</p>
                </div>
              ) : allChats.map(c => (
                <div key={c.id}
                  onClick={() => { setActiveChatId(c.id); setAllChats(prev => prev) }}
                  style={{ padding: '12px 16px', borderRadius: '18px', cursor: 'pointer', ...neu, outline: activeChatId === c.id ? '2px solid #3636e8' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e1e3a' }}>{c.student.name}</span>
                    <span style={pill(c.status === 'WAITING' ? '#f59e0b' : '#10b981')}>{c.status}</span>
                  </div>
                  {c.status === 'WAITING' && (
                    <button onClick={e => { e.stopPropagation(); joinChat(c.id) }} className="btn btn-primary btn-sm" style={{ marginTop: '8px', width: '100%', justifyContent: 'center', borderRadius: '50px' }}>
                      Join Chat
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Chat window */}
          <div style={{ borderRadius: '24px', ...neu, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!activeChatId ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e8eaf0', boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
                <p style={{ fontSize: '16px', fontWeight: '800', color: '#1e1e3a' }}>Live Support Chat</p>
                <p style={{ fontSize: '13px', color: '#9999b0', textAlign: 'center' }}>
                  Start a real-time conversation with our support team. Any available admin or manager will join.
                </p>
                {userRole === 'STUDENT' && (
                  <button onClick={startChat} className="btn btn-primary" style={{ borderRadius: '50px', padding: '12px 28px' }}>
                    Start Chat
                  </button>
                )}
                {userRole !== 'STUDENT' && (
                  <p style={{ fontSize: '13px', color: '#9999b0' }}>Select a chat from the left to respond.</p>
                )}
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div style={{ padding: '14px 20px', borderBottom: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: '#1e1e3a' }}>
                      {userRole === 'STUDENT' ? 'Support Chat' : (allChats.find(c => c.id === activeChatId)?.student.name || 'Chat')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9999b0', marginTop: '2px' }}>
                      {allChats.find(c => c.id === activeChatId)?.agent
                        ? `Agent: ${allChats.find(c => c.id === activeChatId)?.agent?.name}`
                        : chatSession?.agent ? `Agent: ${chatSession.agent.name}` : 'Waiting for an agent...'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={pill('#10b981')}>Active</span>
                    <button onClick={() => setActiveChatId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9999b0' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {chatMsgs.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#9999b0', fontSize: '13px', marginTop: '20px' }}>
                      Chat started. Waiting for messages...
                    </div>
                  )}
                  {chatMsgs.map(m => {
                    const isMe = m.sender.id === userId
                    const isAdmin = m.sender.role !== 'STUDENT'
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end' }}>
                        {!isMe && (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isAdmin ? '#3636e8' : '#e8eaf0', boxShadow: '2px 2px 5px #c5c7cf', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: isAdmin ? '#fff' : '#6b6b8a', flexShrink: 0 }}>
                            {m.sender.name.charAt(0)}
                          </div>
                        )}
                        <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? '#3636e8' : isAdmin ? '#f0f0ff' : '#e8eaf0', boxShadow: isMe ? '3px 3px 8px rgba(54,54,232,0.3)' : '3px 3px 8px #c5c7cf, -3px -3px 8px #ffffff', color: isMe ? '#fff' : '#1e1e3a' }}>
                          {!isMe && <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '3px', color: isAdmin ? '#3636e8' : '#9999b0' }}>{m.sender.name}</div>}
                          <div style={{ fontSize: '13.5px', lineHeight: '1.5' }}>{m.content}</div>
                          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6, textAlign: 'right' }}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', gap: '8px' }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChatMsg()}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '10px 16px', borderRadius: '50px', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '13.5px', ...neuInset, color: '#1e1e3a' }}
                  />
                  <button onClick={sendChatMsg} className="btn btn-primary" style={{ borderRadius: '50%', padding: '10px 13px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Raise a Support Ticket</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9999b0' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Issue Type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['GENERAL', 'SUBJECT'].map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                      flex: 1, padding: '10px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '13px', fontWeight: '700',
                      background: form.type === t ? '#3636e8' : '#e8eaf0',
                      color: form.type === t ? '#fff' : '#6b6b8a',
                      boxShadow: form.type === t ? '4px 4px 10px rgba(54,54,232,0.3)' : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                    }}>
                      {t === 'GENERAL' ? '📋 General Support' : '📚 Subject Related'}
                    </button>
                  ))}
                </div>
              </div>
              {form.type === 'SUBJECT' && (
                <div className="form-group">
                  <label className="form-label">Select Subject</label>
                  <select className="form-input" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                    <option value="">Choose a subject...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief description of the issue" />
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-input" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Explain your issue in detail..." style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['LOW','MEDIUM','HIGH'].map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))} style={{
                      flex: 1, padding: '8px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '12px', fontWeight: '700',
                      background: form.priority === p ? PRIORITY_COLORS[p] : '#e8eaf0',
                      color: form.priority === p ? '#fff' : '#6b6b8a',
                      boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                    }}>{p}</button>
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
      )}
    </div>
  )
}
