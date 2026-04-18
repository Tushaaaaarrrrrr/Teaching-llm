'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
    
    if (source === 'YOUTUBE') {
      const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\s]+)/)
      if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
    }
    
    if (source === 'GOOGLE_DRIVE') {
      // Extract file ID from Google Drive URL
      // Formats: https://drive.google.com/file/d/{ID}/view
      //          https://drive.google.com/open?id={ID}
      const fileIdMatch = url.match(/\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/)
      if (fileIdMatch) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
      }
    }
    
    return url
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
        borderLeft: depth > 0 ? '2px solid #e2e8f0' : 'none',
        paddingLeft: depth > 0 ? '16px' : '0'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', 
            background: '#e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {comment.user.avatar ? (
              <img src={comment.user.avatar} alt={comment.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={20} color="#94a3b8" />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{comment.user.name}</span>
              {comment.user.role !== 'STUDENT' && (
                <span style={{ 
                  fontSize: '10px', fontWeight: '700', 
                  background: comment.user.role === 'ADMIN' ? '#fee2e2' : '#f0f9ff', 
                  color: comment.user.role === 'ADMIN' ? '#ef4444' : '#0ea5e9',
                  padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase'
                }}>
                  {comment.user.role}
                </span>
              )}
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {new Date(comment.createdAt).toLocaleDateString('en-GB')}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '4px 0' }}>{comment.content}</p>
            <button 
              onClick={() => {
                setReplyTo(comment.id)
                setReplyText('')
              }}
              style={{ 
                background: 'none', border: 'none', color: '#6366f1', fontSize: '12px', 
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
                    flex: 1, padding: '8px 16px', borderRadius: '20px', border: '1px solid #e2e8f0',
                    fontSize: '13px', outline: 'none'
                  }}
                  autoFocus
                />
                <button 
                  onClick={() => handlePostComment(comment.id)}
                  style={{ 
                    background: '#6366f1', color: 'white', border: 'none', borderRadius: '50px', 
                    width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <Send size={16} />
                </button>
                <button 
                  onClick={() => setReplyTo(null)}
                  style={{ 
                    background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '50px', 
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
    <div className="page-container fade-in" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link href={`/courses/${params.id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          color: '#64748b', fontSize: '14px', textDecoration: 'none', fontWeight: '600', 
          marginBottom: '16px', transition: 'color 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = content.topic.course.color}
        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
        >
          <ChevronLeft size={18} />
          Back to {content.topic.course.name}
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>{content.title}</h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ 
                fontSize: '12px', color: content.topic.course.color, 
                background: content.topic.course.color + '15', 
                padding: '4px 10px', borderRadius: '6px', fontWeight: '700' 
              }}>
                {content.topic.title}
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                {content.videoSource} Video
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Section */}
      <div style={{ 
        background: '#0f172a', borderRadius: '24px', overflow: 'hidden', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)', marginBottom: '32px',
        position: 'relative', paddingTop: '56.25%' // 16:9 Aspect Ratio
      }}>
        {content.videoUrl ? (
          <iframe
            src={getEmbedUrl(content.videoUrl, content.videoSource)}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div style={{ 
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#64748b', textAlign: 'center', padding: '20px'
          }}>
            <Play size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#94a3b8' }}>No video available</h3>
            <p style={{ fontSize: '14px' }}>This lecture doesn't have a video attached.</p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
        {/* Left Column: Description + Q&A */}
        <div style={{ minWidth: 0 }}>
          {/* Description Section */}
          <section style={{ 
            background: 'white', padding: '24px', borderRadius: '24px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '24px' 
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              About this Lecture
            </h2>
            <div style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {displayedDescription || 'No description provided for this lecture.'}
            </div>
            {isLongDescription && (
              <button 
                onClick={() => setShowFullDescription(!showFullDescription)}
                style={{ 
                  background: 'none', border: 'none', color: '#6366f1', fontSize: '14px', 
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
            background: 'white', padding: '24px', borderRadius: '24px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} color="#6366f1" />
                Discussion & Q&A
              </h2>
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>
                {comments.length} Comment{comments.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Post a Comment */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', 
                  background: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
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
                      width: '100%', padding: '12px 16px', borderRadius: '16px', border: '2px solid #f1f5f9',
                      fontSize: '14px', minHeight: '80px', outline: 'none', resize: 'vertical',
                      transition: 'border-color 0.2s', fontFamily: 'inherit'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                    onBlur={e => e.currentTarget.style.borderColor = '#f1f5f9'}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button 
                      onClick={() => handlePostComment()}
                      disabled={!newComment.trim()}
                      style={{ 
                        background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', 
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
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading comments...</div>
            ) : comments.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
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
            background: 'white', padding: '24px', borderRadius: '24px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'sticky', top: '24px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '16px' }}>Study Materials</h3>
            {content.pptUrl ? (
              <div style={{ 
                background: '#f8fafc', padding: '16px', borderRadius: '16px', 
                border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '8px', background: '#6366f115', 
                    color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                    <Download size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Lecture Resources
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>PDF / Presentation / Notes</div>
                  </div>
                </div>
                <a 
                  href={content.pptUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ 
                    background: '#6366f1', color: 'white', textDecoration: 'none', textAlign: 'center',
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
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                <p style={{ fontSize: '13px' }}>No material available.</p>
              </div>
            )}

            <div style={{ marginTop: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '16px' }}>Course Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: content.topic.course.color }} />
                  <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>{content.topic.course.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }} />
                  <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>{content.topic.title}</span>
                </div>
              </div>
              <button 
                onClick={() => router.push(`/courses/${params.id}`)}
                style={{ 
                  marginTop: '24px', width: '100%', background: '#f1f5f9', border: 'none', 
                  padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', 
                  color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                View Course Syllabus
                <ExternalLink size={14} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
