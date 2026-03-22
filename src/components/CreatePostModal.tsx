'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Image as ImageIcon, Smile, FileType, MapPin, ArrowUpRight } from 'lucide-react'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPublish: (content: string) => void
  userName: string
  userAvatar?: string | null
  userRole?: string
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onPublish,
  userName,
  userAvatar,
  userRole = 'STUDENT'
}: CreatePostModalProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handlePublish = async () => {
    if (!content.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onPublish(content)
      setContent('')
      onClose()
    } catch (error) {
      console.error('Failed to publish post:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const neu = { 
    background: '#e8eaf0', 
    boxShadow: '10px 10px 20px #c5c7cf, -10px -10px 20px #ffffff' 
  }
  
  const neuInset = { 
    background: '#e8eaf0', 
    boxShadow: 'inset 6px 6px 12px #c5c7cf, inset -6px -6px 12px #ffffff' 
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, backdropFilter: 'blur(10px)', background: 'rgba(15, 23, 42, 0.4)' }} onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '560px',
          borderRadius: '32px',
          background: '#ffffff',
          boxShadow: '0 25px 70px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px 32px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', 
              background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
              position: 'relative'
            }}>
              {userAvatar ? (
                <img src={userAvatar} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#3636e8' }}>{initials}</span>
              )}
              <div style={{ 
                position: 'absolute', bottom: '2px', right: '2px', 
                width: '10px', height: '10px', borderRadius: '50%', 
                background: '#10b981', border: '2px solid #fff' 
              }} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e1e3a', lineHeight: '1.2' }}>{userName}</div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.05em', marginTop: '2px' }}>
                DRAFTING NEW MOMENT
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              width: '32px', height: '32px', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8', transition: 'all 0.2s', border: 'none', background: 'transparent'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '0 32px 24px' }}>
          <div style={{ 
            borderRadius: '24px', 
            background: 'linear-gradient(135deg, #f0f7ff 0%, #f9fbff 100%)',
            padding: '24px',
            minHeight: '180px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's unfolding in your atelier today?"
              style={{
                width: '100%',
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: '18px',
                color: '#334155',
                fontFamily: 'inherit',
                lineHeight: '1.6',
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ 
          padding: '0 32px 32px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: '#f8fafc',
            padding: '6px',
            borderRadius: '50px',
            border: '1px solid #f1f5f9'
          }}>
            {[
              { icon: ImageIcon, label: 'Image' },
              { icon: Smile, label: 'Emoji' },
              { icon: FileType, label: 'GIF' },
              { icon: MapPin, label: 'Location' }
            ].map((tool, i) => (
              <button 
                key={i}
                style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#64748b', transition: 'all 0.2s', border: 'none', background: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.color = '#3636e8';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <tool.icon size={18} />
              </button>
            ))}
          </div>

          <button
            onClick={handlePublish}
            disabled={!content.trim() || isSubmitting}
            style={{
              padding: '14px 28px',
              borderRadius: '50px',
              background: content.trim() ? '#3636e8' : '#e2e8f0',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              border: 'none',
              cursor: content.trim() ? 'pointer' : 'default',
              boxShadow: content.trim() ? '0 10px 20px rgba(54,54,232,0.2)' : 'none',
              transform: content.trim() ? 'translateY(0)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (content.trim()) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(54,54,232,0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (content.trim()) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(54,54,232,0.2)';
              }
            }}
          >
            {isSubmitting ? 'Sharing...' : 'Share Update'}
            <ArrowUpRight size={18} />
          </button>
        </div>

        {/* Bottom bar */}
        <div style={{ 
          padding: '16px 32px', 
          background: 'rgba(248, 250, 252, 0.5)',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3636e8' }} />
            <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.1em' }}>PUBLIC STREAM</span>
          </div>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#cbd5e1', letterSpacing: '0.05em' }}>ATELIER STUDIO V2.1</span>
        </div>
      </div>

      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
