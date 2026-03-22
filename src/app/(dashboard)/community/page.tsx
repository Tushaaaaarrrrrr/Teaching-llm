'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Send, Image as ImageIcon, Smile } from 'lucide-react'
import CreatePostModal from '@/components/CreatePostModal'

interface ClassItem {
  id: string
  name: string
  color: string
  subject?: string
  icon?: string
  isCommunityActive?: boolean
  _count?: { lectures: number }
}

interface CommMsg {
  id: string
  content: string
  createdAt: string
  isDeleted?: boolean
  deletedAt?: string | null
  sender: {
    id: string
    name: string
    role: string
    securityNumber?: string
  }
}

function CommunityContent() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)
  const [messages, setMessages] = useState<CommMsg[]>([])
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [userRole, setUserRole] = useState('STUDENT')
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [modifying, setModifying] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showToggleConfirm, setShowToggleConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async (classId: string) => {
    try {
      const res = await fetch(`/api/community/${classId}/messages`)
      const data = await res.json()
      if (res.status === 403 && data.isCommunityActive === false && userRole === 'STUDENT') {
        setMessages([])
        return
      }
      if (res.ok) {
        setMessages(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [userRole])

  const searchParams = useSearchParams()
  const targetId = searchParams.get('id')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUserRole(d.user?.role || 'STUDENT')
      setUserId(d.user?.id || '')
      setUserName(d.user?.name || '')
      setUserAvatar(d.user?.avatar || null)
    })

    fetch('/api/classes').then(r => r.json()).then(data => {
      const list = data.classes || data || []
      setClasses(list)
      if (list.length > 0) {
        const found = list.find((c: any) => c.id === targetId)
        setSelectedClass(found || list[0])
      }
    })
  }, [targetId])

  // Poll messages when a class is selected
  useEffect(() => {
    if (!selectedClass) return
    loadMessages(selectedClass.id)
    const t = setInterval(() => loadMessages(selectedClass.id), 4000)
    return () => clearInterval(t)
  }, [selectedClass, loadMessages])

  useEffect(() => {
    fetch('/api/users/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'community' }),
    }).catch(() => {})
  }, [selectedClass?.id])

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

  async function toggleCommunity() {
    if (!selectedClass || modifying) return
    setModifying(true)
    const newValue = !selectedClass.isCommunityActive
    try {
      const res = await fetch(`/api/courses/${selectedClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCommunityActive: newValue }),
      })
      if (res.ok) {
        const updated = { ...selectedClass, isCommunityActive: newValue }
        setSelectedClass(updated)
        setClasses(prev => prev.map(c => c.id === selectedClass.id ? updated : c))
        setShowToggleConfirm(false)
      }
    } catch (e) {
      console.error(e)
    }
    setModifying(false)
  }

  async function clearMessages() {
    if (!selectedClass || modifying) return
    setModifying(true)
    try {
      const res = await fetch(`/api/community/${selectedClass.id}/clear`, {
        method: 'POST',
      })
      if (res.ok) {
        setMessages([])
        setShowClearConfirm(false)
      }
    } catch (e) {
      console.error(e)
    }
    setModifying(false)
  }

  async function deleteMessage(messageId: string) {
    if (!selectedClass || deletingId) return
    if (!confirm('Delete this message? It will be removed from the chat.')) return
    setDeletingId(messageId)
    try {
      const res = await fetch(`/api/community/${selectedClass.id}/messages`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      })
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isDeleted: true, content: '' } : m))
      }
    } catch (e) {
      console.error(e)
    }
    setDeletingId(null)
  }

  const neu = { background: '#e8eaf0', boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff' }
  const neuInset = { background: '#e8eaf0', boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #ffffff' }
  const neuSmall = { background: '#e8eaf0', boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff' }

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
                {!selectedClass.isCommunityActive && (
                  <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                    ● Community Hidden from Students
                  </div>
                )}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                {userRole === 'MANAGER' && (
                  <>
                    <button
                      onClick={() => window.location.href = `/chat-transcripts?courseId=${selectedClass.id}`}
                      title="View Full Transcript"
                      style={{
                        padding: '8px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: '#e8eaf0', color: '#3636e8', fontSize: '12px', fontWeight: '700',
                        display: 'flex', alignItems: 'center', gap: '6px', ...neuSmall,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      Transcript
                    </button>
                    <button
                      onClick={() => setShowToggleConfirm(true)}
                      title={selectedClass.isCommunityActive ? "Hide from Students" : "Show to Students"}
                      style={{
                        padding: '8px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: '#e8eaf0', color: selectedClass.isCommunityActive ? '#1e1e3a' : '#ef4444', fontSize: '12px', fontWeight: '700',
                        display: 'flex', alignItems: 'center', gap: '6px', ...neuSmall,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        {selectedClass.isCommunityActive ? (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </>
                        ) : (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                          </>
                        )}
                      </svg>
                      {selectedClass.isCommunityActive ? "ON" : "OFF"}
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      title="Clear All Messages"
                      style={{
                        width: '34px', height: '34px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        background: '#e8eaf0', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', ...neuSmall,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowCreatePost(true)}
                  style={{
                    padding: '8px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #0156bf 0%, #3636e8 100%)', 
                    color: '#fff', fontSize: '13px', fontWeight: '800',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 12px rgba(1, 86, 191, 0.3)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <Plus size={16} />
                  New Moment
                </button>
              </div>
            </div>

            {/* Quick Create Bar */}
            {(selectedClass.isCommunityActive || userRole !== 'STUDENT') && (
              <div 
                onClick={() => setShowCreatePost(true)}
                style={{ 
                  margin: '16px 20px 8px', 
                  padding: '12px 16px', 
                  borderRadius: '16px', 
                  background: '#f8fafc',
                  border: '1.5px solid rgba(0,0,0,0.04)',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = 'rgba(1, 86, 191, 0.2)';
                  e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.04)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: userAvatar ? 'transparent' : '#e8eaf0',
                  boxShadow: '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#0156bf', fontSize: '11px', fontWeight: '800',
                  overflow: 'hidden'
                }}>
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>
                  What's unfolding in your atelier today?
                </div>
                <div style={{ display: 'flex', gap: '8px', color: '#94a3b8' }}>
                  <ImageIcon size={18} />
                  <Smile size={18} />
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
              {!selectedClass.isCommunityActive && userRole === 'STUDENT' ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', textAlign: 'center' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  </div>
                  <h3 style={{ margin: 0, color: '#1e1e3a', fontWeight: '800' }}>Community is Temporary Disabled</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#6b6b8a', maxWidth: '300px' }}>
                    A manager has paused this community. You will be able to see history once it is enabled again.
                  </p>
                </div>
              ) : (
                <>
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

                    if (msg.isDeleted) {
                      return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '10px', alignItems: 'flex-end' }}>
                          {!isMe && (
                            <>
                              {showAvatar ? (
                                <div style={{
                                  width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                                  background: '#e8eaf0',
                                  boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '11px', fontWeight: '800', color: '#9999b0',
                                }}>
                                  {msg.sender.name.charAt(0).toUpperCase()}
                                </div>
                              ) : <div style={{ width: '32px', flexShrink: 0 }} />}
                            </>
                          )}
                          <div style={{
                            padding: '8px 14px', borderRadius: '14px',
                            background: 'transparent',
                            border: '1.5px dashed #c5c7cf',
                            color: '#9999b0', fontSize: '13px', fontStyle: 'italic',
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '6px', opacity: 0.6 }}>
                              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                            Message deleted
                          </div>
                        </div>
                      )
                    }

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
                              {userRole === 'MANAGER' && msg.sender.securityNumber && (
                                <span style={{ fontSize: '10px', background: '#f59e0b22', color: '#f59e0b', padding: '1px 7px', borderRadius: '50px', fontWeight: '700' }}>
                                  {msg.sender.securityNumber}
                                </span>
                              )}
                            </div>
                          )}
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
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
                            {/* Delete button for own messages */}
                            {isMe && !msg.id.startsWith('temp-') && (
                              <button
                                onClick={() => deleteMessage(msg.id)}
                                disabled={deletingId === msg.id}
                                title="Delete message"
                                style={{
                                  width: '26px', height: '26px', borderRadius: '50%',
                                  border: 'none', cursor: 'pointer',
                                  background: '#e8eaf0',
                                  boxShadow: '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0, opacity: deletingId === msg.id ? 0.4 : 0.5,
                                  transition: 'opacity 0.2s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                                </svg>
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#9999b0', padding: '0 4px' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}

              {showClearConfirm && (
                <Modal
                  title="Clear All Messages?"
                  description="This will hide all messages from the community chat instantly. All messages will still be preserved in the transcript for managers."
                  confirmText="Clear All"
                  confirmColor="#ef4444"
                  onConfirm={clearMessages}
                  onCancel={() => setShowClearConfirm(false)}
                />
              )}

              {showToggleConfirm && (
                <Modal
                  title={selectedClass.isCommunityActive ? "Hide Community?" : "Enable Community?"}
                  description={selectedClass.isCommunityActive 
                    ? "This community will disappear for all students. Managers will still have full access."
                    : "This community will become visible to all enrolled students again."
                  }
                  confirmText={selectedClass.isCommunityActive ? "Hide Now" : "Enable Now"}
                  confirmColor={selectedClass.isCommunityActive ? "#ef4444" : "#3636e8"}
                  onConfirm={toggleCommunity}
                  onCancel={() => setShowToggleConfirm(false)}
                />
              )}
            </div>

            {/* Input - Hidden if disabled for students */}
            {(selectedClass.isCommunityActive || userRole !== 'STUDENT') && (
              <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', gap: '10px', alignItems: 'center', background: '#e8eaf0' }}>
                <button
                  onClick={() => setShowCreatePost(true)}
                  title="Draft a Moment"
                  style={{
                    width: '44px', height: '44px', borderRadius: '50%', border: 'none',
                    cursor: 'pointer', background: '#e8eaf0', color: '#0156bf',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    ...neuSmall, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff')}
                >
                  <Plus size={20} />
                </button>
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
                    background: input.trim() ? '#0156bf' : '#e8eaf0',
                    color: input.trim() ? '#fff' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: input.trim()
                      ? '4px 4px 10px rgba(1, 86, 191, 0.3)'
                      : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                    transition: 'all 0.2s',
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
            )}

            <CreatePostModal
              isOpen={showCreatePost}
              onClose={() => setShowCreatePost(false)}
              onPublish={async (content) => {
                const optimistic: CommMsg = {
                  id: 'temp-' + Date.now(),
                  content: content,
                  createdAt: new Date().toISOString(),
                  sender: { id: userId, name: userName || 'You', role: userRole },
                }
                setMessages(prev => [...prev, optimistic])

                await fetch(`/api/community/${selectedClass.id}/messages`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: content }),
                })
                loadMessages(selectedClass.id)
              }}
              userName={userName}
              userAvatar={userAvatar}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#9999b0' }}>Loading community...</div>}>
      <CommunityContent />
    </Suspense>
  )
}

function Modal({ title, description, onConfirm, onCancel, confirmText, confirmColor }: any) {
  const neuSmall = { background: '#e8eaf0', boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff' }
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(232, 234, 240, 0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '340px', padding: '24px', borderRadius: '24px',
        background: '#e8eaf0', boxShadow: '10px 10px 20px #c5c7cf, -10px -10px 20px #ffffff',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '18px', fontWeight: '900', color: '#1e1e3a', marginBottom: '8px' }}>{title}</div>
        <div style={{ fontSize: '14px', color: '#6b6b8a', lineHeight: '1.5', marginBottom: '20px' }}>{description}</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: '15px', border: 'none', cursor: 'pointer',
              background: '#e8eaf0', color: '#6b6b8a', fontWeight: '700', ...neuSmall,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px', borderRadius: '15px', border: 'none', cursor: 'pointer',
              background: confirmColor || '#3636e8', color: '#fff', fontWeight: '700',
              boxShadow: `4px 4px 10px ${confirmColor || '#3636e8'}44`,
            }}
          >
            {confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
