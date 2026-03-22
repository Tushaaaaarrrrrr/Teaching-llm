'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Image as ImageIcon, Smile, FileType, MapPin, ArrowUpRight } from 'lucide-react'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPublish: (content: string) => void
  userName: string
  userAvatar?: string | null
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onPublish,
  userName,
  userAvatar,
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

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, backdropFilter: 'blur(12px)', background: 'rgba(235, 243, 255, 0.5)' }} onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '680px',
          borderRadius: '40px',
          background: '#ffffff',
          boxShadow: '0 40px 100px rgba(128, 151, 181, 0.25)',
          overflow: 'hidden',
          animation: 'modalFadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          padding: '40px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', 
              background: '#f8fafb', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '4px solid #fff', boxShadow: '0 8px 16px rgba(128, 151, 181, 0.15)',
              position: 'relative'
            }}>
              {userAvatar ? (
                <img src={userAvatar} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#0156bf' }}>{initials}</span>
              )}
              <div style={{ 
                position: 'absolute', bottom: '2px', right: '2px', 
                width: '14px', height: '14px', borderRadius: '50%', 
                background: '#4ade80', border: '3px solid #fff' 
              }} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#1a2b4b', lineHeight: '1.2' }}>{userName}</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#8097b5', letterSpacing: '0.08em', marginTop: '4px', textTransform: 'uppercase' }}>
                DRAFTING NEW MOMENT
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              width: '40px', height: '40px', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#8097b5', transition: 'all 0.2s', border: 'none', background: 'transparent'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafb')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ 
          borderRadius: '32px', 
          background: 'rgba(235, 243, 255, 0.4)',
          padding: '32px',
          minHeight: '220px',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '32px'
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
              fontSize: '22px',
              color: '#3d4b68',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              fontWeight: '500'
            }}
          />
        </div>

        {/* Footer Actions */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '32px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: '#f8fafb',
            padding: '8px',
            borderRadius: '50px',
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
                  width: '44px', height: '44px', borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#5c7491', transition: 'all 0.2s', border: 'none', background: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.color = '#0156bf';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(128, 151, 181, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#5c7491';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <tool.icon size={20} />
              </button>
            ))}
          </div>

          <button
            onClick={handlePublish}
            disabled={!content.trim() || isSubmitting}
            style={{
              padding: '18px 40px',
              borderRadius: '50px',
              background: content.trim() ? '#0156bf' : '#eef2f6',
              color: content.trim() ? '#fff' : '#8097b5',
              fontSize: '18px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              border: 'none',
              cursor: content.trim() ? 'pointer' : 'default',
              boxShadow: content.trim() ? '0 15px 30px rgba(1, 86, 191, 0.3)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (content.trim()) {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(1, 86, 191, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (content.trim()) {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 15px 30px rgba(1, 86, 191, 0.3)';
              }
            }}
          >
            {isSubmitting ? 'Posting...' : 'Share Update'}
            <ArrowUpRight size={22} />
          </button>
        </div>

        {/* Branding bar */}
        <div style={{ 
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 8px 0',
          borderTop: '2px solid rgba(235, 243, 255, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0156bf' }} />
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#8097b5', letterSpacing: '0.12em' }}>PUBLIC STREAM</span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#cbd5e1', letterSpacing: '0.08em' }}>ALPHA STUDIO V2.0</span>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeInUp {
          from { opacity: 0; transform: translateY(60px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
