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
  const { data: courses } = useSWR('/api/courses', fetcher, { revalidateOnFocus: false })
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null)
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [purchasedCourse, setPurchasedCourse] = useState<any>(null)
  
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

  const handlePurchase = async (offeringId: string, accessType: 'RECORDED' | 'LIVE') => {
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
                courseTier: accessType === 'LIVE' ? 'Live + Recorded (Pro)' : 'Recorded (General)'
              })
            } else {
              alert('Verification failed: ' + verifyData.error)
            }
          } catch {
            alert('Payment verification failed. Please contact support.')
          } finally {
            setPurchasing(null)
            setVerifyingPayment(false)
          }
        },
        modal: {
          ondismiss: () => setPurchasing(null),
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      alert(err.message)
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

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px', paddingTop: '16px' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: '32px', fontWeight: '900', color: '#1e1e3a',
            marginBottom: '12px', letterSpacing: '-0.02em'
          }}>
            GenZ IITian Official Store
          </h1>
          <p style={{
            fontSize: '15px', color: '#9999b0', fontWeight: '500',
            lineHeight: '1.6', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            You can also buy courses from
            <a href="https://app.genziitian.in/courses" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none', backgroundColor: '#6366f1', padding: '4px 12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'inline-block', transition: 'all 0.2s', fontSize: '12px' }}>
              Visit Here
            </a>
          </p>
        </div>

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
        {activeOfferings.map((offering: any) => {
          const discountRecorded = offering.recordedOriginalPrice > 0
            ? Math.round((1 - offering.recordedDiscountPrice / offering.recordedOriginalPrice) * 100)
            : 0
          const discountLive = offering.liveOriginalPrice > 0
            ? Math.round((1 - offering.liveDiscountPrice / offering.liveOriginalPrice) * 100)
            : 0

          return (
            <div
              key={offering.id}
              style={{
                background: '#e8eaf0',
                borderRadius: '28px',
                boxShadow: '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-6px)'
                e.currentTarget.style.boxShadow = '12px 12px 24px #bdbfc7, -12px -12px 24px #ffffff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff'
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

                {/* Best seller badge */}
                <div style={{
                  position: 'absolute', top: '12px', left: '14px',
                  padding: '4px 12px', borderRadius: '20px',
                  background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)',
                  fontSize: '10px', fontWeight: '800', color: '#fff',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  ⭐ Popular
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

                {/* Offering Name - Small */}
                <h3 style={{
                  fontSize: '14px', fontWeight: '700', color: '#6366f1',
                  marginBottom: '8px', lineHeight: '1.3',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {offering.name}
                </h3>

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
                  {/* Recorded Option */}
                  {offering.hasRecorded && (
                    <div style={{
                      padding: '14px 16px', borderRadius: '18px',
                      background: '#e8eaf0',
                      boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#9999b0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                            📹 Recorded Access
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e1e3a' }}>₹{offering.recordedDiscountPrice}</span>
                            {offering.recordedOriginalPrice > offering.recordedDiscountPrice && (
                              <span style={{ fontSize: '13px', color: '#9999b0', textDecoration: 'line-through' }}>₹{offering.recordedOriginalPrice}</span>
                            )}
                          </div>
                        </div>
                        {discountRecorded > 0 && (
                          <div style={{
                            padding: '4px 10px', borderRadius: '20px',
                            background: '#dcfce7', color: '#15803d',
                            fontSize: '10px', fontWeight: '800',
                          }}>
                            {discountRecorded}% OFF
                          </div>
                        )}
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
                        {purchasing === `${offering.id}-RECORDED` ? 'Processing...' : 'Buy Recorded Access'}
                      </button>
                    </div>
                  )}

                  {/* Live Option */}
                  {offering.hasLive && (
                    <div style={{
                      padding: '14px 16px', borderRadius: '18px',
                      background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                      border: '1.5px solid #c7d2fe',
                      position: 'relative', overflow: 'hidden',
                    }}>
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
                            🔴 Live + Recorded
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e1e3a' }}>₹{offering.liveDiscountPrice}</span>
                            {offering.liveOriginalPrice > offering.liveDiscountPrice && (
                              <span style={{ fontSize: '13px', color: '#9999b0', textDecoration: 'line-through' }}>₹{offering.liveOriginalPrice}</span>
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
                        {purchasing === `${offering.id}-LIVE` ? 'Processing...' : '⚡ Buy Live Pro Access'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '12px 22px', marginTop: '10px',
                borderTop: '1.5px solid rgba(0,0,0,0.05)',
                display: 'flex', justifyContent: 'space-between',
                fontSize: '11px', color: '#9999b0', fontWeight: '600',
              }}>
                <span>🕐 Lifetime Access</span>
                <span>✅ Certified</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Offering Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001,
          padding: '20px', overflow: 'auto'
        }} onClick={() => setShowCreateModal(false)}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '600px',
            boxShadow: '0 0 100px rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '40px',
            animation: 'modalSlideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e1e3a', marginBottom: '24px' }}>
              Add Course to Store
            </h2>

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
                📹 Recording Batch - General
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#6b6b8a', marginBottom: '6px' }}>
                    Real Price (₹)
                  </label>
                  <input
                    type="number"
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

            {/* Action Buttons */}
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
                  if (!recordedOriginalPrice && !liveOriginalPrice) {
                    alert('Please enter at least one price (recording or live)')
                    return
                  }
                  setCreating(true)
                  try {
                    const res = await fetch('/api/course-offerings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        courseId: selectedCourse,
                        recordedOriginalPrice: recordedOriginalPrice ? parseInt(recordedOriginalPrice) : 0,
                        recordedDiscountPrice: recordedDiscountPrice ? parseInt(recordedDiscountPrice) : 0,
                        liveOriginalPrice: liveOriginalPrice ? parseInt(liveOriginalPrice) : 0,
                        liveDiscountPrice: liveDiscountPrice ? parseInt(liveDiscountPrice) : 0,
                        tags: tags,
                        hasRecorded: !!(recordedOriginalPrice || recordedDiscountPrice),
                        hasLive: !!(liveOriginalPrice || liveDiscountPrice),
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
      `}</style>
    </div>
  )
}
