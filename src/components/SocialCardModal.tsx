'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import UserAvatar from '@/components/UserAvatar'
import {
  Award,
  BarChart3,
  Calculator,
  CircleHelp,
  GraduationCap,
  HeartHandshake,
  MapPin,
  Medal,
  MessageCircle,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  UserRound,
  X,
} from 'lucide-react'

interface SocialBadge {
  id: string
  badgeId: string
  label: string
  category: string
}

interface BadgeDefinition {
  id: string
  label: string
  category: string
}

interface SocialCardData {
  user: {
    id: string
    name: string
    role: string
    avatar?: string | null
    gender?: string | null
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

interface SocialCardPreviewOverride {
  aboutMe?: string
  publicFields?: SocialCardData['user']['publicFields']
  viewer?: Partial<SocialCardData['viewer']>
}

const REPORT_REASONS = [
  {
    id: 'SPAM',
    label: 'Spam',
    description: 'Repeated, promotional, or suspicious activity',
    subReasons: [
      'Repeated unwanted messages',
      'Advertising / promotion',
      'Irrelevant repeated content',
      'Suspicious links',
      'Mass messaging',
      'Other spam',
    ],
  },
  {
    id: 'HARASSMENT_BULLYING',
    label: 'Harassment / Bullying',
    description: 'Targeted, threatening, or humiliating behavior',
    subReasons: [
      'Personal attacks',
      'Threatening behavior',
      'Repeated targeting',
      'Humiliation / mocking',
      'Other',
    ],
  },
  {
    id: 'ABUSIVE_LANGUAGE',
    label: 'Abusive Language',
    description: 'Insults, hateful, obscene, or repeated abusive language',
    subReasons: [
      'Insults',
      'Hate/derogatory language',
      'Sexual/obscene language',
      'Repeated abusive messages',
      'Other',
    ],
  },
  {
    id: 'INAPPROPRIATE_CONTENT',
    label: 'Inappropriate Content',
    description: 'Sexual, graphic, offensive, or NSFW material',
    subReasons: [
      'Sexual content',
      'Graphic/disturbing content',
      'Offensive material',
      'NSFW content',
      'Other',
    ],
  },
  {
    id: 'IMPERSONATION',
    label: 'Impersonation',
    description: 'Pretending to be someone else or using a fake profile',
    subReasons: [
      'Pretending to be another student',
      'Pretending to be Manager/Admin',
      'Fake identity/profile',
      'Other',
    ],
  },
  {
    id: 'SCAM_FRAUD',
    label: 'Scam / Fraud',
    description: 'Money requests, fake offers, or suspicious payment claims',
    subReasons: [
      'Asking for money',
      'Fake course/payment claim',
      'Suspicious link',
      'Fake offer',
      'Other',
    ],
  },
  {
    id: 'UNWANTED_MESSAGES',
    label: 'Unwanted Messages',
    description: 'Unwanted DMs, personal messages, or excessive mentions',
    subReasons: [
      'Repeated DMs',
      'Unwanted personal messages',
      'Excessive mentions',
      'Other',
    ],
  },
  {
    id: 'ACADEMIC_MISCONDUCT',
    label: 'Academic Misconduct',
    description: 'Cheating, answer sharing, or restricted material',
    subReasons: [
      'Sharing answers',
      'Cheating-related content',
      'Selling/sharing restricted material',
      'Other',
    ],
  },
  {
    id: 'OTHER',
    label: 'Other',
    description: 'Something else that needs review',
    subReasons: [],
  },
]

interface SocialCardModalProps {
  userId: string
  onClose: () => void
  onChatStarted?: (chatId: string) => void | Promise<void>
  previewOverride?: SocialCardPreviewOverride
}

async function fetchSocialCardData(userId: string): Promise<SocialCardData> {
  const res = await fetch(`/api/social-card/${userId}`, { cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to load Social Card')
  return json
}

function formatRole(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase()
}

function getMedalIcon(badge: SocialBadge) {
  const text = `${badge.badgeId} ${badge.label}`.toLowerCase()
  if (text.includes('math')) return Calculator
  if (text.includes('stat')) return BarChart3
  if (text.includes('talk')) return MessageCircle
  if (text.includes('question')) return CircleHelp
  if (text.includes('star')) return Star
  if (text.includes('focus')) return Target
  if (text.includes('comment')) return MessageSquareText
  if (text.includes('help') || text.includes('doubt')) return HeartHandshake
  if (text.includes('topper') || text.includes('quiz') || text.includes('term') || text.includes('ct')) return Trophy
  return Medal
}

function getPublicInfoIcon(key: string) {
  if (key === 'state') return MapPin
  if (key === 'iitmLevel') return GraduationCap
  if (key === 'cgpa') return Award
  return UserRound
}

export default function SocialCardModal({ userId, onClose, onChatStarted, previewOverride }: SocialCardModalProps) {
  const router = useRouter()
  const [data, setData] = useState<SocialCardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAllBadges, setShowAllBadges] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportStep, setReportStep] = useState<1 | 2>(1)
  const [reportReason, setReportReason] = useState('')
  const [reportSubReason, setReportSubReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [reportMessage, setReportMessage] = useState('')
  const [startingChat, setStartingChat] = useState(false)
  const [fullAvatarOpen, setFullAvatarOpen] = useState(false)
  const [showManageMedals, setShowManageMedals] = useState(false)
  const [badgeDefs, setBadgeDefs] = useState<BadgeDefinition[]>([])
  const [selectedBadgeId, setSelectedBadgeId] = useState('')
  const [savingBadge, setSavingBadge] = useState(false)
  const [medalManageError, setMedalManageError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setShowManageMedals(false)
    setSelectedBadgeId('')
    setMedalManageError('')
    fetchSocialCardData(userId)
      .then(json => {
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

  async function refreshSocialCard() {
    const nextData = await fetchSocialCardData(userId)
    setData(nextData)
  }

  async function openMedalManager() {
    setShowManageMedals(true)
    setMedalManageError('')
    if (badgeDefs.length > 0) return
    try {
      const res = await fetch(`/api/social-card/${userId}/badges`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load medals')
      setBadgeDefs(Array.isArray(json.badges) ? json.badges : [])
    } catch (err) {
      setMedalManageError(err instanceof Error ? err.message : 'Failed to load medals')
    }
  }

  async function assignBadge() {
    if (!selectedBadgeId || savingBadge) return
    setSavingBadge(true)
    setMedalManageError('')
    try {
      const res = await fetch(`/api/social-card/${userId}/badges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId: selectedBadgeId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to add medal')
      setSelectedBadgeId('')
      await refreshSocialCard()
    } catch (err) {
      setMedalManageError(err instanceof Error ? err.message : 'Failed to add medal')
    } finally {
      setSavingBadge(false)
    }
  }

  async function removeBadge(badgeId: string) {
    if (savingBadge) return
    setSavingBadge(true)
    setMedalManageError('')
    try {
      const res = await fetch(`/api/social-card/${userId}/badges`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to remove medal')
      await refreshSocialCard()
    } catch (err) {
      setMedalManageError(err instanceof Error ? err.message : 'Failed to remove medal')
    } finally {
      setSavingBadge(false)
    }
  }

  async function submitReport() {
    const selectedReason = REPORT_REASONS.find(reason => reason.id === reportReason)
    const needsSubReason = Boolean(selectedReason && selectedReason.subReasons.length > 0)
    const needsDetails = reportReason === 'OTHER'
    if (!selectedReason || submittingReport || (needsSubReason && !reportSubReason) || (needsDetails && !reportDetails.trim())) return
    setSubmittingReport(true)
    setReportMessage('')
    try {
      const res = await fetch(`/api/social-card/${userId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reportReason,
          subReason: reportSubReason,
          details: reportDetails,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to submit report')
      setReportMessage('Report submitted')
      setShowReport(false)
      setReportStep(1)
      setReportReason('')
      setReportSubReason('')
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const cardData = data
    ? {
        ...data,
        user: {
          ...data.user,
          aboutMe: previewOverride?.aboutMe ?? data.user.aboutMe,
          publicFields: previewOverride?.publicFields ?? data.user.publicFields,
        },
        viewer: {
          ...data.viewer,
          ...previewOverride?.viewer,
        },
      }
    : null
  const visibleBadges = cardData?.user.badges
    ? (showAllBadges ? cardData.user.badges : cardData.user.badges.slice(0, 2))
    : []
  const hiddenBadgeCount = cardData?.user.badges ? Math.max(0, cardData.user.badges.length - visibleBadges.length) : 0
  const canManageMedals = Boolean(cardData?.viewer.isStaff && !cardData.viewer.isSelf)
  const hasSecondarySocialInfo = Boolean(cardData && (cardData.user.publicFields.length > 0 || cardData.user.badges.length > 0 || canManageMedals))
  const availableBadges = badgeDefs.filter(def => !cardData?.user.badges.some(badge => badge.badgeId === def.id))
  const selectedReportReason = REPORT_REASONS.find(reason => reason.id === reportReason)
  const reportNeedsSubReason = Boolean(selectedReportReason && selectedReportReason.subReasons.length > 0)
  const reportNeedsDetails = reportReason === 'OTHER'
  const canSubmitReport = Boolean(selectedReportReason && !submittingReport && (!reportNeedsSubReason || reportSubReason) && (!reportNeedsDetails || reportDetails.trim()))

  function closeReportFlow() {
    setShowReport(false)
    setReportStep(1)
    setReportReason('')
    setReportSubReason('')
    setReportDetails('')
  }

  function selectReportReason(reasonId: string) {
    setReportReason(reasonId)
    setReportSubReason('')
    setReportDetails('')
    setReportStep(2)
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: isMobile ? 'flex-end' : 'center', zIndex: 1200, padding: isMobile ? '0' : '18px' }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: isMobile ? '100%' : '92%',
          maxWidth: isMobile ? '100%' : '680px',
          maxHeight: isMobile ? '92vh' : '86vh',
          overflowY: 'auto',
          borderRadius: isMobile ? '24px 24px 0 0' : '22px',
          padding: isMobile ? '18px 18px max(18px, env(safe-area-inset-bottom))' : '24px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: isMobile ? '16px' : '18px', right: isMobile ? '16px' : '18px', zIndex: 2 }}>
          <button onClick={onClose} aria-label="Close" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={17} strokeWidth={2.4} />
          </button>
        </div>

        {loading ? (
          <div style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : error && !data ? (
          <div style={{ minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', textAlign: 'center' }}>{error}</div>
        ) : cardData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '14px' : '16px' }}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: isMobile ? '4px 40px 2px' : '0 54px 0' }}>
              <div style={{ padding: '5px', borderRadius: '50%', border: '1px solid rgba(99,102,241,0.24)', background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(16,185,129,0.08))', boxShadow: '0 14px 32px rgba(15,23,42,0.10)' }}>
                <UserAvatar
                  user={cardData.user}
                  size={isMobile ? 98 : 104}
                  onClick={cardData.viewer.canViewFullAvatar && cardData.user.avatar ? () => setFullAvatarOpen(true) : undefined}
                  style={{ border: '3px solid var(--surface)', boxShadow: '0 10px 22px rgba(15,23,42,0.14)' }}
                />
              </div>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.15 }}>{cardData.user.name}</h2>
                <span style={{ marginTop: '7px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 9px', borderRadius: '999px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 800 }}>
                  {cardData.user.role === 'STUDENT' ? <GraduationCap size={12} /> : <ShieldCheck size={12} />}
                  {formatRole(cardData.user.role)}
                </span>
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border)', width: '100%' }} />

            <div style={{ display: 'grid', gridTemplateColumns: isMobile || !hasSecondarySocialInfo ? '1fr' : 'minmax(0, 1.08fr) minmax(0, 0.92fr)', gap: isMobile ? '14px' : '16px', alignItems: 'start', minWidth: 0 }}>
              <section style={{ display: 'flex', flexDirection: 'column', gap: '7px', minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>About</h3>
                <div style={{
                  fontSize: '14px',
                  color: cardData.user.aboutMe ? 'var(--text-primary)' : 'var(--text-muted)',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  maxHeight: isMobile ? '220px' : '190px',
                  overflowY: 'auto',
                  overflowWrap: 'break-word',
                }}>
                  {cardData.user.aboutMe || 'No About Me yet.'}
                </div>
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>

            {(cardData.user.badges.length > 0 || canManageMedals) && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: '9px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    <Medal size={15} color="var(--primary)" />
                    Medals
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {cardData.user.badges.length > 2 && (
                      <button onClick={() => setShowAllBadges(v => !v)} style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontSize: '11px', fontWeight: 800, cursor: 'pointer', padding: '2px 0' }}>
                        {showAllBadges ? 'Show less' : 'View all'}
                      </button>
                    )}
                    {canManageMedals && (
                      <button onClick={openMedalManager} style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontSize: '11px', fontWeight: 900, cursor: 'pointer', padding: '2px 0' }}>
                        Manage Medals
                      </button>
                    )}
                  </div>
                </div>
                {cardData.user.badges.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '9px 11px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    No medals assigned yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {visibleBadges.map((badge, index) => {
                      const Icon = getMedalIcon(badge)
                      const accent = badge.category === 'ACADEMIC' ? '#f59e0b' : '#10b981'
                      return (
                        <div key={badge.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', maxWidth: '100%', padding: '7px 10px', borderRadius: '12px', background: index % 2 === 0 ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.10)', border: `1px solid ${accent}33`, color: 'var(--text-primary)' }}>
                          <Icon size={14} color={accent} strokeWidth={2.4} />
                          <span style={{ fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{badge.label}</span>
                        </div>
                      )
                    })}
                    {hiddenBadgeCount > 0 && (
                      <button onClick={() => setShowAllBadges(true)} style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface-2)', color: 'var(--text-secondary)', padding: '7px 10px', fontSize: '12px', fontWeight: 900, cursor: 'pointer' }}>
                        +{hiddenBadgeCount}
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}

            {cardData.user.publicFields.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: '9px', minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Public Info</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {cardData.user.publicFields.map(field => {
                    const Icon = getPublicInfoIcon(field.key)
                    return (
                      <div key={field.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 10px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)', maxWidth: '100%', minWidth: 0 }}>
                        <Icon size={14} color="var(--primary)" strokeWidth={2.3} />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 800 }}>{field.label === 'CGPA' ? 'CGPA' : field.label}</span>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{field.value}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
              </div>
            </div>

            {error && <div style={{ width: '100%', color: 'var(--danger)', fontSize: '12px', textAlign: 'center' }}>{error}</div>}
            {reportMessage && <div style={{ width: '100%', color: reportMessage === 'Report submitted' ? 'var(--success)' : 'var(--danger)', fontSize: '12px', textAlign: 'center' }}>{reportMessage}</div>}

            <div style={{ borderTop: '1px solid var(--border)', width: '100%', paddingTop: isMobile ? '12px' : '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'stretch', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={onClose}
                  className="btn btn-ghost"
                  style={{ borderRadius: '12px', minHeight: '40px', padding: '9px 16px', flex: isMobile ? '1 1 120px' : '0 1 150px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  Close
                </button>
              {cardData.viewer.isSelf && (
                  <button
                    onClick={() => {
                      onClose()
                      router.push('/profile')
                    }}
                    className="btn btn-primary"
                    style={{ borderRadius: '12px', minHeight: '40px', padding: '9px 16px', flex: isMobile ? '1 1 150px' : '0 1 190px', display: 'inline-flex', justifyContent: 'center', gap: '7px', alignItems: 'center' }}
                  >
                    <Sparkles size={15} />
                    Edit Profile
                  </button>
              )}
              {cardData.viewer.canTalkToManager && (
                <button onClick={startManagerChat} disabled={startingChat} className="btn btn-primary" style={{ borderRadius: '12px', minHeight: '40px', padding: '9px 16px', flex: isMobile ? '1 1 170px' : '0 1 210px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Send size={15} />
                  {startingChat ? 'Opening...' : 'Talk to Manager'}
                </button>
              )}
              {cardData.viewer.canReport && (
                <button
                  onClick={() => {
                    setReportMessage('')
                    setShowReport(true)
                  }}
                  className="btn btn-ghost"
                  style={{ borderRadius: '12px', minHeight: '40px', padding: '9px 14px', flex: isMobile ? '1 1 130px' : '0 1 auto', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 800 }}
                >
                  Report User
                </button>
              )}
              </div>
              {cardData.viewer.isSelf && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: isMobile ? 'center' : 'right' }}>Visit Profile to update your information.</span>
              )}
            </div>
          </div>
        )}
      </div>

      {showReport && data && (
        <div className="modal-overlay" onClick={closeReportFlow} style={{ zIndex: 1300, alignItems: isMobile ? 'flex-end' : 'center', padding: isMobile ? '0' : '18px' }}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{
              width: isMobile ? '100%' : '94%',
              maxWidth: '560px',
              maxHeight: isMobile ? '88vh' : '82vh',
              overflowY: 'auto',
              padding: isMobile ? '20px 18px max(20px, env(safe-area-inset-bottom))' : '24px',
              borderRadius: isMobile ? '24px 24px 0 0' : '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
                  {reportStep === 1 ? 'Report User' : `Report ${selectedReportReason?.label || 'User'}`}
                </h3>
                {reportStep === 2 && selectedReportReason && (
                  <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', padding: '5px 9px', borderRadius: '999px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 800 }}>
                    {selectedReportReason.label}
                  </div>
                )}
              </div>
              <button onClick={closeReportFlow} aria-label="Close report" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {reportStep === 1 ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                {REPORT_REASONS.map(reason => (
                  <button
                    key={reason.id}
                    onClick={() => selectReportReason(reason.id)}
                    style={{
                      width: '100%',
                      minHeight: '76px',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      background: 'var(--surface-2)',
                      color: 'var(--text-primary)',
                      padding: '13px 14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: '5px',
                      transition: 'border-color 0.15s ease, background-color 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.background = 'var(--surface)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--surface-2)'
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 900 }}>{reason.label}</span>
                    <span style={{ fontSize: '12px', lineHeight: 1.35, color: 'var(--text-muted)', fontWeight: 600 }}>{reason.description}</span>
                  </button>
                ))}
              </div>
            ) : selectedReportReason && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {selectedReportReason.subReasons.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '9px' }}>
                    {selectedReportReason.subReasons.map(subReason => {
                      const selected = reportSubReason === subReason
                      return (
                        <button
                          key={subReason}
                          onClick={() => setReportSubReason(subReason)}
                          style={{
                            border: selected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                            borderRadius: '14px',
                            background: selected ? 'rgba(99, 102, 241, 0.10)' : 'var(--surface-2)',
                            color: selected ? 'var(--primary)' : 'var(--text-primary)',
                            padding: '11px 12px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            fontSize: '13px',
                            fontWeight: 850,
                            lineHeight: 1.35,
                            minHeight: '48px',
                          }}
                        >
                          {subReason}
                        </button>
                      )
                    })}
                  </div>
                )}

                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Additional details{reportNeedsDetails ? ' required' : ''}
                  </span>
                  <textarea
                    className="form-input"
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value.slice(0, 2000))}
                    placeholder={reportNeedsDetails ? 'Please explain the issue.' : 'Add any extra context.'}
                    rows={isMobile ? 4 : 5}
                    maxLength={2000}
                    style={{ resize: 'vertical', minHeight: isMobile ? '112px' : '124px' }}
                  />
                </label>

                {reportMessage && reportMessage !== 'Report submitted' && (
                  <div style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: 700 }}>{reportMessage}</div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
                  <button
                    onClick={() => {
                      setReportStep(1)
                      setReportSubReason('')
                    }}
                    className="btn btn-ghost"
                    style={{ borderRadius: '12px', flex: isMobile ? undefined : 1 }}
                    disabled={submittingReport}
                  >
                    Back
                  </button>
                  <button
                    onClick={submitReport}
                    disabled={!canSubmitReport}
                    className="btn btn-primary"
                    style={{ borderRadius: '12px', flex: isMobile ? undefined : 1 }}
                  >
                    {submittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showManageMedals && data && canManageMedals && (
        <div className="modal-overlay" onClick={() => setShowManageMedals(false)} style={{ zIndex: 1300, alignItems: isMobile ? 'flex-end' : 'center' }}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{
              width: isMobile ? '100%' : '92%',
              maxWidth: '420px',
              maxHeight: isMobile ? '82vh' : '76vh',
              overflowY: 'auto',
              padding: '20px',
              borderRadius: isMobile ? '22px 22px 0 0' : '22px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Medal size={17} color="var(--primary)" />
                  Manage Medals
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{data.user.name}</div>
              </div>
              <button onClick={() => setShowManageMedals(false)} aria-label="Close medal manager" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px', borderRadius: '16px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Currently assigned</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>{data.user.badges.length}</span>
                </div>
                {data.user.badges.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No medals assigned yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.user.badges.map(badge => {
                      const Icon = getMedalIcon(badge)
                      const accent = badge.category === 'ACADEMIC' ? '#f59e0b' : '#10b981'
                      return (
                        <div key={badge.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <Icon size={15} color={accent} strokeWidth={2.4} />
                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{badge.label}</span>
                          </div>
                          <button
                            onClick={() => removeBadge(badge.badgeId)}
                            disabled={savingBadge}
                            style={{ border: 'none', background: 'transparent', color: 'var(--danger)', fontSize: '11px', fontWeight: 900, cursor: savingBadge ? 'not-allowed' : 'pointer', padding: '4px' }}
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                <select
                  value={selectedBadgeId}
                  onChange={e => setSelectedBadgeId(e.target.value)}
                  className="form-input"
                  style={{ flex: 1, minWidth: 0, fontSize: '13px' }}
                >
                  <option value="">{availableBadges.length === 0 ? 'No medals available' : 'Select medal'}</option>
                  {availableBadges.map(def => (
                    <option key={def.id} value={def.id}>{def.label}</option>
                  ))}
                </select>
                <button
                  onClick={assignBadge}
                  disabled={!selectedBadgeId || savingBadge}
                  className="btn btn-primary"
                  style={{ borderRadius: '12px', padding: '0 16px', flexShrink: 0 }}
                >
                  Add
                </button>
              </div>
              {medalManageError && (
                <div style={{ fontSize: '12px', color: 'var(--danger)', textAlign: 'center' }}>{medalManageError}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {fullAvatarOpen && cardData?.viewer.canViewFullAvatar && cardData.user.avatar && (
        <div className="modal-overlay" onClick={() => setFullAvatarOpen(false)} style={{ zIndex: 1300 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '92%', maxWidth: '520px', padding: '18px' }}>
            <img src={cardData.user.avatar} alt={`${cardData.user.name} profile picture`} style={{ width: '100%', maxHeight: '76vh', objectFit: 'contain', borderRadius: '18px' }} />
          </div>
        </div>
      )}
    </div>
  )
}
