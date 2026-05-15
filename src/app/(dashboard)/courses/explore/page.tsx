'use client'

import { useState } from 'react'
import Script from 'next/script'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ExploreCoursesPage() {
  const router = useRouter()
  const { data: userData } = useSWR('/api/auth/me', fetcher, { revalidateOnFocus: false })
  const { data: offerings, error, isLoading } = useSWR('/api/course-offerings', fetcher, {
    revalidateOnFocus: false,
  })
  const { data: bundleOfferings } = useSWR('/api/bundle-offerings', fetcher, { revalidateOnFocus: false })
  const { data: courses } = useSWR('/api/courses', fetcher, { revalidateOnFocus: false })
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null)
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [purchasedCourse, setPurchasedCourse] = useState<any>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeSuccessOrderId, setUpgradeSuccessOrderId] = useState<string | null>(null)
  const [showInfoHint, setShowInfoHint] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [editingOffering, setEditingOffering] = useState<any | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})
  const [editSaving, setEditSaving] = useState(false)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [recordedOriginalPrice, setRecordedOriginalPrice] = useState('')
  const [recordedDiscountPrice, setRecordedDiscountPrice] = useState('')
  const [liveOriginalPrice, setLiveOriginalPrice] = useState('')
  const [liveDiscountPrice, setLiveDiscountPrice] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [creating, setCreating] = useState(false)
  // Bundle creation (recommended bundle) states
  const [createBundle, setCreateBundle] = useState(false)
  const [bundleName, setBundleName] = useState('')
  const [bundleSelectedCourses, setBundleSelectedCourses] = useState<string[]>([])
  const [bundleRecordedOriginalPrice, setBundleRecordedOriginalPrice] = useState('')
  const [bundleRecordedDiscountPrice, setBundleRecordedDiscountPrice] = useState('')
  const [bundleLiveOriginalPrice, setBundleLiveOriginalPrice] = useState('')
  const [bundleLiveDiscountPrice, setBundleLiveDiscountPrice] = useState('')
  const [bundleAllowIndividualPurchase, setBundleAllowIndividualPurchase] = useState(true)
  const [infoModalOffering, setInfoModalOffering] = useState<any | null>(null)
  // Bundle purchase UI states
  const [showBundleModal, setShowBundleModal] = useState(false)
  const [activeBundle, setActiveBundle] = useState<any | null>(null)
  const [bundleAccessType, setBundleAccessType] = useState<'RECORDED' | 'LIVE'>('RECORDED')
  const [bundleSelectedForPurchase, setBundleSelectedForPurchase] = useState<Record<string, 'RECORDED' | 'LIVE'>>({})
  const [bundleSelectedCoursesToBuy, setBundleSelectedCoursesToBuy] = useState<string[]>([])
  const [showBatchComparisonModal, setShowBatchComparisonModal] = useState(false)
  
  const [editingBundle, setEditingBundle] = useState<any>(null)
  const [editBundleData, setEditBundleData] = useState<any>({})
  const [editBundleSaving, setEditBundleSaving] = useState(false)

  // Helper to get enrollment status
  const getEnrollmentStatus = (courseId: string) => {
    const coursesArray = Array.isArray(courses) ? courses : (courses as any)?.courses || []
    const course = coursesArray.find((c: any) => c.id === courseId)
    return course?.enrollmentType || null
  }

  // Handle upgrade to Live Pro
  const handleUpgrade = async (courseId: string, offeringId: string) => {
    setIsProcessing(true)
    setUpgrading(true)
    try {
      // Create Razorpay order
      const orderRes = await fetch(`/api/courses/${courseId}/create-razorpay-order`, { method: 'POST' })
      if (!orderRes.ok) {
        const data = await orderRes.json()
        alert(data.error || 'Failed to create order')
        setIsProcessing(false)
        setUpgrading(false)
        return
      }
      const orderData = await orderRes.json()

      // Open Razorpay checkout
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
        handler: async (response: any) => {
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
              setUpgradeSuccessOrderId(verifyData.orderId)
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
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (e: any) {
      alert(e.message || 'Something went wrong')
      setIsProcessing(false)
      setUpgrading(false)
    }
  }

  const handlePurchase = async (offeringId: string, accessType: 'RECORDED' | 'LIVE') => {
    setIsProcessing(true)
    setPurchasing(`${offeringId}-${accessType}`)
    try {
      const res = await fetch(`/api/course-offerings/${offeringId}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to initialize payment')

      if (data.isFree) {
        setIsProcessing(false)
        setSuccessOrderId('FREE-ENROLLMENT')
        setPurchasedCourse({ courseName: data.courseName, accessType })
        return
      }

      // Store course info for success modal
      const offering = activeOfferings.find((o: any) => o.id === offeringId)

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'GenZ IItian',
        description: `Purchase ${data.courseName} (${accessType})`,
        order_id: data.razorpayOrderId,
        prefill: {
          name: data.userName || '',
          email: data.userEmail || '',
        },
        theme: { color: '#6366f1' },
        handler: async (response: any) => {
          setIsProcessing(true)
          setVerifyingPayment(true)
          try {
            const verifyRes = await fetch(`/api/course-offerings/${offeringId}/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                accessType,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyRes.ok) {
              setSuccessOrderId(verifyData.orderId || 'SUCCESS')
              setPurchasedCourse({ 
                courseName: data.courseName,
                accessType,
                orderId: verifyData.orderId,
                courseTier: accessType === 'LIVE' ? 'Live + Recorded (Pro)' : 'Recorded (Plus)'
              })
            } else {
              alert('Verification failed: ' + verifyData.error)
            }
          } catch {
            alert('Payment verification failed. Please contact support.')
          } finally {
            setIsProcessing(false)
            setPurchasing(null)
            setVerifyingPayment(false)
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false)
            setPurchasing(null)
          },
        },
      }

      setIsProcessing(false)
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      alert(err.message)
      setIsProcessing(false)
      setPurchasing(null)
    }
  }

  if (isLoading) {
    return (
      <div className="page-container fade-in">
        <div className="grid-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card skeleton" style={{ height: '360px', borderRadius: '28px' }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container fade-in">
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          Failed to load offerings. Please try again later.
        </div>
      </div>
    )
  }

  const activeOfferings = offerings || []
  const activeBundles = bundleOfferings || []

  return (
    <>
      {/* Header Banner */}
      <div style={{
        background: 'transparent',
        padding: '0 32px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '0'
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: '32px', fontWeight: '900', color: '#1e1e3a',
            marginTop: 0, marginBottom: '8px', letterSpacing: '-0.02em'
          }}>
            GenZ IITian Official Store
          </h1>
          <p style={{
            fontSize: '15px', color: '#6b6b8a', fontWeight: '500',
            lineHeight: '1.6', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            You can also buy courses from
            <a href="https://app.genziitian.in/courses" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none', backgroundColor: '#6366f1', padding: '4px 12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'inline-block', transition: 'all 0.2s', fontSize: '12px' }}>
              Visit Here
            </a>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Help Button */}
          <a
            href="/support"
            style={{
              background: '#f1f5f9',
              color: '#475569',
              padding: '10px 18px',
              borderRadius: '12px',
              border: '1.5px solid #e2e8f0',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f1f5f9'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Facing any issue? Get Support
          </a>

          {userData?.user?.role === 'MANAGER' && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                padding: '10px 18px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Course
            </button>
          )}
        </div>
      </div>

      <div className="page-container fade-in">

      {/* Bundle offerings section */}
      {activeBundles.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#1e1e3a', margin: '6px 0 12px' }}>Bundles</h2>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {activeBundles.map((b: any) => {
              const bundlePriceRecorded = b.recordedDiscountPrice ?? b.recordedOriginalPrice
              const bundlePriceLive = b.liveDiscountPrice ?? b.liveOriginalPrice
              return (
                <div key={b.id} style={{ minWidth: '320px', background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 8px 20px rgba(15,23,42,0.06)' }}>
                  <div style={{ fontSize: '16px', fontWeight: '900', marginBottom: '6px' }}>{b.name}</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>{b.description || `${b.courses.length} courses`}</div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                    {bundlePriceRecorded ? <div style={{ fontWeight: '800', color: '#1e293b' }}>Recorded: ₹{bundlePriceRecorded}</div> : null}
                    {bundlePriceLive ? <div style={{ fontWeight: '800', color: '#4f46e5' }}>Live: ₹{bundlePriceLive}</div> : null}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {bundlePriceRecorded || bundlePriceLive ? (
                      <button onClick={() => { setActiveBundle(b); setBundleAccessType(bundlePriceRecorded ? 'RECORDED' : 'LIVE'); setBundleSelectedCoursesToBuy(b.courses.map((c: any) => c.course.id)); setShowBundleModal(true) }} style={{ flex: 1, padding: '10px 12px', borderRadius: '12px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: '800' }}>View / Buy</button>
                    ) : (
                      <button onClick={() => { setActiveBundle(b); setBundleSelectedCoursesToBuy(b.courses.map((c: any) => c.course.id)); setShowBundleModal(true) }} style={{ flex: 1, padding: '10px 12px', borderRadius: '12px', background: '#f3f4f6', color: '#111827', fontWeight: '800' }}>View</button>
                    )}
                    {(userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER') && (
                      <>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingBundle(b); setEditBundleData({ name: b.name, description: b.description || '', recordedOriginalPrice: b.recordedOriginalPrice ?? '', recordedDiscountPrice: b.recordedDiscountPrice ?? '', liveOriginalPrice: b.liveOriginalPrice ?? '', liveDiscountPrice: b.liveDiscountPrice ?? '', courseIds: b.courses.map((c: any) => c.course.id) }) }} style={{ padding: '10px 12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '800', fontSize: '13px' }}>Edit</button>
                        <button onClick={async () => {
                          if (!confirm(`Delete bundle "${b.name}"? This cannot be undone.`)) return
                          try {
                            const res = await fetch(`/api/bundle-offerings/${b.id}`, { method: 'DELETE' })
                            if (res.ok) window.location.reload()
                            else { const d = await res.json(); alert(d.error || 'Failed to delete') }
                          } catch { alert('Failed to delete bundle') }
                        }} style={{ padding: '10px 12px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: '800', fontSize: '13px' }}>🗑️</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeOfferings.length === 0 && (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c5c7cf" strokeWidth="1.5">
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
          </svg>
          <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>No courses available yet</p>
          <p style={{ fontSize: '13px' }}>Check back soon for new offerings!</p>
        </div>
      )}

      <div className="grid-3">
        {[...activeOfferings].sort((a: any, b: any) => {
          const isManager = userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER'
          const aEnroll = getEnrollmentStatus(a.courseId)
          const bEnroll = getEnrollmentStatus(b.courseId)
          const aFull = (!isManager && (aEnroll === 'LIVE' || (aEnroll === 'RECORDED' && !a.hasLive))) ? 1 : 0
          const bFull = (!isManager && (bEnroll === 'LIVE' || (bEnroll === 'RECORDED' && !b.hasLive))) ? 1 : 0
          return aFull - bFull
        }).map((offering: any) => {
          const recPrice = Math.max(Number(offering.recordedDiscountPrice || 0), 1)
          const recOriginal = Math.max(Number(offering.recordedOriginalPrice || 0), recPrice)
          const livePrice = Math.max(Number(offering.liveDiscountPrice || 0), 1)
          const liveOriginal = Math.max(Number(offering.liveOriginalPrice || 0), livePrice)
          const discountRecorded = recOriginal > 0
            ? Math.round((1 - recPrice / recOriginal) * 100)
            : 0
          const discountLive = liveOriginal > 0
            ? Math.round((1 - livePrice / liveOriginal) * 100)
            : 0
          
          // Get enrollment status
          const isManager = userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER'
          const enrollmentType = getEnrollmentStatus(offering.courseId)
          const isRecordedEnrolled = !isManager && enrollmentType === 'RECORDED'
          const isLiveEnrolled = !isManager && enrollmentType === 'LIVE'
          const isFullyPurchased = isLiveEnrolled || (isRecordedEnrolled && !offering.hasLive)

          return (
            <div
              key={offering.id}
              style={{
                background: isFullyPurchased ? '#dfdfe5' : '#e8eaf0',
                borderRadius: '28px',
                boxShadow: isFullyPurchased ? 'none' : '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff',
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.25s ease',
                filter: isFullyPurchased ? 'grayscale(0.4) opacity(0.9)' : 'none',
                pointerEvents: (isFullyPurchased && !isManager) ? 'none' : 'auto',
              } as React.CSSProperties}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-6px)'
                e.currentTarget.style.boxShadow = '12px 12px 24px #bdbfc7, -12px -12px 24px #ffffff'
                setShowInfoHint(offering.id)
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff'
                setShowInfoHint(null)
              }}
            >
              {/* Banner */}
              <div style={{
                height: '110px',
                background: `linear-gradient(135deg, ${offering.course?.color || '#6366f1'}ee, ${offering.course?.color || '#6366f1'}88)`,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ position: 'absolute', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', top: '-60px', right: '-30px' }} />
                <div style={{ position: 'absolute', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', bottom: '-30px', left: '20px' }} />
                
                {/* Course icon */}
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1,
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                  </svg>
                </div>

                {/* Info button with tooltip and Edit button */}
                <div style={{ position: 'absolute', bottom: '12px', right: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Edit button for managers */}
                  {(userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER') && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingOffering(offering); setEditFormData({ recordedOriginalPrice: offering.recordedOriginalPrice ?? '', recordedDiscountPrice: offering.recordedDiscountPrice ?? '', liveOriginalPrice: offering.liveOriginalPrice ?? '', liveDiscountPrice: offering.liveDiscountPrice ?? '', detailsLink: offering.detailsLink ?? '' }) }}
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '14px', fontWeight: '800',
                      }}
                      title="Edit course offering"
                    >
                      ✎
                    </button>
                  )}
                  
                  {/* Info button */}
                  {(offering.hasRecorded || offering.hasLive) && !isFullyPurchased && !isManager && (
                    <div style={{ position: 'relative' }}>
                      {showInfoHint === offering.id && (
                        <div style={{
                          position: 'absolute', bottom: 'calc(100% + 12px)', right: '-6px',
                          background: '#1e1e3a', color: '#fff', padding: '10px 14px', borderRadius: '12px',
                          fontSize: '12px', fontWeight: '600', width: '245px', textAlign: 'center',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.28)', zIndex: 60,
                          animation: 'fadeIn 0.2s ease-out',
                          pointerEvents: 'none',
                        }}>
                          Click here to see the difference between PRO and PLUS Batch
                          <div style={{ position: 'absolute', top: '100%', right: '12px', border: '7px solid transparent', borderTopColor: '#1e1e3a' }} />
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInfoModalOffering(offering) }}
                        onMouseEnter={() => setShowInfoHint(offering.id)}
                        onMouseLeave={() => setShowInfoHint(null)}
                        style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)',
                          border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '14px', fontWeight: '800',
                        }}
                        title="Compare access types"
                      >
                        i
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '20px 22px 10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Course Name - Big and Prominent */}
                {offering.course?.name && (
                  <h2 style={{
                    fontSize: '22px', fontWeight: '900', color: '#1e1e3a',
                    marginBottom: '4px', lineHeight: '1.2',
                  }}>
                    {offering.course.name}
                  </h2>
                )}
                
                {/* Subject Name - Below course name */}
                {offering.course?.subject && (
                  <p style={{
                    fontSize: '13px', color: '#9999b0', fontWeight: '600', marginBottom: '12px',
                  }}>
                    {offering.course.subject}
                  </p>
                )}

                {/* Duplicate name removed - course name already shown above */}

                {offering.description && (
                  <p style={{
                    fontSize: '13px', color: '#6b6b8a', lineHeight: '1.5',
                    marginBottom: '16px',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
                  }}>
                    {offering.description}
                  </p>
                )}

                {/* Pricing Tiers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                  {/* Already Enrolled in LIVE - Show both sections with "Already Enrolled" */}
                  {isLiveEnrolled && offering.hasRecorded && (
                    <>
                      <div style={{
                        padding: '14px 16px', borderRadius: '18px',
                        background: '#e8eaf0',
                        boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
                        filter: 'grayscale(0.8)', opacity: 0.8,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                              📹 Recorded Batch - PLUS
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e1e3a' }}>₹{recPrice}</span>
                              {recOriginal > recPrice && (
                                <span style={{ fontSize: '13px', color: '#9999b0', textDecoration: 'line-through' }}>₹{recOriginal}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          disabled={true}
                          style={{
                            width: '100%', padding: '11px', borderRadius: '50px',
                            border: '2px solid #6366f1', background: '#e8eaf0',
                            color: '#6366f1', fontSize: '13px', fontWeight: '800',
                            cursor: 'not-allowed',
                            opacity: 0.6,
                            boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                            transition: 'all 0.2s',
                          }}
                        >
                          ✅ Already Enrolled
                        </button>
                      </div>
                      <div style={{
                        padding: '14px 16px', borderRadius: '18px',
                        background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                        border: '1.5px solid #c7d2fe',
                        position: 'relative', overflow: 'hidden',
                        filter: 'grayscale(0.8)', opacity: 0.8,
                      }}>
                        <div style={{
                          position: 'absolute', top: '10px', right: '12px',
                          padding: '3px 10px', borderRadius: '20px',
                          background: '#6366f1', color: '#fff',
                          fontSize: '9px', fontWeight: '900', letterSpacing: '0.08em',
                        }}>
                          PRO
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                              🔴 Live + Recorded Batch - PRO
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e1e3a' }}>₹{livePrice}</span>
                              {liveOriginal > livePrice && (
                                <span style={{ fontSize: '13px', color: '#9999b0', textDecoration: 'line-through' }}>₹{liveOriginal}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          disabled={true}
                          style={{
                            width: '100%', padding: '11px', borderRadius: '50px',
                            border: 'none', background: '#6366f1',
                            color: '#fff', fontSize: '13px', fontWeight: '800',
                            cursor: 'not-allowed',
                            opacity: 0.6,
                            boxShadow: '0 8px 16px rgba(99,102,241,0.35)',
                            transition: 'all 0.2s',
                          }}
                        >
                          ✅ Already Enrolled
                        </button>
                      </div>
                    </>
                  )}

                  {/* Already Enrolled in LIVE but no recorded option */}
                  {isLiveEnrolled && !offering.hasRecorded && (
                    <div style={{
                      padding: '14px 16px', borderRadius: '18px',
                      background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                      border: '1.5px solid #c7d2fe',
                      position: 'relative', overflow: 'hidden',
                      filter: 'grayscale(0.8)', opacity: 0.8,
                    }}>
                      <div style={{
                        position: 'absolute', top: '10px', right: '12px',
                        padding: '3px 10px', borderRadius: '20px',
                        background: '#6366f1', color: '#fff',
                        fontSize: '9px', fontWeight: '900', letterSpacing: '0.08em',
                      }}>
                        PRO
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                            🔴 Live + Recorded Batch - PRO
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e1e3a' }}>₹{livePrice}</span>
                            {liveOriginal > livePrice && (
                              <span style={{ fontSize: '13px', color: '#9999b0', textDecoration: 'line-through' }}>₹{liveOriginal}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        disabled={true}
                        style={{
                          width: '100%', padding: '11px', borderRadius: '50px',
                          border: 'none', background: '#6366f1',
                          color: '#fff', fontSize: '13px', fontWeight: '800',
                          cursor: 'not-allowed',
                          opacity: 0.6,
                          boxShadow: '0 8px 16px rgba(99,102,241,0.35)',
                          transition: 'all 0.2s',
                        }}
                      >
                        ✅ Already Enrolled
                      </button>
                    </div>
                  )}

                  {/* Recorded Option - Show purchase when not enrolled */}
                  {offering.hasRecorded && !isLiveEnrolled && !isRecordedEnrolled && (
                    <div 
                      style={{
                        padding: '14px 16px', borderRadius: '18px',
                        background: '#e8eaf0',
                        boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
                        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.02)'
                        e.currentTarget.style.boxShadow = '4px 4px 12px #c5c7cf, -4px -4px 12px #ffffff, inset 2px 2px 4px #c5c7cf'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                            📹 Recorded Batch - PLUS
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e1e3a' }}>₹{recPrice}</span>
                            {recOriginal > recPrice && (
                              <span style={{ fontSize: '13px', color: '#9999b0', textDecoration: 'line-through' }}>₹{recOriginal}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePurchase(offering.id, 'RECORDED')}
                        disabled={!!purchasing}
                        style={{
                          width: '100%', padding: '11px', borderRadius: '50px',
                          border: '2px solid #6366f1', background: '#e8eaf0',
                          color: '#6366f1', fontSize: '13px', fontWeight: '800',
                          cursor: purchasing ? 'not-allowed' : 'pointer',
                          opacity: purchasing ? 0.5 : 1,
                          boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                          transition: 'all 0.2s',
                        }}
                      >
                        {purchasing === `${offering.id}-RECORDED` ? 'Processing...' : 'Buy PLUS Batch'}
                      </button>
                    </div>
                  )}

                  {/* Recorded Option - Show "Already Enrolled" when user has PLUS but not PRO */}
                  {offering.hasRecorded && isRecordedEnrolled && !isLiveEnrolled && (
                    <div style={{
                      padding: '14px 16px', borderRadius: '18px',
                      background: '#e8eaf0',
                      boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
                      filter: 'grayscale(0.8)', opacity: 0.8,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                            📹 Recorded Batch - PLUS
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e1e3a' }}>₹{recPrice}</span>
                            {recOriginal > recPrice && (
                              <span style={{ fontSize: '13px', color: '#9999b0', textDecoration: 'line-through' }}>₹{recOriginal}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        disabled={true}
                        style={{
                          width: '100%', padding: '11px', borderRadius: '50px',
                          border: '2px solid #6366f1', background: '#e8eaf0',
                          color: '#6366f1', fontSize: '13px', fontWeight: '800',
                          cursor: 'not-allowed',
                          opacity: 0.6,
                          boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                          transition: 'all 0.2s',
                        }}
                      >
                        ✅ Already Enrolled
                      </button>
                    </div>
                  )}

                  {/* Upgrade Option - Show for RECORDED enrolled users */}
                  {isRecordedEnrolled && offering.hasLive && (
                    <div 
                      style={{
                        padding: '14px 16px', borderRadius: '18px',
                        background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                        border: '1.5px solid #c7d2fe',
                        position: 'relative', overflow: 'hidden',
                        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.02)'
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.15)'
                        e.currentTarget.style.borderColor = '#818cf8'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                        e.currentTarget.style.borderColor = '#c7d2fe'
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: '10px', right: '12px',
                        padding: '3px 10px', borderRadius: '20px',
                        background: '#6366f1', color: '#fff',
                        fontSize: '9px', fontWeight: '900', letterSpacing: '0.08em',
                      }}>
                        PRO
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                          ⚡ Upgrade to PRO Batch
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e1e3a' }}>₹{livePrice}</span>
                          {liveOriginal > livePrice && (
                            <span style={{ fontSize: '13px', color: '#9999b0', textDecoration: 'line-through' }}>₹{liveOriginal}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUpgrade(offering.courseId, offering.id)}
                        disabled={upgrading}
                        style={{
                          width: '100%', padding: '11px', borderRadius: '50px',
                          border: 'none', background: '#1e1e3a',
                          color: '#fff', fontSize: '13px', fontWeight: '800',
                          cursor: upgrading ? 'not-allowed' : 'pointer',
                          opacity: upgrading ? 0.5 : 1,
                          boxShadow: '0 8px 16px rgba(30, 30, 58, 0.4)',
                          transition: 'all 0.2s',
                        }}
                      >
                        {upgrading ? 'Processing Upgrade...' : '⚡ Upgrade to PRO'}
                      </button>
                    </div>
                  )}

                  {/* Live Option - Show only for non-recorded users */}
                  {offering.hasLive && !isRecordedEnrolled && !isLiveEnrolled && (
                    <div 
                      style={{
                        padding: '14px 16px', borderRadius: '18px',
                        background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                        border: '1.5px solid #c7d2fe',
                        position: 'relative', overflow: 'hidden',
                        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.02)'
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.15)'
                        e.currentTarget.style.borderColor = '#818cf8'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                        e.currentTarget.style.borderColor = '#c7d2fe'
                      }}
                    >
                      {/* PRO Badge */}
                      <div style={{
                        position: 'absolute', top: '10px', right: '12px',
                        padding: '3px 10px', borderRadius: '20px',
                        background: '#6366f1', color: '#fff',
                        fontSize: '9px', fontWeight: '900', letterSpacing: '0.08em',
                      }}>
                        PRO
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                            🔴 Live + Recorded Batch - PRO
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e1e3a' }}>₹{livePrice}</span>
                            {liveOriginal > livePrice && (
                              <span style={{ fontSize: '13px', color: '#9999b0', textDecoration: 'line-through' }}>₹{liveOriginal}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePurchase(offering.id, 'LIVE')}
                        disabled={!!purchasing}
                        style={{
                          width: '100%', padding: '11px', borderRadius: '50px',
                          border: 'none', background: '#6366f1',
                          color: '#fff', fontSize: '13px', fontWeight: '800',
                          cursor: purchasing ? 'not-allowed' : 'pointer',
                          opacity: purchasing ? 0.5 : 1,
                          boxShadow: '0 8px 16px rgba(99,102,241,0.35)',
                          transition: 'all 0.2s',
                        }}
                      >
                        {purchasing === `${offering.id}-LIVE` ? 'Processing...' : '⚡ Buy PLUS + PRO Batch'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '12px 22px', marginTop: '10px',
                borderTop: '1.5px solid rgba(0,0,0,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: '11px', color: '#9999b0', fontWeight: '600',
              }}>
                <span>⏳ Access Till End Term</span>
                {offering.detailsLink && (
                  <a href={offering.detailsLink} target="_blank" rel="noopener noreferrer" style={{
                    fontSize: '11px', fontWeight: '800', color: '#6366f1',
                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    More Details →
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bundle Choose / Buy Modal */}
      {showBundleModal && activeBundle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={() => { setShowBundleModal(false); setActiveBundle(null) }}>
          <div style={{ width: '100%', maxWidth: '1024px', background: '#fff', borderRadius: '24px', padding: '40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900' }}>{activeBundle.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{activeBundle.courses.length} courses</span>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowBatchComparisonModal(true) }}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'rgba(99,102,241,0.12)',
                    border: '1.5px solid rgba(99,102,241,0.3)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#6366f1', fontSize: '13px', fontWeight: '800',
                    fontStyle: 'italic',
                  }}
                  title="Compare PLUS vs PRO batch"
                >
                  i
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
              <div style={{ maxHeight: '400px', overflow: 'auto', paddingRight: '12px' }}>
                {activeBundle.courses.map((bc: any) => {
                  const course = bc.course
                  const offering = (activeOfferings as any[]).find(o => o.courseId === course.id)
                  const recPrice = offering?.recordedDiscountPrice ?? offering?.recordedOriginalPrice ?? 0
                  const livePrice = offering?.liveDiscountPrice ?? offering?.liveOriginalPrice ?? 0
                  return (
                    <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="checkbox"
                          checked={bundleSelectedCoursesToBuy.includes(course.id)}
                          onChange={(e) => {
                            if (e.target.checked) setBundleSelectedCoursesToBuy([...bundleSelectedCoursesToBuy, course.id])
                            else setBundleSelectedCoursesToBuy(bundleSelectedCoursesToBuy.filter(id => id !== course.id))
                          }}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' }}
                        />
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '800' }}>{course.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{course.teacherName || ''}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: '800' }}>₹{recPrice}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Recorded</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#4f46e5' }}>₹{livePrice}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Live</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', color: '#334155', fontWeight: '700' }}>Choose</label>
                          <select value={bundleSelectedForPurchase[course.id] || 'RECORDED'} onChange={e => setBundleSelectedForPurchase({ ...bundleSelectedForPurchase, [course.id]: e.target.value as 'RECORDED' | 'LIVE' })} style={{ padding: '6px 8px', borderRadius: '8px' }}>
                            <option value="RECORDED">Recorded</option>
                            <option value="LIVE">Live</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '24px', display: 'flex', flexDirection: 'column' }}>
                {(() => {
                  let totalPrice = 0;
                  let originalTotalPrice = 0;
                  const selectedList = bundleSelectedCoursesToBuy.length ? bundleSelectedCoursesToBuy : activeBundle.courses.map((c: any) => c.course.id);
                  
                  selectedList.forEach((courseId: string) => {
                    const offering = (activeOfferings as any[]).find(o => o.courseId === courseId);
                    const selectedType = bundleSelectedForPurchase[courseId] || 'RECORDED';
                    if (selectedType === 'RECORDED') {
                      totalPrice += offering?.recordedDiscountPrice ?? offering?.recordedOriginalPrice ?? 0;
                      originalTotalPrice += offering?.recordedOriginalPrice ?? offering?.recordedDiscountPrice ?? 0;
                    } else {
                      totalPrice += offering?.liveDiscountPrice ?? offering?.liveOriginalPrice ?? 0;
                      originalTotalPrice += offering?.liveOriginalPrice ?? offering?.liveDiscountPrice ?? 0;
                    }
                  });

                  return (
                    <>
                      <div style={{ marginBottom: 'auto' }}>
                        <div style={{ fontSize: '18px', color: '#64748b', fontWeight: '700', marginBottom: '20px' }}>Order Summary</div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <span style={{ fontSize: '16px', color: '#334155', fontWeight: '600' }}>Selected Courses</span>
                          <span style={{ fontSize: '16px', fontWeight: '800' }}>{selectedList.length}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <span style={{ fontSize: '16px', color: '#334155', fontWeight: '600' }}>Amount Breakdown</span>
                          <span style={{ fontSize: '16px', fontWeight: '800', color: '#6366f1' }}>
                            {selectedList.map((courseId: string) => {
                               const offering = (activeOfferings as any[]).find(o => o.courseId === courseId);
                               const selectedType = bundleSelectedForPurchase[courseId] || 'RECORDED';
                               return selectedType === 'RECORDED' 
                                 ? offering?.recordedDiscountPrice ?? offering?.recordedOriginalPrice ?? 0
                                 : offering?.liveDiscountPrice ?? offering?.liveOriginalPrice ?? 0;
                             }).join(' + ')}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px', paddingTop: '20px', borderTop: '2px dashed #cbd5e1' }}>
                          <span style={{ fontSize: '20px', color: '#0f172a', fontWeight: '800' }}>Total Amount</span>
                          <div style={{ textAlign: 'right' }}>
                            {originalTotalPrice > totalPrice && (
                              <div style={{ fontSize: '16px', color: '#94a3b8', textDecoration: 'line-through', marginBottom: '4px' }}>₹{originalTotalPrice}</div>
                            )}
                            <div style={{ fontSize: '36px', fontWeight: '900', color: '#4f46e5', lineHeight: '1' }}>₹{totalPrice}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '32px' }}>
                        <button onClick={async () => {
                          try {
                            if (selectedList.length === 0) { alert('Select at least one course'); return }
                            setIsProcessing(true)
                            const res = await fetch(`/api/bundle-offerings/${activeBundle.id}/create-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buyAll: false, accessType: 'RECORDED', selectedCourseIds: selectedList, perCourseAccessTypes: bundleSelectedForPurchase }) })
                            const data = await res.json()
                            if (!res.ok) { alert(data.error || 'Failed to create order'); setIsProcessing(false); return }
                            const options = {
                              key: data.keyId,
                              amount: data.amount,
                              currency: data.currency,
                              name: 'GenZ IItian',
                              description: `Purchase courses from bundle — ${data.bundleName}`,
                              order_id: data.razorpayOrderId,
                              prefill: { name: data.userName || '', email: data.userEmail || '' },
                              theme: { color: '#6366f1' },
                              handler: async (response: any) => {
                                try {
                                  const verifyRes = await fetch('/api/orders/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: response.razorpay_order_id, razorpay_signature: response.razorpay_signature }) })
                                  const verifyData = await verifyRes.json()
                                  if (verifyRes.ok) {
                                    setSuccessOrderId(verifyData.orderId || 'SUCCESS')
                                    setPurchasedCourse({ courseName: data.bundleName, accessType: 'MIXED' })
                                    setShowBundleModal(false)
                                  } else {
                                    alert('Verification failed: ' + verifyData.error)
                                  }
                                } catch (err) { alert('Payment verification failed') }
                                finally { setIsProcessing(false) }
                              },
                              modal: { ondismiss: () => setIsProcessing(false) }
                            }
                            setIsProcessing(false)
                            const rzp = new (window as any).Razorpay(options)
                            rzp.open()
                          } catch (err: any) { alert(err.message || 'Something went wrong'); setIsProcessing(false) }
                        }} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', fontWeight: '900', fontSize: '16px', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)', border: 'none', cursor: 'pointer' }}>
                          ENROLL NOW
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Batch Comparison Modal (opened from bundle i button) ── */}
      {showBatchComparisonModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
          padding: '20px'
        }} onClick={() => setShowBatchComparisonModal(false)}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '750px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
            animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '30px 40px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderBottom: '1.5px solid #e2e8f0', position: 'relative' }}>
              <button onClick={() => setShowBatchComparisonModal(false)} style={{ position: 'absolute', top: '25px', right: '30px', background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                      <th style={{ padding: '18px 24px', fontSize: '13px', color: '#92400e', fontWeight: '800', background: '#fffbeb', textAlign: 'center' }}>PLUS ( Recorded )</th>
                      <th style={{ padding: '18px 24px', fontSize: '13px', color: '#4338ca', fontWeight: '800', background: '#eef2ff', textAlign: 'center' }}>PRO ( Live )</th>
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
              <button onClick={() => setShowBatchComparisonModal(false)} style={{ background: '#1e293b', color: 'white', padding: '14px 40px', borderRadius: '16px', fontSize: '15px', fontWeight: '700', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Offering Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001,
          padding: '20px', overflow: 'auto'
        }} onClick={() => setShowCreateModal(false)}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '960px',
            boxShadow: '0 0 100px rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '40px',
            animation: 'modalSlideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e1e3a', marginBottom: '24px' }}>
              Add Course to Store
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div>
                {/* Course Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#1e1e3a', marginBottom: '8px' }}>
                Select Course *
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '12px', border: '2px solid #e0e7ff',
                  fontSize: '14px', fontWeight: '600', color: '#1e1e3a', 
                  background: '#f8f9fc', cursor: 'pointer'
                }}
              >
                <option value="">Choose a course...</option>
                {courses?.map((course: any) => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
            </div>

            {/* Display Selected Course Info */}
            {selectedCourse && courses && (
              (() => {
                const selected = courses.find((c: any) => c.id === selectedCourse)
                return selected ? (
                  <div style={{
                    background: `linear-gradient(135deg, ${selected.color || '#6366f1'}15, ${selected.color || '#6366f1'}08)`,
                    border: `2px solid ${selected.color || '#6366f1'}40`,
                    padding: '20px',
                    borderRadius: '16px',
                    marginBottom: '24px'
                  }}>
                    <h3 style={{
                      fontSize: '28px', fontWeight: '900', color: '#1e1e3a', marginBottom: '4px',
                      lineHeight: '1.2'
                    }}>
                      {selected.name}
                    </h3>
                    {selected.subject && (
                      <p style={{
                        fontSize: '14px', color: '#9999b0', fontWeight: '600', marginBottom: '0'
                      }}>
                        {selected.subject}
                      </p>
                    )}
                  </div>
                ) : null
              })()
            )}

            {/* Recording Batch Pricing */}
            <div style={{ background: '#f8f9fc', padding: '20px', borderRadius: '18px', marginBottom: '24px', border: '2px solid #e0e7ff' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#1e1e3a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📹 Recording Batch - Plus
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>
                    Real Price (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={recordedOriginalPrice}
                    onChange={(e) => setRecordedOriginalPrice(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #c5c7cf',
                      fontSize: '14px', fontWeight: '600', color: '#1e1e3a', background: '#ffffff'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>
                    Discount Price (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={recordedDiscountPrice}
                    onChange={(e) => setRecordedDiscountPrice(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #c5c7cf',
                      fontSize: '14px', fontWeight: '600', color: '#1e1e3a', background: '#ffffff'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Live Batch Pricing */}
            <div style={{ background: '#f0f3ff', padding: '20px', borderRadius: '18px', marginBottom: '24px', border: '2px solid #c7d2fe' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#4f46e5', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔴 Live Batch - Pro
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>
                    Real Price (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={liveOriginalPrice}
                    onChange={(e) => setLiveOriginalPrice(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #c5c7cf',
                      fontSize: '14px', fontWeight: '600', color: '#1e1e3a', background: '#ffffff'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>
                    Discount Price (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={liveDiscountPrice}
                    onChange={(e) => setLiveDiscountPrice(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #c5c7cf',
                      fontSize: '14px', fontWeight: '600', color: '#1e1e3a', background: '#ffffff'
                    }}
                  />
                </div>
              </div>
            </div>

              </div>

              <div>
                {/* Tags */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#1e1e3a', marginBottom: '8px' }}>
                Tags / Badges
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {tags.map((tag, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#6366f1', color: '#fff', padding: '6px 12px', borderRadius: '20px',
                      fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      setTags([...tags, tagInput.trim()])
                      setTagInput('')
                    }
                  }}
                  placeholder="e.g., Bestseller, 50% OFF (press Enter)"
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #c5c7cf',
                    fontSize: '14px', fontWeight: '600', color: '#1e1e3a', background: '#f8f9fc'
                  }}
                />
                <button
                  onClick={() => {
                    if (tagInput.trim()) {
                      setTags([...tags, tagInput.trim()])
                      setTagInput('')
                    }
                  }}
                  style={{
                    padding: '10px 16px', borderRadius: '10px', border: 'none',
                    background: '#6366f1', color: '#fff', fontWeight: '700',
                    cursor: 'pointer', fontSize: '12px'
                  }}
                >
                  Add
                </button>
              </div>
            </div>
            
            {/* Recommended Bundle Section */}
            <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '12px', border: '1px dashed #e6eefc', background: '#fbfdff' }}>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                <input type="checkbox" checked={createBundle} onChange={(e) => setCreateBundle(e.target.checked)} />
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>Also create a Recommended Bundle</span>
              </label>

              {createBundle && (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Bundle Name</label>
                    <input value={bundleName} onChange={e => setBundleName(e.target.value)} placeholder="E.g., Level 1: Foundations" style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #dbeafe' }} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Select Recommended Courses</label>
                    <div style={{ maxHeight: '160px', overflow: 'auto', padding: '10px', borderRadius: '8px', border: '1px solid #eef2ff', background: '#fff' }}>
                      {(courses || []).map((c: any) => (
                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                          <input
                            type="checkbox"
                            checked={bundleSelectedCourses.includes(c.id)}
                            onChange={(e) => {
                              if (e.target.checked) setBundleSelectedCourses([...bundleSelectedCourses, c.id])
                              else setBundleSelectedCourses(bundleSelectedCourses.filter(id => id !== c.id))
                            }}
                          />
                          <div style={{ fontSize: '14px', fontWeight: '700' }}>{c.name}</div>
                        </label>
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Tip: Select all to get all at the bundle price below.</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ background: '#fbfbff', padding: '12px', borderRadius: '10px', border: '1px solid #eef2ff' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Bundle - Recorded Price</div>
                      <input type="number" min={1} placeholder="Original (₹)" value={bundleRecordedOriginalPrice} onChange={e => setBundleRecordedOriginalPrice(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e6eefc', marginBottom: '8px' }} />
                      <input type="number" min={1} placeholder="Discount (₹)" value={bundleRecordedDiscountPrice} onChange={e => setBundleRecordedDiscountPrice(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e6eefc' }} />
                    </div>
                    <div style={{ background: '#fbfbff', padding: '12px', borderRadius: '10px', border: '1px solid #eef2ff' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Bundle - Live Price</div>
                      <input type="number" min={1} placeholder="Original (₹)" value={bundleLiveOriginalPrice} onChange={e => setBundleLiveOriginalPrice(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e6eefc', marginBottom: '8px' }} />
                      <input type="number" min={1} placeholder="Discount (₹)" value={bundleLiveDiscountPrice} onChange={e => setBundleLiveDiscountPrice(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e6eefc' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="checkbox" checked={bundleAllowIndividualPurchase} onChange={e => setBundleAllowIndividualPurchase(e.target.checked)} />
                    <div style={{ fontSize: '13px', color: '#334155', fontWeight: '700' }}>Allow users to buy individual courses from this bundle</div>
                  </div>
                </div>
              )}
            </div>

              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #e0e7ff',
                  background: '#f8f9fc', color: '#1e1e3a', fontWeight: '700', fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedCourse) {
                    alert('Please select a course')
                    return
                  }
                  const recordedOriginal = Math.max(parseInt(recordedOriginalPrice || '0', 10) || 0, 0)
                  const recordedDiscount = Math.max(parseInt(recordedDiscountPrice || '0', 10) || 0, 0)
                  const liveOriginal = Math.max(parseInt(liveOriginalPrice || '0', 10) || 0, 0)
                  const liveDiscount = Math.max(parseInt(liveDiscountPrice || '0', 10) || 0, 0)

                  if (!recordedOriginal && !liveOriginal) {
                    alert('Please enter at least one price (recording or live)')
                    return
                  }
                  if ((recordedOriginal && recordedOriginal < 1) || (recordedDiscount && recordedDiscount < 1) || (liveOriginal && liveOriginal < 1) || (liveDiscount && liveDiscount < 1)) {
                    alert('Price cannot be less than 1')
                    return
                  }
                  setCreating(true)
                  try {
                    const res = await fetch('/api/course-offerings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        courseId: selectedCourse,
                        recordedOriginalPrice: recordedOriginal,
                        recordedDiscountPrice: recordedDiscount,
                        liveOriginalPrice: liveOriginal,
                        liveDiscountPrice: liveDiscount,
                        tags: tags,
                        hasRecorded: recordedOriginal > 0 || recordedDiscount > 0,
                        hasLive: liveOriginal > 0 || liveDiscount > 0,
                      }),
                    })
                    if (res.ok) {
                      // If manager requested creating a recommended bundle, create it too
                      if (createBundle) {
                        try {
                          // Ensure selectedCourse is included
                          const coursesForBundle = Array.from(new Set([...(bundleSelectedCourses || []), selectedCourse]))
                          if (!bundleName || coursesForBundle.length === 0) {
                            alert('Bundle requires a name and at least one course. Bundle was not created.')
                          } else {
                            const bundleRes = await fetch('/api/bundle-offerings', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                name: bundleName,
                                description: '',
                                courseIds: coursesForBundle,
                                recordedOriginalPrice: bundleRecordedOriginalPrice ? Number(bundleRecordedOriginalPrice) : undefined,
                                recordedDiscountPrice: bundleRecordedDiscountPrice ? Number(bundleRecordedDiscountPrice) : undefined,
                                liveOriginalPrice: bundleLiveOriginalPrice ? Number(bundleLiveOriginalPrice) : undefined,
                                liveDiscountPrice: bundleLiveDiscountPrice ? Number(bundleLiveDiscountPrice) : undefined,
                                allowIndividualPurchase: !!bundleAllowIndividualPurchase,
                              }),
                            })
                            if (!bundleRes.ok) {
                              const data = await bundleRes.json().catch(() => ({}))
                              alert('Course added but failed to create bundle: ' + (data.error || 'Unknown error'))
                            } else {
                              alert('Course and recommended bundle created successfully!')
                            }
                          }
                        } catch (bundleErr: any) {
                          console.error('Bundle create error', bundleErr)
                          alert('Course added but failed to create bundle: ' + (bundleErr?.message || 'Unknown'))
                        }
                      } else {
                        alert('Course added to store successfully!')
                      }
                      setShowCreateModal(false)
                      setSelectedCourse('')
                      setRecordedOriginalPrice('')
                      setRecordedDiscountPrice('')
                      setLiveOriginalPrice('')
                      setLiveDiscountPrice('')
                      setTags([])
                      // reset bundle form
                      setCreateBundle(false)
                      setBundleName('')
                      setBundleSelectedCourses([])
                      setBundleRecordedOriginalPrice('')
                      setBundleRecordedDiscountPrice('')
                      setBundleLiveOriginalPrice('')
                      setBundleLiveDiscountPrice('')
                      setBundleAllowIndividualPurchase(true)
                      window.location.reload()
                    } else {
                      const data = await res.json()
                      alert('Error: ' + (data.error || 'Failed to create offering'))
                    }
                  } catch (err: any) {
                    alert('Error: ' + err.message)
                  } finally {
                    setCreating(false)
                  }
                }}
                disabled={!selectedCourse || creating}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                  background: !selectedCourse || creating ? '#d0d5e0' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff', fontWeight: '700', fontSize: '14px',
                  cursor: !selectedCourse || creating ? 'not-allowed' : 'pointer',
                  opacity: creating ? 0.8 : 1
                }}
              >
                {creating ? 'Creating...' : 'Add to Store'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Verification Loading Modal */}
      {verifyingPayment && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '440px',
            boxShadow: '0 0 100px rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '40px', textAlign: 'center'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              animation: 'spin 1s linear infinite'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
              Verifying Payment...
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: '0' }}>
              Please wait while we confirm your payment and activate your course access.
            </p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successOrderId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001,
          padding: '20px'
        }} onClick={() => { setSuccessOrderId(null); router.push('/courses') }}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '480px',
            boxShadow: '0 0 100px rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '40px', textAlign: 'center',
            animation: 'modalSlideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#1e293b', marginBottom: '16px' }}>
              Purchase Successful!
            </h2>

            {/* Course Details */}
            {purchasedCourse && (
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                borderRadius: '20px', padding: '20px', marginBottom: '24px',
                border: '2px solid #bbf7d0'
              }}>
                <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Course Purchased
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#15803d', marginBottom: '6px' }}>
                  {purchasedCourse.courseName}
                </h3>
                <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: '700', marginBottom: '0' }}>
                  {purchasedCourse.courseTier}
                </div>
              </div>
            )}

            {/* Order ID */}
            {successOrderId && successOrderId !== 'FREE-ENROLLMENT' && successOrderId !== 'SUCCESS' && (
              <div style={{ background: '#f3f4f6', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1.5px solid #d1d5db' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Order ID (sent to your email)
                </div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#374151', fontFamily: 'monospace', letterSpacing: '1px' }}>
                  {successOrderId}
                </div>
              </div>
            )}

            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
              A confirmation email with your order details has been sent to your registered email address. You can now access your course!
            </p>

            <button
              onClick={() => { setSuccessOrderId(null); router.push('/courses') }}
              style={{
                width: '100%', padding: '16px', borderRadius: '18px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(99, 102, 241, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              Go to My Courses 🚀
            </button>
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
        }} onClick={() => { setUpgradeSuccessOrderId(null); router.push('/courses') }}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '480px',
            boxShadow: '0 0 100px rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '40px', textAlign: 'center',
            animation: 'modalSlideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚡</div>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#1e293b', marginBottom: '16px' }}>
              Upgraded to PRO!
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
              borderRadius: '20px', padding: '20px', marginBottom: '24px',
              border: '2px solid #c7d2fe'
            }}>
              <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>
                Access Upgraded
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#4f46e5', marginBottom: '6px' }}>
                Live + Recorded (PRO)
              </h3>
              <div style={{ fontSize: '13px', color: '#818cf8', fontWeight: '700', marginBottom: '0' }}>
                You now have full access to live sessions!
              </div>
            </div>

            {/* Order ID */}
            {upgradeSuccessOrderId && upgradeSuccessOrderId !== 'SUCCESS' && (
              <div style={{ background: '#f3f4f6', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1.5px solid #d1d5db' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Order ID
                </div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#374151', fontFamily: 'monospace', letterSpacing: '1px' }}>
                  {upgradeSuccessOrderId}
                </div>
              </div>
            )}

            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
              Your upgrade is complete! You can now join live sessions and access all premium features.
            </p>

            <button
              onClick={() => { setUpgradeSuccessOrderId(null); router.push('/courses') }}
              style={{
                width: '100%', padding: '16px', borderRadius: '18px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(99, 102, 241, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              Go to My Courses 🚀
            </button>
          </div>
        </div>
      )}

      {/* Edit Offering Modal */}
      {editingOffering && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001,
          padding: '20px'
        }} onClick={() => setEditingOffering(null)}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '600px',
            boxShadow: '0 0 100px rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '40px',
            animation: 'modalSlideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e1e3a', marginBottom: '24px' }}>
              Edit Course Offering
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Course</label>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e1e3a' }}>{editingOffering.course?.name}</div>
            </div>

            {editingOffering.hasRecorded && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Recorded Original Price</label>
                  <input type="number" min={1} value={editFormData.recordedOriginalPrice ?? ''} onChange={e => setEditFormData({...editFormData, recordedOriginalPrice: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #e0e7ff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Recorded Discount Price</label>
                  <input type="number" min={1} value={editFormData.recordedDiscountPrice ?? ''} onChange={e => setEditFormData({...editFormData, recordedDiscountPrice: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #e0e7ff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>
            )}

            {editingOffering.hasLive && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Live Original Price</label>
                  <input type="number" min={1} value={editFormData.liveOriginalPrice ?? ''} onChange={e => setEditFormData({...editFormData, liveOriginalPrice: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #e0e7ff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Live Discount Price</label>
                  <input type="number" min={1} value={editFormData.liveDiscountPrice ?? ''} onChange={e => setEditFormData({...editFormData, liveDiscountPrice: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #e0e7ff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>
            )}

            {/* Details Link (optional) */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Details Link (optional)</label>
              <input type="url" value={editFormData.detailsLink ?? ''} onChange={e => setEditFormData({...editFormData, detailsLink: e.target.value})} placeholder="https://example.com/course-details" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #e0e7ff', fontSize: '14px', boxSizing: 'border-box' }} />
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>If set, a "More Details" button will appear on the course card for students.</div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to DELETE this course offering? This cannot be undone.')) return
                  try {
                    const res = await fetch(`/api/course-offerings/${editingOffering.id}`, { method: 'DELETE' })
                    if (res.ok) {
                      setEditingOffering(null)
                      window.location.reload()
                    } else {
                      const d = await res.json()
                      alert(d.error || 'Failed to delete')
                    }
                  } catch { alert('Failed to delete offering') }
                }}
                style={{
                  padding: '14px 18px', borderRadius: '12px', border: '2px solid #fecaca',
                  background: '#fef2f2', color: '#dc2626', fontWeight: '700', fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                🗑️
              </button>
              <button
                onClick={() => setEditingOffering(null)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #e0e7ff',
                  background: '#f8f9fc', color: '#1e1e3a', fontWeight: '700', fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                disabled={editSaving}
                onClick={async () => {
                  try {
                    setEditSaving(true)
                    const res = await fetch(`/api/course-offerings/${editingOffering.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        courseId: editingOffering.courseId,
                        name: editingOffering.name,
                        thumbnail: editingOffering.thumbnail,
                        hasRecorded: editingOffering.hasRecorded,
                        recordedOriginalPrice: editFormData.recordedOriginalPrice || null,
                        recordedDiscountPrice: editFormData.recordedDiscountPrice || null,
                        hasLive: editingOffering.hasLive,
                        liveOriginalPrice: editFormData.liveOriginalPrice || null,
                        liveDiscountPrice: editFormData.liveDiscountPrice || null,
                        detailsLink: editFormData.detailsLink || null,
                      })
                    })
                    if (res.ok) {
                      setEditingOffering(null)
                      window.location.reload()
                    } else {
                      const d = await res.json()
                      alert(d.error || 'Failed to save')
                    }
                  } catch { alert('Failed to save changes') }
                  finally { setEditSaving(false) }
                }}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                  background: editSaving ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff', fontWeight: '700', fontSize: '14px',
                  cursor: editSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bundle Modal */}
      {editingBundle && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001,
          padding: '20px'
        }} onClick={() => setEditingBundle(null)}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '600px',
            boxShadow: '0 0 100px rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '40px',
            animation: 'modalSlideUp 0.3s ease-out',
            maxHeight: '90vh', overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e1e3a', marginBottom: '8px' }}>Edit Bundle</h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>Update pricing, name, and selected courses for this bundle.</p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Bundle Name</label>
              <input type="text" value={editBundleData.name ?? ''} onChange={e => setEditBundleData({...editBundleData, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #e0e7ff', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Description</label>
              <input type="text" value={editBundleData.description ?? ''} onChange={e => setEditBundleData({...editBundleData, description: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #e0e7ff', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Recorded Original</label>
                <input type="number" min={1} value={editBundleData.recordedOriginalPrice ?? ''} onChange={e => setEditBundleData({...editBundleData, recordedOriginalPrice: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #e0e7ff', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Recorded Discount</label>
                <input type="number" min={1} value={editBundleData.recordedDiscountPrice ?? ''} onChange={e => setEditBundleData({...editBundleData, recordedDiscountPrice: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #e0e7ff', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Live Original</label>
                <input type="number" min={1} value={editBundleData.liveOriginalPrice ?? ''} onChange={e => setEditBundleData({...editBundleData, liveOriginalPrice: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #e0e7ff', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Live Discount</label>
                <input type="number" min={1} value={editBundleData.liveDiscountPrice ?? ''} onChange={e => setEditBundleData({...editBundleData, liveDiscountPrice: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #e0e7ff', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#9999b0', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Select Courses</label>
              <div style={{ maxHeight: '160px', overflow: 'auto', padding: '10px', borderRadius: '8px', border: '1px solid #e0e7ff', background: '#f8fafc' }}>
                {(courses || []).map((c: any) => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editBundleData.courseIds?.includes(c.id) || false}
                      onChange={(e) => {
                        const current = editBundleData.courseIds || []
                        if (e.target.checked) setEditBundleData({ ...editBundleData, courseIds: [...current, c.id] })
                        else setEditBundleData({ ...editBundleData, courseIds: current.filter((id: string) => id !== c.id) })
                      }}
                      style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
                    />
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{c.name}</div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setEditingBundle(null)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #e0e7ff',
                  background: '#f8f9fc', color: '#1e1e3a', fontWeight: '700', fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                disabled={editBundleSaving}
                onClick={async () => {
                  try {
                    setEditBundleSaving(true)
                    const res = await fetch(`/api/bundle-offerings/${editingBundle.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(editBundleData)
                    })
                    if (res.ok) {
                      setEditingBundle(null)
                      window.location.reload()
                    } else {
                      const d = await res.json()
                      alert(d.error || 'Failed to save')
                    }
                  } catch { alert('Failed to save changes') }
                  finally { setEditBundleSaving(false) }
                }}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                  background: editBundleSaving ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff', fontWeight: '700', fontSize: '14px',
                  cursor: editBundleSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {editBundleSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Type Comparison Modal */}
      {infoModalOffering && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }} onClick={() => setInfoModalOffering(null)}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '750px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
            animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '30px 40px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderBottom: '1.5px solid #e2e8f0', position: 'relative' }}>
              <button onClick={() => setInfoModalOffering(null)} style={{ position: 'absolute', top: '25px', right: '30px', background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Access Comparison</h2>
              <p style={{ fontSize: '15px', color: '#64748b', fontWeight: '500' }}>Choose the access type that suits your learning needs</p>
            </div>

            {/* Comparison Table */}
            <div style={{ padding: '30px 40px' }}>
              <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1.5px solid #e2e8f0', background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '18px 24px', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Features</th>
                      {infoModalOffering.hasRecorded && (
                        <th style={{ padding: '18px 24px', fontSize: '13px', color: '#92400e', fontWeight: '800', background: '#fffbeb', textAlign: 'center' }}>Recorded ( PLUS )</th>
                      )}
                      {infoModalOffering.hasLive && (
                        <th style={{ padding: '18px 24px', fontSize: '13px', color: '#4338ca', fontWeight: '800', background: '#eef2ff', textAlign: 'center' }}>Live + Recorded (PRO)</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { f: 'Recorded Lectures', recorded: '✅ Full Access', live: '✅ Full Access' },
                      { f: 'Course Materials', recorded: '✅ Full Access', live: '✅ Full Access' },
                      { f: 'Live Classes', recorded: '❌ No Access', live: '✅ Direct Entry' },
                      { f: 'Direct Q&A with Teacher', recorded: '❌ No', live: '✅ Yes (Live)' },
                      { f: 'Class Recordings', recorded: '✅ Available', live: '✅ Available' },
                      { f: 'Priority Support', recorded: '❌ Standard', live: '✅ 24/7 Priority' },
                      { f: 'Course Duration', recorded: 'Access Till End Term', live: 'Access Till End Term' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155', fontWeight: '600' }}>{row.f}</td>
                        {infoModalOffering.hasRecorded && (
                          <td style={{ padding: '16px 24px', fontSize: '14px', color: '#92400e', textAlign: 'center', background: '#fffdf5' }}>{row.recorded}</td>
                        )}
                        {infoModalOffering.hasLive && (
                          <td style={{ padding: '16px 24px', fontSize: '14px', color: '#4338ca', fontWeight: '700', textAlign: 'center', background: '#f5f7ff' }}>{row.live}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ padding: '0 40px 40px', textAlign: 'center' }}>
              <button onClick={() => setInfoModalOffering(null)} style={{ background: '#1e293b', color: 'white', padding: '14px 40px', borderRadius: '16px', fontSize: '15px', fontWeight: '700', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                Got it, thanks!
              </button>
            </div>
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
            background: 'white', padding: '40px', borderRadius: '32px',
            textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            width: '320px'
          }}>
            <div className="spinner" style={{
              width: '40px', height: '40px', border: '4px solid #f3f3f3',
              borderTop: '4px solid #6366f1', borderRadius: '50%',
              margin: '0 auto 20px'
            }} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Processing...</h3>
            <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Please wait while we set up your course access.</p>
          </div>
        </div>
      )}

      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, 5px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      </div>
    </>
  )
}
