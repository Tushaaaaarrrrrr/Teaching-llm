'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import Script from 'next/script'
import { formatIST, formatISTDate, getEventStatus } from '@/lib/date-utils'
import LiveSessionsMobile from '@/components/live/LiveSessionsMobile'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface CourseEvent {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  meetLink: string | null
  type: string
  status: string
  manualStatus: string
  courseId: string | null
  course: { id: string; name: string; color: string; teacherName?: string | null; liveUpgradePrice?: number | null } | null
  instructor: { id: string; name: string } | null
  instructorId?: string | null
  streamProvider?: string | null
  streamStatus?: string | null
  isRecordedOnly?: boolean
}

interface MeResponse {
  user?: {
    id?: string
    role?: string
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string; bg: string }> = {
  live:        { label: 'LIVE',        color: 'var(--success)', dotColor: 'var(--success)', bg: 'rgba(22,163,74,0.10)' },
  upcoming:    { label: 'UPCOMING',    color: 'var(--text-secondary)', dotColor: 'var(--neu-dark)', bg: 'transparent' },
  completed:   { label: 'COMPLETED',   color: 'var(--text-muted)', dotColor: 'var(--neu-dark)', bg: 'transparent' },
  cancelled:   { label: 'CANCELLED',   color: 'var(--danger)', dotColor: 'var(--danger)', bg: 'rgba(239,68,68,0.10)' },
  rescheduled: { label: 'RESCHEDULED', color: 'var(--warning)', dotColor: 'var(--warning)', bg: 'rgba(217,119,6,0.10)' },
}

export default function LivePage() {
  const { data, isLoading } = useSWR<CourseEvent[]>('/api/live-sessions', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 15000,
  })
  const { data: userData } = useSWR<MeResponse>('/api/auth/me', fetcher)
  
  const [nowTick, setNowTick] = useState(Date.now())
  const [syncing, setSyncing] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [userId, setUserId] = useState('')
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  
  const [upgradeModalCourse, setUpgradeModalCourse] = useState<{ id: string; name: string; liveUpgradePrice: number } | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [upgradeSuccessOrderId, setUpgradeSuccessOrderId] = useState<string | null>(null)

  const handleUpgrade = async (courseId: string) => {
    setIsProcessing(true)
    setUpgrading(true)
    try {
      const orderRes = await fetch(`/api/courses/${courseId}/create-razorpay-order`, { method: 'POST' })
      if (!orderRes.ok) {
        const data = await orderRes.json()
        alert(data.error || 'Failed to create order')
        setIsProcessing(false)
        setUpgrading(false)
        return
      }
      const orderData = await orderRes.json()

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GenZ IItian',
        description: `PRO Upgrade — ${orderData.courseName}`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: orderData.userName,
          email: orderData.userEmail,
        },
        theme: { color: 'var(--accent)' },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          setIsProcessing(true)
          try {
            const verifyRes = await fetch(`/api/courses/${courseId}/upgrade`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyRes.ok) {
              setUpgradeModalCourse(null)
              setUpgradeSuccessOrderId(verifyData.orderId)
              mutate('/api/live-sessions')
            } else {
              alert(verifyData.error || 'Payment verification failed')
            }
          } catch {
            alert('Payment verification failed. Please contact support.')
          } finally {
            setIsProcessing(false)
            setUpgrading(false)
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false)
            setUpgrading(false)
          },
        },
      }

      setIsProcessing(false)
      const rzp = new (window as unknown as { Razorpay: new (opts: typeof options) => { open: () => void } }).Razorpay(options)
      rzp.open()
    } catch (e: any) {
      alert(e.message || 'Something went wrong')
      setIsProcessing(false)
      setUpgrading(false)
    }
  }
  
  const sessions = Array.isArray(data) ? data : []

  // Update time every 30 seconds
  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTick(Date.now()), 30000)
    return () => window.clearInterval(intervalId)
  }, [])

  // Get user role once
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data: MeResponse) => {
        setUserRole(data.user?.role || '')
        setUserId(data.user?.id || '')
      })
      .catch(console.error)
  }, [])

  const today = new Date().toLocaleDateString('en-GB', { month: '2-digit', day: '2-digit', year: 'numeric' })
  const sessionsWithLocalStatus = sessions.map(session => ({
    ...session,
    status: getEventStatus(session.startTime, session.endTime, session.manualStatus || session.status),
  }))
  const isManager = userRole === 'MANAGER'

  // Format lastSyncAt for display
  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return 'Never'
    const date = new Date(isoString)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  if (isLoading) {
    return (
      <div className="page-container">
        {[1,2,3].map(i => (
          <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '50px', marginBottom: '12px' }} />
        ))}
      </div>
    )
  }

  void nowTick
  const liveSessions = sessionsWithLocalStatus.filter(s => s.status === 'live')
  const upcomingSessions = sessionsWithLocalStatus.filter(s => s.status === 'upcoming' || s.status === 'rescheduled')
  const recentSessions = sessionsWithLocalStatus.filter(s => s.status === 'completed' || s.status === 'cancelled')

  const nextUpcomingSessionId = upcomingSessions.length > 0 ? upcomingSessions[0].id : null

  const renderSessionBlock = (session: CourseEvent, isNextUpcoming: boolean) => {
    const isLive = session.status === 'live'
    const isCompleted = session.status === 'completed'
    const isCancelled = session.status === 'cancelled'
    const isRescheduled = session.status === 'rescheduled'

    const statusCfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.upcoming

    const dotColor = isLive ? 'var(--success)' : isCancelled ? 'var(--danger)' : isRescheduled ? 'var(--warning)' : 'var(--neu-dark)'
    const dotFill = isLive ? 'var(--success)' : 'var(--surface-2)'
    const dotGlow = isLive
      ? '0 0 0 4px rgba(22,163,74,0.18)'
      : isNextUpcoming
      ? '0 0 0 4px rgba(54,54,232,0.12)'
      : '2px 2px 4px var(--neu-dark), -2px -2px 4px var(--neu-light)'

    const rowShadow = isCompleted || isCancelled
      ? 'inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)'
      : isLive
      ? '6px 6px 14px #b8e8c8, -6px -6px 14px var(--neu-light)'
      : isNextUpcoming
      ? '6px 6px 14px #c0c2d8, -6px -6px 14px var(--neu-light)'
      : '6px 6px 12px var(--neu-dark), -6px -6px 12px var(--neu-light)'

    return (
      <div key={session.id} style={{ position: 'relative', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{
          position: 'absolute', left: '-41px',
          width: '16px', height: '16px', borderRadius: '50%',
          background: dotFill, border: `2px solid ${dotColor}`, boxShadow: dotGlow, zIndex: 1, flexShrink: 0,
        }} />

        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '20px',
          padding: '18px 24px', borderRadius: '50px', background: 'var(--surface-2)',
          boxShadow: rowShadow, opacity: isCompleted ? 0.65 : isCancelled ? 0.55 : 1,
          transition: 'all 0.2s ease',
        }}>
          {/* Time block */}
          <div style={{ width: '120px', flexShrink: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: isLive ? 'var(--success)' : isCompleted || isCancelled ? 'var(--text-muted)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {formatIST(session.startTime)}
            </div>
            <div style={{ fontSize: '11px', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ color: 'var(--text-muted)' }}>{formatISTDate(session.startTime)}</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '36px', background: '#d0d2d9', flexShrink: 0 }} />

          {/* Title + Status */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap', overflow: 'hidden' }}>
                <span style={{
                  fontSize: '15px', fontWeight: '800',
                  color: isCompleted || isCancelled ? 'var(--text-muted)' : 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                  textDecoration: isCancelled ? 'line-through' : 'none',
                }}>
                  {session.title}
                </span>

                {!isCompleted && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '2px 10px', borderRadius: '50px',
                    background: statusCfg.bg, fontSize: '10px', fontWeight: '700', letterSpacing: '0.04em',
                    color: statusCfg.color, flexShrink: 0,
                    ...(isLive ? { boxShadow: `0 0 8px ${statusCfg.color}33` } : {}),
                  }}>
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%', background: statusCfg.dotColor, display: 'inline-block',
                      ...(isLive ? { boxShadow: `0 0 4px ${statusCfg.color}99`, animation: 'livePulse 1.5s infinite' } : {}),
                    }} />
                    {statusCfg.label}
                  </span>
                )}

                {isNextUpcoming && !isLive && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '50px',
                    background: 'rgba(54,54,232,0.08)', color: 'var(--primary)', fontSize: '10px', fontWeight: '700', letterSpacing: '0.04em', flexShrink: 0,
                  }}>
                    UP NEXT
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  Instructor: {session.course?.teacherName || 'Standard Faculty'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '2px' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  {session.course?.name || 'General Batch'}
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          {isCompleted ? (
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, background: 'var(--surface-2)', boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9999b0" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          ) : isCancelled ? (
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, background: 'var(--surface-2)', boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
          ) : isRescheduled ? (
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, background: 'var(--surface-2)', boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
            </div>
          ) : session.streamProvider === 'AGORA' && (isLive || (!isCompleted && !isCancelled && !isRescheduled)) ? (
            (() => {
              const canHost = isManager || (!!session.instructorId && session.instructorId === userId)
              const streamLive = session.streamStatus === 'LIVE'
              // Hosts get Go Live (when scheduled) or Open Stage (when live) — both route to /live/[id].
              // Audience only gets Join Live once the host has started.
              if (!streamLive && !canHost) {
                return (
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, background: 'var(--surface-2)',
                    boxShadow: isNextUpcoming ? '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light), 0 0 0 2px rgba(54,54,232,0.15)' : '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isNextUpcoming ? 'var(--primary)' : 'var(--text-muted)'} strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </div>
                )
              }
              const label = streamLive ? (canHost ? 'Open Stage' : 'Join Live') : 'Go Live'
              const bg = streamLive ? 'var(--success)' : 'var(--danger)'
              const shadow = streamLive
                ? '4px 4px 10px rgba(22,163,74,0.4), -2px -2px 6px var(--neu-glow)'
                : '4px 4px 10px rgba(239,68,68,0.4), -2px -2px 6px var(--neu-glow)'
              return (
                <Link href={`/live/${session.id}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '50px', flexShrink: 0,
                  background: bg, color: 'white', fontWeight: '700', fontSize: '14px', textDecoration: 'none',
                  boxShadow: shadow,
                }}>
                  {streamLive && (
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--surface)', animation: 'livePulse 1.5s infinite' }} />
                  )}
                  {label}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
              )
            })()
          ) : (isLive || (!isCompleted && !isCancelled && !isRescheduled)) && session.meetLink ? (
            <a href={session.meetLink} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '50px', flexShrink: 0,
              background: isLive ? 'var(--success)' : 'var(--primary)', color: 'white', fontWeight: '600', fontSize: '14px', textDecoration: 'none',
              boxShadow: isLive
                ? '4px 4px 10px rgba(22,163,74,0.4), -2px -2px 6px var(--neu-glow)'
                : '4px 4px 10px rgba(54,54,232,0.3), -2px -2px 6px var(--neu-glow)',
            }}>
              {isLive ? 'Join Now' : 'Join'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          ) : session.isRecordedOnly ? (
            <button
              onClick={() => {
                if (session.courseId) {
                  setUpgradeModalCourse({
                    id: session.courseId,
                    name: session.course?.name || 'This Course',
                    liveUpgradePrice: session.course?.liveUpgradePrice || 999
                  })
                }
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '50px', flexShrink: 0,
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', fontWeight: '800', fontSize: '13px', border: 'none', cursor: 'pointer',
                boxShadow: '0 6px 14px rgba(220, 38, 38, 0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 18px rgba(220, 38, 38, 0.4)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 14px rgba(220, 38, 38, 0.3)'
              }}
            >
              Upgrade to join
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </button>
          ) : (
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, background: 'var(--surface-2)',
              boxShadow: isNextUpcoming ? '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light), 0 0 0 2px rgba(54,54,232,0.15)' : '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isNextUpcoming ? 'var(--primary)' : 'var(--text-muted)'} strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
          )}
      </div>
    )
  }

  return (
    <>
    {/* Mobile redesign */}
    <div className="live-sessions-mobile-only">
      <LiveSessionsMobile 
        sessions={sessions} 
        onUpgradeClick={(courseId, courseName, price) => {
          setUpgradeModalCourse({ id: courseId, name: courseName, liveUpgradePrice: price })
        }}
      />
    </div>
    {/* Desktop layout */}
    <div className="page-container fade-in live-sessions-desktop-only">
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Today&apos;s Schedule &bull; {today}</p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isManager && lastSyncAt && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '0 12px' }}>
              Last Sync: <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{formatLastSync(lastSyncAt)}</span>
            </span>
          )}
          {isManager && (
            <button
              onClick={async () => {
                try {
                  setSyncing(true)
                  const res = await fetch('/api/live-sessions/sync', { method: 'POST' })
                  if (!res.ok) {
                    const err = await res.json()
                    alert(err.error || 'Failed to sync live sessions')
                    return
                  }
                  const result = await res.json()
                  setLastSyncAt(result.lastSyncAt)
                  await Promise.all([
                    mutate('/api/live-sessions'),
                    mutate('/api/dashboard'),
                  ])
                } catch (error) {
                  console.error(error)
                  alert('Failed to sync live sessions')
                } finally {
                  setSyncing(false)
                }
              }}
              style={{
                padding: '0 16px', height: '42px', borderRadius: '50px', border: 'none',
                background: 'var(--surface-2)', boxShadow: '4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)',
                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                color: 'var(--primary)', fontSize: '13px', fontWeight: '700',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M2 22v-6h6M21.34 15.57a10 10 0 1 1-.92-10.45l3.08 2.88L2 22l-3.08-2.88a10 10 0 1 1 .92 10.45"/>
                <path d="M21.5 2v6h-6M2 22v-6h6M2 22l3.08-2.88a10 10 0 1 1 16.26-6.69M21.5 8l-3.08 2.88A10 10 0 1 1 2 15.31"/>
              </svg>
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          )}

        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Category: Live */}
        {liveSessions.length > 0 && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px', paddingLeft: '8px' }}>Live Sessions</h2>
            <div style={{ position: 'relative', paddingLeft: '48px' }}>
              <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '24px', width: '2px', background: 'var(--success)', borderRadius: '2px' }} />
              {liveSessions.map(session => renderSessionBlock(session, false))}
            </div>
          </div>
        )}

        {/* Category: Upcoming */}
        {upcomingSessions.length > 0 && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px', paddingLeft: '8px' }}>Upcoming Sessions</h2>
            <div style={{ position: 'relative', paddingLeft: '48px' }}>
              <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '24px', width: '2px', background: 'var(--neu-dark)', borderRadius: '2px' }} />
              {upcomingSessions.map(session => renderSessionBlock(session, session.id === nextUpcomingSessionId))}
            </div>
          </div>
        )}

        {/* Category: Recent */}
        {recentSessions.length > 0 && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px', paddingLeft: '8px' }}>Recent Sessions</h2>
            <div style={{ position: 'relative', paddingLeft: '48px' }}>
              <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '24px', width: '2px', background: 'var(--surface-2)', borderRadius: '2px' }} />
              {recentSessions.map(session => renderSessionBlock(session, false))}
            </div>
          </div>
        )}
        {sessions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--neu-dark)" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            <p style={{ fontWeight: '500' }}>No sessions scheduled</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>

    {/* Upgrade Confirmation Modal */}
    {upgradeModalCourse && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001,
        padding: '20px'
      }} onClick={() => !upgrading && setUpgradeModalCourse(null)}>
        <div style={{
          background: 'var(--surface)', borderRadius: '32px', width: '100%', maxWidth: '440px',
          boxShadow: '0 0 100px var(--neu-glow), 0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden',
          animation: 'modalSlideUp 0.3s ease-out', position: 'relative'
        }} onClick={e => e.stopPropagation()}>
          {upgrading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', marginBottom: '24px' }}>
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/>
              </svg>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>Processing Payment...</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', textAlign: 'center' }}>
                Please wait while we securely process your transaction.<br/>Do not close or refresh this page.
              </p>
              <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 100% { transform: rotate(360deg); } }`}} />
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <button
                onClick={() => setUpgradeModalCourse(null)}
                style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', fontSize: '28px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}
              >&times;</button>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--surface)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Upgrade to PRO Batch</h2>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px' }}>{upgradeModalCourse.name}</div>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px' }}>
                You will get access to <strong>live classes, real-time mentorship,</strong> and everything as in your current plan.
              </p>

              <div style={{ background: '#f8faff', borderRadius: '20px', padding: '24px', marginBottom: '32px', border: '1.5px solid #e0e7ff' }}>
                <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--accent)', marginBottom: '8px' }}>₹{upgradeModalCourse.liveUpgradePrice}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>One-time upgrade fee</div>
              </div>

              <div style={{ display: 'flex', gap: '14px' }}>
                <button
                  onClick={() => setUpgradeModalCourse(null)}
                  style={{ flex: 1, padding: '16px', borderRadius: '18px', border: '2px solid #e2e8f0', background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpgrade(upgradeModalCourse.id)}
                  style={{
                    flex: 1.5, padding: '16px', borderRadius: '18px', border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white', fontWeight: '700', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  ✓ Confirm Upgrade
                </button>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '24px' }}>
                Course will be updated automatically after Payment
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Upgrade Success Modal */}
    {upgradeSuccessOrderId && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001,
        padding: '20px'
      }} onClick={() => setUpgradeSuccessOrderId(null)}>
        <div style={{
          background: 'var(--surface)', borderRadius: '32px', width: '100%', maxWidth: '440px',
          boxShadow: '0 0 100px var(--neu-glow), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '40px', textAlign: 'center',
          animation: 'modalSlideUp 0.3s ease-out'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Welcome to PRO!</h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
            Your upgrade was successful. You now have full access to live classes, mentorship, and priority support.
          </p>
          <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1.5px solid #bbf7d0' }}>
            <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Order ID</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#15803d', fontFamily: 'monospace' }}>{upgradeSuccessOrderId}</div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>A confirmation email has been sent to your registered email.</p>
          <button
            onClick={() => setUpgradeSuccessOrderId(null)}
            style={{
              width: '100%', padding: '16px', borderRadius: '18px', border: 'none',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
            }}
          >
            Got it, let&apos;s go! 🚀
          </button>
        </div>
      </div>
    )}

    {/* Processing Modal */}
    {isProcessing && (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          background: 'var(--surface)', padding: '40px', borderRadius: '32px',
          textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          width: '320px'
        }}>
          <div className="spinner" style={{
            width: '40px', height: '40px', border: '4px solid #f3f3f3',
            borderTop: '4px solid #6366f1', borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }} />
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Processing...</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Please wait while we set up your course access.</p>
        </div>
      </div>
    )}

    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes modalSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}} />

    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    </>
  )
}
