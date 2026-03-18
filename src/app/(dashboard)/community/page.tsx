'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import useSWR from 'swr'

interface CourseItem {
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
  isDeleted?: boolean
  isSystemDeleted?: boolean
  deletedAt?: string | null
  sender: {
    id: string
    name: string
    role: string
    securityNumber?: string
  }
}

export default function CommunityPage() {
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null)
  const [messages, setMessages] = useState<CommMsg[]>([])
  const fetcher = (url: string) => fetch(url).then(r => r.json())
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState('')
  const [userRole, setUserRole] = useState('STUDENT')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevScrollHeightRef = useRef<number>(0)
  
  // Visibility tracking
  useEffect(() => {
    const handleVisibility = () => setIsVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // useSWR for real-time messages
  const { data: swrMessages, mutate: mutateMessages } = useSWR(
    selectedCourse ? `/api/community/${selectedCourse.id}/messages?limit=20` : null,
    fetcher,
    { 
      refreshInterval: isVisible ? 5000 : 0, 
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  )

  useEffect(() => {
    if (swrMessages) {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMsgs = swrMessages.filter((m: CommMsg) => !existingIds.has(m.id))
        if (newMsgs.length === 0) return prev
        const combined = [...prev, ...newMsgs].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        return combined
      })
      if (!initialLoaded) setInitialLoaded(true)
    }
  }, [swrMessages, initialLoaded])

  const loadHistory = async () => {
    if (!selectedCourse || loadingHistory || !hasMore || messages.length === 0) return
    setLoadingHistory(true)
    const oldestId = messages[0].id
    try {
      const res = await fetch(`/api/community/${selectedCourse.id}/messages?cursor=${oldestId}&limit=20`)
      const history = await res.json()
      if (history.length < 20) setHasMore(false)
      
      if (history.length > 0) {
        // Capture scroll height before prepending
        if (scrollRef.current) {
          prevScrollHeightRef.current = scrollRef.current.scrollHeight
        }
        
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const newMsgs = history.filter((m: CommMsg) => !existingIds.has(m.id))
          return [...newMsgs, ...prev].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        })
      } else {
        setHasMore(false)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingHistory(false)
    }
  }

  const loadMessages = useCallback(async (courseId: string) => {
    setInitialLoaded(false)
    setHasMore(true)
    setMessages([])
    mutateMessages()
  }, [mutateMessages])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUserRole(d.user?.role || 'STUDENT')
      setUserId(d.user?.id || '')
    })
    fetch('/api/courses').then(r => r.json()).then(data => {
      const list = data.courses || data || []
      setCourses(list)
      if (list.length > 0) setSelectedCourse(list[0])
    })
  }, [])

  // Poll messages when a course is selected - handled by SWR
  useEffect(() => {
    if (selectedCourse) {
      loadMessages(selectedCourse.id)
    }
  }, [selectedCourse, loadMessages])

  // Handle scroll restoration when history loads
  useEffect(() => {
    if (prevScrollHeightRef.current && scrollRef.current) {
      const newScrollHeight = scrollRef.current.scrollHeight
      const delta = newScrollHeight - prevScrollHeightRef.current
      scrollRef.current.scrollTop += delta
      prevScrollHeightRef.current = 0
    }
  }, [messages])

  // Auto-scroll to bottom only on initial load or when sending message
  useEffect(() => {
    if (initialLoaded && !loadingHistory && !prevScrollHeightRef.current) {
      const el = scrollRef.current
      if (el) {
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
        if (isNearBottom || messages.length <= 20) {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
        }
      }
    }
  }, [messages, initialLoaded, loadingHistory])

  async function sendMessage() {
    if (!input.trim() || !selectedCourse) return
    const optimistic: CommMsg = {
      id: 'temp-' + Date.now(),
      content: input,
      createdAt: new Date().toISOString(),
      sender: { id: userId, name: 'You', role: userRole },
    }
    setMessages(prev => [...prev, optimistic])
    setInput('')

    await fetch(`/api/community/${selectedCourse.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: optimistic.content }),
    })
    loadMessages(selectedCourse.id)
  }

  async function deleteMessage(messageId: string) {
    if (!selectedCourse || deletingId) return
    if (!confirm('Delete this message? It will be removed from the chat.')) return
    setDeletingId(messageId)
    try {
      const res = await fetch(`/api/community/${selectedCourse.id}/messages`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      })
      if (res.ok) {
        mutateMessages()
      }
    } catch (e) {
      console.error(e)
    }
    setDeletingId(null)
  }

  const neu = { background: '#e8eaf0', boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff' }
  const neuInset = { background: '#e8eaf0', boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #ffffff' }

  return (
    <div className="page-container fade-in" style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>

      {/* Left: Course list */}
      <div style={{ width: '230px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        <div style={{ fontSize: '12px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px', padding: '0 4px' }}>
          Communities
        </div>
        {courses.map(course => (
          <button
            key={course.id}
            onClick={() => setSelectedCourse(course)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '18px', border: 'none',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              transition: 'all 0.2s',
              background: selectedCourse?.id === course.id ? course.color : '#e8eaf0',
              color: selectedCourse?.id === course.id ? '#fff' : '#1e1e3a',
              boxShadow: selectedCourse?.id === course.id
                ? `5px 5px 12px ${course.color}55, -3px -3px 8px rgba(255,255,255,0.6)`
                : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
            }}
          >
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
              background: selectedCourse?.id === course.id ? 'rgba(255,255,255,0.25)' : course.color + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '800',
              color: selectedCourse?.id === course.id ? '#fff' : course.color,
            }}>
              {course.name.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {course.name}
              </div>
              {course.subject && (
                <div style={{ fontSize: '11px', opacity: selectedCourse?.id === course.id ? 0.8 : 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {course.subject}
                </div>
              )}
            </div>
          </button>
        ))}

        {courses.length === 0 && (
          <div style={{ color: '#9999b0', fontSize: '13px', textAlign: 'center', padding: '20px 10px' }}>
            No courses available
          </div>
        )}
      </div>

      {/* Right: Chat area */}
      <div style={{ flex: 1, borderRadius: '24px', ...neu, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {!selectedCourse ? (
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
                background: selectedCourse.color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: '800', color: selectedCourse.color,
              }}>
                {selectedCourse.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '16px', color: '#1e1e3a' }}>{selectedCourse.name}</div>
                {selectedCourse.subject && (
                  <div style={{ fontSize: '12px', color: '#9999b0' }}>{selectedCourse.subject} · Community Chat</div>
                )}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
                {userRole === 'MANAGER' && (
                  <button 
                    onClick={() => window.location.href = '/chat-transcripts'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 16px', borderRadius: '50px',
                      background: '#e8eaf0', color: '#6b6b8a',
                      boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                      border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = '#3636e8'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = '#6b6b8a'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    Transcripts
                  </button>
                )}
                <span style={{
                  padding: '4px 14px', borderRadius: '50px',
                  background: selectedCourse.color + '18', color: selectedCourse.color,
                  fontSize: '12px', fontWeight: '700',
                }}>
                  {messages.length} message{messages.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {hasMore && messages.length >= 20 && (
                <button
                  onClick={loadHistory}
                  disabled={loadingHistory}
                  style={{
                    alignSelf: 'center', padding: '8px 20px', borderRadius: '50px',
                    border: 'none', background: '#e8eaf0', color: '#6b6b8a',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                    boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                    marginBottom: '10px'
                  }}
                >
                  {loadingHistory ? 'Loading history...' : 'Load older messages'}
                </button>
              )}

              {messages.length === 0 && !loadingHistory && (
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
                  const isManagerView = userRole === 'MANAGER'
                  const isActuallyDeleted = msg.isDeleted || msg.isSystemDeleted

                  if (isActuallyDeleted && !isManagerView) {
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
                          opacity: isActuallyDeleted ? 0.6 : 1,
                          position: 'relative',
                          border: isActuallyDeleted ? '1px dashed #ef4444' : 'none',
                          boxShadow: isMe
                            ? '4px 4px 10px rgba(54,54,232,0.25)'
                            : '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                        }}>
                          {isActuallyDeleted && (
                            <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '800', marginBottom: '4px' }}>
                              {msg.isSystemDeleted ? 'SYSTEM DELETED' : 'DELETED BY USER'} (MANAGER OVERSIGHT)
                            </div>
                          )}
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
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={`Message ${selectedCourse.name} community...`}
                  maxLength={2000}
                  style={{
                    width: '100%', padding: '11px 16px', borderRadius: '50px',
                    border: 'none', outline: 'none',
                    fontFamily: 'inherit', fontSize: '14px',
                    ...neuInset, color: '#1e1e3a',
                  }}
                />
                <div style={{ 
                  position: 'absolute', right: '16px', bottom: '-18px', 
                  fontSize: '10px', fontWeight: '700', 
                  color: input.length > 1900 ? '#ef4444' : '#9999b0' 
                }}>
                  {input.length}/2,000
                </div>
              </div>
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                style={{
                  width: '44px', height: '44px', borderRadius: '50%', border: 'none',
                  cursor: input.trim() ? 'pointer' : 'default',
                  background: input.trim() ? selectedCourse.color : '#e8eaf0',
                  color: input.trim() ? '#fff' : '#9999b0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: input.trim()
                    ? `4px 4px 10px ${selectedCourse.color}55`
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
