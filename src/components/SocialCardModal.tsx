'use client'

import { useEffect, useState } from 'react'
import UserAvatar from '@/components/UserAvatar'

interface SocialBadge {
  id: string
  badgeId: string
  label: string
  category: string
}

interface SocialCardData {
  user: {
    id: string
    name: string
    role: string
    avatar?: string | null
    aboutMe: string
    publicFields: { key: string; label: string; value: string | number }[]
    badges: SocialBadge[]
  }
  viewer: {
    isSelf: boolean
    isStaff: boolean
    canReport: boolean
    canTalkToManager: boolean
    canViewFullAvatar: boolean
    canOpenManagerProfile: boolean
  }
}

const REPORT_REASONS = [
  ['SPAM', 'Spam'],
  ['HARASSMENT_BULLYING', 'Harassment / Bullying'],
  ['ABUSIVE_LANGUAGE', 'Abusive Language'],
  ['INAPPROPRIATE_CONTENT', 'Inappropriate Content'],
  ['IMPERSONATION', 'Impersonation'],
  ['SCAM_FRAUD', 'Scam / Fraud'],
  ['UNWANTED_MESSAGES', 'Unwanted Messages'],
  ['ACADEMIC_MISCONDUCT', 'Academic Misconduct'],
  ['OTHER', 'Other'],
]

interface SocialCardModalProps {
  userId: string
  onClose: () => void
  onChatStarted?: (chatId: string) => void | Promise<void>
}

export default function SocialCardModal({ userId, onClose, onChatStarted }: SocialCardModalProps) {
  const [data, setData] = useState<SocialCardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAllBadges, setShowAllBadges] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [reportMessage, setReportMessage] = useState('')
  const [startingChat, setStartingChat] = useState(false)
  const [fullAvatarOpen, setFullAvatarOpen] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    fetch(`/api/social-card/${userId}`)
      .then(async res => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Failed to load Social Card')
        if (alive) setData(json)
      })
      .catch(err => {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load Social Card')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => { alive = false }
  }, [userId])

  async function submitReport() {
    if (!reportReason || submittingReport) return
    setSubmittingReport(true)
    setReportMessage('')
    try {
      const res = await fetch(`/api/social-card/${userId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason, details: reportDetails }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to submit report')
      setReportMessage('Report submitted')
      setShowReport(false)
      setReportReason('')
      setReportDetails('')
    } catch (err) {
      setReportMessage(err instanceof Error ? err.message : 'Failed to submit report')
    } finally {
      setSubmittingReport(false)
    }
  }

  async function startManagerChat() {
    if (!data || startingChat) return
    setStartingChat(true)
    try {
      const res = await fetch('/api/community/direct/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: data.user.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to start chat')
      await onChatStarted?.(json.chatId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start chat')
    } finally {
      setStartingChat(false)
    }
  }

  const primaryBadge = data?.user.badges[0]
  const extraBadgeCount = Math.max(0, (data?.user.badges.length || 0) - 1)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: isMobile ? 'flex-end' : 'center', zIndex: 1200 }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: isMobile ? '100%' : '92%',
          maxWidth: '460px',
          maxHeight: isMobile ? '88vh' : '86vh',
          overflowY: 'auto',
          borderRadius: isMobile ? '24px 24px 0 0' : '24px',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div style={{ minHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : error && !data ? (
          <div style={{ minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', textAlign: 'center' }}>{error}</div>
        ) : data && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <UserAvatar
              user={{ name: data.user.name, avatar: data.user.avatar }}
              size={104}
              onClick={data.viewer.canViewFullAvatar && data.user.avatar ? () => setFullAvatarOpen(true) : undefined}
              style={{ boxShadow: '6px 6px 12px var(--neu-dark), -6px -6px 12px var(--neu-light)' }}
            />
            <div style={{ textAlign: 'center', width: '100%' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{data.user.name}</h2>
              {data.user.role !== 'STUDENT' && (
                <span className="badge" style={{ marginTop: '8px', fontSize: '11px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  {data.user.role.toLowerCase()}
                </span>
              )}
            </div>

            {primaryBadge && (
              <button
                onClick={() => setShowAllBadges(v => !v)}
                style={{
                  border: 'none',
                  borderRadius: '50px',
                  background: 'linear-gradient(135deg, #3636e8, #6366f1)',
                  color: '#fff',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: data.user.badges.length > 1 ? 'pointer' : 'default',
                  display: 'inline-flex',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                {primaryBadge.label}
                {extraBadgeCount > 0 && <span style={{ opacity: 0.85 }}>+{extraBadgeCount}</span>}
              </button>
            )}

            {showAllBadges && data.user.badges.length > 1 && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--surface-2)', borderRadius: '16px', padding: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Badges</div>
                {data.user.badges.map(badge => (
                  <div key={badge.id} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{badge.label}</div>
                ))}
              </div>
            )}

            <div style={{ width: '100%', background: 'var(--surface-2)', borderRadius: '18px', padding: '16px', minHeight: '74px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '8px' }}>About Me</div>
              <div style={{ fontSize: '14px', color: data.user.aboutMe ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {data.user.aboutMe || 'No About Me yet.'}
              </div>
            </div>

            {data.user.publicFields.length > 0 && (
              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {data.user.publicFields.map(field => (
                  <div key={field.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '11px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>{field.label}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 800 }}>{field.value}</span>
                  </div>
                ))}
              </div>
            )}

            {error && <div style={{ width: '100%', color: 'var(--danger)', fontSize: '12px', textAlign: 'center' }}>{error}</div>}
            {reportMessage && <div style={{ width: '100%', color: reportMessage === 'Report submitted' ? 'var(--success)' : 'var(--danger)', fontSize: '12px', textAlign: 'center' }}>{reportMessage}</div>}

            <div style={{ width: '100%', display: 'flex', justifyContent: data.viewer.canReport ? 'space-between' : 'center', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              {data.viewer.canTalkToManager && (
                <button onClick={startManagerChat} disabled={startingChat} className="btn btn-primary" style={{ borderRadius: '50px', flex: 1 }}>
                  {startingChat ? 'Opening...' : 'Talk to Manager'}
                </button>
              )}
              {data.viewer.canReport && (
                <button onClick={() => setShowReport(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, marginLeft: 'auto' }}>
                  Report User
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showReport && data && (
        <div className="modal-overlay" onClick={() => setShowReport(false)} style={{ zIndex: 1300 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '92%', maxWidth: '420px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0 }}>Report User</h3>
              <button onClick={() => setShowReport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select className="form-input" value={reportReason} onChange={e => setReportReason(e.target.value)}>
                <option value="">Select reason</option>
                {REPORT_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <textarea
                className="form-input"
                value={reportDetails}
                onChange={e => setReportDetails(e.target.value.slice(0, 2000))}
                placeholder="Additional details"
                rows={4}
                maxLength={2000}
                style={{ resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setShowReport(false)} className="btn btn-ghost">Cancel</button>
                <button onClick={submitReport} disabled={!reportReason || submittingReport} className="btn btn-primary">
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {fullAvatarOpen && data?.viewer.canViewFullAvatar && data.user.avatar && (
        <div className="modal-overlay" onClick={() => setFullAvatarOpen(false)} style={{ zIndex: 1300 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '92%', maxWidth: '520px', padding: '18px' }}>
            <img src={data.user.avatar} alt={`${data.user.name} profile picture`} style={{ width: '100%', maxHeight: '76vh', objectFit: 'contain', borderRadius: '18px' }} />
          </div>
        </div>
      )}
    </div>
  )
}
