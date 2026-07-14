'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ManagerUserModal from '@/components/ManagerUserModal'
import SwipeableMessage from './SwipeableMessage'

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
  isMuted?: boolean
}

interface CommMsg {
  id: string
  content: string
  imageUrl?: string | null
  createdAt: string
  isDeleted?: boolean
  deletedAt?: string | null
  isPinned?: boolean
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

interface SubjectStyle {
  gradient: string
  shadow: string
  iconType: 'initials' | 'atom' | 'scroll' | 'leaf' | 'flask'
}

function getSubjectStyle(name: string, index: number): SubjectStyle {
  const norm = name.toLowerCase()
  if (norm.includes('math')) {
    return {
      gradient: 'linear-gradient(135deg, #b58bfd 0%, #703bf7 100%)',
      shadow: 'rgba(112, 59, 247, 0.35)',
      iconType: 'initials',
    }
  }
  if (norm.includes('physic')) {
    return {
      gradient: 'linear-gradient(135deg, #ff9575 0%, #ff5c4d 100%)',
      shadow: 'rgba(255, 92, 77, 0.35)',
      iconType: 'atom',
    }
  }
  if (norm.includes('history') || norm.includes('histor')) {
    return {
      gradient: 'linear-gradient(135deg, #32e3a8 0%, #009688 100%)',
      shadow: 'rgba(0, 150, 136, 0.35)',
      iconType: 'scroll',
    }
  }
  if (norm.includes('biolog')) {
    return {
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #a855f7 100%)',
      shadow: 'rgba(244, 63, 94, 0.35)',
      iconType: 'leaf',
    }
  }
  if (norm.includes('chemist') || norm.includes('chem')) {
    return {
      gradient: 'linear-gradient(135deg, #ffd000 0%, #ff9100 100%)',
      shadow: 'rgba(255, 145, 0, 0.35)',
      iconType: 'flask',
    }
  }
  
  // Default gradients based on index
  const defaults: Omit<SubjectStyle, 'iconType'>[] = [
    { gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', shadow: 'rgba(29, 78, 216, 0.35)' },
    { gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', shadow: 'rgba(190, 24, 93, 0.35)' },
    { gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', shadow: 'rgba(4, 120, 87, 0.35)' },
    { gradient: 'linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)', shadow: 'rgba(91, 33, 182, 0.35)' },
    { gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', shadow: 'rgba(180, 83, 9, 0.35)' },
  ]
  const d = defaults[index % defaults.length]
  return {
    ...d,
    iconType: 'initials'
  }
}

function renderSubjectIcon(iconType: 'initials' | 'atom' | 'scroll' | 'leaf' | 'flask', name: string) {
  switch (iconType) {
    case 'atom':
      return (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(45 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-45 12 12)" />
        </svg>
      )
    case 'scroll':
      return (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      )
    case 'leaf':
      return (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 22C2 22 2 18 6 14C10 10 14 10 14 10C14 10 14 14 10 18C6 22 2 22 2 22Z" />
          <path d="M14 10L22 2" />
        </svg>
      )
    case 'flask':
      return (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h12" />
          <path d="M12 3v7" />
          <path d="M9 10h6" />
          <path d="M9 10L4 20a2 2 0 0 0 1.7 3h12.6a2 2 0 0 0 1.7-3L15 10" />
        </svg>
      )
    case 'initials':
    default:
      return <span style={{ fontSize: '24px', fontWeight: '800' }}>{name.substring(0, 2).toUpperCase()}</span>
  }
}

const LECTURE_LINK_REGEX = /\[LECTURE_COMMENT_LINK:courseId=([^;]+);lectureId=([^;]+);commentId=([^;\]]+)(?:;lectureTitle=([^\]]+))?\]/

function hasLectureLink(content: string): boolean {
  if (!content) return false
  return LECTURE_LINK_REGEX.test(content)
}

function cleanContent(content: string): string {
  if (!content) return ''
  return content.replace(LECTURE_LINK_REGEX, '').trim()
}

function parseLectureLink(content: string) {
  if (!content) return null
  const match = content.match(LECTURE_LINK_REGEX)
  if (!match) return null
  return {
    courseId: match[1],
    lectureId: match[2],
    commentId: match[3],
    lectureTitle: match[4] ? decodeURIComponent(match[4]) : 'Lecture'
  }
}

export default function CommunityPage() {
  const router = useRouter()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)
  
  const [isCapacitor, setIsCapacitor] = useState<boolean>(false)
  const [longPressedClass, setLongPressedClass] = useState<ClassItem | null>(null)
  
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasLongPressedRef = useRef<boolean>(false)

  useEffect(() => {
    const check = () => {
      const hasClass = document.documentElement.classList.contains('is-native')
      const hasWindow = !!(window as any).Capacitor?.isNativePlatform?.()
      if (hasClass || hasWindow) {
        setIsCapacitor(true)
        return true
      }
      return false
    }

    if (check()) return

    import('@capacitor/core').then(({ Capacitor }) => {
      if (Capacitor.isNativePlatform()) {
        setIsCapacitor(true)
      }
    }).catch(() => {})

    const intervalId = setInterval(() => {
      if (check()) {
        clearInterval(intervalId)
      }
    }, 100)

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId)
    }, 2000)

    return () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    }
  }, [])

  const handleTouchStart = (cls: ClassItem) => {
    hasLongPressedRef.current = false
    longPressTimerRef.current = setTimeout(() => {
      hasLongPressedRef.current = true
      setLongPressedClass(cls)
    }, 600)
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleCardClick = (cls: ClassItem) => {
    if (hasLongPressedRef.current) {
      hasLongPressedRef.current = false
      return
    }
    setSelectedClass(cls)
  }
  const [messages, setMessages] = useState<CommMsg[]>([])
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState('')
  const [userRole, setUserRole] = useState('STUDENT')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [managingCommunity, setManagingCommunity] = useState(false)
  
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)
  useEffect(() => {
    setIsMobile(window.innerWidth <= 768)
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
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
  const [selectedMessage, setSelectedMessage] = useState<CommMsg | null>(null)
  const [pinnedMessage, setPinnedMessage] = useState<CommMsg | null>(null)
  const [managerActionMessage, setManagerActionMessage] = useState<CommMsg | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Pagination & infinite scroll state
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const prevScrollHeightRef = useRef<number>(0)
  const shouldRestoreScrollRef = useRef<boolean>(false)
  const shouldScrollToBottomRef = useRef<boolean>(true)

  // Tagging state
  const [staff, setStaff] = useState<{
    id: string
    name: string
    role: string
    enrollments?: { courseId: string }[]
    instructorAssignments?: { courseId: string }[]
  }[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [tagSearchQuery, setTagSearchQuery] = useState('')
  const [tagTriggerIndex, setTagTriggerIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  const handleMarkAsRead = async (e: React.MouseEvent, classId: string) => {
    e.stopPropagation()
    setActiveMenuId(null)
    try {
      await fetch(`/api/community/${classId}/read`, { method: 'POST' })
      setClasses(prev => prev.map(c => c.id === classId ? { ...c, hasUnread: false } : c))
    } catch (err) {
      console.error('Failed to mark community as read', err)
    }
  }

  const handleOpenCoursePage = (e: React.MouseEvent, classId: string) => {
    e.stopPropagation()
    setActiveMenuId(null)
    router.push(`/courses/${classId}`)
  }

  const loadPinnedMessage = useCallback(async (classId: string) => {
    try {
      const res = await fetch(`/api/community/${classId}/messages/pinned`)
      if (res.ok) {
        const data = await res.json()
        setPinnedMessage(data?.pinnedMessage || null)
      } else {
        setPinnedMessage(null)
      }
    } catch (err) {
      console.error('Failed to load pinned message', err)
      setPinnedMessage(null)
    }
  }, [])

  const loadMessages = useCallback(async (classId: string) => {
    // Reset pagination states
    setHasMore(true)
    setLoadingMore(false)
    shouldRestoreScrollRef.current = false
    shouldScrollToBottomRef.current = true

    const url = classId.startsWith('dm_')
      ? `/api/community/${classId}/messages`
      : `/api/community/${classId}/messages?limit=50`

    const res = await fetch(url)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load messages')
    }
    const loaded = Array.isArray(data) ? data : []
    setMessages(loaded)

    if (classId.startsWith('dm_')) {
      setHasMore(false)
    } else {
      setHasMore(loaded.length >= 50)
    }
    
    // Fetch pinned message for community (non-blocking)
    if (!classId.startsWith('dm_')) {
      loadPinnedMessage(classId).catch(console.error)
    } else {
      setPinnedMessage(null)
    }
  }, [loadPinnedMessage])

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    if (container.scrollTop === 0 && !loadingMore && hasMore && messages.length > 0 && selectedClass) {
      if (messages[0].id.startsWith('temp-')) return

      setLoadingMore(true)
      prevScrollHeightRef.current = container.scrollHeight
      shouldRestoreScrollRef.current = true
      shouldScrollToBottomRef.current = false

      try {
        const oldestId = messages[0].id
        const res = await fetch(`/api/community/${selectedClass.id}/messages?cursor=${oldestId}&limit=50`)
        const data = await res.json().catch(() => ([]))
        if (res.ok && Array.isArray(data)) {
          if (data.length < 50) {
            setHasMore(false)
          }
          if (data.length > 0) {
            setMessages(prev => [...data, ...prev])
          } else {
            setHasMore(false)
          }
        }
      } catch (err) {
        console.error('Failed to load older messages', err)
      } finally {
        setLoadingMore(false)
      }
    }
  }

  const handlePinToggle = useCallback(async (messageId: string, pin: boolean) => {
    if (!selectedClass) return
    try {
      const action = pin ? 'pin' : 'unpin'
      const res = await fetch(`/api/community/${selectedClass.id}/messages/${messageId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Failed to ${action} message`)
      }
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : `Failed to ${pin ? 'pin' : 'unpin'} message`)
    }
  }, [selectedClass])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUserRole(d.user?.role || 'STUDENT')
      setUserId(d.user?.id || '')
      setUserName(d.user?.name || '')
    })
    
    // Fetch staff list for tagging
    fetch('/api/users/staff')
      .then(r => r.json())
      .then(d => setStaff(Array.isArray(d.staff) ? d.staff : []))
      .catch(console.error)
    
    // Parse query params to auto-focus the channel (e.g. from push notifications)
    let preferredId: string | undefined = undefined
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const course = searchParams.get('course')
      const dm = searchParams.get('dm')
      if (course) {
        preferredId = course
      } else if (dm) {
        preferredId = `dm_${dm}`
      }
    }
    loadClasses(preferredId)
  }, [])

  // Close tag suggestions on click outside
  useEffect(() => {
    if (!showTagSuggestions) return
    const close = () => setShowTagSuggestions(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [showTagSuggestions])

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
        if (match) return match
        // On mobile, never auto-open the first community — let the user pick from the list.
        // On desktop, fall back to the first community so the chat panel isn't empty.
        const isMobileNow = typeof window !== 'undefined' && window.innerWidth <= 768
        if (isMobileNow) return current
        return current || list[0] || null
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

    eventSource.addEventListener('pin', (e) => {
      try {
        const { messageId } = JSON.parse(e.data)
        setMessages(prev => prev.map(m => ({
          ...m,
          isPinned: m.id === messageId
        })))
        if (!messageId) {
          setPinnedMessage(null)
        } else {
          loadPinnedMessage(selectedClass.id).catch(console.error)
        }
      } catch (err) {
        console.error('SSE Pin Error', err)
      }
    })

    return () => eventSource.close()
  }, [selectedClass, loadMessages, loadPinnedMessage])

  useEffect(() => {
    if (shouldRestoreScrollRef.current && chatContainerRef.current) {
      const container = chatContainerRef.current
      const newScrollHeight = container.scrollHeight
      const diff = newScrollHeight - prevScrollHeightRef.current
      container.scrollTop = diff
      shouldRestoreScrollRef.current = false
    } else if (shouldScrollToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
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
      replyTo: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        imageUrl: replyingTo.imageUrl,
        sender: { id: replyingTo.sender.id, name: replyingTo.sender.name }
      } : undefined
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)

    const cursor = e.target.selectionStart || 0
    const textBeforeCursor = val.slice(0, cursor)
    const lastWord = textBeforeCursor.split(/\s/).pop() || ''
    if (lastWord.startsWith('@')) {
      const query = lastWord.slice(1)
      setShowTagSuggestions(true)
      setTagSearchQuery(query)
      setTagTriggerIndex(cursor - lastWord.length)
    } else {
      setShowTagSuggestions(false)
    }
  }

  const selectTagUser = (user: { id: string; name: string }) => {
    const val = input
    const cursor = inputRef.current?.selectionStart || 0
    const textBeforeTrigger = val.slice(0, tagTriggerIndex)
    const textAfterCursor = val.slice(cursor)
    
    const newText = `${textBeforeTrigger}@${user.name} ${textAfterCursor}`
    setInput(newText)
    setShowTagSuggestions(false)
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        const newCursorPos = tagTriggerIndex + user.name.length + 2 // trigger + name + space
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 50)
  }

  const filteredStaff = staff.filter(user => {
    if (!user.name.toLowerCase().includes(tagSearchQuery.toLowerCase())) {
      return false
    }
    // Managers are global and show up in all groups
    if (user.role === 'MANAGER') {
      return true
    }
    // Admins must be part of the current course group (enrolled or assigned)
    if (selectedClass && selectedClass.isDirectChat !== true) {
      const courseId = selectedClass.id
      const isEnrolled = user.enrollments?.some((e: any) => e.courseId === courseId)
      const isAssigned = user.instructorAssignments?.some((a: any) => a.courseId === courseId)
      return !!(isEnrolled || isAssigned)
    }
    return true
  })

  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  const linkifyText = (text: string) => {
    if (!text) return []
    const urlRegex = /(https?:\/\/[^\s]+)/gi
    const splitParts = text.split(urlRegex)
    
    return splitParts.map((subPart, i) => {
      if (subPart.match(urlRegex)) {
        return (
          <a
            key={`link-${i}-${Math.random()}`}
            href={subPart}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--primary)',
              textDecoration: 'underline',
              fontWeight: '600',
              cursor: 'pointer',
              wordBreak: 'break-all'
            }}
          >
            {subPart}
          </a>
        )
      }
      return subPart
    })
  }

  const renderMessageContent = (content: string) => {
    if (!content) return null
    if (staff.length === 0) {
      return linkifyText(content)
    }

    const sortedStaff = [...staff].sort((a, b) => b.name.length - a.name.length)
    let parts: (string | React.JSX.Element)[] = [content]

    for (const member of sortedStaff) {
      const tagStr = `@${member.name}`
      const nextParts: (string | React.JSX.Element)[] = []

      for (const part of parts) {
        if (typeof part !== 'string') {
          nextParts.push(part)
          continue
        }

        const regex = new RegExp(`(${escapeRegExp(tagStr)})`, 'gi')
        const splitPart = part.split(regex)

        for (const subPart of splitPart) {
          if (subPart.toLowerCase() === tagStr.toLowerCase()) {
            nextParts.push(
              <span key={`${member.id}-${Math.random()}`} style={{ color: 'var(--primary)', fontWeight: '800', cursor: 'pointer' }}>
                {subPart}
              </span>
            )
          } else {
            nextParts.push(subPart)
          }
        }
      }
      parts = nextParts
    }

    const finalParts: (string | React.JSX.Element)[] = []
    for (const part of parts) {
      if (typeof part !== 'string') {
        finalParts.push(part)
      } else {
        finalParts.push(...linkifyText(part))
      }
    }

    return finalParts
  }

  async function toggleMuteCourse(courseId: string, currentMuted: boolean) {
    // Optimistically update
    setClasses(prev => prev.map(c => c.id === courseId ? { ...c, isMuted: !currentMuted } : c))
    
    try {
      const res = await fetch(`/api/community/${courseId}/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muted: !currentMuted }),
      })
      if (!res.ok) {
        throw new Error('Failed to toggle mute')
      }
    } catch (err) {
      console.error(err)
      // Revert if failed
      setClasses(prev => prev.map(c => c.id === courseId ? { ...c, isMuted: currentMuted } : c))
      alert('Could not update notification settings.')
    }
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

  const neu = { background: 'var(--community-item-bg)', boxShadow: '6px 6px 12px var(--community-item-shadow-dark), -6px -6px 12px var(--community-item-shadow-light)' }
  const neuInset = { background: 'var(--community-item-bg)', boxShadow: 'inset 4px 4px 8px var(--community-item-shadow-dark), inset -4px -4px 8px var(--community-item-shadow-light)' }


  return (
    <div className="page-container fade-in" style={isMobile ? { display: 'flex', flexDirection: 'column', gap: '0px', padding: '12px', position: 'relative', boxSizing: 'border-box', overflowX: 'hidden' } : { display: 'flex', gap: '20px', height: 'calc(100vh - 120px)', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        .msg-row:hover .msg-actions { opacity: 1 !important; }
      `}</style>
      {confirmDialog}
      {activeMenuId && (
        <div
          onClick={() => setActiveMenuId(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
            background: 'transparent',
          }}
        />
      )}
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
            border: '1px solid var(--border)',
            color: 'var(--danger)',
            background: 'var(--danger-light)',
          }}
        >
          Failed to load community data. {loadError}
        </div>
      ) : null}

      {/* Left: Class list */}
      <div style={{ width: isMobile ? '100%' : '230px', flexShrink: 0, display: (isMobile && selectedClass) ? 'none' : 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '8px', overflowY: 'auto', overflowX: 'hidden', padding: isMobile ? '4px 4px 16px' : '0' }}>
        {isMobile && (
          /* Premium Neumorphic Page Header */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '10px',
            padding: '0 4px',
            justifyContent: 'flex-start'
          }}>
            <button
              onClick={() => router.back()}
              aria-label="Go Back"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--surface)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)',
                color: 'var(--text-secondary)',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '2px 2px 4px var(--neu-dark), -2px -2px 4px var(--neu-light)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontSize: '22px',
                fontWeight: 900,
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                fontFamily: "'Outfit', 'Nunito', sans-serif"
              }}>
                Community
              </h1>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                margin: '3px 0 0',
                fontFamily: "'Outfit', sans-serif"
              }}>
                Connect with your coursemates
              </p>
            </div>
          </div>
        )}
        {/* If Capacitor and Mobile, render grid */}
        {isCapacitor && isMobile ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '10px 2px 24px', overflow: 'hidden' }}>
            {classes.filter(cls => !cls.isDirectChat).map((cls, idx) => {
              const style = getSubjectStyle(cls.name, idx)
              const isMuted = cls.isMuted || false
              return (
                <div
                  key={cls.id}
                  onTouchStart={() => handleTouchStart(cls)}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={() => handleTouchStart(cls)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  onClick={() => handleCardClick(cls)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '22px 10px 18px',
                    borderRadius: '24px',
                    border: 'none',
                    background: 'var(--surface)',
                    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.04), 0 4px 10px rgba(15, 23, 42, 0.02)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    minWidth: 0,
                  }}
                >
                  {cls.hasUnread && (
                    <span style={{
                      position: 'absolute',
                      top: '14px',
                      right: '36px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      boxShadow: '0 0 6px #ef4444',
                      zIndex: 9
                    }} />
                  )}

                  <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenuId(activeMenuId === cls.id ? null : cls.id)
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '50%',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s',
                        width: '24px',
                        height: '24px',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    {activeMenuId === cls.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: '32px',
                          right: '0px',
                          background: 'var(--surface)',
                          borderRadius: '16px',
                          boxShadow: '0 10px 28px rgba(0,0,0,0.15)',
                          border: '1px solid rgba(0,0,0,0.06)',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          zIndex: 1000,
                          minWidth: '160px',
                          maxWidth: 'calc(100vw - 60px)',
                          alignItems: 'flex-start'
                        }}
                      >
                        <button
                          onClick={(e) => handleMarkAsRead(e, cls.id)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '10px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14.5px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          Mark as read
                        </button>
                        <button
                          onClick={(e) => handleOpenCoursePage(e, cls.id)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '10px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14.5px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          Open course page
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMuteCourse(cls.id, cls.isMuted || false)
                            setActiveMenuId(null)
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '10px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14.5px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          {cls.isMuted ? 'Unmute notification' : 'Mute notification'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    background: style.gradient,
                    boxShadow: `0 10px 24px ${style.shadow}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    marginBottom: '16px',
                    position: 'relative'
                  }}>
                    {renderSubjectIcon(style.iconType, cls.name)}

                    {cls.hasUnread && (
                      <span style={{
                        position: 'absolute',
                        top: '0px',
                        right: '0px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        boxShadow: '0 0 6px #ef4444'
                      }} />
                    )}

                    {isMuted && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        background: 'rgba(239, 68, 68, 0.95)',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4l5-5v20z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <span style={{
                    fontSize: '13.5px',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                    lineHeight: 1.25,
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    minWidth: 0,
                  }}>
                    {cls.name}
                  </span>
                </div>
              )
            })}
          </div>
          <p style={{
            textAlign: 'center',
            fontSize: '12.5px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            margin: '0 16px 8px',
            lineHeight: 1.5,
            opacity: 0.7,
          }}>
            Please click on any course tab to chat with mentor &amp; your course mates
          </p>
          </>
        ) : (
          <>
            {/* Groups header */}
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: isMobile ? '6px' : '4px', padding: '0 6px' }}>
              Communities
            </div>
            {classes.filter(cls => !cls.isDirectChat).map(cls => {
              const active = selectedClass?.id === cls.id
              return (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className={`community-channel-btn ${active ? 'active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: isMobile ? '14px' : '12px',
                  padding: isMobile ? '14px 16px' : '12px 16px',
                  borderRadius: isMobile ? '20px' : '18px', border: 'none',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  background: active ? cls.color : undefined,
                  color: active ? '#fff' : 'var(--community-item-text)',
                  boxShadow: active
                    ? `5px 5px 14px ${cls.color}55, -3px -3px 8px var(--community-item-shadow-light)`
                    : undefined,
                  position: 'relative',
                  minHeight: isMobile ? '64px' : 'auto',
                }}
              >
                {cls.hasUnread && !active && (
                  <div style={{ position: 'absolute', top: '10px', right: '12px', width: '9px', height: '9px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }} />
                )}
                <div style={{
                  width: isMobile ? '44px' : '34px', height: isMobile ? '44px' : '34px',
                  borderRadius: isMobile ? '14px' : '10px', flexShrink: 0,
                  background: active ? 'rgba(255,255,255,0.25)' : cls.color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMobile ? '14px' : '12px', fontWeight: '800',
                  color: active ? '#fff' : cls.color,
                }}>
                  {cls.name.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? '14.5px' : '13px', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cls.name}
                  </div>
                  {cls.subject && (
                    <div style={{ fontSize: isMobile ? '12px' : '11px', opacity: active ? 0.85 : 0.6, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {cls.subject}
                    </div>
                  )}
                  {userRole === 'MANAGER' && cls.isCommunityActive === false && (
                    <div style={{ fontSize: '10px', fontWeight: '800', marginTop: '4px', color: active ? '#fff' : 'var(--danger)' }}>
                      COMMUNITY OFF
                    </div>
                  )}
                </div>
                
                {/* Mute toggle button (bell icon) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleMuteCourse(cls.id, cls.isMuted || false)
                  }}
                  title={cls.isMuted ? 'Unmute Group' : 'Mute Group'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: active ? '#ffffff' : (cls.isMuted ? 'var(--danger)' : 'var(--text-muted)'),
                    opacity: cls.isMuted ? 1 : 0.4,
                    transition: 'opacity 0.2s, color 0.2s',
                    marginLeft: '4px',
                  }}
                  onMouseEnter={(e) => {
                    if (!cls.isMuted) e.currentTarget.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    if (!cls.isMuted) e.currentTarget.style.opacity = '0.4'
                  }}
                >
                  {cls.isMuted ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8v7a3 3 0 0 1-3 3h15" />
                      <path d="M18 8a6 6 0 0 0-9.33-5" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8v7a3 3 0 0 1-3 3h18a3 3 0 0 1-3-3V8z" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  )}
                </button>

                {isMobile && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#ffffff' : 'var(--text-muted)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: '4px' }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </button>
              )
            })}
          </>
        )}

        {/* Direct Messages section — hidden for students with zero DMs, and hidden entirely in native app */}
        {!isCapacitor && (userRole === 'MANAGER' || classes.some(cls => cls.isDirectChat)) && (
          <>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '12px 0 4px', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Direct Messages</span>
              {userRole === 'MANAGER' && (
                <button
                  onClick={() => setShowNewDMModal(true)}
                  title="New Direct Chat"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', padding: '2px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              )}
            </div>
            {classes.filter(cls => cls.isDirectChat).map(cls => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className={`dm-channel-btn ${selectedClass?.id === cls.id ? 'active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', borderRadius: '18px', border: 'none',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  background: selectedClass?.id === cls.id ? '#3636e8' : undefined,
                  color: selectedClass?.id === cls.id ? '#fff' : 'var(--community-item-text)',
                  boxShadow: selectedClass?.id === cls.id
                    ? '5px 5px 12px rgba(54,54,232,0.35), -3px -3px 8px var(--community-item-shadow-light)'
                    : undefined,
                  opacity: cls.isDmDisabled ? 0.55 : 1,
                  position: 'relative'
                }}
              >
                {cls.hasUnread && selectedClass?.id !== cls.id && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }} />
                )}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  background: selectedClass?.id === cls.id ? 'rgba(255,255,255,0.25)' : 'var(--primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '800',
                  color: selectedClass?.id === cls.id ? '#fff' : 'var(--primary)',
                }}>
                  {cls.name.replace('Chat with ', '').charAt(0).toUpperCase()}
                </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {cls.name.replace('Chat with ', '')}
                    {cls.role && cls.role !== 'STUDENT' && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ color: selectedClass?.id === cls.id ? '#fff' : 'var(--primary)' }}>
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
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '8px 10px' }}>
                {userRole === 'MANAGER' ? 'No active DMs — click + to start one' : 'No direct messages yet'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: Chat area */}
      <div style={{ 
        flex: 1, 
        borderRadius: isMobile ? '0' : '24px', 
        ...(isMobile ? {} : neu), 
        display: (isMobile && !selectedClass) ? 'none' : 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        minWidth: 0,
        ...(isMobile ? { height: '100vh', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: 'var(--surface)' } : {}),
      }}>
        {!selectedClass ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--text-muted)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <p style={{ fontWeight: '700' }}>Select a community</p>
          </div>
        ) : (
          <>
            {/* Header */}
            {selectedMessage ? (
              <div style={{ 
                padding: isMobile ? '12px 14px' : '16px 22px', 
                borderBottom: '1.5px solid rgba(0,0,0,0.06)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                background: 'var(--primary-light)', // Vibrant light indigo highlight for selection
                transition: 'all 0.3s ease',
              }}>
                <button
                  onClick={() => setSelectedMessage(null)}
                  title="Cancel selection"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'var(--surface)',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
                    color: 'var(--primary)',
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '850', fontSize: '16px', color: 'var(--text-primary)' }}>
                    1 message selected
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {/* Reply Button */}
                  <button
                    onClick={() => {
                      setReplyingTo(selectedMessage)
                      setSelectedMessage(null)
                    }}
                    title="Reply to message"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'var(--surface)',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '2px 2px 5px rgba(0,0,0,0.08), -2px -2px 5px var(--neu-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 17 4 12 9 7"/>
                      <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                    </svg>
                  </button>

                  {/* Copy Button */}
                  {selectedMessage.content && (
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(selectedMessage.content)
                        }
                        setSelectedMessage(null)
                      }}
                      title="Copy content"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'var(--surface)',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '2px 2px 5px rgba(0,0,0,0.08), -2px -2px 5px var(--neu-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  )}

                  {/* Delete Button */}
                  {(userRole === 'MANAGER' || selectedMessage.sender.id === userId) && !selectedMessage.id.startsWith('temp-') && (
                    <button
                      onClick={() => {
                        deleteMessage(selectedMessage.id)
                        setSelectedMessage(null)
                      }}
                      title="Delete message"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'var(--danger-light)',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '2px 2px 5px rgba(239,68,68,0.15), -2px -2px 5px var(--neu-light)',
                        color: 'var(--danger)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/>
                        <path d="M14 11v6"/>
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: isMobile ? '12px 14px' : '16px 22px', borderBottom: '1.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px', flexWrap: 'wrap' }}>
                {isMobile && (
                  <button
                    onClick={() => setSelectedClass(null)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: 'var(--surface)',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
                      color: 'var(--text-secondary)',
                      marginRight: '4px',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"/>
                      <polyline points="12 19 5 12 12 5"/>
                    </svg>
                  </button>
                )}
                <div style={{
                  width: isMobile ? '36px' : '40px', height: isMobile ? '36px' : '40px', borderRadius: isDM(selectedClass) ? '50%' : '12px',
                  background: selectedClass.color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '800', color: selectedClass.color,
                  flexShrink: 0,
                }}>
                  {isDM(selectedClass)
                    ? selectedClass.name.replace('Chat with ', '').charAt(0).toUpperCase()
                    : selectedClass.name.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '800', fontSize: isMobile ? '15px' : '16px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isDM(selectedClass) ? selectedClass.name.replace('Chat with ', '') : selectedClass.name}
                  </div>
                  {isDM(selectedClass) ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Direct Message</div>
                  ) : selectedClass.subject && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedClass.subject} · Community Chat</div>
                  )}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                  {!isDM(selectedClass) && selectedClass.isCommunityActive === false && (
                    <span style={{ padding: '4px 10px', borderRadius: '50px', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: '11px', fontWeight: '700' }}>
                      Off
                    </span>
                  )}
                  {isDM(selectedClass) && selectedClass.isDmDisabled && (
                    <span style={{ padding: '4px 10px', borderRadius: '50px', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: '11px', fontWeight: '700' }}>
                      Hidden
                    </span>
                  )}
                  {userRole === 'MANAGER' && (
                    <>
                      <button onClick={openTranscript} style={{ padding: '6px 12px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700', ...neu, boxShadow: '4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)', color: 'var(--primary)' }}>
                        Transcript
                      </button>
                      {!isDM(selectedClass) && (
                        <button
                          onClick={toggleCommunityStatus}
                          disabled={managingCommunity}
                          style={{
                            padding: '6px 12px', borderRadius: '50px', border: 'none',
                            cursor: managingCommunity ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700',
                            background: selectedClass.isCommunityActive === false ? 'var(--success)' : 'var(--warning)',
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
                            background: selectedClass.isDmDisabled ? 'var(--success)' : 'var(--warning)',
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
                          background: 'var(--danger)', color: '#fff',
                          boxShadow: '4px 4px 10px rgba(239,68,68,0.25)',
                          opacity: managingCommunity || messages.length === 0 ? 0.5 : 1,
                        }}
                      >
                        Clear Chat
                      </button>
                    </>
                  )}
                  <div style={{ position: 'relative', zIndex: 10 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenuId(activeMenuId === 'active-header' ? null : 'active-header')
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '50%',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s',
                        width: '36px',
                        height: '36px',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    {activeMenuId === 'active-header' && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: '40px',
                          right: '0px',
                          background: 'var(--surface)',
                          borderRadius: '16px',
                          boxShadow: '0 10px 28px rgba(0,0,0,0.15)',
                          border: '1px solid rgba(0,0,0,0.06)',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          zIndex: 1000,
                          minWidth: '185px',
                          alignItems: 'flex-start'
                        }}
                      >
                        <button
                          onClick={(e) => handleMarkAsRead(e, selectedClass.id)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '10px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14.5px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          Mark as read
                        </button>
                        <button
                          onClick={(e) => handleOpenCoursePage(e, selectedClass.id)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '10px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14.5px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          Open course page
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMuteCourse(selectedClass.id, selectedClass.isMuted || false)
                            setActiveMenuId(null)
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '10px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14.5px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          {selectedClass.isMuted ? 'Unmute notification' : 'Mute notification'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pinned Message Banner */}
            {!isDM(selectedClass) && pinnedMessage && (
              <div 
                onClick={() => {
                  const el = document.getElementById(`msg-${pinnedMessage.id}`)
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  } else {
                    alert('Pinned message is older and not loaded. Scroll up to load older messages.')
                  }
                }}
                style={{
                  background: 'var(--surface)',
                  borderBottom: '1px solid var(--border)',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  zIndex: 2,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" style={{ flexShrink: 0, transform: 'rotate(45deg)' }}>
                  <line x1="12" y1="17" x2="12" y2="22"/>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.26V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.26a2 2 0 0 1-.78 1.24l-2.78 3.5a2 2 0 0 0-.44 1.24z"/>
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Pinned Message
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>
                    <strong>{pinnedMessage.sender.name}: </strong>
                    {hasLectureLink(pinnedMessage.content) ? `💬 Comment: ${cleanContent(pinnedMessage.content)}` : pinnedMessage.content || (pinnedMessage.imageUrl ? '📷 Photo' : '')}
                  </div>
                </div>
                {userRole === 'MANAGER' && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      await handlePinToggle(pinnedMessage.id, false)
                    }}
                    title="Unpin message"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '4px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            )}

            {/* Messages */}
            <div 
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="chat-wallpaper" 
              style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {loadingMore && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
                  Loading older messages...
                </div>
              )}
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
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

                if (msg.isDeleted && userRole !== 'MANAGER') {
                  return (
                    <React.Fragment key={msg.id}>
                      {showDateHeader && (
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 12px' }}>
                          <span style={{
                            padding: '4px 14px', borderRadius: '50px',
                            background: 'rgba(0,0,0,0.04)', color: 'var(--text-secondary)',
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
                            background: 'var(--surface-2)',
                            boxShadow: '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
                            display: showAvatar ? 'flex' : 'none',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)',
                          }}>
                            {msg.sender.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {!isMe && !showAvatar && <div style={{ width: '32px', flexShrink: 0 }} />}
                        <div style={{
                          padding: '8px 14px', borderRadius: '14px',
                          background: 'transparent',
                          border: '1.5px dashed var(--neu-dark)',
                          color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic',
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
                          background: 'rgba(0,0,0,0.04)', color: 'var(--text-secondary)',
                          fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
                        }}>
                          {formatMessageDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div id={`msg-${msg.id}`} className="msg-row" style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-end', marginBottom: showAvatar ? '6px' : '1px' }}>
                      {/* Avatar */}
                      {!isMe && (
                        <div 
                          onClick={() => userRole === 'MANAGER' && setSelectedUserDetailsId(msg.sender.id)}
                          style={{
                            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                            background: isAdmin ? 'var(--primary)' : 'var(--surface-2)',
                            boxShadow: isAdmin ? '0 2px 8px rgba(54,54,232,0.2)' : '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
                            display: showAvatar ? 'flex' : 'none',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: '800',
                            color: isAdmin ? '#fff' : 'var(--text-secondary)',
                            cursor: userRole === 'MANAGER' ? 'pointer' : 'default',
                          }}
                        >
                          {msg.sender.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {!isMe && !showAvatar && <div style={{ width: '32px', flexShrink: 0 }} />}

                      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row', width: '100%', maxWidth: '100%', minWidth: 0 }}>
                          <SwipeableMessage
                            onSwipeTrigger={() => setReplyingTo(msg)}
                            onLongPress={() => {
                              if (userRole === 'MANAGER') {
                                setManagerActionMessage(msg)
                              } else {
                                setSelectedMessage(msg)
                              }
                            }}
                            isMe={isMe}
                            disabled={msg.id.startsWith('temp-')}
                          >
                            <div style={{
                              padding: msg.imageUrl ? '5px 5px 15px 5px' : '7px 12px 15px 12px',
                              borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              background: selectedMessage?.id === msg.id
                                ? '#d0e1fd'
                                : isMe ? '#dcf8c6' : isAdmin ? '#e0e7ff' : '#ffffff',
                              color: '#1e1e3a',
                              fontSize: '14px', lineHeight: '1.5',
                              boxShadow: selectedMessage?.id === msg.id
                                ? '0 0 0 2.5px #3636e8, 0 4px 12px rgba(54,54,232,0.2)'
                                : '0 2px 4px rgba(0,0,0,0.05)',
                              minWidth: '80px',
                              maxWidth: '100%',
                              border: selectedMessage?.id === msg.id
                                ? 'none'
                                : isMe ? 'none' : '1px solid #e8eaf0',
                              position: 'relative',
                              transition: 'all 0.2s',
                            }}>
                              {/* Pinned indicator inside bubble */}
                              {msg.isPinned && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontSize: '11px', color: 'var(--primary)', fontWeight: '700' }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transform: 'rotate(45deg)', flexShrink: 0 }}>
                                    <line x1="12" y1="17" x2="12" y2="22"/>
                                    <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.26V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.26a2 2 0 0 1-.78 1.24l-2.78 3.5a2 2 0 0 0-.44 1.24z"/>
                                  </svg>
                                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pinned</span>
                                </div>
                              )}
                              {/* Reply info */}
                              {msg.replyTo && (
                                <div 
                                  onClick={() => {
                                    const el = document.getElementById(`msg-${msg.replyTo!.id}`)
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                  }}
                                  style={{
                                    background: isMe ? 'rgba(0,0,0,0.06)' : 'rgba(54,54,232,0.04)',
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    borderLeft: `4px solid ${isAdmin ? 'var(--primary)' : 'var(--text-secondary)'}`,
                                    marginBottom: '8px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    borderTop: '1px solid rgba(0,0,0,0.02)',
                                    borderRight: '1px solid rgba(0,0,0,0.02)',
                                    borderBottom: '1px solid rgba(0,0,0,0.02)',
                                    transition: 'all 0.2s',
                                    maxWidth: '100%',
                                    minWidth: 0,
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = isMe ? 'rgba(0,0,0,0.1)' : 'rgba(54,54,232,0.08)'}
                                  onMouseLeave={e => e.currentTarget.style.background = isMe ? 'rgba(0,0,0,0.06)' : 'rgba(54,54,232,0.04)'}
                                >
                                  <div style={{ fontWeight: '800', color: isAdmin ? 'var(--primary)' : '#555', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{msg.replyTo.sender.name}</span>
                                  </div>
                                  <div style={{ color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', fontSize: '11.5px', lineHeight: '1.4' }}>
                                    {hasLectureLink(msg.replyTo.content) ? `💬 Comment: ${cleanContent(msg.replyTo.content)}` : msg.replyTo.content || (msg.replyTo.imageUrl ? '📷 Image' : 'Message')}
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
                                      color: isAdmin ? 'var(--primary)' : '#888',
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
                                <div>
                                  {hasLectureLink(msg.content) ? (() => {
                                    const parsed = parseLectureLink(msg.content)
                                    if (!parsed) return null
                                    const cleanedText = cleanContent(msg.content)
                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '8px' }}>
                                        <div style={{ fontSize: '12px', color: 'rgba(30, 30, 58, 0.7)', fontWeight: '600' }}>
                                          Commented on <strong>{parsed.lectureTitle}</strong>:
                                        </div>
                                        <div style={{
                                          background: 'rgba(54, 54, 232, 0.05)',
                                          borderLeft: '3px solid #3636e8',
                                          padding: '8px 12px',
                                          borderRadius: '6px',
                                          fontSize: '13px',
                                          lineHeight: '1.4',
                                          color: '#1e1e3a',
                                          fontStyle: 'italic',
                                          wordBreak: 'break-word',
                                          whiteSpace: 'pre-wrap',
                                        }}>
                                          "{cleanedText}"
                                        </div>
                                        <button
                                          onClick={() => {
                                            router.push(`/courses/${parsed.courseId}/lectures/${parsed.lectureId}?commentId=${parsed.commentId}`)
                                          }}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            alignSelf: 'flex-start',
                                            gap: '5px',
                                            marginTop: '2px',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            background: 'linear-gradient(135deg, #3636e8, #6366f1)',
                                            color: '#ffffff',
                                            border: 'none',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            boxShadow: '0 3px 8px rgba(54,54,232,0.2)',
                                            transition: 'all 0.2s',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-1px)'
                                            e.currentTarget.style.boxShadow = '0 5px 12px rgba(54,54,232,0.3)'
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)'
                                            e.currentTarget.style.boxShadow = '0 3px 8px rgba(54,54,232,0.2)'
                                          }}
                                        >
                                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                          </svg>
                                          View Comments
                                        </button>
                                      </div>
                                    )
                                  })() : (
                                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                      {renderMessageContent(msg.content)}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Time inside bubble */}
                              <div style={{ 
                                position: 'absolute', bottom: '2px', right: '10px', 
                                fontSize: '10px', color: isMe ? '#4a7c44' : 'var(--text-muted)', 
                                display: 'flex', alignItems: 'center', gap: '3px',
                                fontWeight: '600',
                              }}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {isMe && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                )}
                                {msg.isDeleted && (
                                  <span style={{ fontSize: '9px', background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '50px', fontWeight: '800' }}>
                                    Deleted
                                  </span>
                                )}
                              </div>
                            </div>
                          </SwipeableMessage>

                          {/* Message Actions (Visible on Hover/Right Side) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', opacity: 0, transition: 'opacity 0.2s' }} className="msg-actions">
                            {(userRole === 'MANAGER' || isMe) && !msg.isDeleted && !msg.id.startsWith('temp-') && (
                              <button
                                onClick={() => deleteMessage(msg.id)}
                                disabled={deletingId === msg.id}
                                style={{
                                  width: '24px', height: '24px', borderRadius: '50%',
                                  border: 'none', cursor: 'pointer',
                                  background: 'var(--surface)',
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
                                background: 'var(--surface)',
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
              <div style={{ padding: '14px 20px', borderTop: '1.5px solid rgba(0,0,0,0.06)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '6px', opacity: 0.6 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                This community is currently disabled.
              </div>
            ) : (
            <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
              {/* Reply Preview */}
              {replyingTo && (
                <div style={{ 
                  marginBottom: '8px', padding: '10px 14px', 
                  background: 'var(--primary-light)', borderRadius: '12px',
                  borderLeft: '4px solid #3636e8',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '12px'
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '800', color: 'var(--primary)', marginBottom: '2px' }}>Replying to {replyingTo.sender.name}</div>
                    <div style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {replyingTo.content || 'Image'}
                    </div>
                  </div>
                  <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              )}

              {/* Image preview */}
              {pendingImagePreview && (
                <div style={{ 
                  marginBottom: '10px', position: 'relative', display: 'inline-flex', 
                  alignItems: 'flex-end', gap: '8px', padding: '10px 14px', 
                  borderRadius: '16px', background: 'var(--primary-light)', 
                  border: '2px solid #3636e830',
                  boxShadow: '0 4px 12px rgba(54,54,232,0.1)',
                }}>
                  <img src={pendingImagePreview} alt="Preview" style={{ maxHeight: '100px', maxWidth: '200px', borderRadius: '10px', objectFit: 'cover' }} />
                  <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>📎 Ready to send</div>
                  <button
                    onClick={clearPendingImage}
                    style={{
                      position: 'absolute', top: '-8px', right: '-8px',
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: 'var(--danger)', color: '#fff', border: '2px solid var(--border)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: '800', boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                    }}
                  >✕</button>
                </div>
              )}
              {uploadingImage && (
                <div style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>
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
                    background: pendingImage ? 'var(--primary-light)' : 'var(--surface-2)',
                    boxShadow: '4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: pendingImage ? 'var(--primary)' : 'var(--text-muted)',
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
                  {showTagSuggestions && filteredStaff.length > 0 && !isDM(selectedClass) && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '12px',
                      marginBottom: '8px',
                      background: 'var(--community-item-bg)',
                      border: '1.5px solid rgba(0,0,0,0.08)',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 10,
                      width: '280px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      {filteredStaff.map((user) => (
                        <button
                          key={user.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            selectTagUser(user)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            color: 'var(--community-item-text)',
                            borderBottom: '1px solid rgba(0,0,0,0.02)',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(54,54,232,0.08)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#3636e822',
                            color: '#3636e8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '800',
                          }}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {user.name}
                            </div>
                            <div style={{ fontSize: '10px', color: '#9999b0', textTransform: 'capitalize' }}>
                              {user.role.toLowerCase()}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setShowTagSuggestions(false)
                      } else if (e.key === 'Enter' && !e.shiftKey) {
                        sendMessage()
                      }
                    }}
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
                      ...neuInset, color: 'var(--text-primary)',
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
                    background: (input.trim() || pendingImage) ? selectedClass.color : 'var(--surface-2)',
                    color: (input.trim() || pendingImage) ? '#fff' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, gap: '6px',
                    boxShadow: (input.trim() || pendingImage) ? `4px 4px 10px ${selectedClass.color}55` : '4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)',
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
              <button onClick={() => setTranscriptOpen(false)} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
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
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading transcript...</div>
                ) : transcriptMessages.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No transcript messages found for this group.</div>
                ) : (
                  transcriptMessages.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: msg.isDeleted ? 'var(--danger-light)' : 'var(--surface)',
                        border: msg.isDeleted ? '1px solid var(--border)' : '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span 
                            onClick={() => {
                              if (userRole === 'MANAGER') setSelectedUserDetailsId(msg.sender.id)
                            }}
                            style={{ 
                              fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)',
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
                            <span style={{ fontSize: '10px', background: 'var(--warning-light)', color: 'var(--warning)', padding: '1px 6px', borderRadius: '50px', fontWeight: '700' }}>
                              {msg.sender.securityNumber}
                            </span>
                          )}
                          {msg.isDeleted && (
                            <span style={{ fontSize: '10px', background: 'var(--danger-light)', color: 'var(--danger)', padding: '1px 6px', borderRadius: '50px', fontWeight: '700' }}>
                              Deleted
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {new Date(msg.createdAt).toLocaleString()}
                          {msg.deletedAt ? ` • Deleted ${new Date(msg.deletedAt).toLocaleString()}` : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
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

      {/* Manager Message Action Modal */}
      {managerActionMessage && (
        <div className="modal-overlay" onClick={() => setManagerActionMessage(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px', padding: '16px', borderRadius: '24px' }}>
            <div className="modal-header" style={{ padding: '0 4px 12px 4px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Message Options</h3>
              <button onClick={() => setManagerActionMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0 4px 0' }}>
              {/* Pin / Unpin option */}
              {!isDM(selectedClass) && (
                <button
                  onClick={async () => {
                    const msg = managerActionMessage;
                    setManagerActionMessage(null);
                    await handlePinToggle(msg.id, !msg.isPinned);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', border: 'none', width: '100%',
                    cursor: 'pointer', textAlign: 'left',
                    borderRadius: '12px',
                    background: 'transparent', fontFamily: 'inherit',
                    fontSize: '14px', fontWeight: '700',
                    color: 'var(--primary)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(45deg)' }}>
                    <line x1="12" y1="17" x2="12" y2="22"/>
                    <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.26V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.26a2 2 0 0 1-.78 1.24l-2.78 3.5a2 2 0 0 0-.44 1.24z"/>
                  </svg>
                  {managerActionMessage.isPinned ? 'Unpin Message' : 'Pin Message'}
                </button>
              )}

              {/* Reply option */}
              <button
                onClick={() => {
                  const msg = managerActionMessage;
                  setManagerActionMessage(null);
                  setReplyingTo(msg);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', border: 'none', width: '100%',
                  cursor: 'pointer', textAlign: 'left',
                  borderRadius: '12px',
                  background: 'transparent', fontFamily: 'inherit',
                  fontSize: '14px', fontWeight: '700',
                  color: 'var(--text-primary)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 17 4 12 9 7"/>
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                </svg>
                Reply
              </button>

              {/* Delete option */}
              {!managerActionMessage.id.startsWith('temp-') && (
                <button
                  onClick={async () => {
                    const msgId = managerActionMessage.id;
                    setManagerActionMessage(null);
                    await deleteMessage(msgId);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', border: 'none', width: '100%',
                    cursor: 'pointer', textAlign: 'left',
                    borderRadius: '12px',
                    background: 'transparent', fontFamily: 'inherit',
                    fontSize: '14px', fontWeight: '700',
                    color: 'var(--danger)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--danger-light)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                  Delete Message
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Direct Chat Modal */}
      {showNewDMModal && (
        <div className="modal-overlay" onClick={() => { setShowNewDMModal(false); setDmSearch(''); setDmResults([]) }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Start Direct Chat</h3>
              <button onClick={() => { setShowNewDMModal(false); setDmSearch(''); setDmResults([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
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
              {dmSearching && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Searching...</div>}
              {dmResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                  {dmResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => startDM(u.id)}
                      disabled={dmStarting}
                      className="modal-user-btn"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', borderRadius: '14px', border: 'none',
                        cursor: dmStarting ? 'default' : 'pointer', textAlign: 'left',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s', opacity: dmStarting ? 0.6 : 1,
                      }}
                      onMouseEnter={e => { if (!dmStarting) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = ''; }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: 'var(--primary)', flexShrink: 0 }}>
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
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No users found matching "{dmSearch}"</div>
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

      {longPressedClass && (
        <div 
          className="modal-overlay fade-in" 
          onClick={() => setLongPressedClass(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div 
            className="bottom-sheet-content"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '450px',
              background: 'var(--surface)',
              borderRadius: '32px 32px 0 0',
              padding: '24px 20px 40px',
              boxShadow: '0 -10px 25px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ width: '36px', height: '4px', background: 'var(--text-muted)', opacity: 0.3, borderRadius: '2px', alignSelf: 'center', marginBottom: '8px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '18px',
                background: getSubjectStyle(longPressedClass.name, 0).gradient,
                boxShadow: `0 8px 20px ${getSubjectStyle(longPressedClass.name, 0).shadow}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '18px',
                fontWeight: '800'
              }}>
                {renderSubjectIcon(getSubjectStyle(longPressedClass.name, 0).iconType, longPressedClass.name)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)' }}>{longPressedClass.name}</h4>
                {longPressedClass.subject && <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{longPressedClass.subject}</p>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Mute Notifications */}
              <button
                onClick={async () => {
                  const isCurrentlyMuted = longPressedClass.isMuted || false
                  await toggleMuteCourse(longPressedClass.id, isCurrentlyMuted)
                  setLongPressedClass(null)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px', borderRadius: '20px', border: 'none',
                  background: 'var(--surface-2)', color: 'var(--text-primary)',
                  fontWeight: 700, fontSize: '14.5px', cursor: 'pointer',
                  textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ color: longPressedClass.isMuted ? 'var(--success)' : 'var(--danger)', display: 'flex' }}>
                  {longPressedClass.isMuted ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8v7a3 3 0 0 1-3 3h18a3 3 0 0 1-3-3V8z" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8v7a3 3 0 0 1-3 3h15" />
                      <path d="M18 8a6 6 0 0 0-9.33-5" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </div>
                <span>{longPressedClass.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
              </button>

              {/* Mark all messages as read */}
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/community/${longPressedClass.id}/read`, { method: 'POST' })
                    if (res.ok) {
                      setClasses(prev => prev.map(c => c.id === longPressedClass.id ? { ...c, hasUnread: false } : c))
                    }
                  } catch (e) { console.error(e) }
                  setLongPressedClass(null)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px', borderRadius: '20px', border: 'none',
                  background: 'var(--surface-2)', color: 'var(--text-primary)',
                  fontWeight: 700, fontSize: '14.5px', cursor: 'pointer',
                  textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ color: 'var(--info)', display: 'flex' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                    <polyline points="20 12 13 19 8 14" />
                  </svg>
                </div>
                <span>Mark all messages as read</span>
              </button>

              {/* View course materials */}
              <button
                onClick={() => {
                  setLongPressedClass(null)
                  router.push(`/courses/${longPressedClass.id}`)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px', borderRadius: '20px', border: 'none',
                  background: 'var(--surface-2)', color: 'var(--text-primary)',
                  fontWeight: 700, fontSize: '14.5px', cursor: 'pointer',
                  textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ color: 'var(--accent)', display: 'flex' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
                <span>View course materials</span>
              </button>
            </div>

            <button
              onClick={() => setLongPressedClass(null)}
              style={{
                marginTop: '8px',
                padding: '16px', borderRadius: '20px', border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text-secondary)',
                fontWeight: 700, fontSize: '14.5px', cursor: 'pointer',
                textAlign: 'center', width: '100%',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
