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
  const { data: storeNotesData } = useSWR('/api/store/notes', fetcher, { revalidateOnFocus: false })
  const { data: mentorshipsData } = useSWR('/api/store/mentorships', fetcher, { revalidateOnFocus: false })
  const { data: testSeriesData } = useSWR('/api/test-series', fetcher, { revalidateOnFocus: false })
  const { data: myMentorshipsData } = useSWR('/api/store/mentorships/my-bookings', fetcher, { revalidateOnFocus: true })
  const { data: staffData } = useSWR('/api/users/staff', fetcher, { revalidateOnFocus: false })
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
  const [bundleForceClassType, setBundleForceClassType] = useState<string | null>(null)
  const [bundleAllowIndividualPurchase, setBundleAllowIndividualPurchase] = useState(true)
  const [bundleTierPrices, setBundleTierPrices] = useState<Record<number, { recordedOriginal?: string, recordedDiscount?: string, liveOriginal?: string, liveDiscount?: string }>>({})
  const [bundleStartingPrice, setBundleStartingPrice] = useState('')
  const [bundleDescription, setBundleDescription] = useState('')
  const [infoModalOffering, setInfoModalOffering] = useState<any | null>(null)
  // Bundle purchase UI states
  const [showBundleModal, setShowBundleModal] = useState(false)
  const [activeBundle, setActiveBundle] = useState<any | null>(null)
  const [bundleAccessType, setBundleAccessType] = useState<'RECORDED' | 'LIVE'>('RECORDED')
  const [bundleSelectedForPurchase, setBundleSelectedForPurchase] = useState<Record<string, 'RECORDED' | 'LIVE'>>({})
  const [bundleGlobalAccessType, setBundleGlobalAccessType] = useState<'RECORDED' | 'LIVE'>('RECORDED')
  const [bundleSelectedCoursesToBuy, setBundleSelectedCoursesToBuy] = useState<string[]>([])
  const [showBatchComparisonModal, setShowBatchComparisonModal] = useState(false)
  
  const [editingBundle, setEditingBundle] = useState<any>(null)
  const [editBundleData, setEditBundleData] = useState<any>({})
  const [editBundleSaving, setEditBundleSaving] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState<any>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  const [storeView, setStoreView] = useState<null | 'courses' | 'notes' | 'mentorship' | 'testSeries'>(null)
  const [showCreateDropdown, setShowCreateDropdown] = useState(false)
  const [showCreateBundleModal, setShowCreateBundleModal] = useState(false)
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false)
  const [editingNote, setEditingNote] = useState<any>(null)
  const [showCreateMentorshipModal, setShowCreateMentorshipModal] = useState(false)
  const [editingMentorship, setEditingMentorship] = useState<any>(null)

  // Mentorship Booking
  const [showMentorshipBookingModal, setShowMentorshipBookingModal] = useState<any>(null)
  const [mentorshipBookingDate, setMentorshipBookingDate] = useState('')
  const [mentorshipBookingTimes, setMentorshipBookingTimes] = useState<string[]>([])

  // Mentorship Slots Management
  const [showManageSlotsModal, setShowManageSlotsModal] = useState<any>(null)
  const [showManageBookingsModal, setShowManageBookingsModal] = useState<any>(null)
  const [allBookingsData, setAllBookingsData] = useState<any[]>([])
  const [loadingAllBookings, setLoadingAllBookings] = useState(false)
  const [editingBookingLink, setEditingBookingLink] = useState<string | null>(null)
  const [showManualBookingModal, setShowManualBookingModal] = useState(false)
  const [allStudentsData, setAllStudentsData] = useState<any[]>([])
  const [loadingAllStudents, setLoadingAllStudents] = useState(false)
  const [manageSlotsDate, setManageSlotsDate] = useState('')
  const [manageSlotsTime, setManageSlotsTime] = useState('')
  const [editingSlots, setEditingSlots] = useState<{date: string, time: string}[]>([])
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [bookingSearchQuery, setBookingSearchQuery] = useState('')
  const [manualAvailableSlots, setManualAvailableSlots] = useState<any[]>([])
  const [loadingManualSlots, setLoadingManualSlots] = useState(false)

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

  const handleNotePurchase = async (note: any) => {
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/store/notes/${note.id}/create-order`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.isFree) {
        alert('Note accessed successfully! You can find it in Free Resources -> Purchased Materials')
        window.open(note.files?.[0]?.fileUrl, '_blank')
        setIsProcessing(false)
        return
      }

      const options = {
        key: data.key,
        amount: data.amount,
        currency: 'INR',
        name: 'GenZ IITian',
        description: `Note Purchase: ${note.title}`,
        order_id: data.razorpayOrderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch(`/api/store/notes/${note.id}/verify-payment`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
            })
            if (verifyRes.ok) {
              alert('Purchase successful! You have 30 days of access. View it in Free Resources -> Purchased Materials')
              window.open(note.files?.[0]?.fileUrl, '_blank')
              window.location.reload()
            } else { alert('Payment verification failed') }
          } catch { alert('Payment verification failed') }
          finally { setIsProcessing(false) }
        },
        modal: { ondismiss: () => setIsProcessing(false) }
      }
      setIsProcessing(false)
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      alert(err.message || 'Error processing')
      setIsProcessing(false)
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
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowCreateDropdown(!showCreateDropdown)}
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
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Create
              </button>
              {showCreateDropdown && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: '#fff', borderRadius: '12px', padding: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  zIndex: 100, minWidth: '160px',
                  display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                  {[
                    { label: '📚 Course', action: () => { setShowCreateModal(true); setShowCreateDropdown(false) } },
                    { label: '📦 Bundle', action: () => { setShowCreateBundleModal(true); setShowCreateDropdown(false) } },
                    { label: '📝 Notes', action: () => { setShowCreateNoteModal(true); setShowCreateDropdown(false) } },
                    { label: '🤝 Mentorship', action: () => { setShowCreateMentorshipModal(true); setShowCreateDropdown(false) } }
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      style={{
                        padding: '10px 12px', background: 'transparent', border: 'none',
                        borderRadius: '8px', textAlign: 'left', fontSize: '13px',
                        fontWeight: '600', color: '#1e293b', cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="page-container fade-in">

      {/* STORE CATEGORY CARDS */}
      {!storeView && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {[
            { key: 'courses' as const, title: 'Courses', subtitle: `${(offerings || []).length + (bundleOfferings || []).length} available`, emoji: '📚', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', shadow: 'rgba(99,102,241,0.3)' },
            { key: 'notes' as const, title: 'Premium Notes', subtitle: `${storeNotesData?.notes?.length || 0} notes`, emoji: '📝', gradient: 'linear-gradient(135deg, #10b981, #059669)', shadow: 'rgba(16,185,129,0.3)' },
            { key: 'mentorship' as const, title: 'Book a Call with Mentor', subtitle: `${mentorshipsData?.mentorships?.length || 0} mentors`, emoji: '🤝', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', shadow: 'rgba(245,158,11,0.3)' },
            { key: 'testSeries' as const, title: 'Test Series', subtitle: `${testSeriesData?.testSeries?.length || 0} available`, emoji: '📋', gradient: 'linear-gradient(135deg, #ec4899, #be185d)', shadow: 'rgba(236,72,153,0.3)' },
          ].map(card => (
            <div key={card.key} onClick={() => setStoreView(card.key)} style={{ background: '#fff', borderRadius: '24px', padding: '32px', cursor: 'pointer', boxShadow: '0 10px 30px rgba(15,23,42,0.06)', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = `0 20px 40px ${card.shadow}` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(15,23,42,0.06)' }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: card.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px', boxShadow: `0 8px 20px ${card.shadow}` }}>{card.emoji}</div>
              <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b', marginBottom: '6px' }}>{card.title}</h3>
              <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', marginBottom: '16px' }}>{card.subtitle}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366f1', fontSize: '13px', fontWeight: '700' }}>
                Explore <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BACK BUTTON when inside a view */}
      {storeView && (
        <button onClick={() => setStoreView(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '20px', padding: '8px 0' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Store
        </button>
      )}

      {/* Bundle offerings section */}
      {storeView === 'courses' && activeBundles.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#1e1e3a', margin: '6px 0 12px' }}>Bundles</h2>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {activeBundles.map((b: any) => {
              const bundlePriceRecorded = b.recordedDiscountPrice ?? b.recordedOriginalPrice
              const bundlePriceLive = b.liveDiscountPrice ?? b.liveOriginalPrice
              return (
                <div key={b.id} style={{ 
                  minWidth: '320px', 
                  maxWidth: '350px',
                  background: '#fff', 
                  borderRadius: '24px', 
                  padding: '22px', 
                  boxShadow: '0 10px 40px rgba(15,23,42,0.08)',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'transform 0.3s ease',
                  cursor: 'default'
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(99,102,241,0.08)', padding: '4px 10px', borderRadius: '20px' }}>Bundle</div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✨ {b.courses.length} Courses
                      </div>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>{b.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', lineHeight: '1.5', minHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {b.description || `Special curated bundle with ${b.courses.length} premium courses.`}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '16px', border: '1px solid #eef2ff' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#6366f1', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>📅 Class starts from 1 June 2026</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>Courses start from</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>₹</span>
                      <span style={{ fontSize: '28px', fontWeight: '950', color: '#1e293b', letterSpacing: '-0.02em' }}>{b.startingPrice || (bundlePriceLive || bundlePriceRecorded || 0)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={() => { 
                      setActiveBundle(b); 
                      setBundleAccessType(bundlePriceRecorded ? 'RECORDED' : 'LIVE'); 
                      setBundleSelectedCoursesToBuy(b.courses.map((c: any) => c.course.id).filter((id: string) => {
                        if (b.allowIndividualPurchase === false) return true;
                        const isManager = userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER';
                        return isManager || getEnrollmentStatus(id) === null;
                      })); 
                      setShowBundleModal(true) 
                    }} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: '900', fontSize: '15px', border: 'none', cursor: 'pointer', boxShadow: '0 8px 20px rgba(99,102,241,0.25)' }}>View / Buy</button>
                    
                    {(userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER') && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          setEditingBundle(b); 
                          setEditBundleData({ 
                            name: b.name, 
                            description: b.description || '', 
                            recordedOriginalPrice: b.recordedOriginalPrice ?? '', 
                            recordedDiscountPrice: b.recordedDiscountPrice ?? '', 
                            liveOriginalPrice: b.liveOriginalPrice ?? '', 
                            liveDiscountPrice: b.liveDiscountPrice ?? '', 
                            courseIds: b.courses.map((c: any) => c.course.id), 
                            allowIndividualPurchase: b.allowIndividualPurchase ?? true, 
                            enableBundleDiscount: b.enableBundleDiscount ?? false, 
                            bundleDiscountType: b.bundleDiscountType ?? 'PERCENTAGE', 
                            bundleDiscountValue: b.bundleDiscountValue ?? '', 
                            bundleDiscountApplicability: b.bundleDiscountApplicability ?? 'BOTH', 
                            requireAllCourses: b.requireAllCourses ?? true,
                            coursePrices: b.coursePrices || '[]',
                            startingPrice: b.startingPrice ?? ''
                          }) 
                        }} style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>📝</button>
                        <button onClick={async () => {
                          if (!confirm(`Delete bundle "${b.name}"? This cannot be undone.`)) return
                          try {
                            const res = await fetch(`/api/bundle-offerings/${b.id}`, { method: 'DELETE' })
                            if (res.ok) window.location.reload()
                            else { const d = await res.json(); alert(d.error || 'Failed to delete') }
                          } catch { alert('Failed to delete bundle') }
                        }} style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Notes section */}
      {storeView === 'notes' && storeNotesData?.notes?.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#1e1e3a', margin: '6px 0 12px' }}>Study Notes</h2>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {storeNotesData.notes.map((n: any) => (
              <div key={n.id} style={{ minWidth: '320px', background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 8px 20px rgba(15,23,42,0.06)' }}>
                <div style={{ fontSize: '16px', fontWeight: '900', marginBottom: '6px' }}>{n.title}</div>
                {n.description && <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>{n.description}</div>}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                  <div style={{ fontWeight: '800', color: n.price > 0 ? '#1e293b' : '#10b981' }}>{n.price > 0 ? `₹${n.price}` : 'Free'}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { n.price > 0 ? handleNotePurchase(n) : window.open(n.files?.[0]?.fileUrl, '_blank') }} style={{ flex: 1, padding: '10px 12px', borderRadius: '12px', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: '800' }}>
                    {n.price > 0 ? 'Buy / Access' : 'Access Notes'}
                  </button>
                  {(userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER') && (
                    <>
                      <button onClick={(e) => {
                        e.stopPropagation()
                        setEditingNote(n)
                        setShowCreateNoteModal(true)
                        setTimeout(() => {
                          const titleEl = document.getElementById('noteTitleInput') as HTMLInputElement
                          const descEl = document.getElementById('noteDescInput') as HTMLTextAreaElement
                          const linkEl = document.getElementById('noteLinkInput') as HTMLInputElement
                          const priceEl = document.getElementById('notePriceInput') as HTMLInputElement
                          if (titleEl) titleEl.value = n.title
                          if (descEl) descEl.value = n.description || ''
                          if (linkEl) linkEl.value = n.files?.[0]?.fileUrl || ''
                          if (priceEl) priceEl.value = n.price
                        }, 100)
                      }} style={{ padding: '10px 12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '800', fontSize: '13px' }}>Edit</button>
                      <button onClick={async () => {
                        if (!confirm(`Delete note "${n.title}"?`)) return
                        try {
                          const res = await fetch(`/api/store/notes/${n.id}`, { method: 'DELETE' })
                          if (res.ok) window.location.reload()
                          else alert('Failed to delete')
                        } catch { alert('Failed to delete') }
                      }} style={{ padding: '10px 12px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: '800', fontSize: '13px' }}>🗑️</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mentorship offerings section */}
      {storeView === 'mentorship' && mentorshipsData?.mentorships?.length > 0 && (
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#1e1e3a', margin: 0 }}>1-on-1 Mentorship</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER') && (
                  <button 
                    onClick={async () => {
                      setShowManualBookingModal(true)
                      setLoadingAllStudents(true)
                      try {
                        const res = await fetch('/api/users/students')
                        const data = await res.json()
                        setAllStudentsData(data.students || [])
                      } catch { alert('Failed to fetch students') }
                      finally { setLoadingAllStudents(false) }
                    }}
                    style={{ padding: '8px 16px', borderRadius: '50px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                  >
                    ➕ Manual Book
                  </button>
                )}
                <button 
                  onClick={async () => {
                  setShowManageBookingsModal(true)
                  setLoadingAllBookings(true)
                  try {
                    const res = await fetch('/api/store/mentorships/all-bookings')
                    const data = await res.json()
                    setAllBookingsData(data.bookings || [])
                  } catch { alert('Failed to fetch bookings') }
                  finally { setLoadingAllBookings(false) }
                }}
                style={{ padding: '8px 16px', borderRadius: '50px', background: '#3636e8', color: '#fff', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(54,54,232,0.2)' }}
              >
                📋 View All Bookings
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '20px', paddingRight: '20px' }}>
            {mentorshipsData.mentorships.map((m: any) => (
              <div key={m.id} style={{ 
                minWidth: '380px', 
                background: '#fff', 
                borderRadius: '24px', 
                padding: '28px', 
                boxShadow: '0 10px 40px rgba(15,23,42,0.06)',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                transition: 'transform 0.3s ease',
                position: 'relative'
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-6px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#fff', fontWeight: '900', boxShadow: '0 8px 16px rgba(245,158,11,0.2)' }}>
                    {m.mentorName[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>{m.mentorName}</div>
                    <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>{m.mentorTitle || 'IIT Mentorship Specialist'}</div>
                  </div>
                </div>

                <div style={{ minHeight: '48px' }}>
                  <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', margin: 0 }}>{m.description || 'Experienced mentor ready to guide you through your JEE/NEET journey and beyond.'}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fffbeb', padding: '14px 20px', borderRadius: '16px', border: '1px solid #fef3c7' }}>
                  <div style={{ fontSize: '18px' }}>💰</div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#92400e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Starting From</div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#92400e' }}>₹{m.pricePerSlot} <span style={{ fontSize: '13px', fontWeight: '600', opacity: 0.8 }}>/ {m.slotDurationMinutes} mins session</span></div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <button 
                    onClick={() => { setShowMentorshipBookingModal(m); setMentorshipBookingDate(''); setMentorshipBookingTimes([]) }} 
                    style={{ flex: 1, padding: '14px', borderRadius: '16px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontWeight: '800', border: 'none', cursor: 'pointer', fontSize: '15px', boxShadow: '0 8px 20px rgba(217,119,6,0.2)' }}
                  >
                    Book a Slot
                  </button>
                  
                  {(userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER') && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditingMentorship(m)
                        setShowCreateMentorshipModal(true)
                        setTimeout(() => {
                          const mentorEl = document.getElementById('mentorNameInput') as HTMLInputElement
                          const titleEl = document.getElementById('mentorTitleInput') as HTMLInputElement
                          const descEl = document.getElementById('mentorDescInput') as HTMLTextAreaElement
                          const priceEl = document.getElementById('mentorPriceInput') as HTMLInputElement
                          const durationEl = document.getElementById('mentorDurationInput') as HTMLInputElement
                          if (mentorEl) mentorEl.value = m.mentorName
                          if (titleEl) titleEl.value = m.mentorTitle || 'IIT Mentorship Specialist'
                          if (descEl) descEl.value = m.description || ''
                          if (priceEl) priceEl.value = m.pricePerSlot
                          if (durationEl) durationEl.value = m.slotDurationMinutes
                        }, 100)
                      }} style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>⚙️</button>
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        setShowManageSlotsModal(m); 
                        setEditingSlots(JSON.parse(m.availableSlots || '[]'));
                        setManageSlotsDate('');
                        setManageSlotsTime('');
                      }} style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>📅</button>
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Delete mentorship "${m.mentorName}"?`)) return
                        try {
                          const res = await fetch(`/api/store/mentorships/${m.id}`, { method: 'DELETE' })
                          if (res.ok) window.location.reload()
                          else alert('Failed to delete')
                        } catch { alert('Failed to delete') }
                      }} style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>🗑️</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MY BOOKINGS SECTION */}
      {storeView === 'mentorship' && myMentorshipsData?.bookings?.length > 0 && (
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#1e1e3a', marginBottom: '20px' }}>Your Booked Sessions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {myMentorshipsData.bookings.map((booking: any) => {
              const isPast = new Date(`${booking.slotDate}T${booking.slotTime}`) < new Date();
              const isToday = booking.slotDate === new Date().toISOString().split('T')[0];
              
              return (
                <div key={booking.id} style={{ 
                  background: isPast ? '#f8fafc' : '#fff', 
                  borderRadius: '20px', 
                  padding: '20px', 
                  boxShadow: isPast ? 'none' : '0 10px 30px rgba(0,0,0,0.04)',
                  border: isPast ? '1px solid #e2e8f0' : '2px solid #f59e0b',
                  opacity: isPast ? 0.7 : 1,
                  filter: isPast ? 'grayscale(0.5)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>{booking.mentorship?.mentorName}</div>
                      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{booking.mentorship?.slotDuration} mins Session</div>
                    </div>
                    {isToday && !isPast && <span style={{ padding: '4px 10px', borderRadius: '50px', background: '#10b981', color: '#fff', fontSize: '10px', fontWeight: '800' }}>TODAY</span>}
                    {isPast && <span style={{ padding: '4px 10px', borderRadius: '50px', background: '#94a3b8', color: '#fff', fontSize: '10px', fontWeight: '800' }}>COMPLETED</span>}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', background: isPast ? '#f1f5f9' : '#fffbeb', padding: '12px', borderRadius: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Date</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{new Date(booking.slotDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Time</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{booking.slotTime} IST</div>
                    </div>
                  </div>

                  {!isPast && (
                    <div style={{ marginTop: '4px' }}>
                      {booking.meetLink ? (
                        <a href={booking.meetLink} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '12px', background: '#3636e8', color: '#fff', fontWeight: '800', textDecoration: 'none', fontSize: '14px' }}>
                          Join Meeting →
                        </a>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '12px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b', fontWeight: '700', fontSize: '13px', border: '1.5px dashed #cbd5e1' }}>
                          Link will be added soon
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {myMentorshipsData.bookings.length > 5 && (
             <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b', fontWeight: '600', fontStyle: 'italic' }}>
               Completed sessions are displayed above in grey.
             </div>
          )}
        </div>
      )}

      {/* TEST SERIES STORE SECTION */}
      {storeView === 'testSeries' && testSeriesData?.testSeries?.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#1e1e3a', margin: '6px 0 12px' }}>Test Series</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {testSeriesData.testSeries.map((ts: any) => {
              const hasAccess = ts.myAccess != null
              const isExpiredAccess = hasAccess && new Date(ts.myAccess.expiresAt) < new Date()
              const canAccess = hasAccess && !isExpiredAccess
              return (
                <div key={ts.id} style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 8px 20px rgba(15,23,42,0.06)', border: canAccess ? '2px solid #10b981' : '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: '900', marginBottom: '4px' }}>{ts.title}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{ts.description || `${ts._count?.exams || 0} exams`}</div>
                    </div>
                    {canAccess && <span style={{ padding: '4px 10px', borderRadius: '50px', background: '#d1fae5', color: '#059669', fontSize: '10px', fontWeight: 800 }}>OWNED</span>}
                    {isExpiredAccess && <span style={{ padding: '4px 10px', borderRadius: '50px', background: '#fef2f2', color: '#dc2626', fontSize: '10px', fontWeight: 800 }}>EXPIRED</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                    <div><span style={{ fontSize: '10px', color: '#9999b0', fontWeight: 700 }}>EXAMS</span><div style={{ fontSize: '15px', fontWeight: 800 }}>{ts._count?.exams || 0}</div></div>
                    <div><span style={{ fontSize: '10px', color: '#9999b0', fontWeight: 700 }}>VALIDITY</span><div style={{ fontSize: '15px', fontWeight: 800 }}>{ts.validityDays} days</div></div>
                  </div>
                  {canAccess ? (
                    <button onClick={() => { window.location.href = '/exams' }} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#10b981', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '14px' }}>Go to Exams →</button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        {ts.originalPrice && ts.originalPrice > ts.price && <div style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }}>₹{ts.originalPrice}</div>}
                        <div style={{ fontSize: '22px', fontWeight: 900, color: '#1e293b' }}>{ts.price > 0 ? `₹${ts.price}` : 'FREE'}</div>
                      </div>
                      <button
                        disabled={purchasing === `ts-${ts.id}`}
                        onClick={async () => {
                          setPurchasing(`ts-${ts.id}`)
                          try {
                            const res = await fetch(`/api/test-series/${ts.id}/create-order`, { method: 'POST' })
                            const data = await res.json()
                            if (!res.ok) { alert(data.error || 'Failed'); setPurchasing(null); return }
                            if (data.isFree) { alert('Access granted! Go to Exams tab.'); window.location.reload(); return }
                            const options = {
                              key: data.key, amount: data.amount, currency: data.currency,
                              name: 'GenZ IItian', description: `Purchase: ${data.testSeriesName}`,
                              order_id: data.razorpayOrderId,
                              prefill: { name: data.userName || '', email: data.userEmail || '' },
                              theme: { color: '#ec4899' },
                              handler: async (response: any) => {
                                try {
                                  const vRes = await fetch(`/api/test-series/${ts.id}/verify-payment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: response.razorpay_order_id, razorpay_signature: response.razorpay_signature, accessId: data.accessId }) })
                                  if (vRes.ok) { alert('Payment successful! Go to Exams tab to start.'); window.location.reload() }
                                  else alert('Verification failed')
                                } catch { alert('Payment verification failed') }
                                finally { setPurchasing(null) }
                              },
                              modal: { ondismiss: () => setPurchasing(null) }
                            }
                            setPurchasing(null)
                            const rzp = new (window as any).Razorpay(options)
                            rzp.open()
                          } catch { alert('Error'); setPurchasing(null) }
                        }}
                        style={{ padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #ec4899, #be185d)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '14px' }}
                      >
                        {purchasing === `ts-${ts.id}` ? 'Processing...' : (ts.price > 0 ? 'Buy Now' : 'Get Free Access')}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {storeView === 'courses' && activeOfferings.length === 0 && (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c5c7cf" strokeWidth="1.5">
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
          </svg>
          <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>No courses available yet</p>
          <p style={{ fontSize: '13px' }}>Check back soon for new offerings!</p>
        </div>
      )}

      {storeView === 'courses' && <div className="grid-3">
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
      </div>}

      {/* Bundle Choose / Buy Modal */}
      {showBundleModal && activeBundle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={() => { setShowBundleModal(false); setActiveBundle(null) }}>
          <div style={{ width: '100%', maxWidth: '1024px', background: '#fff', borderRadius: '24px', padding: '40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900' }}>{activeBundle.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowBatchComparisonModal(true) }}
                  style={{
                    padding: '6px 12px', borderRadius: '10px',
                    background: 'rgba(99,102,241,0.08)',
                    border: '1.5px solid rgba(99,102,241,0.2)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    color: '#6366f1', fontSize: '13px', fontWeight: '800'
                  }}
                >
                  click me to see difference >
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ maxHeight: '380px', overflow: 'auto', paddingRight: '12px', marginBottom: '20px' }}>
                  {activeBundle.courses.map((bc: any) => {
                    const course = bc.course
                    const offering = (activeOfferings as any[]).find(o => o.courseId === course.id)
                    const recPrice = offering?.recordedDiscountPrice ?? offering?.recordedOriginalPrice ?? 0
                    const livePrice = offering?.liveDiscountPrice ?? offering?.liveOriginalPrice ?? 0
                    return (
                      <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {(() => {
                            const enrollmentType = getEnrollmentStatus(course.id);
                            const isManager = userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER';
                            const isEnrolled = !isManager && enrollmentType !== null;
                            return (
                              <>
                                <input
                                  type="checkbox"
                                  checked={isEnrolled ? true : bundleSelectedCoursesToBuy.includes(course.id)}
                                  disabled={isEnrolled || activeBundle.allowIndividualPurchase === false}
                                  onChange={(e) => {
                                    if (activeBundle.allowIndividualPurchase === false || isEnrolled) return
                                    if (e.target.checked) setBundleSelectedCoursesToBuy([...bundleSelectedCoursesToBuy, course.id])
                                    else setBundleSelectedCoursesToBuy(bundleSelectedCoursesToBuy.filter(id => id !== course.id))
                                  }}
                                  style={{ width: '18px', height: '18px', cursor: isEnrolled ? 'not-allowed' : 'pointer', accentColor: isEnrolled ? '#10b981' : '#6366f1', opacity: isEnrolled ? 0.6 : 1 }}
                                />
                                <div>
                                  <div style={{ fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {course.name}
                                    {isEnrolled && <span style={{ fontSize: '10px', background: '#d1fae5', color: '#059669', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: '800' }}>Enrolled</span>}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#64748b' }}>{course.teacherName || ''}</div>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                        {((activeBundle.allowIndividualPurchase === false || activeBundle.coursePrices) && activeBundle.courses.length === selectedList.length) ? (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                             <span style={{ fontSize: '13px', color: '#6366f1', fontWeight: '800', background: 'rgba(99,102,241,0.08)', padding: '4px 10px', borderRadius: '8px' }}>✨ Included in Bundle</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {getEnrollmentStatus(course.id) && userData?.user?.role !== 'MANAGER' && userData?.role !== 'MANAGER' ? (
                               <div style={{ fontSize: '13px', color: '#059669', fontWeight: '700' }}>✅ Already Purchased</div>
                            ) : (
                              <>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '13px', fontWeight: '800' }}>₹{recPrice}</div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Recorded</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#4f46e5' }}>₹{livePrice}</div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Live</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <select value={bundleSelectedForPurchase[course.id] || 'RECORDED'} onChange={e => setBundleSelectedForPurchase({ ...bundleSelectedForPurchase, [course.id]: e.target.value as 'RECORDED' | 'LIVE' })} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '12px', fontWeight: '700' }}>
                                    <option value="RECORDED">Recorded</option>
                                    <option value="LIVE">Live</option>
                                  </select>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Left Bottom Info Area */}
                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', border: '1.5px solid #f1f5f9' }}>
                  {/* Bundle Discount Banner Moved Here */}
                  {activeBundle.enableBundleDiscount && activeBundle.bundleDiscountValue && (
                    <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', marginBottom: '16px', border: '1px solid #f59e0b' }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#92400e' }}>
                        🏷️ {activeBundle.bundleDiscountType === 'PERCENTAGE' ? `Special ${activeBundle.bundleDiscountValue}% OFF` : `Special ₹${activeBundle.bundleDiscountValue} OFF`} applied!
                      </div>
                      <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px', fontWeight: '600' }}>
                        {activeBundle.requireAllCourses 
                          ? `This discount is automatically applied when you enroll in all courses (as ${activeBundle.bundleDiscountApplicability === 'BOTH' ? 'Live or Recorded' : activeBundle.bundleDiscountApplicability === 'LIVE' ? 'Live PRO' : 'Recorded PLUS'}) in this term.` 
                          : "Save more by enrolling in this curated course bundle."}
                      </div>
                    </div>
                  )}

                  {/* Fixed bundle notice Moved Here */}
                  {activeBundle.allowIndividualPurchase === false && (
                    <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '20px' }}>🔒</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e40af' }}>Fixed Bundle Terms</div>
                        <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600' }}>This is a fixed term bundle. Individual course removal is not available for this configuration.</div>
                      </div>
                    </div>
                  )}

                  {/* Global Bundle Class Type Choice Moved Here */}
                  {(() => {
                    const selectedList = bundleSelectedCoursesToBuy.length ? bundleSelectedCoursesToBuy : activeBundle.courses.map((c: any) => c.course.id);
                    if ((activeBundle.allowIndividualPurchase === false || selectedList.length === activeBundle.courses.length) && !activeBundle.forceClassType) {
                      return (
                        <div style={{ padding: '16px', borderRadius: '12px', background: '#fff', border: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>Bundle Class Preference</div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Apply to all courses in this bundle</div>
                          </div>
                          <select 
                            value={bundleGlobalAccessType} 
                            onChange={e => setBundleGlobalAccessType(e.target.value as 'RECORDED' | 'LIVE')}
                            style={{ padding: '10px 14px', borderRadius: '10px', border: '2px solid #cbd5e1', fontSize: '14px', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="RECORDED">Recorded PLUS</option>
                            <option value="LIVE">Live PRO</option>
                          </select>
                        </div>
                      )
                    }
                    return null;
                  })()}
                </div>
              </div>

              <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '24px', display: 'flex', flexDirection: 'column' }}>
                {(() => {
                  let totalPrice = 0;
                  let originalTotalPrice = 0;
                  const selectedList = bundleSelectedCoursesToBuy.length ? bundleSelectedCoursesToBuy : activeBundle.courses.map((c: any) => c.course.id);
                  const isFixed = activeBundle.allowIndividualPurchase === false;
                  const effectiveAccessType = activeBundle.forceClassType || bundleGlobalAccessType;
                  
                  // Check if ALL selected courses are already enrolled
                  const isManager = userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER';
                  const isAllEnrolled = !isManager && selectedList.length > 0 && selectedList.every(id => getEnrollmentStatus(id) !== null);

                  const tierPrices = activeBundle.coursePrices ? JSON.parse(activeBundle.coursePrices) : {};
                  const count = selectedList.length;
                  const tier = tierPrices[count];

                  if (tier) {
                    if (effectiveAccessType === 'RECORDED') {
                      totalPrice = Number(tier.recordedDiscount) || Number(tier.recordedOriginal) || 0;
                      originalTotalPrice = Number(tier.recordedOriginal) || totalPrice;
                    } else {
                      totalPrice = Number(tier.liveDiscount) || Number(tier.liveOriginal) || 0;
                      originalTotalPrice = Number(tier.liveOriginal) || totalPrice;
                    }
                  } else {
                    // Fallback to existing bundle prices or sum
                    const isBuyingAll = selectedList.length === activeBundle.courses.length;
                    const useBundleBasePrice = (isFixed || isBuyingAll) && (effectiveAccessType === 'RECORDED' ? activeBundle.recordedOriginalPrice != null : activeBundle.liveOriginalPrice != null);

                    if (useBundleBasePrice) {
                      const bundlePrice = effectiveAccessType === 'RECORDED' ? activeBundle.recordedDiscountPrice ?? activeBundle.recordedOriginalPrice : activeBundle.liveDiscountPrice ?? activeBundle.liveOriginalPrice;
                      const bundleOriginal = effectiveAccessType === 'RECORDED' ? activeBundle.recordedOriginalPrice ?? activeBundle.recordedDiscountPrice : activeBundle.liveOriginalPrice ?? activeBundle.liveDiscountPrice;
                      
                      totalPrice = bundlePrice || 0;
                      originalTotalPrice = bundleOriginal || totalPrice;
                    } else {
                      selectedList.forEach((courseId: string) => {
                        const offering = (activeOfferings as any[]).find(o => o.courseId === courseId);
                        const selectedType = bundleSelectedForPurchase[courseId] || effectiveAccessType || 'RECORDED';
                        if (selectedType === 'RECORDED') {
                          totalPrice += offering?.recordedDiscountPrice ?? offering?.recordedOriginalPrice ?? 0;
                          originalTotalPrice += offering?.recordedOriginalPrice ?? offering?.recordedDiscountPrice ?? 0;
                        } else {
                          totalPrice += offering?.liveDiscountPrice ?? offering?.liveOriginalPrice ?? 0;
                          originalTotalPrice += offering?.liveOriginalPrice ?? offering?.liveDiscountPrice ?? 0;
                        }
                      });
                    }
                  }

                  // Calculate bundle discount
                  let bundleDiscountAmt = 0;
                  if (activeBundle.enableBundleDiscount && activeBundle.bundleDiscountValue) {
                    const applicability = activeBundle.bundleDiscountApplicability || 'BOTH';
                    const allSelected = selectedList.length === activeBundle.courses.length;
                    const meetsRequireAll = !activeBundle.requireAllCourses || allSelected;
                    const dominantType = Object.values(bundleSelectedForPurchase).filter(v => v === 'LIVE').length > selectedList.length / 2 ? 'LIVE' : 'RECORDED';
                    const accessOk = applicability === 'BOTH' || applicability === dominantType;
                    if (accessOk && meetsRequireAll) {
                      if (activeBundle.bundleDiscountType === 'PERCENTAGE') {
                        bundleDiscountAmt = Math.round((totalPrice * activeBundle.bundleDiscountValue) / 100);
                      } else {
                        bundleDiscountAmt = activeBundle.bundleDiscountValue;
                      }
                      bundleDiscountAmt = Math.min(bundleDiscountAmt, totalPrice);
                    }
                  }

                  const afterBundleDiscount = totalPrice - bundleDiscountAmt;
                  const couponDiscountAmt = couponApplied ? Math.min(couponApplied.discountAmount || 0, afterBundleDiscount) : 0;
                  const finalTotal = Math.max(0, afterBundleDiscount - couponDiscountAmt);
                  const totalSavings = bundleDiscountAmt + couponDiscountAmt + (originalTotalPrice > totalPrice ? originalTotalPrice - totalPrice : 0);

                  return (
                    <>
                      <div style={{ marginBottom: 'auto' }}>
                        <div style={{ fontSize: '18px', color: '#0f172a', fontWeight: '800', marginBottom: '20px', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '10px' }}>Order Summary</div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '700' }}>Selected Courses</span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
                            {(() => {
                              const prices: number[] = [];
                              selectedList.forEach((courseId: string) => {
                                const offering = (activeOfferings as any[]).find(o => o.courseId === courseId);
                                const selectedType = bundleSelectedForPurchase[courseId] || (activeBundle.forceClassType || bundleGlobalAccessType) || 'RECORDED';
                                const price = selectedType === 'RECORDED' 
                                  ? (offering?.recordedDiscountPrice ?? offering?.recordedOriginalPrice ?? 0)
                                  : (offering?.liveDiscountPrice ?? offering?.liveOriginalPrice ?? 0);
                                if (price > 0) prices.push(price);
                              });
                              return prices.length > 0 ? prices.join(' + ') : selectedList.length;
                            })()}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '700' }}>Subtotal</span>
                          <span style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>₹{totalPrice}</span>
                        </div>

                        {bundleDiscountAmt > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', padding: '8px 12px', borderRadius: '10px', background: '#f0fdf4' }}>
                            <span style={{ fontSize: '13px', color: '#166534', fontWeight: '800' }}>Bundle Discount</span>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: '#16a34a' }}>-₹{bundleDiscountAmt}</span>
                          </div>
                        )}

                        {couponApplied && couponDiscountAmt > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', padding: '8px 12px', borderRadius: '10px', background: '#eff6ff' }}>
                            <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: '800' }}>Coupon ({couponApplied.code})</span>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: '#2563eb' }}>-₹{couponDiscountAmt}</span>
                          </div>
                        )}

                        {/* Coupon Input */}
                        {!isAllEnrolled && (
                          <div style={{ marginTop: '20px', marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Apply Coupon</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input type="text" value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }} placeholder="COUPON CODE" style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '2px solid #e0e7ff', fontSize: '13px', fontWeight: '800', letterSpacing: '0.05em', outline: 'none' }} disabled={!!couponApplied} />
                              {couponApplied ? (
                                <button onClick={() => { setCouponApplied(null); setCouponCode(''); setCouponError('') }} style={{ padding: '10px 16px', borderRadius: '10px', background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                              ) : (
                                <button disabled={!couponCode || couponLoading} onClick={async () => {
                                  setCouponLoading(true); setCouponError('')
                                  try {
                                    const res = await fetch('/api/store/coupons/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: couponCode, bundleOfferingId: activeBundle.id, subtotal: afterBundleDiscount }) })
                                    const data = await res.json()
                                    if (res.ok && data.valid) { setCouponApplied(data) }
                                    else { setCouponError(data.error || 'Invalid coupon') }
                                  } catch { setCouponError('Failed to validate') }
                                  finally { setCouponLoading(false) }
                                }} style={{ padding: '10px 16px', borderRadius: '10px', background: couponCode ? '#6366f1' : '#e2e8f0', color: couponCode ? '#fff' : '#94a3b8', fontWeight: '800', fontSize: '12px', cursor: couponCode ? 'pointer' : 'not-allowed', border: 'none' }}>{couponLoading ? '...' : 'APPLY'}</button>
                              )}
                            </div>
                            {couponError && <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700', marginTop: '6px' }}>⚠️ {couponError}</div>}
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '2px dashed #e2e8f0' }}>
                          <span style={{ fontSize: '18px', color: '#0f172a', fontWeight: '900' }}>Total Payable</span>
                          <div style={{ textAlign: 'right' }}>
                            {(originalTotalPrice > finalTotal || bundleDiscountAmt > 0 || couponDiscountAmt > 0) && (
                              <div style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'line-through', marginBottom: '2px', fontWeight: '700' }}>₹{originalTotalPrice > totalPrice ? originalTotalPrice : totalPrice}</div>
                            )}
                            <div style={{ fontSize: '36px', fontWeight: '950', color: '#4f46e5', lineHeight: '1', letterSpacing: '-1px' }}>₹{isAllEnrolled ? 0 : finalTotal}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '28px' }}>
                        <button 
                          disabled={isProcessing || isAllEnrolled}
                          onClick={async () => {
                            try {
                              if (selectedList.length === 0) { alert('Select at least one course'); return }
                              setIsProcessing(true)
                              const res = await fetch(`/api/bundle-offerings/${activeBundle.id}/create-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buyAll: selectedList.length === activeBundle.courses.length, accessType: effectiveAccessType, selectedCourseIds: selectedList, perCourseAccessTypes: bundleSelectedForPurchase, couponCode: couponApplied?.code || null }) })
                              const data = await res.json()
                              if (!res.ok) { alert(data.error || 'Failed to create order'); setIsProcessing(false); return }
                              if (data.freeCheckout) {
                                setSuccessOrderId(data.orderId || 'FREE'); setPurchasedCourse({ courseName: data.bundleName, accessType: 'MIXED' }); setShowBundleModal(false); setIsProcessing(false); return
                              }
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
                          }} 
                          style={{ 
                            width: '100%', 
                            padding: '18px', 
                            borderRadius: '16px', 
                            background: isAllEnrolled ? '#e2e8f0' : 'linear-gradient(135deg, #4f46e5, #6366f1)', 
                            color: '#fff', 
                            fontWeight: '950', 
                            fontSize: '16px', 
                            boxShadow: isAllEnrolled ? 'none' : '0 12px 24px rgba(79, 70, 229, 0.3)', 
                            border: 'none', 
                            cursor: (isProcessing || isAllEnrolled) ? 'not-allowed' : 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: 'scale(1)'
                          }}
                          onMouseOver={(e) => { if (!isProcessing && !isAllEnrolled) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(79, 70, 229, 0.4)'; } }}
                          onMouseOut={(e) => { if (!isProcessing && !isAllEnrolled) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(79, 70, 229, 0.3)'; } }}
                        >
                          {isProcessing ? 'Processing...' : (isAllEnrolled ? 'ALREADY ENROLLED' : (finalTotal === 0 ? 'ENROLL FREE 🎉' : 'ENROLL NOW'))}
                        </button>
                        {isAllEnrolled && (
                          <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', fontWeight: '700', marginTop: '12px' }}>
                            You already own all selected courses in this bundle.
                          </div>
                        )}
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
                    {courses?.map((course: any) => {
                      const isExisting = activeOfferings?.some((o: any) => o.courseId === course.id);
                      return (
                        <option key={course.id} value={course.id} disabled={isExisting}>
                          {course.name} {isExisting ? '(Already in store)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

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
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
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
                  if (activeOfferings?.some((o: any) => o.courseId === selectedCourse)) {
                    alert('This course is already in the store.')
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
                      alert('Course added to store successfully!')
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

            {/* EDIT TIERED PRICING */}
            {(editBundleData.courseIds?.length || 0) > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '12px' }}>
                  Pricing Tiers (Max 6)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(() => {
                    const savedTiers = JSON.parse(editBundleData.coursePrices || '{}');
                    return Array.from({ length: Math.min(6, editBundleData.courseIds.length) }).map((_, idx) => {
                      const count = idx + 1;
                      const tier = savedTiers[count] || {};
                      return (
                        <div key={count} style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1.5px solid #eef2ff' }}>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ background: '#6366f1', color: '#fff', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>{count}</span>
                            Price for {count} {count === 1 ? 'Course' : 'Courses'}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Recorded (Original / Discount)</div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="number" min={1} placeholder="Orig" value={tier.recordedOriginal || ''} onChange={e => {
                                  const newTiers = { ...savedTiers, [count]: { ...tier, recordedOriginal: e.target.value } };
                                  setEditBundleData({ ...editBundleData, coursePrices: JSON.stringify(newTiers) });
                                }} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e6eefc' }} />
                                <input type="number" min={1} placeholder="Disc" value={tier.recordedDiscount || ''} onChange={e => {
                                  const newTiers = { ...savedTiers, [count]: { ...tier, recordedDiscount: e.target.value } };
                                  setEditBundleData({ ...editBundleData, coursePrices: JSON.stringify(newTiers) });
                                }} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e6eefc' }} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Live (Original / Discount)</div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="number" min={1} placeholder="Orig" value={tier.liveOriginal || ''} onChange={e => {
                                  const newTiers = { ...savedTiers, [count]: { ...tier, liveOriginal: e.target.value } };
                                  setEditBundleData({ ...editBundleData, coursePrices: JSON.stringify(newTiers) });
                                }} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e6eefc' }} />
                                <input type="number" min={1} placeholder="Disc" value={tier.liveDiscount || ''} onChange={e => {
                                  const newTiers = { ...savedTiers, [count]: { ...tier, liveDiscount: e.target.value } };
                                  setEditBundleData({ ...editBundleData, coursePrices: JSON.stringify(newTiers) });
                                }} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e6eefc' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    });
                  })()}
                </div>
              </div>
            )}

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

            {/* Fixed Bundle Toggle */}
            <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e0e7ff' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>🔒 Fixed Bundle</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Users must buy all courses together (no individual selection)</div>
                </div>
                <input type="checkbox" checked={editBundleData.allowIndividualPurchase === false} onChange={e => setEditBundleData({ ...editBundleData, allowIndividualPurchase: !e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#6366f1' }} />
              </label>
            </div>

            {/* Force Class Type Configuration */}
            {editBundleData.allowIndividualPurchase === false && (
              <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e0e7ff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>🎯 Force Class Type</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Force users to buy a specific class type (Live or Recorded)</div>
                  </div>
                </div>
                <select 
                  value={editBundleData.forceClassType || ''} 
                  onChange={e => setEditBundleData({ ...editBundleData, forceClassType: e.target.value === '' ? null : e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
                >
                  <option value="">Let user choose (Live or Recorded)</option>
                  <option value="RECORDED">Force Recorded Classes</option>
                  <option value="LIVE">Force Live Classes</option>
                </select>
              </div>
            )}

            {/* Bundle Discount Configuration */}
            <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '12px', background: '#fefce8', border: '1px solid #fde68a' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: editBundleData.enableBundleDiscount ? '14px' : 0 }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#92400e' }}>🏷️ Bundle Discount</div>
                  <div style={{ fontSize: '12px', color: '#a16207', marginTop: '2px' }}>Apply a discount when users buy from this bundle</div>
                </div>
                <input type="checkbox" checked={!!editBundleData.enableBundleDiscount} onChange={e => setEditBundleData({ ...editBundleData, enableBundleDiscount: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#f59e0b' }} />
              </label>
              {editBundleData.enableBundleDiscount && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#92400e', display: 'block', marginBottom: '4px' }}>Discount Type</label>
                      <select value={editBundleData.bundleDiscountType || 'PERCENTAGE'} onChange={e => setEditBundleData({ ...editBundleData, bundleDiscountType: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '13px' }}>
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FIXED">Fixed Amount (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#92400e', display: 'block', marginBottom: '4px' }}>Discount Value</label>
                      <input type="number" min={0} value={editBundleData.bundleDiscountValue ?? ''} onChange={e => setEditBundleData({ ...editBundleData, bundleDiscountValue: e.target.value })} placeholder={editBundleData.bundleDiscountType === 'FIXED' ? '₹ Amount' : '% Off'} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#92400e', display: 'block', marginBottom: '4px' }}>Applies To</label>
                      <select value={editBundleData.bundleDiscountApplicability || 'BOTH'} onChange={e => setEditBundleData({ ...editBundleData, bundleDiscountApplicability: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '13px' }}>
                        <option value="BOTH">Both (Recorded + Live)</option>
                        <option value="RECORDED">Recorded Only</option>
                        <option value="LIVE">Live Only</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: '18px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={editBundleData.requireAllCourses !== false} onChange={e => setEditBundleData({ ...editBundleData, requireAllCourses: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#f59e0b' }} />
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#92400e' }}>Only when all courses selected</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
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

      {/* CREATE BUNDLE MODAL */}
      {showCreateBundleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }} onClick={() => setShowCreateBundleModal(false)}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '600px',
            boxShadow: '0 0 100px rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '40px', maxHeight: '90vh', overflowY: 'auto',
            animation: 'modalSlideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e1e3a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                  Create Bundle 📦
                </h2>
                <p style={{ fontSize: '15px', color: '#64748b', fontWeight: '500', lineHeight: '1.5' }}>
                  Group multiple courses into a single package.
                </p>
              </div>
              <button onClick={() => setShowCreateBundleModal(false)} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Bundle Name</label>
              <input value={bundleName} onChange={e => setBundleName(e.target.value)} placeholder="E.g., Complete Developer Bootcamp" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #dbeafe', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Bundle Description</label>
              <textarea value={bundleDescription} onChange={e => setBundleDescription(e.target.value)} placeholder="Tell students what's included in this bundle..." rows={3} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #dbeafe', fontSize: '14px', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Courses Start From (₹)</label>
              <input type="number" value={bundleStartingPrice} onChange={e => setBundleStartingPrice(e.target.value)} placeholder="E.g., 499" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #dbeafe', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Select Courses</label>
              <div style={{ maxHeight: '160px', overflow: 'auto', padding: '12px', borderRadius: '10px', border: '1.5px solid #eef2ff', background: '#f8fafc' }}>
                {(courses || []).map((c: any) => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={bundleSelectedCourses.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) setBundleSelectedCourses([...bundleSelectedCourses, c.id])
                        else setBundleSelectedCourses(bundleSelectedCourses.filter(id => id !== c.id))
                      }}
                      style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
                    />
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{c.name}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* TIERED PRICING (MODAL DYNAMIC FIELDS) */}
            {bundleSelectedCourses.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '12px' }}>
                  Pricing Tiers (Max 6)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Array.from({ length: Math.min(6, bundleSelectedCourses.length) }).map((_, idx) => {
                    const count = idx + 1;
                    return (
                      <div key={count} style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1.5px solid #eef2ff' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: '#6366f1', color: '#fff', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>{count}</span>
                          Price for {count} {count === 1 ? 'Course' : 'Courses'}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Recorded (Original / Discount)</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input type="number" min={1} placeholder="Orig" value={bundleTierPrices[count]?.recordedOriginal || ''} onChange={e => setBundleTierPrices({...bundleTierPrices, [count]: {...bundleTierPrices[count], recordedOriginal: e.target.value}})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e6eefc' }} />
                              <input type="number" min={1} placeholder="Disc" value={bundleTierPrices[count]?.recordedDiscount || ''} onChange={e => setBundleTierPrices({...bundleTierPrices, [count]: {...bundleTierPrices[count], recordedDiscount: e.target.value}})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e6eefc' }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Live (Original / Discount)</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input type="number" min={1} placeholder="Orig" value={bundleTierPrices[count]?.liveOriginal || ''} onChange={e => setBundleTierPrices({...bundleTierPrices, [count]: {...bundleTierPrices[count], liveOriginal: e.target.value}})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e6eefc' }} />
                              <input type="number" min={1} placeholder="Disc" value={bundleTierPrices[count]?.liveDiscount || ''} onChange={e => setBundleTierPrices({...bundleTierPrices, [count]: {...bundleTierPrices[count], liveDiscount: e.target.value}})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e6eefc' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '24px', padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e0e7ff' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>🔒 Fixed Bundle</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Users must buy all courses together</div>
                </div>
                <input type="checkbox" checked={!bundleAllowIndividualPurchase} onChange={e => setBundleAllowIndividualPurchase(!e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#6366f1' }} />
              </label>

              {!bundleAllowIndividualPurchase && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>🎯 Force Class Type</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Force users to buy a specific class type (Live or Recorded)</div>
                    </div>
                  </div>
                  <select 
                    value={bundleForceClassType || ''} 
                    onChange={e => setBundleForceClassType(e.target.value === '' ? null : e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
                  >
                    <option value="">Let user choose (Live or Recorded)</option>
                    <option value="RECORDED">Force Recorded Classes</option>
                    <option value="LIVE">Force Live Classes</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowCreateBundleModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #e0e7ff', background: '#f8f9fc', color: '#1e1e3a', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button
                disabled={creating}
                onClick={async () => {
                  if (!bundleName || bundleSelectedCourses.length === 0) { alert('Bundle requires a name and at least one course.'); return }
                  setCreating(true)
                  try {
                    const res = await fetch('/api/bundle-offerings', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: bundleName, description: bundleDescription, courseIds: bundleSelectedCourses,
                        recordedOriginalPrice: bundleTierPrices[bundleSelectedCourses.length]?.recordedOriginal ? Number(bundleTierPrices[bundleSelectedCourses.length].recordedOriginal) : (bundleRecordedOriginalPrice ? Number(bundleRecordedOriginalPrice) : undefined),
                        recordedDiscountPrice: bundleTierPrices[bundleSelectedCourses.length]?.recordedDiscount ? Number(bundleTierPrices[bundleSelectedCourses.length].recordedDiscount) : (bundleRecordedDiscountPrice ? Number(bundleRecordedDiscountPrice) : undefined),
                        liveOriginalPrice: bundleTierPrices[bundleSelectedCourses.length]?.liveOriginal ? Number(bundleTierPrices[bundleSelectedCourses.length].liveOriginal) : (bundleLiveOriginalPrice ? Number(bundleLiveOriginalPrice) : undefined),
                        liveDiscountPrice: bundleTierPrices[bundleSelectedCourses.length]?.liveDiscount ? Number(bundleTierPrices[bundleSelectedCourses.length].liveDiscount) : (bundleLiveDiscountPrice ? Number(bundleLiveDiscountPrice) : undefined),
                        allowIndividualPurchase: !!bundleAllowIndividualPurchase,
                        forceClassType: bundleForceClassType || null,
                        coursePrices: JSON.stringify(bundleTierPrices),
                        startingPrice: bundleStartingPrice ? Number(bundleStartingPrice) : undefined,
                      })
                    })
                    if (res.ok) {
                      setShowCreateBundleModal(false)
                      window.location.reload()
                    } else { alert('Failed to create bundle') }
                  } catch { alert('Error creating bundle') }
                  finally { setCreating(false) }
                }}
                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: creating ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: creating ? 'not-allowed' : 'pointer' }}
              >
                {creating ? 'Creating...' : 'Create Bundle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NOTE MODAL */}
      {showCreateNoteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }} onClick={() => setShowCreateNoteModal(false)}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '500px',
            boxShadow: '0 0 100px rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '40px', maxHeight: '90vh', overflowY: 'auto',
            animation: 'modalSlideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e1e3a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                  {editingNote ? 'Edit Notes 📝' : 'Add Notes 📝'}
                </h2>
                <p style={{ fontSize: '15px', color: '#64748b', fontWeight: '500', lineHeight: '1.5' }}>
                  Upload notes or provide a link for students to access.
                </p>
              </div>
              <button onClick={() => { setShowCreateNoteModal(false); setEditingNote(null) }} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Note Title</label>
              <input id="noteTitleInput" placeholder="E.g., Physics Chapter 1 Notes" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #dbeafe', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Description (Optional)</label>
              <textarea id="noteDescInput" rows={3} placeholder="Brief description of these notes..." style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #dbeafe', fontSize: '14px', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Link (Google Drive, Notion, etc.)</label>
              <input id="noteLinkInput" type="url" placeholder="https://..." style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #dbeafe', fontSize: '14px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Price (₹)</label>
                <input id="notePriceInput" type="number" min={0} placeholder="0 for Free" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #dbeafe', fontSize: '14px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowCreateNoteModal(false); setEditingNote(null) }} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #e0e7ff', background: '#f8f9fc', color: '#1e1e3a', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={async () => {
                  const title = (document.getElementById('noteTitleInput') as HTMLInputElement).value
                  const desc = (document.getElementById('noteDescInput') as HTMLTextAreaElement).value
                  const link = (document.getElementById('noteLinkInput') as HTMLInputElement).value
                  const price = (document.getElementById('notePriceInput') as HTMLInputElement).value
                  if (!title || !link) { alert('Title and Link are required'); return }

                  setCreating(true)
                  try {
                    const method = editingNote ? 'PUT' : 'POST'
                    const url = editingNote ? `/api/store/notes/${editingNote.id}` : '/api/store/notes'
                    const res = await fetch(url, {
                      method, headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ title, description: desc, fileUrl: link, price: Number(price) || 0 })
                    })
                    if (res.ok) { window.location.reload() }
                    else { alert(editingNote ? 'Failed to update notes' : 'Failed to add notes') }
                  } catch { alert('Error saving notes') }
                  finally { setCreating(false) }
                }}
                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
              >
                {editingNote ? 'Save Changes' : 'Create Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MENTORSHIP MODAL */}
      {showCreateMentorshipModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }} onClick={() => setShowCreateMentorshipModal(false)}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '500px',
            boxShadow: '0 0 100px rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '40px', maxHeight: '90vh', overflowY: 'auto',
            animation: 'modalSlideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e1e3a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                  {editingMentorship ? 'Edit Mentorship 🤝' : 'Create Mentorship 🤝'}
                </h2>
                <p style={{ fontSize: '15px', color: '#64748b', fontWeight: '500', lineHeight: '1.5' }}>
                  Set up 1-on-1 mentorship slots for students to book.
                </p>
              </div>
              <button onClick={() => { setShowCreateMentorshipModal(false); setEditingMentorship(null) }} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                ✕
              </button>
            </div>

            {/* MENTOR SELECTION */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Assign Mentor (Staff)</label>
              <select id="mentorIdInput" defaultValue={editingMentorship?.mentorId || ''} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #dbeafe', fontSize: '14px', background: '#fff' }}>
                <option value="">Select a Mentor...</option>
                {staffData?.staff?.filter((s: any) => s.role === 'ADMIN' || s.role === 'MANAGER').map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Mentor Display Name</label>
              <input id="mentorNameInput" defaultValue={editingMentorship?.mentorName || ''} placeholder="E.g., John Doe" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #dbeafe', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Mentor Title / Tagline</label>
              <input id="mentorTitleInput" defaultValue={editingMentorship?.mentorTitle || 'IIT Mentorship Specialist'} placeholder="E.g., IIT Mentorship Specialist" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #dbeafe', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Description</label>
              <textarea id="mentorDescInput" defaultValue={editingMentorship?.description || ''} rows={3} placeholder="What will this mentorship cover?" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #dbeafe', fontSize: '14px', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Price Per Slot (₹)</label>
                <input id="mentorPriceInput" defaultValue={editingMentorship?.pricePerSlot || ''} type="number" min={1} placeholder="E.g., 500" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #dbeafe', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>Slot Duration (min)</label>
                <select id="mentorDurationInput" defaultValue={editingMentorship?.slotDuration || '30'} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #dbeafe', fontSize: '14px', backgroundColor: '#fff' }}>
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowCreateMentorshipModal(false); setEditingMentorship(null) }} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #e0e7ff', background: '#f8f9fc', color: '#1e1e3a', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={async () => {
                  const mentorId = (document.getElementById('mentorIdInput') as HTMLSelectElement).value
                  const mentorName = (document.getElementById('mentorNameInput') as HTMLInputElement).value
                  const mentorTitle = (document.getElementById('mentorTitleInput') as HTMLInputElement).value
                  const desc = (document.getElementById('mentorDescInput') as HTMLTextAreaElement).value
                  const price = (document.getElementById('mentorPriceInput') as HTMLInputElement).value
                  const duration = (document.getElementById('mentorDurationInput') as HTMLSelectElement).value
                  if (!mentorName || !price || !duration) { alert('Name, Price, and Duration are required'); return }

                  setCreating(true)
                  try {
                    const method = editingMentorship ? 'PUT' : 'POST'
                    const url = editingMentorship ? `/api/store/mentorships/${editingMentorship.id}` : '/api/store/mentorships'
                    const res = await fetch(url, {
                      method, headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ mentorId, mentorName, mentorTitle, description: desc, pricePerSlot: Number(price), slotDuration: Number(duration) })
                    })
                    if (res.ok) { window.location.reload() }
                    else { alert(editingMentorship ? 'Failed to update mentorship' : 'Failed to add mentorship') }
                  } catch { alert('Error saving mentorship') }
                  finally { setCreating(false) }
                }}
                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
              >
                {editingMentorship ? 'Save Changes' : 'Create Mentorship'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MENTORSHIP BOOKING MODAL */}
      {showMentorshipBookingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowMentorshipBookingModal(null)}>
          <div style={{ background: '#fff', borderRadius: '32px', padding: '24px', width: '95%', maxWidth: '480px', animation: 'modalSlideUp 0.3s ease-out', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowMentorshipBookingModal(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>Book Session with {showMentorshipBookingModal.mentorName}</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '5px 10px', borderRadius: '8px', fontWeight: '700' }}>⏱️ {showMentorshipBookingModal.slotDuration} mins / slot</span>
                <span style={{ fontSize: '12px', color: '#b45309', background: '#fef3c7', padding: '5px 10px', borderRadius: '8px', fontWeight: '700' }}>💰 ₹{showMentorshipBookingModal.pricePerSlot} / slot</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '10px', color: '#1e293b' }}>1. Select Date</label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                {Array.from(new Set(JSON.parse(showMentorshipBookingModal.availableSlots || '[]').map((s: any) => s.date))).sort().map((d: any) => {
                  const isSelected = mentorshipBookingDate === d;
                  return (
                    <button
                      key={d}
                      onClick={() => { setMentorshipBookingDate(d); setMentorshipBookingTimes([]) }}
                      style={{
                        padding: '10px 16px', borderRadius: '12px', border: isSelected ? '2px solid #f59e0b' : '2px solid #e2e8f0',
                        background: isSelected ? '#fffbeb' : '#fff', color: isSelected ? '#92400e' : '#64748b',
                        fontWeight: '800', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
                      }}
                    >
                      {new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', marginBottom: '10px', color: '#1e293b' }}>
                2. Choose Time Slots <span style={{ fontWeight: '500', color: '#64748b', fontSize: '11px' }}>(Multi-select)</span>
              </label>
              {!mentorshipBookingDate ? (
                <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: '600', border: '2px dashed #e2e8f0' }}>
                  Please select a date first
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                  {(() => {
                    const now = new Date();
                    const slots = JSON.parse(showMentorshipBookingModal.availableSlots || '[]')
                      .filter((s: any) => s.date === mentorshipBookingDate)
                      .sort((a: any, b: any) => a.time.localeCompare(b.time));
                    
                    if (slots.length === 0) return <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No slots available for this day.</p>;

                    return slots.map((s: any) => {
                      const [h, m] = s.time.split(':').map(Number);
                      const startTime = new Date(`${s.date}T${s.time}:00`);
                      const isPast = startTime < now;
                      const booked = showMentorshipBookingModal.bookings?.some((b: any) => b.slotDate === s.date && b.slotTime === s.time && b.status === 'PAID');
                      
                      // Calculate End Time
                      const totalMins = h * 60 + m + (showMentorshipBookingModal.slotDuration || 30);
                      const endH = Math.floor(totalMins / 60) % 24;
                      const endM = totalMins % 60;
                      const timeInterval = `${s.time} - ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                      
                      const isSelected = mentorshipBookingTimes.includes(s.time);
                      const disabled = booked || isPast;

                      return (
                        <button
                          key={s.time}
                          disabled={disabled}
                          onClick={() => {
                            if (isSelected) setMentorshipBookingTimes(mentorshipBookingTimes.filter(t => t !== s.time))
                            else setMentorshipBookingTimes([...mentorshipBookingTimes, s.time])
                          }}
                          style={{
                            padding: '10px', borderRadius: '14px', border: isSelected ? '2px solid #f59e0b' : '2px solid #e2e8f0',
                            background: isSelected ? '#fffbeb' : (disabled ? '#f1f5f9' : '#fff'),
                            color: isSelected ? '#92400e' : (disabled ? '#cbd5e1' : '#334155'),
                            fontWeight: '800', fontSize: '12.5px', cursor: disabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s', position: 'relative'
                          }}
                        >
                          {timeInterval}
                          {booked && <div style={{ fontSize: '8px', color: '#ef4444', marginTop: '2px' }}>BOOKED</div>}
                          {isPast && !booked && <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '2px' }}>PAST</div>}
                        </button>
                      )
                    });
                  })()}
                </div>
              )}
            </div>

            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '24px', border: '1.5px solid #e2e8f0' }}>
              {/* Mentorship Note */}
              <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'rgba(54,54,232,0.05)', borderRadius: '14px', border: '1px solid rgba(54,54,232,0.1)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px' }}>📧</span>
                <p style={{ fontSize: '11.5px', color: '#4b5563', margin: 0, lineHeight: '1.4', fontWeight: '600' }}>
                  <strong>Note:</strong> A Google Meet invite will be sent to your email after payment. Access it in the <span style={{ color: '#3636e8' }}>"Live Sessions"</span> tab or Calendar.
                </p>
              </div>

              {/* STUDENT QUESTION FIELD */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>Questions for Mentor (Optional)</label>
                <textarea 
                  id="userQuestionInput"
                  placeholder="e.g. JEE Main Strategy, specific doubts, etc."
                  style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '13px', color: '#1e293b', minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>Total Selected</div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{mentorshipBookingTimes.length} slots for {mentorshipBookingDate ? new Date(mentorshipBookingDate).toLocaleDateString() : '...'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Amount</div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#f59e0b' }}>₹{mentorshipBookingTimes.length * showMentorshipBookingModal.pricePerSlot}</div>
                </div>
              </div>

              <button 
                disabled={isProcessing || mentorshipBookingTimes.length === 0}
                onClick={async () => {
                  if (!mentorshipBookingDate || mentorshipBookingTimes.length === 0) { alert('Please select at least one time slot.'); return }
                  setIsProcessing(true)
                  try {
                    const res = await fetch(`/api/store/mentorships/${showMentorshipBookingModal.id}/create-order`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ slotDate: mentorshipBookingDate, slotTimes: mentorshipBookingTimes })
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error)
                    if (data.isFree) {
                      setShowMentorshipBookingModal(null)
                      alert('Booking confirmed!')
                      setIsProcessing(false)
                      window.location.reload()
                      return
                    }
                    const options = {
                      key: data.key,
                      amount: data.amount,
                      currency: 'INR',
                      name: 'GenZ IITian',
                      description: `Mentorship Booking (${mentorshipBookingTimes.length} slots)`,
                      order_id: data.razorpayOrderId,
                      handler: async function (response: any) {
                        try {
                          const verifyRes = await fetch(`/api/store/mentorships/${showMentorshipBookingModal.id}/verify-payment`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              razorpay_order_id: response.razorpay_order_id,
                              razorpay_payment_id: response.razorpay_payment_id,
                              razorpay_signature: response.razorpay_signature
                            })
                          })
                          if (verifyRes.ok) {
                            setShowMentorshipBookingModal(null)
                            alert('Mentorship Booking Confirmed!')
                            window.location.reload()
                          } else { alert('Payment verification failed') }
                        } catch { alert('Payment verification failed') }
                        finally { setIsProcessing(false) }
                      },
                      modal: { ondismiss: () => setIsProcessing(false) }
                    }
                    setIsProcessing(false)
                    const rzp = new (window as any).Razorpay(options)
                    rzp.open()
                  } catch (e: any) {
                    setIsProcessing(false)
                    alert(e.message || 'Error processing')
                  }
                }} 
                style={{ 
                  width: '100%', padding: '18px', 
                  background: (isProcessing || mentorshipBookingTimes.length === 0) ? '#e2e8f0' : 'linear-gradient(135deg, #f59e0b, #d97706)', 
                  color: (isProcessing || mentorshipBookingTimes.length === 0) ? '#94a3b8' : 'white', 
                  fontWeight: '900', fontSize: '16px', borderRadius: '16px', border: 'none', 
                  cursor: (isProcessing || mentorshipBookingTimes.length === 0) ? 'not-allowed' : 'pointer',
                  boxShadow: (isProcessing || mentorshipBookingTimes.length === 0) ? 'none' : '0 10px 20px rgba(245, 158, 11, 0.3)',
                  textTransform: 'uppercase', letterSpacing: '0.05em'
                }}
              >
                {isProcessing ? 'Processing...' : (mentorshipBookingTimes.length === 0 ? 'Select a slot to proceed' : `Confirm & Pay ₹${mentorshipBookingTimes.length * showMentorshipBookingModal.pricePerSlot}`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE SLOTS MODAL */}
      {showManageSlotsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowManageSlotsModal(null)}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '480px', animation: 'modalSlideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>Manage Time Slots</h3>
              <button onClick={() => setShowManageSlotsModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}>✕</button>
            </div>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>Mentorship with {showManageSlotsModal.mentorName} ({showManageSlotsModal.slotDuration} mins)</p>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Add New Slot</h4>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Date</label>
                  <input type="date" value={manageSlotsDate} onChange={e => setManageSlotsDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Time</label>
                  <input type="time" value={manageSlotsTime} onChange={e => setManageSlotsTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <button onClick={() => {
                  if (!manageSlotsDate || !manageSlotsTime) return;
                  if (editingSlots.some(s => s.date === manageSlotsDate && s.time === manageSlotsTime)) return;
                  setEditingSlots([...editingSlots, { date: manageSlotsDate, time: manageSlotsTime }]);
                  setManageSlotsTime('');
                }} style={{ padding: '10px 16px', background: '#3b82f6', color: '#fff', borderRadius: '8px', fontWeight: '700', border: 'none' }}>Add</button>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Available Slots</h4>
              {editingSlots.length === 0 ? <p style={{ fontSize: '13px', color: '#64748b' }}>No slots added yet.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {editingSlots.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).map((slot, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>
                        {new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {slot.time}
                      </div>
                      <button onClick={() => {
                        setEditingSlots(editingSlots.filter((_, i) => i !== idx))
                      }} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              disabled={isProcessing}
              onClick={async () => {
                setIsProcessing(true)
                try {
                  const res = await fetch(`/api/store/mentorships/${showManageSlotsModal.id}/slots`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slots: editingSlots })
                  })
                  if (!res.ok) throw new Error('Failed to update slots')
                  setShowManageSlotsModal(null)
                  window.location.reload()
                } catch (e: any) {
                  alert(e.message || 'Error updating slots')
                } finally {
                  setIsProcessing(false)
                }
              }} 
              style={{ width: '100%', padding: '14px', background: '#1e293b', color: 'white', fontWeight: '700', borderRadius: '12px', border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
              {isProcessing ? 'Saving...' : 'Save Slots'}
            </button>
          </div>
        </div>
      )}

      {/* MANAGE ALL BOOKINGS MODAL (Manager Only) */}
      {showManageBookingsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={() => setShowManageBookingsModal(null)}>
          <div style={{ background: '#fff', borderRadius: '32px', padding: '40px', width: '100%', maxWidth: '900px', maxHeight: '85vh', overflow: 'auto', animation: 'modalSlideUp 0.3s ease-out', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowManageBookingsModal(null)} style={{ position: 'absolute', top: '30px', right: '30px', background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            
            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', marginBottom: '16px' }}>All Mentorship Bookings</h3>
            
            <div style={{ marginBottom: '24px' }}>
              <input 
                type="text" 
                placeholder="Filter by student, mentor, or date (YYYY-MM-DD)..." 
                value={bookingSearchQuery}
                onChange={(e) => setBookingSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '14px 20px', borderRadius: '18px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#fcfcfd' }}
              />
            </div>

            {loadingAllBookings ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading bookings...</div>
            ) : allBookingsData.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '20px' }}>No bookings found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 2fr', gap: '12px', padding: '0 16px', fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                  <span>Student / Mentor</span>
                  <span>Date</span>
                  <span>Time</span>
                  <span>Status</span>
                  <span>Actions / Meeting Link</span>
                </div>
                {allBookingsData
                  .filter(b => 
                    b.user?.name?.toLowerCase().includes(bookingSearchQuery.toLowerCase()) || 
                    b.mentorship?.mentorName?.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
                    b.slotDate?.includes(bookingSearchQuery)
                  )
                  .map((b: any) => (
                    <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 2fr', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '20px', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '14px', color: '#1e293b' }}>{b.user?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Mentor: {b.mentorship?.mentorName}</div>
                        {b.userQuestion && <div style={{ fontSize: '11px', color: '#3636e8', fontWeight: '600', marginTop: '4px' }}>Q: {b.userQuestion}</div>}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700' }}>{b.slotDate}</div>
                      <div style={{ fontSize: '13px', fontWeight: '700' }}>{b.slotTime}</div>
                      <div>
                        <span style={{ padding: '4px 10px', borderRadius: '50px', background: b.status === 'PAID' ? '#d1fae5' : '#fef2f2', color: b.status === 'PAID' ? '#059669' : '#dc2626', fontSize: '11px', fontWeight: '800' }}>{b.status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {editingBookingLink === b.id ? (
                          <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                            <input id={`link-input-${b.id}`} defaultValue={b.meetLink || ''} placeholder="Meet Link" style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #3636e8', fontSize: '13px' }} />
                            <button onClick={async () => {
                              const link = (document.getElementById(`link-input-${b.id}`) as HTMLInputElement)?.value;
                              try {
                                const res = await fetch(`/api/store/mentorships/bookings/${b.id}`, {
                                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ meetLink: link })
                                })
                                if (res.ok) {
                                  setAllBookingsData(allBookingsData.map(item => item.id === b.id ? { ...item, meetLink: link } : item))
                                  setEditingBookingLink(null)
                                } else alert('Failed to update')
                              } catch { alert('Error updating') }
                            }} style={{ padding: '8px 12px', borderRadius: '10px', background: '#3636e8', color: '#fff', border: 'none', fontWeight: '700', fontSize: '12px' }}>Save</button>
                          </div>
                        ) : (
                          <>
                            <div style={{ flex: 1, fontSize: '12px', color: b.meetLink ? '#3636e8' : '#94a3b8', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.meetLink || 'No link'}</div>
                            <button onClick={() => setEditingBookingLink(b.id)} style={{ padding: '6px 12px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '700', fontSize: '11px' }}>Edit</button>
                            {(userData?.user?.role === 'MANAGER' || userData?.role === 'MANAGER') && (
                              <button onClick={async () => {
                                if (!confirm('Cancel this booking?')) return
                                try {
                                  const res = await fetch(`/api/store/mentorships/bookings/${b.id}`, { method: 'DELETE' })
                                  if (res.ok) setAllBookingsData(allBookingsData.filter(item => item.id !== b.id))
                                  else alert('Failed')
                                } catch { alert('Error') }
                              }} style={{ padding: '6px 12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: '700', fontSize: '11px' }}>Cancel</button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANUAL BOOKING MODAL (Manager Only) */}
      {showManualBookingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={() => { setShowManualBookingModal(false); setStudentSearchQuery(''); }}>
          <div style={{ background: '#fff', borderRadius: '32px', padding: '40px', width: '100%', maxWidth: '500px', animation: 'modalSlideUp 0.3s ease-out', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowManualBookingModal(false); setStudentSearchQuery(''); }} style={{ position: 'absolute', top: '30px', right: '30px', background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', marginBottom: '24px' }}>Manual Booking</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Select Student</label>
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #f1f5f9', marginBottom: '10px', fontSize: '14px', outline: 'none' }}
              />
              <select id="manualStudentInput" style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', background: '#fff', fontSize: '14px' }}>
                <option value="">{studentSearchQuery ? 'Matching students...' : 'Choose student...'}</option>
                {allStudentsData
                  .filter(s => 
                    s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
                    s.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
                  )
                  .map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
              </select>
              {studentSearchQuery && allStudentsData.filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || s.email.toLowerCase().includes(studentSearchQuery.toLowerCase())).length === 0 && (
                <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', fontWeight: '600' }}>No students found matching "{studentSearchQuery}"</div>
              )}
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Select Mentorship Offering</label>
              <select id="manualMentorshipInput" onChange={async (e) => {
                const mid = e.target.value;
                if (!mid) { setManualAvailableSlots([]); return; }
                setLoadingManualSlots(true);
                try {
                  const res = await fetch(`/api/store/mentorships/${mid}/slots`);
                  const data = await res.json();
                  setManualAvailableSlots(data.slots || []);
                } catch { alert('Error fetching slots'); }
                finally { setLoadingManualSlots(false); }
              }} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9' }}>
                <option value="">Choose mentorship...</option>
                {mentorshipsData?.mentorships?.map((m: any) => <option key={m.id} value={m.id}>{m.mentorName}</option>)}
              </select>
            </div>

            {manualAvailableSlots.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#3636e8', marginBottom: '8px', textTransform: 'uppercase' }}>Pick an Existing Slot</label>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {manualAvailableSlots.map((s, idx) => (
                    <button key={idx} onClick={() => {
                      (document.getElementById('manualDateInput') as HTMLInputElement).value = s.date;
                      (document.getElementById('manualTimeInput') as HTMLInputElement).value = s.time;
                    }} style={{ padding: '8px 12px', borderRadius: '10px', background: '#eef2ff', border: '1.5px solid #dbeafe', fontSize: '12px', fontWeight: '700', color: '#3636e8', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      {s.date} {s.time}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Date</label>
                <input id="manualDateInput" type="date" style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Time (HH:MM)</label>
                <input id="manualTimeInput" type="time" style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9' }} />
              </div>
            </div>
            <button onClick={async () => {
              const studentId = (document.getElementById('manualStudentInput') as HTMLSelectElement).value;
              const mentorshipId = (document.getElementById('manualMentorshipInput') as HTMLSelectElement).value;
              const date = (document.getElementById('manualDateInput') as HTMLInputElement).value;
              const time = (document.getElementById('manualTimeInput') as HTMLInputElement).value;
              if (!studentId || !mentorshipId || !date || !time) return alert('All fields required')
              try {
                const res = await fetch('/api/store/mentorships/manual-book', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ studentId, mentorshipId, date, time })
                })
                if (res.ok) { alert('Success!'); setShowManualBookingModal(false); window.location.reload() }
                else alert('Failed')
              } catch { alert('Error') }
            }} style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#1e293b', color: '#fff', fontWeight: '800', border: 'none', cursor: 'pointer' }}>Create Booking</button>
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
