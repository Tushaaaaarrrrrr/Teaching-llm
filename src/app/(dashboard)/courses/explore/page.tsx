'use client'

import { useState } from 'react'
import Script from 'next/script'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ExploreCoursesPage() {
  const router = useRouter()
  const { data: offerings, error, isLoading } = useSWR('/api/course-offerings', fetcher, {
    revalidateOnFocus: false,
  })
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null)

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
        return
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'GenZ IItian',
        description: `Purchase ${data.offeringName} (${accessType})`,
        order_id: data.razorpayOrderId,
        prefill: {
          name: data.userName || '',
          email: data.userEmail || '',
        },
        theme: { color: '#6366f1' },
        handler: async (response: any) => {
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
            } else {
              alert('Verification failed: ' + verifyData.error)
            }
          } catch {
            alert('Payment verification failed. Please contact support.')
          } finally {
            setPurchasing(null)
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
      <div style={{ textAlign: 'center', marginBottom: '48px', paddingTop: '16px' }}>
        <h1 style={{
          fontSize: '32px', fontWeight: '900', color: '#1e1e3a',
          marginBottom: '12px', letterSpacing: '-0.02em'
        }}>
          GenZ IITian Official Store
        </h1>
        <p style={{
          fontSize: '15px', color: '#9999b0', fontWeight: '500',
          maxWidth: '500px', margin: '0 auto', lineHeight: '1.6'
        }}>
          Buy Courses From <a href="https://app.genziitian.in/courses" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>app.genziitian.in/courses</a>
        </p>
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
                <h3 style={{
                  fontSize: '18px', fontWeight: '800', color: '#1e1e3a',
                  marginBottom: '6px', lineHeight: '1.3',
                }}>
                  {offering.name}
                </h3>
                {offering.course?.name && (
                  <span style={{
                    display: 'inline-block', padding: '3px 12px', borderRadius: '50px',
                    background: (offering.course?.color || '#6366f1') + '18',
                    color: offering.course?.color || '#6366f1',
                    fontSize: '11px', fontWeight: '700', marginBottom: '12px',
                    alignSelf: 'flex-start',
                  }}>
                    {offering.course.name}
                  </span>
                )}
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

      {/* Success Modal */}
      {successOrderId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001,
          padding: '20px'
        }} onClick={() => { setSuccessOrderId(null); router.push('/courses') }}>
          <div style={{
            background: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '440px',
            boxShadow: '0 0 100px rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '40px', textAlign: 'center',
            animation: 'modalSlideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Purchase Successful!</h2>
            <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
              Your course access has been activated. You can now start learning right away!
            </p>
            {successOrderId !== 'FREE-ENROLLMENT' && successOrderId !== 'SUCCESS' && (
              <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1.5px solid #bbf7d0' }}>
                <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Order ID</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#15803d', fontFamily: 'monospace' }}>{successOrderId}</div>
              </div>
            )}
            <button
              onClick={() => { setSuccessOrderId(null); router.push('/courses') }}
              style={{
                width: '100%', padding: '16px', borderRadius: '18px', border: 'none',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
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
      `}</style>
    </div>
  )
}
