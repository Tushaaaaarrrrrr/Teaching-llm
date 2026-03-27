'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

interface ClassItem {
  id: string
  name: string
  color: string
  subject?: string
  icon?: string
  isCommunityActive?: boolean
  isDisabled?: boolean
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

interface TranscriptMsg {
  id: string
  content: string
  isDeleted: boolean
  deletedAt?: string | null
  createdAt: string
  sender: {
    id: string
    name: string
    role: string
    securityNumber?: string
  }
}

export default function CommunityPage() {
  const { confirm, confirmDialog } = useConfirmDialog()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)
  const [messages, setMessages] = useState<CommMsg[]>([])
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('STUDENT')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [managingCommunity, setManagingCommunity] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMsg[]>([])
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async (classId: string) => {
    const data = await fetch(`/api/community/${classId}/messages`).then(r => r.json())
    setMessages(data)
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUserRole(d.user?.role || 'STUDENT')
      setUserId(d.user?.id || '')
      setUserName(d.user?.name || '')
    })
    loadClasses()
  }, [])

  async function loadClasses(preferredId?: string) {
    const data = await fetch('/api/classes').then(r => r.json())
    const list = data.classes || data || []
    setClasses(list)
    setSelectedClass(current => {
      const nextId = preferredId || current?.id
      const match = nextId ? list.find((item: ClassItem) => item.id === nextId) : null
      return match || list[0] || null
    })
  }

  // SSE connection for real-time messages
  useEffect(() => {
    if (!selectedClass) return
    loadMessages(selectedClass.id)

    const eventSource = new EventSource(`/api/community/${selectedClass.id}/messages/stream`)

    eventSource.addEventListener('message', (e) => {
      try {
        const newMsg = JSON.parse(e.data)
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev
          const filtered = prev.filter(m => !m.id.startsWith('temp-'))
          return [...filtered, newMsg]
        })
      } catch (err) {
        console.error('SSE Message Error', err)
      }
    })

    eventSource.addEventListener('delete', (e) => {
      try {
        const { messageId } = JSON.parse(e.data)
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isDeleted: true, content: '' } : m))
      } catch (err) {
        console.error('SSE Delete Error', err)
      }
    })

    eventSource.addEventListener('clear', () => {
      setMessages([])
    })

    return () => eventSource.close()
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

  async function deleteMessage(messageId: string) {
    if (!selectedClass || deletingId) return
    const allowed = await confirm({
      title: 'Delete Message?',
      message: 'This message will be removed from the chat.',
      confirmLabel: 'Delete Message',
      tone: 'danger',
    })
    if (!allowed) return
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

  async function clearCommunityMessages() {
    if (!selectedClass || userRole !== 'MANAGER' || managingCommunity) return
    const allowed = await confirm({
      title: 'Clear Community Chat?',
      message: 'This will remove all messages from this community for everyone.',
      confirmLabel: 'Clear Messages',
      tone: 'danger',
    })
    if (!allowed) return

    setManagingCommunity(true)
    try {
      const res = await fetch(`/api/community/${selectedClass.id}/clear`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to clear community')
      }
      await loadMessages(selectedClass.id)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Failed to clear community')
    } finally {
      setManagingCommunity(false)
    }
  }

  async function toggleCommunityStatus() {
    if (!selectedClass || userRole !== 'MANAGER' || managingCommunity) return
    const nextActive = !selectedClass.isCommunityActive
    const allowed = await confirm({
      title: nextActive ? 'Enable Community?' : 'Disable Community?',
      message: nextActive
        ? 'Students and admins will be able to see and use this community again.'
        : 'Students and admins will no longer see this community, but managers will still have access.',
      confirmLabel: nextActive ? 'Enable Community' : 'Disable Community',
      tone: nextActive ? 'default' : 'danger',
    })
    if (!allowed) return

    setManagingCommunity(true)
    try {
      const res = await fetch(`/api/courses/${selectedClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCommunityActive: nextActive }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update community')
      }
      await loadClasses(selectedClass.id)
      await loadMessages(selectedClass.id)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Failed to update community')
    } finally {
      setManagingCommunity(false)
    }
  }

  async function exportTranscript(format: 'csv' | 'json' | 'pdf') {
    if (!selectedClass || userRole !== 'MANAGER') return
    try {
      const res = await fetch(`/api/community/transcripts/export?courseId=${selectedClass.id}&format=${format}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to export transcript')
      }
      const blob = await res.blob()
      const ext = format === 'pdf' ? 'html' : format
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `transcript-${selectedClass.name.replace(/\s+/g, '_')}.${ext}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Failed to export transcript')
    }
  }

  async function openTranscript() {
    if (!selectedClass || userRole !== 'MANAGER') return
    setTranscriptOpen(true)
    setLoadingTranscript(true)
    try {
      const res = await fetch(`/api/community/transcripts?courseId=${selectedClass.id}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load transcript')
      }
      setTranscriptMessages(data.messages || [])
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Failed to load transcript')
    } finally {
      setLoadingTranscript(false)
    }
  }

  const neu = { background: '#e8eaf0', boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff' }
  const neuInset = { background: '#e8eaf0', boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #ffffff' }

  return (
    <div className="page-container fade-in" style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      {confirmDialog}

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
              {userRole === 'MANAGER' && cls.isCommunityActive === false && (
                <div style={{ fontSize: '10px', fontWeight: '800', marginTop: '4px', color: selectedClass?.id === cls.id ? '#fff' : '#ef4444' }}>
                  COMMUNITY OFF
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
                {selectedClass.isCommunityActive === false && (
                  <span style={{
                    padding: '4px 14px', borderRadius: '50px',
                    background: '#fef2f2', color: '#ef4444',
                    fontSize: '12px', fontWeight: '700',
                  }}>
                    Community Off
                  </span>
                )}
                <span style={{
                  padding: '4px 14px', borderRadius: '50px',
                  background: selectedClass.color + '18', color: selectedClass.color,
                  fontSize: '12px', fontWeight: '700',
                }}>
                  {messages.length} message{messages.length !== 1 ? 's' : ''}
                </span>
                {userRole === 'MANAGER' && (
                  <>
                    <button
                      onClick={openTranscript}
                      style={{
                        padding: '6px 12px', borderRadius: '50px', border: 'none',
                        cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700',
                        ...neu, boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff', color: '#3636e8',
                      }}
                    >
                      Transcript
                    </button>
                    <button
                      onClick={toggleCommunityStatus}
                      disabled={managingCommunity}
                      style={{
                        padding: '6px 12px', borderRadius: '50px', border: 'none',
                        cursor: managingCommunity ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700',
                        background: selectedClass.isCommunityActive === false ? '#22c55e' : '#f59e0b',
                        color: '#fff',
                        boxShadow: selectedClass.isCommunityActive === false
                          ? '4px 4px 10px rgba(34,197,94,0.25)'
                          : '4px 4px 10px rgba(245,158,11,0.25)',
                        opacity: managingCommunity ? 0.6 : 1,
                      }}
                    >
                      {selectedClass.isCommunityActive === false ? 'Enable' : 'Disable'}
                    </button>
                    <button
                      onClick={clearCommunityMessages}
                      disabled={managingCommunity || messages.length === 0}
                      style={{
                        padding: '6px 12px', borderRadius: '50px', border: 'none',
                        cursor: managingCommunity || messages.length === 0 ? 'default' : 'pointer',
                        fontFamily: 'inherit', fontSize: '12px', fontWeight: '700',
                        background: '#ef4444', color: '#fff',
                        boxShadow: '4px 4px 10px rgba(239,68,68,0.25)',
                        opacity: managingCommunity || messages.length === 0 ? 0.5 : 1,
                      }}
                    >
                      Clear Chat
                    </button>
                  </>
                )}
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
                const senderDisplayName = isMe ? (userName || 'You') : msg.sender.name
                const senderLabelColor = isMe ? selectedClass.color : isAdmin ? '#3636e8' : '#6b6b8a'
                const senderMeta = (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: isMe ? '0 4px 0 0' : '0 0 0 2px', flexWrap: 'wrap', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: senderLabelColor }}>
                      {senderDisplayName}
                    </span>
                    {isAdmin && (
                      <span style={{ fontSize: '10px', background: isMe ? selectedClass.color : '#3636e8', color: '#fff', padding: '1px 6px', borderRadius: '50px', fontWeight: '700' }}>
                        {msg.sender.role.charAt(0) + msg.sender.role.slice(1).toLowerCase()}
                      </span>
                    )}
                    {userRole === 'MANAGER' && msg.sender.securityNumber && (
                      <span style={{ fontSize: '10px', background: '#f59e0b22', color: '#f59e0b', padding: '1px 7px', borderRadius: '50px', fontWeight: '700' }}>
                        ID: {msg.sender.securityNumber}
                      </span>
                    )}
                  </div>
                )

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
                      <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        {senderMeta}
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
                      {senderMeta}
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
                        {(userRole === 'MANAGER' || isMe) && !msg.id.startsWith('temp-') && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            disabled={deletingId === msg.id}
                            title={userRole === 'MANAGER' && !isMe ? 'Delete message as manager' : 'Delete message'}
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
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={
                    selectedClass.isCommunityActive === false && userRole !== 'MANAGER'
                      ? 'This community is disabled'
                      : `Message ${selectedClass.name} community...`
                  }
                  disabled={selectedClass.isCommunityActive === false && userRole !== 'MANAGER'}
                  style={{
                    width: '100%', padding: '11px 16px', borderRadius: '50px',
                    border: 'none', outline: 'none',
                    fontFamily: 'inherit', fontSize: '14px',
                    ...neuInset, color: '#1e1e3a',
                    opacity: selectedClass.isCommunityActive === false && userRole !== 'MANAGER' ? 0.6 : 1,
                  }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || (selectedClass.isCommunityActive === false && userRole !== 'MANAGER')}
                style={{
                  width: '44px', height: '44px', borderRadius: '50%', border: 'none',
                  cursor: input.trim() && !(selectedClass.isCommunityActive === false && userRole !== 'MANAGER') ? 'pointer' : 'default',
                  background: input.trim() && !(selectedClass.isCommunityActive === false && userRole !== 'MANAGER') ? selectedClass.color : '#e8eaf0',
                  color: input.trim() && !(selectedClass.isCommunityActive === false && userRole !== 'MANAGER') ? '#fff' : '#9999b0',
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

      {transcriptOpen && selectedClass && (
        <div className="modal-overlay" onClick={() => setTranscriptOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{selectedClass.name} Transcript</h3>
              <button onClick={() => setTranscriptOpen(false)} style={{ color: '#9999b0', cursor: 'pointer', background: 'none', border: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '12px', color: '#6b6b8a' }}>
                  Individual transcript for this community only. Deleted and active messages are both shown here.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['csv', 'json', 'pdf'] as const).map(format => (
                    <button key={format} onClick={() => exportTranscript(format)} className="btn btn-ghost btn-sm">
                      {format === 'pdf' ? 'Export HTML' : `Export ${format.toUpperCase()}`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                {loadingTranscript ? (
                  <div style={{ fontSize: '13px', color: '#9999b0' }}>Loading transcript...</div>
                ) : transcriptMessages.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#9999b0' }}>No transcript messages found for this group.</div>
                ) : (
                  transcriptMessages.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: msg.isDeleted ? '#fff5f5' : '#f8fafc',
                        border: msg.isDeleted ? '1px solid #fecaca' : '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e1e3a' }}>{msg.sender.name}</span>
                          <span style={{ fontSize: '10px', background: '#3636e8', color: '#fff', padding: '1px 6px', borderRadius: '50px', fontWeight: '700' }}>
                            {msg.sender.role}
                          </span>
                          {msg.sender.securityNumber && (
                            <span style={{ fontSize: '10px', background: '#f59e0b22', color: '#f59e0b', padding: '1px 6px', borderRadius: '50px', fontWeight: '700' }}>
                              {msg.sender.securityNumber}
                            </span>
                          )}
                          {msg.isDeleted && (
                            <span style={{ fontSize: '10px', background: '#fee2e2', color: '#ef4444', padding: '1px 6px', borderRadius: '50px', fontWeight: '700' }}>
                              Deleted
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b6b8a' }}>
                          {new Date(msg.createdAt).toLocaleString()}
                          {msg.deletedAt ? ` • Deleted ${new Date(msg.deletedAt).toLocaleString()}` : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: '#1e1e3a', whiteSpace: 'pre-wrap' }}>
                        {msg.content || '[No visible content]'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
