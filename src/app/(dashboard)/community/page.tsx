'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ManagerUserModal from '@/components/ManagerUserModal'

interface ClassItem {
  id: string
  name: string
  color: string
  subject?: string
  icon?: string
  isCommunityActive?: boolean
  isDisabled?: boolean
  hasUnread?: boolean
  isDirectChat?: boolean
  isDmDisabled?: boolean
  _count?: { lectures: number }
  role?: string
}

interface CommMsg {
  id: string
  content: string
  imageUrl?: string | null
  createdAt: string
  isDeleted?: boolean
  deletedAt?: string | null
  sender: {
    id: string
    name: string
    role: string
    securityNumber?: string
  }
  replyTo?: {
    id: string
    content: string
    imageUrl?: string | null
    sender: {
      id: string
      name: string
    }
  } | null
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

function formatMessageDate(dateString: string) {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    // Return dd/mm/yyyy format as requested across the system
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
}

export default function CommunityPage() {
  const { confirm, confirmDialog } = useConfirmDialog()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)
  const [messages, setMessages] = useState<CommMsg[]>([])
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState('')
  const [userRole, setUserRole] = useState('STUDENT')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [managingCommunity, setManagingCommunity] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMsg[]>([])
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedUserDetailsId, setSelectedUserDetailsId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // DM state
  const [showNewDMModal, setShowNewDMModal] = useState(false)
  const [dmSearch, setDmSearch] = useState('')
  const [dmResults, setDmResults] = useState<{ id: string; name: string; email: string; role: string }[]>([])
  const [dmSearching, setDmSearching] = useState(false)
  const [dmStarting, setDmStarting] = useState(false)
  const [userName, setUserName] = useState('')
  // Image upload state
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<CommMsg | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const loadMessages = useCallback(async (classId: string) => {
    const res = await fetch(`/api/community/${classId}/messages`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load messages')
    }
    setMessages(Array.isArray(data) ? data : [])
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
    try {
      setLoadError(null)
      const res = await fetch('/api/classes')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load communities')
      }
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.classes)
          ? data.classes
          : []
      setClasses(list)
      setSelectedClass(current => {
        const nextId = preferredId || current?.id
        const match = nextId ? list.find((item: ClassItem) => item.id === nextId) : null
        return match || list[0] || null
      })
    } catch (error) {
      console.error(error)
      setClasses([])
      setSelectedClass(null)
      setLoadError(error instanceof Error ? error.message : 'Failed to load communities')
    }
  }

  // Poll for unread status every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/classes')
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return
        const fresh = Array.isArray(data)
          ? data
          : Array.isArray(data?.classes)
            ? data.classes
            : []
        
        // Update unread flags, keep existing list order to prevent shifting UI, but remove deleted/disabled classes and append new ones
        setClasses(prev => {
          const updated = prev
            .filter(c => fresh.some((f: ClassItem) => f.id === c.id))
            .map(c => {
              const update = fresh.find((f: ClassItem) => f.id === c.id)
              return update ? { ...c, hasUnread: update.hasUnread } : c
            })

          const existingIds = new Set(prev.map(c => c.id))
          const newClasses = fresh.filter((f: ClassItem) => !existingIds.has(f.id))
          
          return [...updated, ...newClasses]
        })
      } catch (err) {
        console.error('Failed to poll classes', err)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Mark community as read when selected
  useEffect(() => {
    if (selectedClass) {
      fetch(`/api/community/${selectedClass.id}/read`, { method: 'POST' }).catch(console.error);
      
      // Optimistically clear the unread dot LOCALLY
      setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, hasUnread: false } : c))
    }
  }, [selectedClass])

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

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Maximum 5MB.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Only JPG, PNG, and WEBP images are allowed.')
      return
    }
    setPendingImage(file)
    setPendingImagePreview(URL.createObjectURL(file))
  }

  function clearPendingImage() {
    setPendingImage(null)
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview)
    setPendingImagePreview(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  async function sendMessage() {
    if ((!input.trim() && !pendingImage) || !selectedClass) return
    
    let imageUrl: string | null = null

    // Upload image first if present
    if (pendingImage) {
      setUploadingImage(true)
      try {
        const formData = new FormData()
        formData.append('file', pendingImage)
        const uploadRes = await fetch('/api/upload/chat-image', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed')
        imageUrl = uploadData.url
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Image upload failed')
        setUploadingImage(false)
        return
      }
      setUploadingImage(false)
    }

    const optimistic: CommMsg = {
      id: 'temp-' + Date.now(),
      content: input,
      imageUrl,
      createdAt: new Date().toISOString(),
      sender: { id: userId, name: 'You', role: userRole },
    }
    setMessages(prev => [...prev, optimistic])
    const msgContent = input
    setInput('')
    clearPendingImage()

    await fetch(`/api/community/${selectedClass.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: msgContent || '', 
        imageUrl,
        replyToId: replyingTo?.id 
      }),
    })
    setReplyingTo(null)
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
      // DM transcripts come from messages endpoint directly
      if (selectedClass.isDirectChat) {
        const res = await fetch(`/api/community/${selectedClass.id}/messages`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load transcript')
        setTranscriptMessages(Array.isArray(data) ? data.map((m: any) => ({ ...m, isDeleted: m.isDeleted || false })) : [])
      } else {
        const res = await fetch(`/api/community/transcripts?courseId=${selectedClass.id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load transcript')
        setTranscriptMessages(data.messages || [])
      }
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Failed to load transcript')
    } finally {
      setLoadingTranscript(false)
    }
  }

  async function searchDMUsers(q: string) {
    if (q.length < 2) { setDmResults([]); return }
    setDmSearching(true)
    try {
      const res = await fetch(`/api/community/direct/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setDmResults(Array.isArray(data) ? data : [])
    } catch { setDmResults([]) }
    setDmSearching(false)
  }

  async function startDM(studentId: string) {
    if (dmStarting) return
    setDmStarting(true)
    try {
      const res = await fetch('/api/community/direct/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start chat')
      setShowNewDMModal(false)
      setDmSearch('')
      setDmResults([])
      await loadClasses(data.chatId)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start chat')
    }
    setDmStarting(false)
  }

  const isDM = (cls: ClassItem | null) => cls?.isDirectChat === true

  const neu = { background: '#ffffff', boxShadow: 'var(--shadow)', border: '1px solid rgba(0,0,0,0.02)' }
  const neuInset = { background: '#f8fafc', boxShadow: 'var(--shadow-inset)', border: '1px solid #e2e8f0' }


  return (
    <div className="page-container fade-in" style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        .msg-row:hover .msg-actions { opacity: 1 !important; }
      `}</style>
      {confirmDialog}
      {loadError ? (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5,
            padding: '12px 16px',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            background: '#fff5f5',
          }}
        >
          Failed to load community data. {loadError}
        </div>
      ) : null}

      {/* Left: Class list */}
      <div style={{ width: '230px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        {/* Groups header */}
        <div style={{ fontSize: '12px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px', padding: '0 4px' }}>
          Communities
        </div>
        {classes.filter(cls => !cls.isDirectChat).map(cls => (
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
                ? `0 4px 12px ${cls.color}44`
                : 'var(--shadow-sm)',
              position: 'relative'
            }}
          >
            {cls.hasUnread && selectedClass?.id !== cls.id && (
              <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }} />
            )}
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

        {/* Direct Messages section — hidden for students with zero DMs */}
        {(userRole === 'MANAGER' || classes.some(cls => cls.isDirectChat)) && (
          <>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#9999b0', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '12px 0 4px', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Direct Messages</span>
              {userRole === 'MANAGER' && (
                <button
                  onClick={() => setShowNewDMModal(true)}
                  title="New Direct Chat"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3636e8', display: 'flex', alignItems: 'center', padding: '2px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              )}
            </div>
            {classes.filter(cls => cls.isDirectChat).map(cls => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', borderRadius: '18px', border: 'none',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  background: selectedClass?.id === cls.id ? '#3636e8' : '#e8eaf0',
                  color: selectedClass?.id === cls.id ? '#fff' : '#1e1e3a',
                  boxShadow: selectedClass?.id === cls.id
                    ? '0 4px 12px rgba(54,54,232,0.3)'
                    : 'var(--shadow-sm)',
                  opacity: cls.isDmDisabled ? 0.55 : 1,
                  position: 'relative'
                }}
              >
                {cls.hasUnread && selectedClass?.id !== cls.id && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }} />
                )}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  background: selectedClass?.id === cls.id ? 'rgba(255,255,255,0.25)' : '#3636e822',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '800',
                  color: selectedClass?.id === cls.id ? '#fff' : '#3636e8',
                }}>
                  {cls.name.replace('Chat with ', '').charAt(0).toUpperCase()}
                </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {cls.name.replace('Chat with ', '')}
                    {cls.role && cls.role !== 'STUDENT' && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ color: selectedClass?.id === cls.id ? '#fff' : '#3636e8' }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.6, textTransform: 'capitalize' }}>
                    {cls.isDmDisabled ? 'Hidden from student' : (cls.role && cls.role !== 'STUDENT' ? cls.role.toLowerCase() : 'Direct Message')}
                  </div>
              </button>
            ))}
            {classes.filter(cls => cls.isDirectChat).length === 0 && (
              <div style={{ color: '#9999b0', fontSize: '12px', textAlign: 'center', padding: '8px 10px' }}>
                {userRole === 'MANAGER' ? 'No active DMs — click + to start one' : 'No direct messages yet'}
              </div>
            )}
          </>
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
                width: '40px', height: '40px', borderRadius: isDM(selectedClass) ? '50%' : '12px',
                background: selectedClass.color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: '800', color: selectedClass.color,
              }}>
                {isDM(selectedClass)
                  ? selectedClass.name.replace('Chat with ', '').charAt(0).toUpperCase()
                  : selectedClass.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '16px', color: '#1e1e3a' }}>
                  {isDM(selectedClass) ? selectedClass.name.replace('Chat with ', '') : selectedClass.name}
                </div>
                {isDM(selectedClass) ? (
                  <div style={{ fontSize: '12px', color: '#9999b0' }}>Direct Message</div>
                ) : selectedClass.subject && (
                  <div style={{ fontSize: '12px', color: '#9999b0' }}>{selectedClass.subject} · Community Chat</div>
                )}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
                {!isDM(selectedClass) && selectedClass.isCommunityActive === false && (
                  <span style={{ padding: '4px 14px', borderRadius: '50px', background: '#fef2f2', color: '#ef4444', fontSize: '12px', fontWeight: '700' }}>
                    Community Off
                  </span>
                )}
                {isDM(selectedClass) && selectedClass.isDmDisabled && (
                  <span style={{ padding: '4px 14px', borderRadius: '50px', background: '#fef2f2', color: '#ef4444', fontSize: '12px', fontWeight: '700' }}>
                    Hidden from Student
                  </span>
                )}
                <span style={{ padding: '4px 14px', borderRadius: '50px', background: selectedClass.color + '18', color: selectedClass.color, fontSize: '12px', fontWeight: '700' }}>
                  {messages.length} message{messages.length !== 1 ? 's' : ''}
                </span>
                {userRole === 'MANAGER' && (
                  <>
                    <button onClick={openTranscript} style={{ padding: '6px 12px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700', ...neu, color: '#3636e8' }}>
                      Transcript
                    </button>
                    {!isDM(selectedClass) && (
                      <button
                        onClick={toggleCommunityStatus}
                        disabled={managingCommunity}
                        style={{
                          padding: '6px 12px', borderRadius: '50px', border: 'none',
                          cursor: managingCommunity ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700',
                          background: selectedClass.isCommunityActive === false ? '#22c55e' : '#f59e0b',
                          color: '#fff',
                          boxShadow: selectedClass.isCommunityActive === false ? '4px 4px 10px rgba(34,197,94,0.25)' : '4px 4px 10px rgba(245,158,11,0.25)',
                          opacity: managingCommunity ? 0.6 : 1,
                        }}
                      >
                        {selectedClass.isCommunityActive === false ? 'Enable' : 'Disable'}
                      </button>
                    )}
                    {isDM(selectedClass) && (
                      <button
                        onClick={async () => {
                          if (managingCommunity) return
                          const action = selectedClass.isDmDisabled ? 'enable' : 'disable'
                          const allowed = await confirm({
                            title: action === 'disable' ? 'Hide Chat from Student?' : 'Show Chat to Student?',
                            message: action === 'disable'
                              ? 'This will hide the chat from the student. All messages are preserved and you can re-enable it anytime.'
                              : 'This will make the chat visible to the student again.',
                            confirmLabel: action === 'disable' ? 'Hide Chat' : 'Show Chat',
                            tone: action === 'disable' ? 'danger' : 'default',
                          })
                          if (!allowed) return
                          setManagingCommunity(true)
                          try {
                            const chatId = selectedClass.id.replace('dm_', '')
                            const res = await fetch('/api/community/direct/toggle', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ chatId, action }),
                            })
                            if (!res.ok) throw new Error('Failed to toggle chat')
                            await loadClasses(selectedClass.id)
                          } catch (error) {
                            console.error(error)
                            alert(error instanceof Error ? error.message : 'Failed to toggle chat')
                          } finally {
                            setManagingCommunity(false)
                          }
                        }}
                        disabled={managingCommunity}
                        style={{
                          padding: '6px 12px', borderRadius: '50px', border: 'none',
                          cursor: managingCommunity ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700',
                          background: selectedClass.isDmDisabled ? '#22c55e' : '#f59e0b',
                          color: '#fff',
                          boxShadow: selectedClass.isDmDisabled ? '4px 4px 10px rgba(34,197,94,0.25)' : '4px 4px 10px rgba(245,158,11,0.25)',
                          opacity: managingCommunity ? 0.6 : 1,
                        }}
                      >
                        {selectedClass.isDmDisabled ? 'Show to Student' : 'Hide from Student'}
                      </button>
                    )}
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
                
                const currentDate = new Date(msg.createdAt).toDateString()
                const prevDate = idx > 0 ? new Date(messages[idx - 1].createdAt).toDateString() : null
                const showDateHeader = currentDate !== prevDate
                
                const showAvatar = idx === 0 || messages[idx - 1]?.sender.id !== msg.sender.id || showDateHeader

                if (msg.isDeleted) {
                  return (
                    <React.Fragment key={msg.id}>
                      {showDateHeader && (
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 12px' }}>
                          <span style={{
                            padding: '4px 14px', borderRadius: '50px',
                            background: 'rgba(0,0,0,0.04)', color: '#6b6b8a',
                            fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
                          }}>
                            {formatMessageDate(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '10px', alignItems: 'flex-start' }}>
                        {!isMe && (
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                            background: '#e8eaf0',
                            boxShadow: 'var(--shadow-sm)',
                            display: showAvatar ? 'flex' : 'none',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: '800', color: '#9999b0',
                          }}>
                            {msg.sender.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {!isMe && !showAvatar && <div style={{ width: '32px', flexShrink: 0 }} />}
                        <div style={{
                          padding: '8px 14px', borderRadius: '14px',
                          background: 'transparent',
                          border: '1.5px dashed #c5c7cf',
                          color: '#9999b0', fontSize: '13px', fontStyle: 'italic',
                        }}>
                          Message deleted
                        </div>
                      </div>
                    </React.Fragment>
                  )
                }

                return (
                  <React.Fragment key={msg.id}>
                    {showDateHeader && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 12px' }}>
                        <span style={{
                          padding: '4px 14px', borderRadius: '50px',
                          background: 'rgba(0,0,0,0.04)', color: '#6b6b8a',
                          fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
                        }}>
                          {formatMessageDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className="msg-row" style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '10px', alignItems: 'flex-start', marginBottom: showAvatar ? '8px' : '2px' }}>
                      {/* Avatar */}
                      {!isMe && (
                        <div 
                          onClick={() => userRole === 'MANAGER' && setSelectedUserDetailsId(msg.sender.id)}
                          style={{
                            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                            background: isAdmin ? '#3636e8' : '#e8eaf0',
                            boxShadow: isAdmin ? '0 2px 8px rgba(54,54,232,0.2)' : 'var(--shadow-sm)',
                            display: showAvatar ? 'flex' : 'none',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: '800',
                            color: isAdmin ? '#fff' : '#6b6b8a',
                            cursor: userRole === 'MANAGER' ? 'pointer' : 'default',
                          }}
                        >
                          {msg.sender.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {!isMe && !showAvatar && <div style={{ width: '32px', flexShrink: 0 }} />}

                      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                          <div style={{
                            padding: msg.imageUrl ? '6px 6px 20px 6px' : '8px 12px 20px 12px',
                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: isMe ? '#dcf8c6' : isAdmin ? '#f0f0ff' : '#ffffff',
                            color: '#1e1e3a',
                            fontSize: '14px', lineHeight: '1.5',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            minWidth: '80px',
                            border: isMe ? 'none' : '1px solid #e8eaf0',
                            position: 'relative',
                            transition: 'all 0.2s',
                          }}>
                            {/* Reply info */}
                            {msg.replyTo && (
                              <div style={{
                                background: isMe ? 'rgba(0,0,0,0.05)' : 'rgba(54,54,232,0.05)',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                borderLeft: `3px solid ${isAdmin ? '#3636e8' : '#6b6b8a'}`,
                                marginBottom: '8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                opacity: 0.8
                              }}>
                                <div style={{ fontWeight: '800', color: isAdmin ? '#3636e8' : '#6b6b8a', fontSize: '11px' }}>
                                  {msg.replyTo.sender.name}
                                </div>
                                <div style={{ color: '#6b6b8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                  {msg.replyTo.content || (msg.replyTo.imageUrl ? '📷 Image' : 'Message')}
                                </div>
                              </div>
                            )}
                            {/* Name inside for group/staff */}
                            {!isMe && showAvatar && (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                                <span 
                                  onClick={() => {
                                    if (userRole === 'MANAGER') setSelectedUserDetailsId(msg.sender.id)
                                  }}
                                  style={{ 
                                    fontSize: '11px', fontWeight: '800', 
                                    color: isAdmin ? '#3636e8' : '#888',
                                    cursor: userRole === 'MANAGER' ? 'pointer' : 'default',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {msg.sender.name}
                                </span>
                                {isAdmin && (
                                  <span style={{ 
                                    fontSize: '9px', 
                                    background: 'linear-gradient(135deg, #3636e8, #6366f1)', 
                                    color: '#fff', 
                                    padding: '2px 8px', 
                                    borderRadius: '50px', 
                                    fontWeight: '800',
                                    letterSpacing: '0.02em',
                                    boxShadow: '0 2px 4px rgba(54,54,232,0.2)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    textTransform: 'capitalize'
                                  }}>
                                    {msg.sender.role.toLowerCase()}
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                  </span>
                                )}
                              </div>
                            )}

                            {msg.imageUrl && (
                              <img
                                src={msg.imageUrl}
                                alt="Shared image"
                                onClick={() => setLightboxUrl(msg.imageUrl!)}
                                style={{
                                  maxWidth: '100%', maxHeight: '240px',
                                  borderRadius: '12px',
                                  cursor: 'pointer', display: 'block',
                                  objectFit: 'cover',
                                  marginBottom: msg.content ? '6px' : '0',
                                }}
                              />
                            )}
                            {msg.content && (
                              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {msg.content}
                              </div>
                            )}

                            {/* Time inside bubble */}
                            <div style={{ 
                              position: 'absolute', bottom: '4px', right: '10px', 
                              fontSize: '10px', color: isMe ? '#4a7c44' : '#999', 
                              display: 'flex', alignItems: 'center', gap: '3px',
                              fontWeight: '600',
                            }}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isMe && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                            </div>
                          </div>

                          {/* Message Actions (Visible on Hover/Right Side) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', opacity: 0, transition: 'opacity 0.2s' }} className="msg-actions">
                            {(userRole === 'MANAGER' || isMe) && !msg.id.startsWith('temp-') && (
                              <button
                                onClick={() => deleteMessage(msg.id)}
                                disabled={deletingId === msg.id}
                                style={{
                                  width: '24px', height: '24px', borderRadius: '50%',
                                  border: 'none', cursor: 'pointer',
                                  background: '#fff',
                                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                              </button>
                            )}
                            <button
                              onClick={() => setReplyingTo(msg)}
                              style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                border: 'none', cursor: 'pointer',
                                background: '#fff',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2.5"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input — DMs are two-way: both sides can reply */}
            {(!isDM(selectedClass) && selectedClass.isCommunityActive === false && userRole !== 'MANAGER') ? (
              <div style={{ padding: '14px 20px', borderTop: '1.5px solid rgba(0,0,0,0.06)', textAlign: 'center', color: '#9999b0', fontSize: '13px', fontStyle: 'italic' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '6px', opacity: 0.6 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                This community is currently disabled.
              </div>
            ) : (
            <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.06)' }}>
              {/* Reply Preview */}
              {replyingTo && (
                <div style={{ 
                  marginBottom: '8px', padding: '10px 14px', 
                  background: '#f0f0ff', borderRadius: '12px',
                  borderLeft: '4px solid #3636e8',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '12px'
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '800', color: '#3636e8', marginBottom: '2px' }}>Replying to {replyingTo.sender.name}</div>
                    <div style={{ color: '#6b6b8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {replyingTo.content || 'Image'}
                    </div>
                  </div>
                  <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              )}

              {/* Image preview */}
              {pendingImagePreview && (
                <div style={{ 
                  marginBottom: '10px', position: 'relative', display: 'inline-flex', 
                  alignItems: 'flex-end', gap: '8px', padding: '10px 14px', 
                  borderRadius: '16px', background: '#f0f0ff', 
                  border: '2px solid #3636e830',
                  boxShadow: '0 4px 12px rgba(54,54,232,0.1)',
                }}>
                  <img src={pendingImagePreview} alt="Preview" style={{ maxHeight: '100px', maxWidth: '200px', borderRadius: '10px', objectFit: 'cover' }} />
                  <div style={{ fontSize: '11px', color: '#3636e8', fontWeight: '600' }}>📎 Ready to send</div>
                  <button
                    onClick={clearPendingImage}
                    style={{
                      position: 'absolute', top: '-8px', right: '-8px',
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: '#ef4444', color: '#fff', border: '2px solid #fff',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: '800', boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                    }}
                  >✕</button>
                </div>
              )}
              {uploadingImage && (
                <div style={{ marginBottom: '8px', fontSize: '13px', color: '#3636e8', fontWeight: '600' }}>
                  Uploading image...
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  ref={imageInputRef}
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  title="Attach image"
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                    cursor: 'pointer', flexShrink: 0,
                    background: pendingImage ? '#3636e818' : '#e8eaf0',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: pendingImage ? '#3636e8' : '#9999b0',
                    transition: 'all 0.2s',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </button>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder={
                      !isDM(selectedClass) && selectedClass.isCommunityActive === false && userRole !== 'MANAGER'
                        ? 'This community is disabled'
                        : isDM(selectedClass)
                          ? `Message ${selectedClass.name.replace('Chat with ', '')}...`
                          : `Message ${selectedClass.name} community...`
                    }
                    disabled={(!isDM(selectedClass) && selectedClass.isCommunityActive === false && userRole !== 'MANAGER') || uploadingImage}
                    style={{
                      width: '100%', padding: '11px 16px', borderRadius: '50px',
                      border: 'none', outline: 'none',
                      fontFamily: 'inherit', fontSize: '14px',
                      ...neuInset, color: '#1e1e3a',
                      opacity: (!isDM(selectedClass) && selectedClass.isCommunityActive === false && userRole !== 'MANAGER') ? 0.6 : 1,
                    }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={(!input.trim() && !pendingImage) || uploadingImage || (!isDM(selectedClass) && selectedClass.isCommunityActive === false && userRole !== 'MANAGER')}
                  style={{
                    height: '44px', borderRadius: pendingImage ? '50px' : '50%', border: 'none',
                    width: pendingImage ? 'auto' : '44px',
                    padding: pendingImage ? '0 20px' : '0',
                    cursor: (input.trim() || pendingImage) ? 'pointer' : 'default',
                    background: (input.trim() || pendingImage) ? selectedClass.color : '#e8eaf0',
                    color: (input.trim() || pendingImage) ? '#fff' : '#9999b0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, gap: '6px',
                    boxShadow: (input.trim() || pendingImage) ? `0 4px 12px ${selectedClass.color}44` : 'var(--shadow-sm)',
                    transition: 'all 0.2s', fontWeight: '700', fontSize: '13px', fontFamily: 'inherit',
                  }}
                >
                  {pendingImage && <span>Send</span>}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
            )}
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
                          <span 
                            onClick={() => {
                              if (userRole === 'MANAGER') setSelectedUserDetailsId(msg.sender.id)
                            }}
                            style={{ 
                              fontSize: '12px', fontWeight: '700', color: '#1e1e3a',
                              cursor: userRole === 'MANAGER' ? 'pointer' : 'default',
                              textDecoration: userRole === 'MANAGER' ? 'underline' : 'none',
                              textUnderlineOffset: '2px'
                            }}
                          >
                            {msg.sender.name}
                          </span>
                          <span style={{ 
                            fontSize: '10px', 
                            background: 'linear-gradient(135deg, #3636e8, #6366f1)', 
                            color: '#fff', 
                            padding: '1px 8px', 
                            borderRadius: '50px', 
                            fontWeight: '800',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            textTransform: 'capitalize'
                          }}>
                            {msg.sender.role.toLowerCase()}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
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

      {selectedUserDetailsId && (
        <ManagerUserModal 
          userId={selectedUserDetailsId} 
          onClose={() => setSelectedUserDetailsId(null)} 
          onUpdate={() => {
            loadMessages(selectedClass?.id || '')
            if (transcriptOpen) openTranscript()
          }}
        />
      )}

      {/* New Direct Chat Modal */}
      {showNewDMModal && (
        <div className="modal-overlay" onClick={() => { setShowNewDMModal(false); setDmSearch(''); setDmResults([]) }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Start Direct Chat</h3>
              <button onClick={() => { setShowNewDMModal(false); setDmSearch(''); setDmResults([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b8a' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: '#6b6b8a', margin: 0 }}>
                Search for a student or admin to start a private direct chat. They will see your messages in the Community tab.
              </p>
              <input
                className="form-input"
                placeholder="Search by name or email..."
                value={dmSearch}
                autoFocus
                onChange={e => {
                  setDmSearch(e.target.value)
                  searchDMUsers(e.target.value)
                }}
              />
              {dmSearching && <div style={{ fontSize: '13px', color: '#9999b0' }}>Searching...</div>}
              {dmResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                  {dmResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => startDM(u.id)}
                      disabled={dmStarting}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', borderRadius: '14px', border: 'none',
                        cursor: dmStarting ? 'default' : 'pointer', textAlign: 'left',
                        background: '#e8eaf0', fontFamily: 'inherit',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'all 0.15s', opacity: dmStarting ? 0.6 : 1,
                      }}
                      onMouseEnter={e => { if (!dmStarting) (e.currentTarget as HTMLButtonElement).style.background = '#3636e8'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e8eaf0'; (e.currentTarget as HTMLButtonElement).style.color = '#1e1e3a' }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#3636e818', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: '#3636e8', flexShrink: 0 }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'inherit' }}>{u.name}</div>
                        <div style={{ fontSize: '11px', opacity: 0.6 }}>{u.email} · {u.role.charAt(0) + u.role.slice(1).toLowerCase()}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {dmSearch.length >= 2 && !dmSearching && dmResults.length === 0 && (
                <div style={{ fontSize: '13px', color: '#9999b0', textAlign: 'center', padding: '12px' }}>No users found matching "{dmSearch}"</div>
              )}
            </div>
          </div>
        </div>
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
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              cursor: 'default',
            }}
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
