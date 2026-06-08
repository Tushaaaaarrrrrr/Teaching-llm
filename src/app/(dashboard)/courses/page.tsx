'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import useSWR, { mutate } from 'swr'
import FeedbackModal from '@/components/FeedbackModal'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || `Request failed for ${url}`)
  }
  return data
}

interface CourseItem {
  id: string
  name: string
  description: string
  subject: string
  color: string
  icon: string
  teacherName: string
  enrollmentType?: string
  liveUpgradePrice?: number | null
  _count: { lectures: number; materials: number; topics: number; courseEvents: number }
}

const COURSE_ICONS: Record<string, React.ReactNode> = {
  BookOpen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'var(--course-icon-svg-size, 28px)', height: 'var(--course-icon-svg-size, 28px)' }}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  Brain: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'var(--course-icon-svg-size, 28px)', height: 'var(--course-icon-svg-size, 28px)' }}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20"/><path d="M2 12h20"/></svg>,
  Globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'var(--course-icon-svg-size, 28px)', height: 'var(--course-icon-svg-size, 28px)' }}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  Database: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'var(--course-icon-svg-size, 28px)', height: 'var(--course-icon-svg-size, 28px)' }}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Monitor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'var(--course-icon-svg-size, 28px)', height: 'var(--course-icon-svg-size, 28px)' }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Wifi: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'var(--course-icon-svg-size, 28px)', height: 'var(--course-icon-svg-size, 28px)' }}><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1"/></svg>,
}

export default function CoursesPage() {
  const { data, error, isLoading } = useSWR<CourseItem[]>('/api/courses', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })
  const { data: userData } = useSWR('/api/auth/me', fetcher, { revalidateOnFocus: false })
  const { data: helpCard } = useSWR('/api/support/help-card', fetcher)
  const isManager = userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER'
  const isStudent = userData?.user?.role === 'STUDENT' || userData?.role === 'STUDENT'
  
  const { data: feedbacksRaw, mutate: mutateFeedbacks } = useSWR(isStudent ? '/api/feedback' : null, fetcher)
  const feedbacks = Array.isArray(feedbacksRaw) ? feedbacksRaw : []
  const [selectedFeedbackCourse, setSelectedFeedbackCourse] = useState<CourseItem | null>(null)

  const courses = Array.isArray(data) ? data : (data as any)?.courses || []
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [infoModalCourse, setInfoModalCourse] = useState<CourseItem | null>(null)
  const [upgradeModalCourse, setUpgradeModalCourse] = useState<CourseItem | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [showUpgradeHint, setShowUpgradeHint] = useState<string | null>(null)
  const [upgradeSuccessOrderId, setUpgradeSuccessOrderId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(handler)
  }, [search])

  const filtered = courses.filter((c: CourseItem) =>
    c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    c.subject?.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  async function handleUpgrade(courseId: string) {
    setIsProcessing(true)
    setUpgrading(true)
    try {
      // Step 1: Create Razorpay order
      const orderRes = await fetch(`/api/courses/${courseId}/create-razorpay-order`, { method: 'POST' })
      if (!orderRes.ok) {
        const data = await orderRes.json()
        alert(data.error || 'Failed to create order')
        setIsProcessing(false)
        setUpgrading(false)
        return
      }
      const orderData = await orderRes.json()

      // Step 2: Open Razorpay checkout
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
              mutate('/api/courses')
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

      const rzp = new (window as unknown as { Razorpay: new (opts: typeof options) => { open: () => void } }).Razorpay(options)
      rzp.open()
      setIsProcessing(false)
    } catch (e: any) {
      alert(e.message || 'Something went wrong')
      setIsProcessing(false)
      setUpgrading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="grid-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card skeleton" style={{ height: '260px', borderRadius: '28px' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      {error ? (
        <div
          className="card"
          style={{
            marginBottom: '16px',
            padding: '14px 18px',
            border: '1px solid var(--border)',
            color: 'var(--danger)',
            background: 'var(--danger-light)',
          }}
        >
          Failed to load courses. {error.message}
        </div>
      ) : null}
      <div className="courses-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{courses.length} courses available</p>
        <div className="courses-search-wrap" style={{ position: 'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input courses-search-input"
            style={{ width: '260px', borderRadius: '50px', paddingLeft: '40px' }}
          />
        </div>
      </div>
      <style>{`
        .courses-search-input {
          border: 1.5px solid #000000 !important;
          color: #000000 !important;
          background: #ffffff !important;
        }
        .courses-search-input::placeholder {
          color: #000000 !important;
          opacity: 0.65 !important;
        }
        .courses-search-input:focus {
          border-color: #000000 !important;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.15) !important;
        }

        :root {
          --course-card-padding: 18px 20px 16px;
          --course-banner-height: 100px;
          --course-icon-size: 58px;
          --course-icon-svg-size: 28px;
          --course-title-size: 16px;
          --course-desc-display: -webkit-box;
          --course-teacher-display: flex;
          --course-stats-padding: 8px 10px;
          --course-stats-font-size: 15px;
          --course-stats-label-size: 11px;
          --course-stats-gap: 10px;
          --course-badge-padding: 3px 10px;
          --course-badge-font: 10px;
          --course-card-radius: 28px;
          --course-teacher-margin: 14px;
          --course-upgrade-padding: 14px 16px;
          --course-upgrade-font-size: 13px;
          --course-badge-pos: absolute;
          --course-badge-left: 12px;
          --course-upgrade-flex-dir: row;
          --course-optional-margin: 0;
        }

        @media (max-width: 768px) {
          .grid-3 {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          
          :root {
            --course-card-padding: 10px 10px 12px;
            --course-banner-height: 70px;
            --course-icon-size: 38px;
            --course-icon-svg-size: 18px;
            --course-title-size: 13.5px;
            --course-desc-display: none; /* Hide descriptions to keep card heights small & consistent */
            --course-teacher-display: none; /* Hide teacher name to save vertical space on mobile cards */
            --course-stats-padding: 4px 6px;
            --course-stats-font-size: 12px;
            --course-stats-label-size: 8px;
            --course-stats-gap: 6px;
            --course-badge-padding: 2px 6px;
            --course-badge-font: 8px;
            --course-card-radius: 20px;
            --course-teacher-margin: 6px;
            --course-upgrade-padding: 8px 6px;
            --course-upgrade-font-size: 9px;
            --course-badge-pos: relative;
            --course-badge-left: auto;
            --course-upgrade-flex-dir: column;
            --course-optional-margin: 0 0 4px 0;
          }

          /* Match compact margins for headers inside the card */
          .grid-3 h3 {
            margin-bottom: 2px !important;
          }

          .mobile-only-feedback-btn {
            display: flex !important;
          }
        }

        .mobile-only-feedback-btn {
          display: none !important;
        }

        @media (max-width: 600px) {
          .courses-header-row { margin-bottom: 18px !important; }
          .courses-search-wrap { width: 100%; }
          .courses-search-input { width: 100% !important; }
        }
      `}</style>

      <style>{`
        @keyframes proShine {
          0% { left: -100%; }
          20% { left: 200%; }
          100% { left: 200%; }
        }
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .help-icon-float {
          animation: gentleFloat 3s ease-in-out infinite;
        }
      `}</style>

      <div className="grid-3">
        {filtered.map((course: CourseItem) => {
          const isRecorded = ['RECORDED', 'FREE', 'DEMO'].includes(course.enrollmentType || '')
          const isLive = course.enrollmentType === 'LIVE'
          const isFreeOrDemo = course.enrollmentType === 'FREE' || course.enrollmentType === 'DEMO'
          const hasUpgradePrice = isRecorded && !isFreeOrDemo && course.liveUpgradePrice != null && course.liveUpgradePrice > 0
          
          // Determine batch type: General (free/demo), PRO (live), or Plus (recorded)
          const getBatchBadge = () => {
            if (isFreeOrDemo) return { text: 'General Batch', color: '#bae6fd' }
            if (isLive) return { text: 'PRO Batch', color: '#fff' }
            if (isRecorded) return { text: 'PLUS', color: 'var(--border)' }
            return { text: 'General Batch', color: '#bae6fd' }
          }
          const batchBadge = getBatchBadge()

          const isCourseExpired = (course as any).isExpired

          const innerCard = (
            <div
              style={{
                background: 'var(--surface-2)',
                borderRadius: 'var(--course-card-radius, 28px)',
                boxShadow: (isLive && !isCourseExpired)
                  ? `8px 8px 16px var(--neu-dark), -8px -8px 16px var(--neu-light), 0 0 0 2px ${course.color}40`
                  : '8px 8px 16px var(--neu-dark), -8px -8px 16px var(--neu-light)',
                overflow: 'hidden',
                cursor: isCourseExpired ? 'default' : 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                position: 'relative',
                filter: isCourseExpired ? 'grayscale(100%) opacity(0.85)' : 'none',
              }}
              onMouseEnter={e => {
                if (isCourseExpired) return;
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = isLive
                  ? `12px 12px 24px var(--neu-dark), -12px -12px 24px var(--neu-light), 0 0 0 2px ${course.color}60`
                  : '12px 12px 24px var(--neu-dark), -12px -12px 24px var(--neu-light)'
                if (!isFreeOrDemo && isRecorded) setShowUpgradeHint(course.id)
              }}
              onMouseLeave={e => {
                if (isCourseExpired) return;
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = isLive
                  ? `8px 8px 16px var(--neu-dark), -8px -8px 16px var(--neu-light), 0 0 0 2px ${course.color}40`
                  : '8px 8px 16px var(--neu-dark), -8px -8px 16px var(--neu-light)'
                setShowUpgradeHint(null)
              }}
            >
              {isCourseExpired && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '100px',
                  background: 'rgba(0,0,0,0.6)', zIndex: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '20px', fontWeight: '900', letterSpacing: '0.1em'
                }}>
                  EXPIRED
                </div>
              )}
              {isLive && (
                <div style={{
                  position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%',
                  background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent)',
                  transform: 'skewX(-25deg)',
                  animation: 'proShine 3s infinite ease-in-out',
                  zIndex: 10, pointerEvents: 'none'
                }} />
              )}
              {/* Gradient Banner */}
              <div style={{
                height: 'var(--course-banner-height, 100px)',
                background: isRecorded || isFreeOrDemo ? 'linear-gradient(135deg, #4b5563, #6b7280)' : `linear-gradient(135deg, ${course.color}ee, ${course.color}99)`,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ position: 'absolute', width: '130px', height: '130px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', top: '-50px', right: '-30px' }} />
                <div style={{ position: 'absolute', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', bottom: '-20px', left: '24px' }} />
                <div style={{
                  width: 'var(--course-icon-size, 58px)',
                  height: 'var(--course-icon-size, 58px)',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1,
                }}>
                  {COURSE_ICONS[course.icon] || COURSE_ICONS.BookOpen}
                </div>

                {/* Batch badge on banner */}
                {(isLive || isRecorded || isFreeOrDemo) && (
                  <div style={{
                    position: 'absolute', top: '10px', left: '12px',
                    padding: 'var(--course-badge-padding, 3px 10px)', borderRadius: '20px',
                    background: isLive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(8px)',
                    fontSize: 'var(--course-badge-font, 10px)', fontWeight: '800', color: batchBadge.color,
                    letterSpacing: '0.06em',
                  }}>
                    {batchBadge.text}
                  </div>
                )}

                    {/* Info button for recorded non-free users + tooltip */}
                    {isRecorded && !isFreeOrDemo && !isManager && (
                      <div style={{ position: 'absolute', top: '10px', right: '12px' }}>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInfoModalCourse(course) }}
                          style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '14px', fontWeight: '800',
                          }}
                          title={`Compare PRO vs ${isFreeOrDemo ? 'General Batch' : 'PLUS'}`}
                        >
                          i
                        </button>
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 8px)', right: '0',
                          background: 'var(--primary)', color: '#fff', padding: '8px 14px', borderRadius: '12px',
                          fontSize: '11px', fontWeight: '600', width: '200px', textAlign: 'center',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.4)', pointerEvents: 'none',
                          opacity: showUpgradeHint === course.id ? 1 : 0, 
                          transform: showUpgradeHint === course.id ? 'translateY(0)' : 'translateY(5px)',
                          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', zIndex: 100,
                          lineHeight: '1.4'
                        }}>
                          Click here to see difference between PLUS AND PRO batches
                          <div style={{ position: 'absolute', bottom: '100%', right: '10px', border: '6px solid transparent', borderBottomColor: 'var(--text-primary)' }} />
                        </div>
                      </div>
                    )}
              </div>

              {/* Card Body */}
              <div style={{ padding: 'var(--course-card-padding, 18px 20px 16px)', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ 
                  fontSize: 'var(--course-title-size, 16px)', 
                  fontWeight: '700', 
                  color: 'var(--text-primary)', 
                  marginBottom: '4px', 
                  lineHeight: '1.3',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {course.name}
                </h3>

                {course.subject && (
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 12px',
                    borderRadius: '50px',
                    background: isRecorded ? 'var(--surface-2)' : course.color + '18',
                    color: isRecorded ? 'var(--text-secondary)' : course.color,
                    fontSize: '12px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    letterSpacing: '0.02em',
                  }}>
                    {course.subject}
                  </span>
                )}

                {/* Show description for LIVE users and General Batch */}
                {(!isRecorded || isFreeOrDemo) && course.description && (
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.55',
                    marginBottom: '14px',
                    display: 'var(--course-desc-display, -webkit-box)',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {course.description}
                  </p>
                )}

                {/* Show teacher for LIVE users and General Batch */}
                {(!isRecorded || isFreeOrDemo) && course.teacherName && (
                  <div style={{ display: 'var(--course-teacher-display, flex)', alignItems: 'center', gap: '6px', marginBottom: 'var(--course-teacher-margin, 14px)' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: course.color + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: '700', color: course.color,
                    }}>
                      {course.teacherName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '500' }}>
                      {course.teacherName}
                    </span>
                  </div>
                )}

                {/* Upgrade button for RECORDED users */}
                {hasUpgradePrice && (
                  <div style={{ position: 'relative', marginTop: 'auto' }}>
                    {/* Show teacher only for LIVE users or above upgrade for RECORDED */}
                    {course.teacherName && (
                      <div style={{ display: 'var(--course-teacher-display, flex)', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: isRecorded ? 'var(--surface-2)' : course.color + '22',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', fontWeight: '700', color: isRecorded ? 'var(--text-secondary)' : course.color,
                        }}>
                          {course.teacherName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          {course.teacherName}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setUpgradeModalCourse(course) }}
                      style={{
                        width: '100%',
                        padding: 'var(--course-upgrade-padding, 14px 16px)',
                        borderRadius: '50px',
                        border: 'none',
                        background: 'var(--primary)',
                        color: '#fff',
                        fontSize: 'var(--course-upgrade-font-size, 13px)',
                        fontWeight: '800',
                        cursor: 'pointer',
                        marginBottom: '4px',
                        boxShadow: '0 8px 16px rgba(30, 30, 58, 0.4)',
                        transition: 'all 0.25s',
                        letterSpacing: '0.02em',
                        display: 'flex',
                        flexDirection: 'var(--course-upgrade-flex-dir, row)' as any,
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{ 
                        position: 'var(--course-badge-pos, absolute)' as any,
                        left: 'var(--course-badge-left, 12px)',
                        margin: 'var(--course-optional-margin, 0)',
                        fontSize: '8px', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '20px', 
                        color: '#fff', letterSpacing: '0.05em', fontWeight: '900', border: '1px solid rgba(255,255,255,0.2)' 
                      }}>
                        OPTIONAL
                      </span>
                      <span>
                        ⚡ Upgrade to PRO — ₹{course.liveUpgradePrice}
                      </span>
                      
                      {/* Shine effect overlay */}
                      <div style={{
                        position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                        transform: 'skewX(-25deg)',
                        transition: 'left 0.75s',
                      }} className="button-shine" />
                    </button>
                    
                    <style dangerouslySetInnerHTML={{ __html: `
                      button:hover .button-shine { left: 150% !important; }
                      @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, 5px); } to { opacity: 1; transform: translate(-50%, 0); } }
                    `}} />
                  </div>
                )}

                {/* Mobile-only Course Feedback option */}
                {isStudent && !feedbacks.some((f: any) => f.courseId === course.id) && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSelectedFeedbackCourse(course)
                    }}
                    className="mobile-only-feedback-btn"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '50px',
                      border: 'none',
                      background: 'var(--surface)',
                      color: 'var(--warning)',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      marginTop: '8px',
                      marginBottom: '10px',
                      boxShadow: '4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)',
                      display: 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontFamily: "'Outfit', 'Nunito', sans-serif",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    Give Course Feedback
                  </button>
                )}

                {/* Stats row */}
                <div style={{
                  display: 'flex',
                  gap: 'var(--course-stats-gap, 10px)',
                  paddingTop: '12px',
                  borderTop: '1.5px solid rgba(0,0,0,0.06)',
                  marginTop: 'auto',
                }}>
                  <div style={{
                    flex: 1, padding: 'var(--course-stats-padding, 8px 10px)', borderRadius: '14px',
                    background: 'var(--surface-2)', boxShadow: 'inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 'var(--course-stats-font-size, 15px)', fontWeight: '800', color: 'var(--text-primary)' }}>{course._count?.topics || 0}</div>
                    <div style={{ fontSize: 'var(--course-stats-label-size, 11px)', color: 'var(--text-muted)', fontWeight: '600' }}>Topics</div>
                  </div>
                  <div style={{
                    flex: 1, padding: 'var(--course-stats-padding, 8px 10px)', borderRadius: '14px',
                    background: 'var(--surface-2)', boxShadow: 'inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 'var(--course-stats-font-size, 15px)', fontWeight: '800', color: 'var(--text-primary)' }}>{course._count?.lectures || 0}</div>
                    <div style={{ fontSize: 'var(--course-stats-label-size, 11px)', color: 'var(--text-muted)', fontWeight: '600' }}>Lectures</div>
                  </div>
                  <div style={{
                    flex: 1, padding: 'var(--course-stats-padding, 8px 10px)', borderRadius: '14px',
                    background: 'var(--surface-2)', boxShadow: 'inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 'var(--course-stats-font-size, 15px)', fontWeight: '800', color: 'var(--text-primary)' }}>{course._count?.materials || 0}</div>
                    <div style={{ fontSize: 'var(--course-stats-label-size, 11px)', color: 'var(--text-muted)', fontWeight: '600' }}>Materials</div>
                  </div>
                </div>
              </div>
            </div>
          )

          return isCourseExpired ? (
            <div key={course.id} style={{ display: 'flex' }}>
              {innerCard}
            </div>
          ) : (
            <Link key={course.id} href={`/courses/${course.id}`} style={{ textDecoration: 'none', display: 'flex' }}>
              {innerCard}
            </Link>
          )
        })}

        {helpCard && helpCard.isEnabled && (
          <a href={helpCard.redirectUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex' }}>
            <div
              style={{
                background: 'var(--surface-2)',
                borderRadius: '28px',
                boxShadow: '8px 8px 16px var(--neu-dark), -8px -8px 16px var(--neu-light)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '12px 12px 24px var(--neu-dark), -12px -12px 24px var(--neu-light)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '8px 8px 16px var(--neu-dark), -8px -8px 16px var(--neu-light)'
              }}
            >
              {/* Simple Gradient Banner */}
              <div style={{
                height: '100px',
                background: `linear-gradient(135deg, #6366f1ee, #6366f199)`,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ position: 'absolute', width: '130px', height: '130px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', top: '-50px', right: '-30px' }} />
                <div style={{ position: 'absolute', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', bottom: '-20px', left: '24px' }} />
                <div style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1,
                }} className="help-icon-float">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '800', 
                  color: 'var(--text-primary)', 
                  marginBottom: '20px', 
                  lineHeight: '1.3',
                }}>
                  {helpCard.title}
                </h3>

                <button style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '16px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '700',
                  boxShadow: '4px 4px 8px rgba(99, 102, 241, 0.3)',
                  cursor: 'pointer'
                }}>
                  {helpCard.buttonText || 'Enroll in More'}
                </button>
              </div>
            </div>
          </a>
        )}
      </div>

      {filtered.length === 0 && (!helpCard || !helpCard.isEnabled) && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>No courses found</p>
          <p style={{ fontSize: '13px' }}>Try a different search term</p>
        </div>
      )}

      {/* ── Info / Comparison Modal ── */}
      {infoModalCourse && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }} onClick={() => setInfoModalCourse(null)}>
          <style dangerouslySetInnerHTML={{ __html: `
            .batch-cmp-modal { padding: 30px 40px; }
            .batch-cmp-table-wrap { padding: 30px 40px; }
            .batch-cmp-footer { padding: 0 40px 40px; }
            .batch-cmp-th { padding: 14px 16px; font-size: 13px; }
            .batch-cmp-td { padding: 14px 16px; font-size: 13px; }
            .batch-cmp-title { font-size: 24px; }
            .batch-cmp-sub { font-size: 15px; }
            @media (max-width: 520px) {
              .batch-cmp-modal { padding: 18px 16px 14px; }
              .batch-cmp-table-wrap { padding: 12px; }
              .batch-cmp-footer { padding: 0 12px 16px; }
              .batch-cmp-th { padding: 8px 8px; font-size: 10px; }
              .batch-cmp-td { padding: 10px 8px; font-size: 11px; }
              .batch-cmp-title { font-size: 18px; }
              .batch-cmp-sub { font-size: 12px; }
            }
          `}} />
          <div style={{
            background: 'var(--surface)', borderRadius: '24px', width: '100%', maxWidth: '750px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
            animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="batch-cmp-modal" style={{ background: 'linear-gradient(135deg, var(--surface-2), var(--border))', borderBottom: '1.5px solid var(--border)', position: 'relative' }}>
              <button onClick={() => setInfoModalCourse(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--surface)', border: 'none', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <h2 className="batch-cmp-title" style={{ fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px', paddingRight: '40px' }}>Batch Comparison</h2>
              <p className="batch-cmp-sub" style={{ color: 'var(--text-secondary)', fontWeight: '500', margin: 0 }}>Choose the experience that fits your learning style</p>
            </div>

            {/* Comparison Table */}
            <div className="batch-cmp-table-wrap">
              <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1.5px solid var(--border)', background: 'var(--surface)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '38%' }} />
                    <col style={{ width: '31%' }} />
                    <col style={{ width: '31%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: 'var(--surface)' }}>
                      <th className="batch-cmp-th" style={{ color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Features</th>
                      <th className="batch-cmp-th" style={{ color: 'var(--warning)', fontWeight: '800', background: 'var(--warning-light)', textAlign: 'center', wordBreak: 'break-word' }}>
                        {infoModalCourse?.enrollmentType === 'FREE' || infoModalCourse?.enrollmentType === 'DEMO' ? 'General' : 'PLUS'}
                      </th>
                      <th className="batch-cmp-th" style={{ color: 'var(--primary-dark)', fontWeight: '800', background: 'var(--primary-light)', textAlign: 'center' }}>PRO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { f: 'Lectures', g: '✅ Full', p: '✅ Full' },
                      { f: 'Materials', g: '✅ Full', p: '✅ Full' },
                      { f: 'Live Classes', g: '❌ No', p: '✅ Yes' },
                      { f: 'Q&A w/ Teacher', g: '❌ No', p: '✅ Live' },
                      { f: 'Mentorship', g: '❌ No', p: '✅ Weekly' },
                      { f: 'Support', g: '❌ Basic', p: '✅ Priority' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                        <td className="batch-cmp-td" style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{row.f}</td>
                        <td className="batch-cmp-td" style={{ color: 'var(--warning)', textAlign: 'center', background: 'var(--warning-light)' }}>{row.g}</td>
                        <td className="batch-cmp-td" style={{ color: 'var(--primary-dark)', fontWeight: '700', textAlign: 'center', background: 'var(--surface)' }}>{row.p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="batch-cmp-footer" style={{ textAlign: 'center' }}>
              <button onClick={() => setInfoModalCourse(null)} style={{ background: 'var(--primary)', color: 'white', padding: '12px 32px', borderRadius: '14px', fontSize: '14px', fontWeight: '700', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upgrade Confirmation Modal ── */}
      {upgradeModalCourse && (
        <div
          onClick={() => !upgrading && setUpgradeModalCourse(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1001,
            background: 'rgba(10,10,30,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', borderRadius: '32px', width: '100%', maxWidth: '440px',
              boxShadow: '0 0 100px var(--neu-glow), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              padding: '40px', textAlign: 'center', position: 'relative',
              animation: 'modalSlideUp 0.3s ease-out'
            }}
          >
            {upgrading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', marginBottom: '24px' }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/>
                </svg>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>Processing Payment...</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Please wait while we securely process your transaction.<br/>Do not close or refresh this page.
                </p>
                <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 100% { transform: rotate(360deg); } }`}} />
              </div>
            ) : (
              <>
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

                <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '24px', marginBottom: '32px', border: '1.5px solid var(--border)' }}>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--accent)', marginBottom: '8px' }}>₹{upgradeModalCourse.liveUpgradePrice}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>One-time upgrade fee</div>
                </div>

                <div style={{ display: 'flex', gap: '14px' }}>
                  <button
                    onClick={() => setUpgradeModalCourse(null)}
                    style={{
                      flex: 1, padding: '16px', borderRadius: '18px', border: '2px solid var(--border)', background: 'var(--surface)',
                      color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer'
                    }}
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
              </>
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
            <div style={{ background: 'var(--success-light)', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1.5px solid var(--border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Order ID</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--success)', fontFamily: 'monospace' }}>{upgradeSuccessOrderId}</div>
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
              margin: '0 auto 20px'
            }} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Processing...</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Please wait while we set up your course access.</p>
          </div>
        </div>
      )}

      {selectedFeedbackCourse && (
        <FeedbackModal
          courseId={selectedFeedbackCourse.id}
          courseName={selectedFeedbackCourse.name}
          courseSubject={selectedFeedbackCourse.subject || ''}
          onClose={() => setSelectedFeedbackCourse(null)}
          onSuccess={() => {
            mutateFeedbacks()
          }}
        />
      )}

      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
