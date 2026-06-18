'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import CustomVideoPlayer, { extractYouTubeId } from '@/components/courses/CustomVideoPlayer'
import { 
  Play, 
  ChevronLeft, 
  Download, 
  MessageSquare, 
  Send, 
  User, 
  CornerDownRight, 
  Clock, 
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface Comment {
  id: string
  content: string
  userId: string
  parentId: string | null
  createdAt: string
  user: {
    id: string
    name: string
    avatar: string | null
    role: string
  }
  replies: Comment[]
}

interface ContentItem {
  id: string
  title: string
  description?: string
  videoUrl?: string
  videoSource: string
  pptUrl?: string
  topic: {
    id: string
    title: string
    course: {
      id: string
      name: string
      color: string
    }
  }
}

export default function LecturePage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<ContentItem | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const videoIframeRef = useRef<HTMLIFrameElement>(null)
  const videoWrapperRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)
  const [isNativeApp, setIsNativeApp] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'qa'>('info')

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768)
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const detectNativeApp = () => {
      const w = window as any
      setIsNativeApp(
        document.documentElement.classList.contains('is-native') ||
        Boolean(w.Capacitor?.isNativePlatform?.() || w.Capacitor?.isNative)
      )
    }

    detectNativeApp()
    const observer = new MutationObserver(detectNativeApp)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  function isDriveSource(url: string | undefined, source: string | undefined) {
    if (source === 'GOOGLE_DRIVE') return true
    if (!url) return false
    return /drive\.google\.com|docs\.google\.com/i.test(url)
  }

  const fetchData = useCallback(async () => {
    try {
      const [contentRes, sessionRes] = await Promise.all([
        fetch(`/api/content/${params.lectureId}`),
        fetch('/api/auth/me')
      ])
      
      if (!contentRes.ok) {
        router.push(`/courses/${params.id}`)
        return
      }

      const contentData = await contentRes.json()
      const sessionData = await sessionRes.json()

      setContent(contentData)
      setCurrentUser(sessionData.user)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [params.id, params.lectureId, router])

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/content/${params.lectureId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCommentsLoading(false)
    }
  }, [params.lectureId])

  useEffect(() => {
    fetchData()
    fetchComments()

    // Mark as in-progress when viewed
    if (params.lectureId) {
      fetch('/api/lectures/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contentId: params.lectureId, 
          status: 'IN_PROGRESS' 
        })
      }).catch(err => console.error('Failed to update progress:', err))
    }
  }, [fetchData, fetchComments, params.lectureId])

  const getEmbedUrl = (url: string | undefined, source: string) => {
    if (!url) return ''
    const u = url.trim()

    // ── YouTube auto-detection (handles youtu.be, youtube.com/watch, /embed, /shorts, m.youtube.com)
    const ytPatterns = [
      /(?:youtu\.be\/)([\w-]+)/,
      /(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?v=|embed\/|shorts\/|v\/|live\/)([\w-]+)/,
      /(?:m\.youtube\.com)\/(?:watch\?v=|embed\/|shorts\/|live\/)([\w-]+)/,
    ]
    const isYoutubeUrl = /youtu\.?be/i.test(u)
    if (source === 'YOUTUBE' || isYoutubeUrl) {
      for (const re of ytPatterns) {
        const m = u.match(re)
        if (m) {
          // Minimal-chrome YouTube embed:
          //   youtube-nocookie.com  → no tracking, cleaner UI
          //   rel=0                 → only same-channel suggestions
          //   modestbranding=1      → small/no YouTube logo
          //   iv_load_policy=3      → no annotations
          //   cc_load_policy=0      → no auto-captions
          //   playsinline=1         → inline on iOS, not forced FS
          //   showinfo=0            → hide title (deprecated but honored)
          //   disablekb=1           → block YouTube keyboard shortcuts
          //   fs=1                  → fullscreen still allowed
          //   color=white           → minimal red progress bar
          const params = new URLSearchParams({
            rel: '0', modestbranding: '1', iv_load_policy: '3', cc_load_policy: '0',
            playsinline: '1', showinfo: '0', disablekb: '1', fs: '1',
          })
          return `https://www.youtube-nocookie.com/embed/${m[1]}?${params.toString()}`
        }
      }
    }

    // ── Google Drive auto-detection
    // Supports: /file/d/{ID}/view, /file/d/{ID}/preview, ?id={ID}, /uc?id={ID}
    const isDriveUrl = /drive\.google\.com|docs\.google\.com/i.test(u)
    if (source === 'GOOGLE_DRIVE' || isDriveUrl) {
      const fileIdMatch = u.match(/\/d\/([\w-]+)/) || u.match(/[?&]id=([\w-]+)/)
      if (fileIdMatch) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
      }
    }

    return u
  }

  const handlePostComment = async (parentId: string | null = null) => {
    const text = parentId ? replyText : newComment
    if (!text.trim()) return

    try {
      const res = await fetch(`/api/content/${params.lectureId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, parentId }),
      })

      if (res.ok) {
        setNewComment('')
        setReplyTo(null)
        setReplyText('')
        fetchComments() // Refresh comments
      }
    } catch (e) {
      console.error(e)
    }
  }

  const renderComments = (commentList: Comment[], depth = 0) => {
    return commentList.map(comment => (
      <div key={comment.id} style={{ 
        marginLeft: depth > 0 ? '40px' : '0', 
        marginTop: '16px',
        borderLeft: depth > 0 ? '2px solid var(--border)' : 'none',
        paddingLeft: depth > 0 ? '16px' : '0'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', 
            background: 'var(--surface-2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {comment.user.avatar ? (
              <img src={comment.user.avatar} alt={comment.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={20} color="#94a3b8" />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{comment.user.name}</span>
              {comment.user.role !== 'STUDENT' && (
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
                  {comment.user.role.toLowerCase()}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              )}
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {new Date(comment.createdAt).toLocaleDateString('en-GB')}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '4px 0' }}>{comment.content}</p>
            <button 
              onClick={() => {
                setReplyTo(comment.id)
                setReplyText('')
              }}
              style={{ 
                background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', 
                fontWeight: '600', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', gap: '4px',
                marginTop: '4px'
              }}
            >
              <CornerDownRight size={12} />
              Reply
            </button>

            {replyTo === comment.id && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  style={{ 
                    flex: 1, padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)',
                    fontSize: '13px', outline: 'none'
                  }}
                  autoFocus
                />
                <button 
                  onClick={() => handlePostComment(comment.id)}
                  style={{ 
                    background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '50px', 
                    width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <Send size={16} />
                </button>
                <button 
                  onClick={() => setReplyTo(null)}
                  style={{ 
                    background: 'var(--surface)', color: 'var(--text-secondary)', border: 'none', borderRadius: '50px', 
                    padding: '0 12px', height: '36px', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
        {comment.replies && comment.replies.length > 0 && renderComments(comment.replies, depth + 1)}
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '30px', width: '200px', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '500px', borderRadius: '24px', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '200px', borderRadius: '24px' }} />
      </div>
    )
  }

  if (!content) return null

  const isLongDescription = content.description && content.description.length > 250
  const displayedDescription = showFullDescription || !isLongDescription 
    ? content.description 
    : content.description?.substring(0, 250) + '...'

  return (
    <div className={`page-container fade-in ${isMobile ? 'lecture-page-mobile' : ''}`} style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px', overflowX: 'visible', overflowY: 'visible' }}>
      {/* Top Header */}
      {isMobile ? (
        // Mobile: compact top bar like inspiration image 4
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 6px',
          marginBottom: '12px',
        }}>
          <Link href={`/courses/${params.id}`} aria-label="Back" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--surface-2)',
            boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
            color: 'var(--text-primary)',
            textDecoration: 'none', flexShrink: 0,
          }}>
            <ChevronLeft size={18} />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {content.topic.course.name}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '24px' }}>
          <Link href={`/courses/${params.id}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', fontWeight: '600',
            marginBottom: '16px', transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = content.topic.course.color}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <ChevronLeft size={18} />
            Back to {content.topic.course.name}
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>{content.title}</h1>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{
                  fontSize: '12px', color: content.topic.course.color,
                  background: content.topic.course.color + '15',
                  padding: '4px 10px', borderRadius: '6px', fontWeight: '700'
                }}>
                  {content.topic.title}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Section */}
      {isMobile ? (
        <>
        <div
          ref={videoWrapperRef}
          onContextMenu={e => e.preventDefault()}
          className={`lecture-video-wrapper-mobile ${content.videoSource === 'GOOGLE_DRIVE' ? 'google-drive' : ''}`}
          style={{
            width: '100%',
            paddingTop: '56.25%', // 16:9 aspect-ratio fallback (universally supported)
            aspectRatio: '16 / 9',
            borderRadius: '16px',
            marginBottom: '10px',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            boxShadow: '0 14px 32px -10px rgba(15, 23, 42, 0.40)',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {content.videoUrl ? (
            <>
              {isDriveSource(content.videoUrl, content.videoSource) && isNativeApp ? (
                // App-only: Drive videos use our backend proxy player inside the WebView.
                <div 
                  onClick={() => router.push(`/courses/${params.id}/lectures/${params.lectureId}/play`)}
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1e1b4b, #0f172a)',
                    color: '#fff', cursor: 'pointer', padding: '20px',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.95'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <div style={{
                    width: '68px', height: '68px', borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '16px', border: '1px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    transition: 'transform 0.2s ease'
                  }}>
                    <Play size={28} color="#fff" fill="#fff" style={{ marginLeft: '4px' }} />
                  </div>
                  <span style={{
                    fontSize: '15px', fontWeight: '700',
                    background: 'linear-gradient(135deg, #a5b4fc, #c084fc)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    Click here to play the video
                    <ExternalLink size={14} color="#a5b4fc" />
                  </span>
                </div>
              ) : isDriveSource(content.videoUrl, content.videoSource) ? (
                // Website/mobile browser: keep Google Drive's native iframe player.
                <iframe
                  ref={videoIframeRef}
                  src={getEmbedUrl(content.videoUrl, content.videoSource)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  scrolling="no"
                  onContextMenu={e => e.preventDefault()}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', overflow: 'hidden', background: '#000' }}
                />
              ) : (content.videoSource === 'YOUTUBE' || /youtu\.?be/i.test(content.videoUrl || '')) && extractYouTubeId(content.videoUrl) ? (
                // YouTube → unified player using IFrame API engine
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  <CustomVideoPlayer source={{ type: 'youtube', videoId: extractYouTubeId(content.videoUrl)! }} />
                </div>
              ) : (
                // Other iframe-friendly sources (Vimeo, generic embed)
                <iframe
                  ref={videoIframeRef}
                  src={getEmbedUrl(content.videoUrl, content.videoSource)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  scrolling="no"
                  onContextMenu={e => e.preventDefault()}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', overflow: 'hidden', background: '#000' }}
                />
              )}
              {/* CustomVideoPlayer has its own fullscreen + speed + skip; no overlay button needed.
                  The iframe fallback path uses the embed provider's own fullscreen affordance. */}
            </>
          ) : (
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', textAlign: 'center', padding: '20px'
            }}>
              <Play size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-muted)' }}>No video available</h3>
              <p style={{ fontSize: '14px' }}>This lecture doesn't have a video attached.</p>
            </div>
          )}
        </div>

        {/* Mobile lecture meta block — appears UNDER the video like inspiration */}
        <div style={{ padding: '0 4px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span style={{
              fontSize: '11px', color: content.topic.course.color,
              background: content.topic.course.color + '18',
              padding: '4px 10px', borderRadius: '50px', fontWeight: 800,
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              {content.topic.title}
            </span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            {content.title}
          </h1>
        </div>
        </>
      ) : (
        <div style={{
          background: 'var(--text-primary)', borderRadius: '24px', overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)', marginBottom: '32px',
          position: 'relative', paddingTop: '56.25%' // 16:9 Aspect Ratio
        }}>
          {content.videoUrl ? (
            isDriveSource(content.videoUrl, content.videoSource) ? (
              // Drive → Google Drive iframe (since native proxy player fails/not preferred on desktop/tablet/laptop)
              <iframe
                src={getEmbedUrl(content.videoUrl, content.videoSource)}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onContextMenu={e => e.preventDefault()}
              />
            ) : (content.videoSource === 'YOUTUBE' || /youtu\.?be/i.test(content.videoUrl || '')) && extractYouTubeId(content.videoUrl) ? (
              // YouTube → unified player (IFrame API engine)
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                <CustomVideoPlayer source={{ type: 'youtube', videoId: extractYouTubeId(content.videoUrl)! }} />
              </div>
            ) : (
              <iframe
                src={getEmbedUrl(content.videoUrl, content.videoSource)}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onContextMenu={e => e.preventDefault()}
              />
            )
          ) : (
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', textAlign: 'center', padding: '20px'
            }}>
              <Play size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-muted)' }}>No video available</h3>
              <p style={{ fontSize: '14px' }}>This lecture doesn't have a video attached.</p>
            </div>
          )}
        </div>
      )}

      {isMobile ? (
        /* Unified Mobile Layout (Discussion placed after Study Materials) */
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* About this Lecture — only show on mobile if description exists */}
            {content.description && (
            <section style={{ 
              background: 'var(--surface)', padding: '20px', borderRadius: '20px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)' 
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                About this Lecture
              </h2>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {displayedDescription}
              </div>
              {isLongDescription && (
                <button 
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  style={{ 
                    background: 'none', border: 'none', color: 'var(--accent)', fontSize: '13px', 
                    fontWeight: '700', cursor: 'pointer', marginTop: '10px', padding: '0',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  {showFullDescription ? (
                    <>Show Less <ChevronUp size={14} /></>
                  ) : (
                    <>Read More <ChevronDown size={14} /></>
                  )}
                </button>
              )}
            </section>
            )}

            {/* Study Materials */}
            <section style={{ 
              background: 'var(--surface)', padding: '20px', borderRadius: '20px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)' 
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px' }}>Study Materials</h3>
              {content.pptUrl ? (
                <div style={{ 
                  background: 'var(--surface)', padding: '14px', borderRadius: '14px', 
                  border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', 
                      color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <Download size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Lecture Resources
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PDF / Presentation / Notes</div>
                    </div>
                  </div>
                  <a 
                    href={content.pptUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ 
                      background: 'var(--accent)', color: 'white', textDecoration: 'none', textAlign: 'center',
                      padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                    }}
                  >
                    Download Material
                  </a>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '13px' }}>No material available.</p>
                </div>
              )}
            </section>

            {/* Discussion Section (Moved directly after Study Materials!) */}
            <section style={{ 
              background: 'var(--surface)', padding: '20px', borderRadius: '20px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={18} color="#6366f1" />
                  Discussion & Q&A
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {comments.length} Comment{comments.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Post a Comment */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', 
                    background: 'var(--surface)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={20} color="#94a3b8" />
                    )}
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <textarea 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Ask a question or share your thoughts..."
                      style={{ 
                        width: '100%', padding: '10px 14px', borderRadius: '12px', border: '2px solid var(--border)',
                        fontSize: '13px', minHeight: '70px', outline: 'none', resize: 'vertical',
                        transition: 'border-color 0.2s', fontFamily: 'inherit'
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--surface)'}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button 
                        onClick={() => handlePostComment()}
                        disabled={!newComment.trim()}
                        style={{ 
                          background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', 
                          padding: '6px 14px', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '6px', opacity: newComment.trim() ? 1 : 0.6,
                        }}
                      >
                        Post
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comment List */}
              {commentsLoading ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading comments...</div>
              ) : comments.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <MessageSquare size={28} style={{ marginBottom: '10px', opacity: 0.3 }} />
                  <p style={{ fontSize: '13px' }}>No comments yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {renderComments(comments)}
                </div>
              )}
            </section>

            {/* Course Info */}
            <section style={{ 
              background: 'var(--surface)', padding: '20px', borderRadius: '20px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)' 
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px' }}>Course Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: content.topic.course.color }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{content.topic.course.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{content.topic.title}</span>
                </div>
              </div>
              <button 
                onClick={() => router.push(`/courses/${params.id}`)}
                style={{ 
                  marginTop: '16px', width: '100%', background: 'var(--surface)', border: 'none', 
                  padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', 
                  color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                View Course Syllabus
                <ExternalLink size={12} />
              </button>
            </section>
          </div>
        </>
      ) : (
        /* Original Desktop View (Unchanged!) */
        <div className="lecture-layout-grid">
          {/* Left Column: Description + Q&A */}
          <div style={{ minWidth: 0 }}>
            {/* Description Section */}
            <section style={{ 
              background: 'var(--surface)', padding: '24px', borderRadius: '24px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '24px' 
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                About this Lecture
              </h2>
              <div style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                {displayedDescription || 'No description provided for this lecture.'}
              </div>
              {isLongDescription && (
                <button 
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  style={{ 
                    background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', 
                    fontWeight: '700', cursor: 'pointer', marginTop: '12px', padding: '0',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  {showFullDescription ? (
                    <>Show Less <ChevronUp size={16} /></>
                  ) : (
                    <>Read More <ChevronDown size={16} /></>
                  )}
                </button>
              )}
            </section>

            {/* Discussion Section */}
            <section style={{ 
              background: 'var(--surface)', padding: '24px', borderRadius: '24px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={20} color="#6366f1" />
                  Discussion & Q&A
                </h2>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {comments.length} Comment{comments.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Post a Comment */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', 
                    background: 'var(--surface)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={24} color="#94a3b8" />
                    )}
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <textarea 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Ask a question or share your thoughts..."
                      style={{ 
                        width: '100%', padding: '12px 16px', borderRadius: '16px', border: '2px solid var(--border)',
                        fontSize: '14px', minHeight: '80px', outline: 'none', resize: 'vertical',
                        transition: 'border-color 0.2s', fontFamily: 'inherit'
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--surface)'}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button 
                        onClick={() => handlePostComment()}
                        disabled={!newComment.trim()}
                        style={{ 
                          background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '12px', 
                          padding: '8px 20px', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '8px', opacity: newComment.trim() ? 1 : 0.6,
                          transition: 'transform 0.1s'
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        Post Comment
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comment List */}
              {commentsLoading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading comments...</div>
              ) : comments.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <MessageSquare size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                  <p style={{ fontSize: '14px' }}>No comments yet. Be the first to start the discussion!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {renderComments(comments)}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Sidebar */}
          <div>
            <section style={{ 
              background: 'var(--surface)', padding: '24px', borderRadius: '24px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'sticky', top: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Study Materials</h3>
              {content.pptUrl ? (
                <div style={{ 
                  background: 'var(--surface)', padding: '16px', borderRadius: '16px', 
                  border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary-light)', 
                      color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <Download size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Lecture Resources
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PDF / Presentation / Notes</div>
                    </div>
                  </div>
                  <a 
                    href={content.pptUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ 
                      background: 'var(--accent)', color: 'white', textDecoration: 'none', textAlign: 'center',
                      padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    Download Material
                  </a>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '13px' }}>No material available.</p>
                </div>
              )}

              <div style={{ marginTop: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Course Info</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: content.topic.course.color }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>{content.topic.course.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>{content.topic.title}</span>
                  </div>
                </div>
                <button 
                  onClick={() => router.push(`/courses/${params.id}`)}
                  style={{ 
                    marginTop: '24px', width: '100%', background: 'var(--surface)', border: 'none', 
                    padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', 
                    color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                >
                  View Course Syllabus
                  <ExternalLink size={14} />
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

    </div>
  )
}

/**
 * OPAQUE click-eaters layered over the YouTube iframe that BOTH hide and block
 * clicks on YouTube branding:
 *   - top title row + channel name + news-source disclaimer
 *   - top-left clickable title that links to youtube.com/watch
 *   - bottom-right "More videos" suggestion pop-up + YouTube wordmark
 *   - bottom-left "Copy link" chain icon
 *
 * Center-top (settings/CC/volume) and center-bottom (play/progress/time/fullscreen)
 * are LEFT CLEAR so the player remains usable.
 *
 * Each mask is solid black (or fades-to-black gradient) — taps land on it and
 * are eaten via preventDefault, never reaching the iframe's link handlers.
 */
function YouTubeChromeMaskers() {
  const eat = (e: React.MouseEvent | React.TouchEvent) => { e.stopPropagation(); e.preventDefault() }
  const base: React.CSSProperties = {
    position: 'absolute', zIndex: 10, pointerEvents: 'auto', cursor: 'default',
  }
  return (
    <>
      {/* TOP gradient — fades from solid black at the very top to transparent over ~80px.
          Hides the video title, channel name, and the news-source disclaimer overlay.
          Right side leaves 150px clear for YouTube's settings/CC/volume icons. */}
      <div
        aria-hidden
        onClick={eat}
        onTouchStart={eat}
        style={{
          ...base,
          top: 0, left: 0, right: '150px', height: '90px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 55%, rgba(0,0,0,0) 100%)',
        }}
      />
      {/* TOP-RIGHT tiny corner — covers the small "more options / Watch on YouTube" button that sometimes appears here */}
      <div
        aria-hidden
        onClick={eat}
        onTouchStart={eat}
        style={{
          ...base,
          top: 0, right: 0, width: '40px', height: '38px',
          background: '#000',
        }}
      />
      {/* BOTTOM-RIGHT solid black — covers "More videos" thumbnail + "YouTube" wordmark.
          ~32% wide and ~50px tall, positioned at the very bottom so it doesn't cover the progress bar above. */}
      <div
        aria-hidden
        onClick={eat}
        onTouchStart={eat}
        style={{
          ...base,
          bottom: 0, right: 0, width: '34%', height: '54px',
          background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 70%, rgba(0,0,0,0) 100%)',
        }}
      />
      {/* BOTTOM-LEFT — covers the chain-link "Copy link" icon */}
      <div
        aria-hidden
        onClick={eat}
        onTouchStart={eat}
        style={{
          ...base,
          bottom: 0, left: 0, width: '70px', height: '50px',
          background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 70%, rgba(0,0,0,0) 100%)',
        }}
      />
    </>
  )
}
