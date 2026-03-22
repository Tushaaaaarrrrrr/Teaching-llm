'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import DOMPurify from 'dompurify'

interface PendingUpdate {
  id: string
  title: string
  content: string
  type: string
  imageUrl: string | null
  animationType: string | null
  showDelay: number
  priority: number
  ctaText?: string | null
  ctaLink?: string | null
}

interface DailyDigest {
  newLectures: number
  newMaterials: number
  upcomingExams: number
}

/**
 * UpdateOverlay – displayed once per login session.
 * Priority: WELCOME → DAILY_DIGEST → GENERAL
 * Shows one update at a time with configurable delays.
 */
export default function UpdateOverlay() {
  const [queue, setQueue] = useState<PendingUpdate[]>([])
  const [dailyDigest, setDailyDigest] = useState<DailyDigest | null>(null)
  const [currentUpdate, setCurrentUpdate] = useState<PendingUpdate | null>(null)
  const [showDigest, setShowDigest] = useState(false)
  const [visible, setVisible] = useState(false)
  const [confettiPieces, setConfettiPieces] = useState<any[]>([])
  const fetchedRef = useRef(false)
  const queueRef = useRef<PendingUpdate[]>([])

  // Fetch pending updates once per login session
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
        if (data.dailyDigest) {
          setDailyDigest(data.dailyDigest)
        }
      })
      .catch(console.error)
  }, [])

  // Process the queue: show next update
  const showNext = useCallback(() => {
    const remaining = queueRef.current
    if (remaining.length === 0) {
      // After all queued updates, show daily digest if available
      if (dailyDigest && (dailyDigest.newLectures > 0 || dailyDigest.newMaterials > 0 || dailyDigest.upcomingExams > 0)) {
        setShowDigest(true)
        setVisible(true)
      }
      return
    }

    const next = remaining[0]
    queueRef.current = remaining.slice(1)
    setQueue(queueRef.current)
    setCurrentUpdate(next)
    setVisible(true)

    // Generate confetti if animation is configured
    if (next.animationType === 'confetti' || next.animationType === 'fireworks' || next.animationType === 'festival') {
      generateConfetti(next.animationType)
    }
  }, [dailyDigest])

  // Start showing updates after initial delay
  useEffect(() => {
    if (queue.length === 0 && !dailyDigest) return
    if (currentUpdate || showDigest) return

    // First update appears after 1.5s
    const timer = setTimeout(() => showNext(), 1500)
    return () => clearTimeout(timer)
  }, [queue, dailyDigest, currentUpdate, showDigest, showNext])

  // Dismiss current update
  const dismiss = async () => {
    if (currentUpdate) {
      // Mark as viewed
      fetch(`/api/updates/${currentUpdate.id}/dismiss`, { method: 'POST' }).catch(console.error)
      setCurrentUpdate(null)
      setVisible(false)
      setConfettiPieces([])

      // Show next update after the configured delay
      const nextDelay = queueRef.current[0]?.showDelay || 3
      setTimeout(() => showNext(), nextDelay * 1000)
    } else if (showDigest) {
      setShowDigest(false)
      setVisible(false)
    }
  }

  // Generate confetti/animation pieces
  const generateConfetti = (type: string) => {
    const colors = type === 'festival'
      ? ['#ff6b35', '#ffd700', '#ff1493', '#00ff88', '#ff4444', '#8b5cf6', '#f97316']
      : type === 'fireworks'
      ? ['#ffd700', '#ff4444', '#00bfff', '#ff69b4', '#32cd32']
      : ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

    const pieces = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 3,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      type: Math.random() > 0.5 ? 'circle' : 'rect',
    }))
    setConfettiPieces(pieces)
  }

  if (!visible) return null

  // Render daily digest
  if (showDigest && dailyDigest) {
    return (
      <div className="modal-overlay" style={{ zIndex: 10000, backdropFilter: 'blur(8px)', background: 'rgba(15,23,42,0.6)' }} onClick={dismiss}>
        <div
          style={{
            maxWidth: '480px', width: '90%', borderRadius: '24px', overflow: 'hidden',
            background: '#ffffff', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            animation: 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
            padding: '36px 28px 28px', textAlign: 'center',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
              margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '32px' }}>📊</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0 }}>
              Today's Summary
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>
              Here's what's new since your last visit
            </p>
          </div>
          <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'New Lectures', value: dailyDigest.newLectures, icon: '🎬', color: '#8b5cf6' },
              { label: 'New Materials', value: dailyDigest.newMaterials, icon: '📚', color: '#10b981' },
              { label: 'Upcoming Exams', value: dailyDigest.upcomingExams, icon: '📝', color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 18px', borderRadius: '14px',
                background: '#f8fafc', border: '1px solid #e2e8f0',
              }}>
                <span style={{ fontSize: '24px' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{item.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: item.color }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 28px 28px', textAlign: 'center' }}>
            <button onClick={dismiss} style={{
              background: '#1e293b', color: '#fff', border: 'none', padding: '14px 40px',
              borderRadius: '50px', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(30,41,59,0.25)', transition: 'transform 0.2s',
            }}>
              Got It
            </button>
          </div>
        </div>
        <style>{`
          @keyframes bounceIn {
            0% { opacity: 0; transform: scale(0.85); }
            70% { opacity: 1; transform: scale(1.02); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    )
  }

  // Render system update
  if (!currentUpdate) return null

  const sanitizedContent = DOMPurify.sanitize(currentUpdate.content)

  return (
    <div className="modal-overlay" style={{ zIndex: 10000, backdropFilter: 'blur(8px)', background: 'rgba(15,23,42,0.6)' }} onClick={dismiss}>

      {/* Confetti */}
      {confettiPieces.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10001, overflow: 'hidden' }}>
          {confettiPieces.map(p => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.left}%`,
                top: '-20px',
                width: p.type === 'circle' ? `${p.size}px` : `${p.size * 0.6}px`,
                height: `${p.size}px`,
                background: p.color,
                borderRadius: p.type === 'circle' ? '50%' : '2px',
                animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
                transform: `rotate(${p.rotation}deg)`,
                opacity: 0.9,
              }}
            />
          ))}
        </div>
      )}

      <div
        style={{
          maxWidth: '560px', width: '92%', borderRadius: '24px', overflow: 'hidden',
          background: '#ffffff', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          animation: 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div style={{
          background: currentUpdate.type === 'WELCOME'
            ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
            : currentUpdate.type === 'DAILY_DIGEST'
            ? 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)'
            : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          padding: '36px 28px 24px', textAlign: 'center', position: 'relative', flexShrink: 0,
        }}>
          <button onClick={dismiss} style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {currentUpdate.type === 'WELCOME' && (
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', background: '#fff',
              margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            }}>
              <span style={{ fontSize: '36px', lineHeight: '1' }}>👋</span>
            </div>
          )}

          <h2 style={{
            fontSize: currentUpdate.type === 'WELCOME' ? '28px' : '22px',
            fontWeight: '800', color: '#fff', margin: 0, lineHeight: '1.2',
          }}>
            {currentUpdate.title}
          </h2>
        </div>

        {/* Image */}
        {currentUpdate.imageUrl && (
          <div style={{ flexShrink: 0 }}>
            <img
              src={currentUpdate.imageUrl}
              alt=""
              style={{ width: '100%', maxHeight: '240px', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Content */}
        <div style={{
          padding: '28px', overflowY: 'auto', flex: 1,
          background: '#f8fafc',
        }}>
          <div
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            style={{
              fontSize: '15px', color: '#334155', lineHeight: '1.7',
              wordBreak: 'break-word',
            }}
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
              boxShadow: '0 4px 14px rgba(54,54,232,0.25)', transition: 'transform 0.2s, box-shadow 0.2s',
              flex: 1, maxWidth: '200px'
            }}>
              {currentUpdate.ctaText}
            </button>
          )}
          <button onClick={dismiss} style={{
            background: currentUpdate.ctaText ? '#f1f5f9' : '#1e293b', 
            color: currentUpdate.ctaText ? '#475569' : '#fff', 
            border: 'none', padding: '14px 24px',
            borderRadius: '50px', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
            boxShadow: currentUpdate.ctaText ? 'none' : '0 4px 14px rgba(30,41,59,0.25)', 
            transition: 'transform 0.2s, background 0.2s',
            flex: currentUpdate.ctaText ? undefined : 1, 
            maxWidth: currentUpdate.ctaText ? undefined : '200px'
          }}>
            {currentUpdate.type === 'WELCOME' && !currentUpdate.ctaText ? "Let's Get Started" : (currentUpdate.ctaText ? 'Close' : 'Got It')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.85); }
          70% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
