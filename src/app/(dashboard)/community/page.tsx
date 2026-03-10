'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

interface ClassItem {
  id: string
  name: string
  color: string
  subject?: string
  icon?: string
  _count?: { lectures: number }
}

interface CommMsg {
  id: string
  content: string
  createdAt: string
  sender: {
    id: string
    name: string
    role: string
    securityNumber?: string
  }
}

export default function CommunityPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)
  const [messages, setMessages] = useState<CommMsg[]>([])
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState('')
  const [userRole, setUserRole] = useState('STUDENT')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async (classId: string) => {
    const data = await fetch(`/api/community/${classId}/messages`).then(r => r.json())
    setMessages(data)
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUserRole(d.user?.role || 'STUDENT')
      setUserId(d.user?.id || '')
    })
    fetch('/api/classes').then(r => r.json()).then(data => {
      const list = data.classes || data || []
      setClasses(list)
      if (list.length > 0) setSelectedClass(list[0])
    })
  }, [])

  // Poll messages when a class is selected
  useEffect(() => {
    if (!selectedClass) return
    loadMessages(selectedClass.id)
    const t = setInterval(() => loadMessages(selectedClass.id), 4000)
    return () => clearInterval(t)
  }, [selectedClass, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || !selectedClass) return
    const optimistic: CommMsg = {
      id: 'temp-' + Date.now(),
      content: input,
      createdAt: new Date().toISOString(),
      sender: { id: userId, name: 'You', role: userRole },
    }
    setMessages(prev => [...prev, optimistic])
    setInput('')

    await fetch(`/api/community/${selectedClass.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: optimistic.content }),
    })
    loadMessages(selectedClass.id)
  }

  const neu = { background: '#e8eaf0', boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff' }
  const neuInset = { background: '#e8eaf0', boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #ffffff' }

  return (
    <div className="page-container fade-in" style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>

      {/* Left: Class list */}
      <div style={{ width: '230px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        <div style={{ fontSize: '12px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px', padding: '0 4px' }}>
          Communities
        </div>
        {classes.map(cls => (
          <button
            key={cls.id}
            onClick={() => setSelectedClass(cls)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '18px', border: 'none',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              transition: 'all 0.2s',
              background: selectedClass?.id === cls.id ? cls.color : '#e8eaf0',
              color: selectedClass?.id === cls.id ? '#fff' : '#1e1e3a',
              boxShadow: selectedClass?.id === cls.id
                ? `5px 5px 12px ${cls.color}55, -3px -3px 8px rgba(255,255,255,0.6)`
                : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
            }}
          >
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
              background: selectedClass?.id === cls.id ? 'rgba(255,255,255,0.25)' : cls.color + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '800',
              color: selectedClass?.id === cls.id ? '#fff' : cls.color,
            }}>
              {cls.name.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cls.name}
              </div>
              {cls.subject && (
                <div style={{ fontSize: '11px', opacity: selectedClass?.id === cls.id ? 0.8 : 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cls.subject}
                </div>
              )}
            </div>
          </button>
        ))}

        {classes.length === 0 && (
          <div style={{ color: '#9999b0', fontSize: '13px', textAlign: 'center', padding: '20px 10px' }}>
            No classes available
          </div>
        )}
      </div>

      {/* Right: Chat area */}
      <div style={{ flex: 1, borderRadius: '24px', ...neu, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {!selectedClass ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#9999b0' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <p style={{ fontWeight: '700' }}>Select a community</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '16px 22px', borderBottom: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: selectedClass.color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: '800', color: selectedClass.color,
              }}>
                {selectedClass.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '16px', color: '#1e1e3a' }}>{selectedClass.name}</div>
                {selectedClass.subject && (
                  <div style={{ fontSize: '12px', color: '#9999b0' }}>{selectedClass.subject} · Community Chat</div>
                )}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{
                  padding: '4px 14px', borderRadius: '50px',
                  background: selectedClass.color + '18', color: selectedClass.color,
                  fontSize: '12px', fontWeight: '700',
                }}>
                  {messages.length} message{messages.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9999b0' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  <p style={{ marginTop: '12px', fontWeight: '700' }}>No messages yet</p>
                  <p style={{ fontSize: '13px', marginTop: '4px' }}>Be the first to say something!</p>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isMe = msg.sender.id === userId
                const isAdmin = msg.sender.role !== 'STUDENT'
                const showAvatar = idx === 0 || messages[idx - 1]?.sender.id !== msg.sender.id

                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '10px', alignItems: 'flex-end' }}>
                    {/* Avatar */}
                    {!isMe && (
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                        background: isAdmin ? '#3636e8' : '#e8eaf0',
                        boxShadow: isAdmin ? 'none' : '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                        display: showAvatar ? 'flex' : 'none',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: '800',
                        color: isAdmin ? '#fff' : '#6b6b8a',
                      }}>
                        {msg.sender.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {!isMe && !showAvatar && <div style={{ width: '32px', flexShrink: 0 }} />}

                    <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      {showAvatar && !isMe && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', paddingLeft: '2px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: isAdmin ? '#3636e8' : '#6b6b8a' }}>
                            {msg.sender.name}
                          </span>
                          {isAdmin && (
                            <span style={{ fontSize: '10px', background: '#3636e8', color: '#fff', padding: '1px 6px', borderRadius: '50px', fontWeight: '700' }}>
                              {msg.sender.role.charAt(0) + msg.sender.role.slice(1).toLowerCase()}
                            </span>
                          )}
                          {/* Manager sees security number */}
                          {userRole === 'MANAGER' && msg.sender.securityNumber && (
                            <span style={{ fontSize: '10px', background: '#f59e0b22', color: '#f59e0b', padding: '1px 7px', borderRadius: '50px', fontWeight: '700' }}>
                              {msg.sender.securityNumber}
                            </span>
                          )}
                        </div>
                      )}
                      <div style={{
                        padding: '10px 16px',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMe ? '#3636e8' : isAdmin ? '#f0f0ff' : '#e8eaf0',
                        color: isMe ? '#fff' : '#1e1e3a',
                        fontSize: '14px', lineHeight: '1.5',
                        boxShadow: isMe
                          ? '4px 4px 10px rgba(54,54,232,0.25)'
                          : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                      }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#9999b0', padding: '0 4px' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={`Message ${selectedClass.name} community...`}
                  style={{
                    width: '100%', padding: '11px 16px', borderRadius: '50px',
                    border: 'none', outline: 'none',
                    fontFamily: 'inherit', fontSize: '14px',
                    ...neuInset, color: '#1e1e3a',
                  }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                style={{
                  width: '44px', height: '44px', borderRadius: '50%', border: 'none',
                  cursor: input.trim() ? 'pointer' : 'default',
                  background: input.trim() ? selectedClass.color : '#e8eaf0',
                  color: input.trim() ? '#fff' : '#9999b0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: input.trim()
                    ? `4px 4px 10px ${selectedClass.color}55`
                    : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                  transition: 'all 0.2s',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
