'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import DOMPurify from 'dompurify'

interface PendingUpdate {
  id: string
  title: string
  content: string
  type: string   // WELCOME | CUSTOM
  imageUrl: string | null
  showDelay: number
  priority: number
  ctaText?: string | null
  ctaLink?: string | null
  frequency?: string
  animation?: string | null
}

/**
 * VisualEffect — renders a temporary visual celebration
 */
function VisualEffect({ type }: { type: string }) {
  const [active, setActive] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setActive(false), 8000)
    return () => clearTimeout(timer)
  }, [])

  if (!active) return null

  if (type === 'CONFETTI') {
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 10 }}>
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              position: 'absolute', top: '-10%', left: `${Math.random() * 100}%`,
              width: `${Math.random() * 10 + 5}px`, height: `${Math.random() * 10 + 5}px`,
              background: ['#ffec3d', '#ff4d4f', '#40a9ff', '#73d13d', '#9254de', '#ffa940'][Math.floor(Math.random() * 6)],
              animation: `confetti-fall ${Math.random() * 3 + 2}s linear forwards`,
              animationDelay: `${Math.random() * 2}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>
    )
  }

  if (type === 'PARTY_POPS') {
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 10 }}>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute', top: `${30 + Math.random() * 40}%`, left: `${Math.random() * 100}%`,
              fontSize: '24px', animation: 'party-pop 1.5s ease-out forwards',
              animationDelay: `${i * 0.4}s`, opacity: 0,
            }}
          >
            {['🎉', '🎊', '✨', '🎈'][Math.floor(Math.random() * 4)]}
          </div>
        ))}
      </div>
    )
  }

  if (type === 'FESTIVAL') {
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 10 }}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute', bottom: '-10%', left: `${10 + i * 18}%`,
              fontSize: '32px', animation: 'festival-float 6s ease-in-out forwards',
              animationDelay: `${i * 0.8}s`, filter: 'drop-shadow(0 0 10px rgba(255,100,0,0.5))',
            }}
          >
            🏮
          </div>
        ))}
      </div>
    )
  }

  return null
}

/**
 * UpdateOverlay – displayed once per login session.
 * Priority: WELCOME first, then CUSTOM messages.
 * Only appears on login; never interrupts active browsing.
 * Respects ONCE / RECURRING frequency set per message.
 */
export default function UpdateOverlay() {
  const [queue, setQueue] = useState<PendingUpdate[]>([])
  const [currentUpdate, setCurrentUpdate] = useState<PendingUpdate | null>(null)
  const [visible, setVisible] = useState(false)
  const fetchedRef = useRef(false)
  const queueRef = useRef<PendingUpdate[]>([])

  // Fetch pending updates exactly once per login session
  useEffect(() => {
    if (fetchedRef.current) return
    const sessionKey = 'updates_fetched_session'
    if (sessionStorage.getItem(sessionKey)) return

    fetchedRef.current = true
    sessionStorage.setItem(sessionKey, 'true')

    fetch('/api/updates/pending')
      .then(r => r.json())
      .then(data => {
        if (data.updates && data.updates.length > 0) {
          queueRef.current = data.updates
          setQueue(data.updates)
        }
      })
      .catch(console.error)
  }, [])

  // Show next update from queue
  const showNext = useCallback(() => {
    const remaining = queueRef.current
    if (remaining.length === 0) return

    const next = remaining[0]
    queueRef.current = remaining.slice(1)
    setQueue(queueRef.current)
    setCurrentUpdate(next)
    setVisible(true)
  }, [])

  // Start queue after a brief login delay
  useEffect(() => {
    if (queue.length === 0 || currentUpdate) return
    const timer = setTimeout(() => showNext(), 1500)
    return () => clearTimeout(timer)
  }, [queue, currentUpdate, showNext])

  // Dismiss current update and advance queue
  const dismiss = async () => {
    if (!currentUpdate) return

    // Record view
    fetch(`/api/updates/${currentUpdate.id}/dismiss`, { method: 'POST' }).catch(console.error)
    setCurrentUpdate(null)
    setVisible(false)

    // Show next after its configured delay
    if (queueRef.current.length > 0) {
      const nextDelay = (queueRef.current[0]?.showDelay || 3) * 1000
      setTimeout(() => showNext(), nextDelay)
    }
  }

  if (!visible || !currentUpdate) return null

  const isWelcome = currentUpdate.type === 'WELCOME'
  const sanitizedContent = DOMPurify.sanitize(currentUpdate.content)

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 10000, backdropFilter: 'blur(8px)', background: 'rgba(15,23,42,0.6)' }}
      onClick={dismiss}
    >
      <div
        style={{
          maxWidth: '560px', width: '92%', borderRadius: '24px', overflow: 'hidden',
          background: '#ffffff', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          animation: 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Visual Effect Layer */}
        {currentUpdate.animation && currentUpdate.animation !== 'NONE' && (
          <VisualEffect type={currentUpdate.animation} key={`effect-${currentUpdate.id}`} />
        )}

        {/* Header */}
        <div style={{
          background: isWelcome
            ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
            : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          padding: '36px 28px 24px', textAlign: 'center', position: 'relative', flexShrink: 0,
        }}>
          <button onClick={dismiss} style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 20,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {isWelcome && (
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', background: '#fff',
              margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            }}>
              <span style={{ fontSize: '36px', lineHeight: '1' }}>👋</span>
            </div>
          )}

          <h2 style={{
            fontSize: isWelcome ? '28px' : '22px',
            fontWeight: '800', color: '#fff', margin: 0, lineHeight: '1.2',
          }}>
            {currentUpdate.title}
          </h2>
        </div>

        {/* Image */}
        {currentUpdate.imageUrl && (
          <div style={{ flexShrink: 0 }}>
            <img src={currentUpdate.imageUrl} alt="" style={{ width: '100%', maxHeight: '240px', objectFit: 'cover' }} />
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '28px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
          <div
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            style={{ fontSize: '15px', color: '#334155', lineHeight: '1.7', wordBreak: 'break-word' }}
          />
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 28px', textAlign: 'center', flexShrink: 0,
          borderTop: '1px solid #e2e8f0', background: '#fff',
          display: 'flex', gap: '12px', justifyContent: 'center',
        }}>
          {currentUpdate.ctaText && currentUpdate.ctaLink && (
            <button onClick={() => {
              fetch(`/api/updates/${currentUpdate.id}/dismiss`, { method: 'POST' }).catch(console.error)
              window.location.href = currentUpdate.ctaLink!
            }} style={{
              background: '#3636e8', color: '#fff', border: 'none', padding: '14px 24px',
              borderRadius: '50px', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(54,54,232,0.25)', flex: 1, maxWidth: '200px',
            }}>
              {currentUpdate.ctaText}
            </button>
          )}
          <button onClick={dismiss} style={{
            background: currentUpdate.ctaText ? '#f1f5f9' : '#1e293b',
            color: currentUpdate.ctaText ? '#475569' : '#fff',
            border: 'none', padding: '14px 24px',
            borderRadius: '50px', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
            flex: 1, maxWidth: '200px',
          }}>
            {isWelcome && !currentUpdate.ctaText ? "Let's Get Started" : (currentUpdate.ctaText ? 'Close' : 'Got It')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.85); }
          70% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
        }
        @keyframes party-pop {
          0% { transform: scale(0) translateY(0); opacity: 0; }
          20% { transform: scale(1.5) translateY(-20px); opacity: 1; }
          100% { transform: scale(1) translateY(-100px); opacity: 0; }
        }
        @keyframes festival-float {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-800px) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
