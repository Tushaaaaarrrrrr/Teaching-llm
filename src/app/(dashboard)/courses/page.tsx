'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import useSWR, { mutate } from 'swr'

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
  BookOpen: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  Brain: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20"/><path d="M2 12h20"/></svg>,
  Globe: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  Database: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Monitor: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Wifi: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1"/></svg>,
}

export default function CoursesPage() {
  const { data, error, isLoading } = useSWR<CourseItem[]>('/api/courses', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })
  const { data: helpCard } = useSWR('/api/support/help-card', fetcher)
  const courses = Array.isArray(data) ? data : (data as any)?.courses || []
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [infoModalCourse, setInfoModalCourse] = useState<CourseItem | null>(null)
  const [upgradeModalCourse, setUpgradeModalCourse] = useState<CourseItem | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [showUpgradeHint, setShowUpgradeHint] = useState<string | null>(null)
  const [upgradeSuccessOrderId, setUpgradeSuccessOrderId] = useState<string | null>(null)

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
    setUpgrading(true)
    try {
      // Step 1: Create Razorpay order
      const orderRes = await fetch(`/api/courses/${courseId}/create-razorpay-order`, { method: 'POST' })
      if (!orderRes.ok) {
        const data = await orderRes.json()
        alert(data.error || 'Failed to create order')
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
        theme: { color: '#6366f1' },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
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
            setUpgrading(false)
          }
        },
        modal: {
          ondismiss: () => {
            setUpgrading(false)
          },
        },
      }

      const rzp = new (window as unknown as { Razorpay: new (opts: typeof options) => { open: () => void } }).Razorpay(options)
      rzp.open()
    } catch (e: any) {
      alert(e.message || 'Something went wrong')
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
            border: '1px solid #fecaca',
            color: '#b91c1c',
            background: '#fff5f5',
          }}
        >
          Failed to load courses. {error.message}
        </div>
      ) : null}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <p style={{ fontSize: '13px', color: '#9999b0', margin: 0 }}>{courses.length} courses available</p>
        <div style={{ position: 'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
            style={{ width: '260px', borderRadius: '50px', paddingLeft: '40px' }}
          />
        </div>
      </div>

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
            if (isRecorded) return { text: 'PLUS', color: '#fde68a' }
            return { text: 'General Batch', color: '#bae6fd' }
          }
          const batchBadge = getBatchBadge()

          return (
          <Link key={course.id} href={`/courses/${course.id}`} style={{ textDecoration: 'none', display: 'flex' }}>
            <div
              style={{
                background: '#e8eaf0',
                borderRadius: '28px',
                boxShadow: isLive
                  ? `8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff, 0 0 0 2px ${course.color}40`
                  : '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                position: 'relative',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = isLive
                  ? `12px 12px 24px #bdbfc7, -12px -12px 24px #ffffff, 0 0 0 2px ${course.color}60`
                  : '12px 12px 24px #bdbfc7, -12px -12px 24px #ffffff'
                if (!isFreeOrDemo && isRecorded) setShowUpgradeHint(course.id)
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = isLive
                  ? `8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff, 0 0 0 2px ${course.color}40`
                  : '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff'
                setShowUpgradeHint(null)
              }}
            >
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
                height: '100px',
                background: isRecorded || isFreeOrDemo ? 'linear-gradient(135deg, #6b7280, #9ca3af)' : `linear-gradient(135deg, ${course.color}ee, ${course.color}99)`,
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
                }}>
                  {COURSE_ICONS[course.icon] || COURSE_ICONS.BookOpen}
                </div>

                {/* Batch badge on banner */}
                {(isLive || isRecorded || isFreeOrDemo) && (
                  <div style={{
                    position: 'absolute', top: '10px', left: '12px',
                    padding: '3px 10px', borderRadius: '20px',
                    background: isLive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(8px)',
                    fontSize: '10px', fontWeight: '800', color: batchBadge.color,
                    letterSpacing: '0.06em',
                  }}>
                    {batchBadge.text}
                  </div>
                )}

                    {/* Info button for recorded non-free users + tooltip */}
                    {isRecorded && !isFreeOrDemo && (
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
                          background: '#1e1e3a', color: '#fff', padding: '8px 14px', borderRadius: '12px',
                          fontSize: '11px', fontWeight: '600', width: '200px', textAlign: 'center',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.4)', pointerEvents: 'none',
                          opacity: showUpgradeHint === course.id ? 1 : 0, 
                          transform: showUpgradeHint === course.id ? 'translateY(0)' : 'translateY(5px)',
                          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', zIndex: 100,
                          lineHeight: '1.4'
                        }}>
                          Click here to see difference between PLUS AND PRO batches
                          <div style={{ position: 'absolute', bottom: '100%', right: '10px', border: '6px solid transparent', borderBottomColor: '#1e1e3a' }} />
                        </div>
                      </div>
                    )}
              </div>

              {/* Card Body */}
              <div style={{ padding: '18px 20px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: '#1e1e3a', 
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
                    background: isRecorded ? '#e5e7eb' : course.color + '18',
                    color: isRecorded ? '#4b5563' : course.color,
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
                    color: '#6b6b8a',
                    lineHeight: '1.55',
                    marginBottom: '14px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {course.description}
                  </p>
                )}

                {/* Show teacher for LIVE users and General Batch */}
                {(!isRecorded || isFreeOrDemo) && course.teacherName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: course.color + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: '700', color: course.color,
                    }}>
                      {course.teacherName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12.5px', color: '#9999b0', fontWeight: '500' }}>
                      {course.teacherName}
                    </span>
                  </div>
                )}

                {/* Upgrade button for RECORDED users */}
                {hasUpgradePrice && (
                  <div style={{ position: 'relative', marginTop: 'auto' }}>
                    {/* Show teacher only for LIVE users or above upgrade for RECORDED */}
                    {course.teacherName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: isRecorded ? '#e5e7eb' : course.color + '22',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', fontWeight: '700', color: isRecorded ? '#4b5563' : course.color,
                        }}>
                          {course.teacherName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          {course.teacherName}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setUpgradeModalCourse(course) }}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '50px',
                        border: 'none',
                        background: '#1e1e3a',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        marginBottom: '4px',
                        boxShadow: '0 8px 16px rgba(30, 30, 58, 0.4)',
                        transition: 'all 0.25s',
                        letterSpacing: '0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{ 
                        position: 'absolute', left: '12px',
                        fontSize: '8px', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '20px', 
                        color: '#fff', letterSpacing: '0.05em', fontWeight: '900', border: '1px solid rgba(255,255,255,0.2)' 
                      }}>
                        OPTIONAL
                      </span>
                      ⚡ Upgrade to PRO — ₹{course.liveUpgradePrice}
                      
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

                {/* Stats row */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  paddingTop: '12px',
                  borderTop: '1.5px solid rgba(0,0,0,0.06)',
                  marginTop: 'auto',
                }}>
                  <div style={{
                    flex: 1, padding: '8px 10px', borderRadius: '14px',
                    background: '#e8eaf0', boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>{course._count?.topics || 0}</div>
                    <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600' }}>Topics</div>
                  </div>
                  <div style={{
                    flex: 1, padding: '8px 10px', borderRadius: '14px',
                    background: '#e8eaf0', boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>{course._count?.lectures || 0}</div>
                    <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600' }}>Lectures</div>
                  </div>
                  <div style={{
                    flex: 1, padding: '8px 10px', borderRadius: '14px',
                    background: '#e8eaf0', boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e1e3a' }}>{course._count?.materials || 0}</div>
                    <div style={{ fontSize: '11px', color: '#9999b0', fontWeight: '600' }}>Materials</div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
          )
        })}

        {helpCard && helpCard.isEnabled && (
          <a href={helpCard.redirectUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex' }}>
            <div
              style={{
                background: '#e8eaf0',
                borderRadius: '28px',
                boxShadow: '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff',
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
                e.currentTarget.style.boxShadow = '12px 12px 24px #bdbfc7, -12px -12px 24px #ffffff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff'
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
                  color: '#1e1e3a', 
                  marginBottom: '20px', 
                  lineHeight: '1.3',
                }}>
                  {helpCard.title}
                </h3>

                <button style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '16px',
                  background: '#6366f1',
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
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '750px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
            animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '30px 40px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderBottom: '1.5px solid #e2e8f0', position: 'relative' }}>
              <button onClick={() => setInfoModalCourse(null)} style={{ position: 'absolute', top: '25px', right: '30px', background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Batch Comparison</h2>
              <p style={{ fontSize: '15px', color: '#64748b', fontWeight: '500' }}>Choose the experience that fits your learning style</p>
            </div>

            {/* Comparison Table */}
            <div style={{ padding: '30px 40px' }}>
              <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1.5px solid #e2e8f0', background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '18px 24px', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Features</th>
                      <th style={{ padding: '18px 24px', fontSize: '13px', color: '#92400e', fontWeight: '800', background: '#fffbeb', textAlign: 'center' }}>
                        {infoModalCourse?.enrollmentType === 'FREE' || infoModalCourse?.enrollmentType === 'DEMO' ? 'General Batch' : 'PLUS ( Recorded )'}
                      </th>
                      <th style={{ padding: '18px 24px', fontSize: '13px', color: '#4338ca', fontWeight: '800', background: '#eef2ff', textAlign: 'center' }}>PRO ( LIVE )</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { f: 'Course Lectures', g: '✅ Full Access', p: '✅ Full Access' },
                      { f: 'Course Materials', g: '✅ Full Access', p: '✅ Full Access' },
                      { f: 'Live Classes', g: '❌ No Access', p: '✅ Direct Entry' },
                      { f: 'Direct Q&A with Teacher', g: '❌ No', p: '✅ Yes (Live)' },
                      { f: 'Weekly Mentorship', g: '❌ No', p: '✅ Every Sunday' },
                      { f: 'Priority Support', g: '❌ Standard', p: '✅ 24/7 Priority' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155', fontWeight: '600' }}>{row.f}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#92400e', textAlign: 'center', background: '#fffdf5' }}>{row.g}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#4338ca', fontWeight: '700', textAlign: 'center', background: '#f5f7ff' }}>{row.p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ padding: '0 40px 40px', textAlign: 'center' }}>
              <button onClick={() => setInfoModalCourse(null)} style={{ background: '#1e293b', color: 'white', padding: '14px 40px', borderRadius: '16px', fontSize: '15px', fontWeight: '700', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
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
              background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '440px',
              boxShadow: '0 0 100px rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              padding: '40px', textAlign: 'center', position: 'relative',
              animation: 'modalSlideUp 0.3s ease-out'
            }}
          >
            {upgrading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', marginBottom: '24px' }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/>
                </svg>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>Processing Payment...</h2>
                <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                  Please wait while we securely process your transaction.<br/>Do not close or refresh this page.
                </p>
                <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 100% { transform: rotate(360deg); } }`}} />
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setUpgradeModalCourse(null)}
                  style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', fontSize: '28px', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}
                >&times;</button>
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: '#ffffff', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Upgrade to PRO Batch</h2>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' }}>{upgradeModalCourse.name}</div>
                <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: '32px' }}>
                  You will get access to <strong>live classes, real-time mentorship,</strong> and everything as in your current plan.
                </p>

                <div style={{ background: '#f8faff', borderRadius: '20px', padding: '24px', marginBottom: '32px', border: '1.5px solid #e0e7ff' }}>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: '#6366f1', marginBottom: '8px' }}>₹{upgradeModalCourse.liveUpgradePrice}</div>
                  <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>One-time upgrade fee</div>
                </div>

                <div style={{ display: 'flex', gap: '14px' }}>
                  <button
                    onClick={() => setUpgradeModalCourse(null)}
                    style={{
                      flex: 1, padding: '16px', borderRadius: '18px', border: '2px solid #e2e8f0', background: 'white',
                      color: '#64748b', fontWeight: '700', cursor: 'pointer'
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

                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '24px' }}>
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
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '440px',
            boxShadow: '0 0 100px rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '40px', textAlign: 'center',
            animation: 'modalSlideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Welcome to PRO!</h2>
            <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
              Your upgrade was successful. You now have full access to live classes, mentorship, and priority support.
            </p>
            <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1.5px solid #bbf7d0' }}>
              <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Order ID</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#15803d', fontFamily: 'monospace' }}>{upgradeSuccessOrderId}</div>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>A confirmation email has been sent to your registered email.</p>
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
