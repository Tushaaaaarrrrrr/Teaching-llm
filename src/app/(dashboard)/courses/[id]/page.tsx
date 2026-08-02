'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import MobileCourseDetail from '@/components/courses/MobileCourseDetail'
import { getCourseBackground, getCourseTextColor, getCourseSecondaryTextColor, getCourseBadgeBg, getCourseBadgeText, getCourseDecorativeColor, colorWithOpacity, extractHex, isGradient } from '@/lib/color-utils'

interface ContentItem {
  id: string
  title: string
  description?: string
  videoUrl?: string
  youtubeUrl?: string
  pptUrl?: string
  order: number
}

interface Topic {
  id: string
  title: string
  order: number
  content: ContentItem[]
}

interface CourseDetail {
  id: string
  name: string
  description: string
  subject: string
  color: string
  expiresAt?: string
  teacherName: string
  enrollmentType?: 'LIVE' | 'RECORDED' | null
  liveUpgradePrice?: number | null
  instructorAssignments?: { instructor: { id: string; name: string } }[]
  _count?: { topics: number; lectures: number; materials: number; courseEvents: number }
  courseEvents?: {
    id: string
    title: string
    description: string | null
    startTime: string
    endTime: string
    meetLink: string | null
    type: string
    status: string
    instructor?: { name: string } | null
  }[]
}

interface Exam {
  id: string
  title: string
  description: string | null
  expiresAt: string
  startDate: string | null
  isPublished: boolean
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [activeExam, setActiveExam] = useState<Exam | null>(null)
  const [progressMap, setProgressMap] = useState<Record<string, string>>({})
  const [infoModalCourse, setInfoModalCourse] = useState<CourseDetail | null>(null)
  const [upgradeModalCourse, setUpgradeModalCourse] = useState<CourseDetail | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [showUpgradeHint, setShowUpgradeHint] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isNative, setIsNative] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [courseRes, topicsRes, sessionRes, progressRes] = await Promise.all([
        fetch(`/api/courses/${params.id}`),
        fetch(`/api/courses/${params.id}/topics`),
        fetch('/api/auth/me'),
        fetch(`/api/lectures/progress?courseId=${params.id}`),
      ])
      const courseData = await courseRes.json()
      const topicsData = await topicsRes.json()
      const sessionData = await sessionRes.json()
      const progressData = progressRes.ok ? await progressRes.json() : []

      if (Array.isArray(progressData)) {
        const pMap = progressData.reduce((acc: any, curr: any) => {
          acc[curr.contentId] = curr.status
          return acc
        }, {})
        setProgressMap(pMap)
      }

      setCourse(courseData.course || courseData)
      setTopics(Array.isArray(topicsData) ? topicsData : [])
      setRole(sessionData.user?.role || '')
      setUserId(sessionData.user?.id || '')
      
      // Fetch exams for this course
      const examsRes = await fetch(`/api/exams?courseId=${params.id}`)
      const examsData = await examsRes.json()
      if (Array.isArray(examsData)) {
        const now = new Date()
        const active = examsData
          .filter(e => {
            if (!e.isPublished) return false
            const start = e.startDate ? new Date(e.startDate) : null
            const end = new Date(e.expiresAt)
            return (!start || start <= now) && end > now
          })
          .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0]
        setActiveExam(active || null)
      }

      // Topics start collapsed — user expands on click
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window as any
      setIsNative(!!(w.Capacitor?.isNativePlatform?.() || w.Capacitor?.isNative))
    }
  }, [])

  const updateProgress = async (contentId: string, status: string) => {
    setProgressMap(prev => ({ ...prev, [contentId]: status })) // Optimistic UI update
    try {
      await fetch('/api/lectures/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, status })
      })
    } catch (e) {
      console.error("Failed to update progress", e)
    }
  }

  const toggleTopic = (id: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  
  const handleUnenrollDemo = async () => {
    if (!confirm('Are you sure you want to unenroll from this demo? You will lose access to demo lectures.')) return
    try {
      const res = await fetch(`/api/courses/${params.id}/unenroll`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert('Successfully unenrolled from demo.')
        router.push('/courses')
      } else {
        alert(data.error || 'Failed to unenroll')
      }
    } catch (e: any) {
      alert(e.message || 'Error unenrolling')
    }
  }

  const [upgradeSuccessOrderId, setUpgradeSuccessOrderId] = useState<string | null>(null)

  const handleUpgrade = async (courseId: string) => {
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
          // Step 3: Verify payment and upgrade
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
              fetchData()
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



  if (loading) {
    return (
      <>
        {/* Mobile Skeleton */}
        <div className="course-detail-mobile-only" style={{ paddingBottom: '24px', background: 'var(--bg)', minHeight: '100vh' }}>
          {/* Mobile Hero Cover Skeleton */}
          <div style={{
            height: '240px',
            background: 'var(--skeleton-shine)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
              <div className="skeleton" style={{ width: '40px', height: '18px', borderRadius: '10px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton" style={{ height: '22px', width: '80%', borderRadius: '4px' }} />
              <div className="skeleton" style={{ height: '14px', width: '40%', borderRadius: '4px' }} />
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <div className="skeleton" style={{ height: '12px', width: '60px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ height: '12px', width: '80px', borderRadius: '4px' }} />
              </div>
            </div>
          </div>

          {/* Progress Card Skeleton */}
          <div style={{ margin: '-20px 16px 20px', position: 'relative', zIndex: 10 }}>
            <div style={{
              background: 'var(--surface)',
              borderRadius: '24px',
              padding: '16px 20px',
              boxShadow: '0 12px 30px -10px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div className="skeleton" style={{ height: '12px', width: '60px', borderRadius: '4px' }} />
                  <div className="skeleton" style={{ height: '12px', width: '30px', borderRadius: '4px' }} />
                </div>
                <div className="skeleton" style={{ height: '6px', width: '100%', borderRadius: '3px' }} />
              </div>
            </div>
          </div>

          {/* Mobile Tabs Skeleton */}
          <div style={{
            display: 'flex',
            margin: '0 16px 20px',
            borderRadius: '16px',
            background: 'var(--surface-2)',
            padding: '4px',
            boxShadow: 'inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light)'
          }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center' }}>
                <div className="skeleton" style={{ height: '14px', width: '60px', borderRadius: '4px' }} />
              </div>
            ))}
          </div>

          {/* Curriculum List Skeleton */}
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                background: 'var(--surface)',
                borderRadius: '24px',
                padding: '16px 20px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: '14px', width: '70%', marginBottom: '4px', borderRadius: '4px' }} />
                    <div className="skeleton" style={{ height: '10px', width: '40%', borderRadius: '4px' }} />
                  </div>
                </div>
                <div className="skeleton" style={{ width: '14px', height: '14px', borderRadius: '50%' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Skeleton */}
        <div className="page-container course-detail-desktop-only">
          {/* Header Banner Skeleton */}
          <div className="card" style={{ overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ background: 'var(--skeleton-shine)', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton" style={{ height: '12px', width: '100px', borderRadius: '4px', marginBottom: '12px' }} />
              <div className="skeleton" style={{ height: '28px', width: '250px', borderRadius: '4px', marginBottom: '6px' }} />
              <div className="skeleton" style={{ height: '14px', width: '450px', borderRadius: '4px', marginBottom: '14px' }} />
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="skeleton" style={{ height: '20px', width: '80px', borderRadius: '20px' }} />
                <div className="skeleton" style={{ height: '12px', width: '150px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ height: '20px', width: '180px', borderRadius: '20px' }} />
                <div className="skeleton" style={{ height: '20px', width: '160px', borderRadius: '20px' }} />
              </div>
            </div>
          </div>

          {/* Topics List Skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card" style={{ overflow: 'hidden', padding: '0' }}>
                {/* Topic Header Skeleton */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '12px' }}>
                  <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: '15px', width: '200px', borderRadius: '4px', marginBottom: '4px' }} />
                    <div className="skeleton" style={{ height: '12px', width: '80px', borderRadius: '4px' }} />
                  </div>
                  <div className="skeleton" style={{ width: '16px', height: '16px', borderRadius: '50%' }} />
                </div>

                {/* Topic Expanded Content Skeleton */}
                <div style={{ borderTop: '1px solid #d8dae3', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[1, 2].map((j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 20px', borderRadius: '24px', background: 'var(--surface-2)' }}>
                      <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ height: '14px', width: '180px', borderRadius: '4px', marginBottom: '6px' }} />
                        <div className="skeleton" style={{ height: '11px', width: '240px', borderRadius: '4px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <div className="skeleton" style={{ height: '32px', width: '80px', borderRadius: '50px' }} />
                        <div className="skeleton" style={{ height: '32px', width: '32px', borderRadius: '50%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  if (!course) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p style={{ fontSize: '16px', fontWeight: '500' }}>Course not found</p>
          <Link href="/courses" className="btn btn-primary" style={{ marginTop: '16px' }}>Back to Courses</Link>
        </div>
      </div>
    )
  }

  const isManager = ['MANAGER', 'ADMIN'].includes(role)
  const canManage = isManager

  const isCourseExpired = course.expiresAt && new Date(course.expiresAt).getTime() < new Date().getTime();

  if (isCourseExpired && !isManager) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', background: 'var(--surface)', padding: '40px', borderRadius: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', maxWidth: '500px', width: '100%' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Access Expired</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px' }}>
            Your access to <strong>{course.name}</strong> has expired. You can no longer view the course lectures or materials.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/courses" className="btn btn-ghost" style={{ padding: '12px 24px', borderRadius: '16px', background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: '700' }}>Back to Courses</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    {/* Mobile redesign */}
    <div className="course-detail-mobile-only">
      <MobileCourseDetail
        course={course as any}
        topics={topics as any}
        expandedTopics={expandedTopics}
        toggleTopic={toggleTopic}
        progressMap={progressMap}
        updateProgress={updateProgress}
        role={role}
        setInfoModalCourse={setInfoModalCourse}
        setUpgradeModalCourse={setUpgradeModalCourse}
      />
    </div>
    {/* Desktop layout */}
    <div className="page-container fade-in course-detail-desktop-only">
      {/* Course Header Banner */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: '20px' }}>
        <div 
          onMouseEnter={() => setShowUpgradeHint(true)}
          onMouseLeave={() => setShowUpgradeHint(false)}
          style={{
            background: ['RECORDED', 'FREE', 'DEMO'].includes(course.enrollmentType || '') ? 'linear-gradient(135deg, #6b7280, #9ca3af)' : getCourseBackground(course.color),
            padding: '28px 24px', position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', background: getCourseDecorativeColor(course.color), top: '-60px', right: '40px' }} />
          <div style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', background: getCourseDecorativeColor(course.color), bottom: '-30px', right: '200px' }} />

          {/* Info Button for Recorded users (Top Right) */}
          {course.enrollmentType === 'RECORDED' && course.liveUpgradePrice && !isManager && (
            <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10 }}>
              <button
                onClick={() => setInfoModalCourse(course)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
                  color: '#fff', fontSize: '16px', fontWeight: '800', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s',
                }}
                title={`Compare PRO vs ${['FREE', 'DEMO'].includes(course.enrollmentType || '') ? 'General Batch' : 'PLUS ( Recorded )'}`}
              >
                i
              </button>
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: '0',
                background: 'var(--text-primary)', color: 'var(--text-inverse)', padding: '8px 14px', borderRadius: '12px',
                fontSize: '11px', fontWeight: '600', width: '200px', textAlign: 'center',
                boxShadow: '0 8px 25px rgba(0,0,0,0.4)', pointerEvents: 'none',
                opacity: showUpgradeHint ? 1 : 0, 
                transform: showUpgradeHint ? 'translateY(0)' : 'translateY(5px)',
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', zIndex: 100,
                lineHeight: '1.4'
              }} className="info-tooltip">
                Click here to see difference between PLUS AND PRO batches
                <div style={{ position: 'absolute', bottom: '100%', right: '10px', border: '6px solid transparent', borderBottomColor: 'var(--text-primary)' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <Link href="/courses" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                color: getCourseSecondaryTextColor(course.color), fontSize: '13px', marginBottom: '12px', textDecoration: 'none',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Back to Courses
              </Link>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: getCourseTextColor(course.color), marginBottom: '6px' }}>{course.name}</h1>
              {course.description && (
                <p style={{ color: getCourseSecondaryTextColor(course.color), fontSize: '14px', maxWidth: '600px', lineHeight: '1.5' }}>{course.description}</p>
              )}
              <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                {course.subject && (
                  <span style={{ background: getCourseBadgeBg(course.color), color: getCourseBadgeText(course.color), padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                    {course.subject}
                  </span>
                )}
                <span style={{ color: getCourseSecondaryTextColor(course.color), fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {course._count?.topics || 0} topic{(course._count?.topics !== 1) ? 's' : ''} &middot; {course._count?.lectures || 0} lecture{(course._count?.lectures !== 1) ? 's' : ''} &middot; {course._count?.materials || 0} material{(course._count?.materials !== 1) ? 's' : ''}
                </span>
                {course.expiresAt && (
                  <span style={{ 
                    background: 'rgba(255,165,0,0.2)', 
                    color: '#ffa500', 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    border: '1px solid rgba(255,165,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {(() => {
                      const expiry = new Date(course.expiresAt || '')
                      const diff = expiry.getTime() - new Date().getTime()
                      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
                      return days > 0 ? `Course Access Ends In: ${days} Day${days !== 1 ? 's' : ''}` : 'Course Access Ending Soon'
                    })()}
                  </span>
                )}
                  <span style={{ background: getCourseBadgeBg(course.color), color: getCourseBadgeText(course.color), padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Teacher Name: {course.teacherName}
                  </span>

                {/* Upgrade Button for Recorded users perfectly inline */}
                {course.enrollmentType === 'RECORDED' && course.liveUpgradePrice && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setUpgradeModalCourse(course)}
                      onMouseEnter={() => setShowUpgradeHint(true)}
                      onMouseLeave={() => setShowUpgradeHint(false)}
                      style={{
                        background: 'var(--surface)', color: 'var(--text-primary)', padding: '6px 16px', borderRadius: '50px',
                        fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ fontSize: '8px', background: 'var(--bg)', padding: '1px 6px', borderRadius: '10px', color: 'var(--text-secondary)' }}>OPTIONAL</span>
                      ⚡ Upgrade to PRO
                    </button>
                  </div>
                )}

                {/* Demo Action Buttons */}
                {(course.enrollmentType as string) === 'DEMO' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Link
                      href="/courses/explore"
                      style={{
                        background: 'var(--surface)', color: 'var(--text-primary)', padding: '6px 16px', borderRadius: '50px',
                        fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        textDecoration: 'none', whiteSpace: 'nowrap',
                      }}
                    >
                      Unlock Full Course
                    </Link>
                    <button
                      onClick={handleUnenrollDemo}
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)',
                        padding: '6px 16px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Unenroll Demo
                    </button>
                  </div>
                )}
              </div>
            </div>

              {isManager && (
                <button
                  onClick={() => router.push(`/courses/${params.id}/edit`)}
                  style={{
                    background: getCourseBadgeBg(course.color), border: `1px solid ${getCourseBadgeBg(course.color)}`,
                    color: getCourseBadgeText(course.color), padding: '8px 16px', borderRadius: '20px',
                    fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(4px)',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Manage Course
                </button>
              )}
          </div>
        </div>
      </div>


      {/* Active Exam Alert */}
      {activeExam && (
        <div 
          className="fade-in"
          style={{ 
            background: 'linear-gradient(135deg, #fff9e6, #fff4d1)',
            borderLeft: `4px solid #f59e0b`,
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '12px', 
              background: 'var(--warning-light)', color: 'var(--warning)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--warning)', marginBottom: '2px' }}>Exam is Live</h3>
              <p style={{ fontSize: '13px', color: 'var(--warning)', opacity: 0.9 }}>
                You have an active exam for this course: <strong>{activeExam.title}</strong>
              </p>
            </div>
          </div>
          <Link 
            href={`/exams/${activeExam.id}`}
            style={{ 
              background: 'var(--warning)', color: 'white', padding: '10px 24px', 
              borderRadius: '12px', fontSize: '14px', fontWeight: '600',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
              transition: 'all 0.2s',
              textDecoration: 'none'
            }}
          >
            Attend Exam
          </Link>
        </div>
      )}

      {/* Topics + Content */}
      {topics.length === 0 ? (
        <div className="card empty-state" style={{ padding: '48px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
          </svg>
          <p style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>No content yet</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {isManager ? 'Go to Manage Course to add topics and lectures.' : 'Content will appear here once the teacher adds it.'}
          </p>
          {isManager && (
            <button onClick={() => router.push(`/courses/${params.id}/edit`)} className="btn btn-primary" style={{ marginTop: '16px' }}>
              Add Content
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {topics.map((topic, topicIdx) => {
            const hasNewContent = ((topic as any).createdAt && new Date().getTime() - new Date((topic as any).createdAt).getTime() < 24 * 60 * 60 * 1000) ||
              topic.content?.some((item: any) => item.createdAt && new Date().getTime() - new Date(item.createdAt).getTime() < 24 * 60 * 60 * 1000);
            return (
              <div key={topic.id} className="card" style={{ overflow: 'hidden' }}>
                {/* Topic Header */}
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <button
                    onClick={() => toggleTopic(topic.id)}
                    style={{
                      flex: 1, padding: '16px 20px', background: 'none', border: 'none',
                      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: colorWithOpacity(course.color, '18'), color: extractHex(course.color),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '700', flexShrink: 0,
                    }}>
                      {String(topicIdx + 1).padStart(2, '0')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{topic.title}</span>
                        {hasNewContent && (
                          <span style={{
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: 'white', padding: '2px 6px', borderRadius: '4px',
                            fontSize: '9px', fontWeight: '800', textTransform: 'uppercase',
                            letterSpacing: '0.05em', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
                            flexShrink: 0
                          }}>
                            New
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {topic.content.length} lecture{topic.content.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="2"
                      style={{ transition: 'transform 0.2s', transform: expandedTopics.has(topic.id) ? 'rotate(180deg)' : 'none' }}
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                </div>

              {/* Topic Content */}
              {expandedTopics.has(topic.id) && (
                <div style={{ borderTop: '1px solid #d8dae3', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '60px' }}>
                  {topic.content.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No lectures in this topic yet
                    </div>
                  ) : (
                    topic.content.map((item) => (
                      <div
                        key={item.id}
                        className="lecture-row"
                        style={{
                          display: 'flex', alignItems: 'center', gap: isNative ? '16px' : '12px',
                          padding: isNative ? '18px 24px' : '10px 18px',
                          borderRadius: isNative ? '24px' : '16px',
                          background: 'var(--surface-2)',
                          boxShadow: isNative ? '5px 5px 10px var(--neu-dark), -5px -5px 10px var(--neu-light)' : '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
                          transition: 'box-shadow 0.2s',
                          flexWrap: 'wrap',
                          minHeight: isNative ? '84px' : '52px',
                        }}
                      >
                        {/* Lecture icon */}
                        <div style={{
                          width: isNative ? '38px' : '30px', height: isNative ? '38px' : '30px', borderRadius: isNative ? '10px' : '8px',
                          background: (item.videoUrl || item.youtubeUrl) ? colorWithOpacity(course.color, '12') : '#f0f0f5',
                          color: (item.videoUrl || item.youtubeUrl) ? extractHex(course.color) : 'var(--text-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {(item.videoUrl || item.youtubeUrl) ? (
                            <svg width={isNative ? "14" : "12"} height={isNative ? "14" : "12"} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          ) : (
                            <svg width={isNative ? "14" : "12"} height={isNative ? "14" : "12"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          )}
                        </div>

                        {/* Title + description */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: isNative ? '15px' : '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                            {(item as any).createdAt && (
                              <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)', flexShrink: 0 }}>
                                - Added on {new Date((item as any).createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                            {(item as any).createdAt && new Date().getTime() - new Date((item as any).createdAt).getTime() < 24 * 60 * 60 * 1000 && (
                              <span style={{
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: 'white', padding: '2px 6px', borderRadius: '4px',
                                fontSize: '9px', fontWeight: '800', textTransform: 'uppercase',
                                letterSpacing: '0.05em', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
                                flexShrink: 0
                              }}>
                                New
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p style={{ fontSize: isNative ? '13px' : '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons Group */}
                        <div className="lecture-row-actions" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginLeft: 'auto', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Progress actions for students */}
                          {role === 'STUDENT' && (item.videoUrl || item.youtubeUrl) && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginRight: '6px', paddingRight: '12px', borderRight: '1px solid #d8dae3' }}>
                              <button
                                onClick={() => updateProgress(item.id, progressMap[item.id] === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED')}
                                style={{
                                  background: progressMap[item.id] === 'COMPLETED' ? '#22c55e20' : 'transparent',
                                  color: progressMap[item.id] === 'COMPLETED' ? 'var(--success)' : 'var(--text-muted)',
                                  border: `1px solid ${progressMap[item.id] === 'COMPLETED' ? 'var(--success)' : 'var(--text-muted)'}`,
                                  padding: isNative ? '6px 12px' : '4px 10px', borderRadius: '50px', fontSize: isNative ? '11px' : '10px', fontWeight: '700',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <svg width={isNative ? "12" : "10"} height={isNative ? "12" : "10"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                Completed
                              </button>
                              <button
                                onClick={() => updateProgress(item.id, progressMap[item.id] === 'REWATCH' ? 'NOT_STARTED' : 'REWATCH')}
                                style={{
                                  background: progressMap[item.id] === 'REWATCH' ? '#eab30820' : 'transparent',
                                  color: progressMap[item.id] === 'REWATCH' ? '#ca8a04' : 'var(--text-muted)',
                                  border: `1px solid ${progressMap[item.id] === 'REWATCH' ? '#eab308' : 'var(--text-muted)'}`,
                                  padding: isNative ? '6px 12px' : '4px 10px', borderRadius: '50px', fontSize: isNative ? '11px' : '10px', fontWeight: '700',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <svg width={isNative ? "12" : "10"} height={isNative ? "12" : "10"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/></svg>
                                Rewatch
                              </button>
                            </div>
                          )}

                          {/* Watch / Material buttons */}
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                            {(item as any).isDemoLocked ? (
                              <Link
                                href="/courses/explore"
                                style={{
                                  padding: isNative ? '10px 20px' : '6px 16px',
                                  fontSize: isNative ? '13px' : '12px',
                                  fontWeight: '800',
                                  borderRadius: '50px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                  color: '#fff',
                                  textDecoration: 'none',
                                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                                }}
                              >
                                Unlock Now
                              </Link>
                            ) : (
                              <>
                                {item.pptUrl && (
                                  <Link
                                    href={`/material/${item.id}/view`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-ghost"
                                    style={{
                                      padding: isNative ? '10px 18px' : '6px 14px',
                                      fontSize: isNative ? '13px' : '12px',
                                      fontWeight: '800',
                                      borderRadius: '50px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      height: isNative ? '40px' : '32px',
                                      border: '1.5px solid var(--border)',
                                    }}
                                  >
                                    <svg width={isNative ? "12" : "10"} height={isNative ? "12" : "10"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                    Download Notes
                                  </Link>
                                )}
                                {(item.videoUrl || item.youtubeUrl) && (
                                  <Link
                                    href={`/courses/${params.id}/lectures/${item.id}`}
                                    className="btn btn-primary"
                                    style={{
                                      padding: isNative ? '10px 20px' : '6px 14px',
                                      fontSize: isNative ? '13px' : '12px',
                                      fontWeight: '800',
                                      borderRadius: '50px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      height: isNative ? '40px' : '32px',
                                    }}
                                  >
                                    <svg width={isNative ? "12" : "10"} height={isNative ? "12" : "10"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    Watch
                                  </Link>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )})}
        </div>
      )}
      {/* Info Modal */}
      {infoModalCourse && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }} onClick={() => setInfoModalCourse(null)}>
          <div style={{
            background: 'var(--surface)', borderRadius: '32px', width: '100%', maxWidth: '750px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
            animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '30px 40px', background: 'linear-gradient(135deg, var(--surface-2), var(--border))', borderBottom: '1.5px solid var(--border)', position: 'relative' }}>
              <button onClick={() => setInfoModalCourse(null)} style={{ position: 'absolute', top: '25px', right: '30px', background: 'var(--surface)', border: 'none', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Batch Comparison</h2>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: '500' }}>Choose the experience that fits your learning style</p>
            </div>

            {/* Comparison Table */}
            <div style={{ padding: '30px 40px' }}>
              <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1.5px solid var(--border)', background: 'var(--surface)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)' }}>
                      <th style={{ padding: '18px 24px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Features</th>
                      <th style={{ padding: '18px 24px', fontSize: '13px', color: 'var(--warning)', fontWeight: '800', background: 'var(--warning-light)', textAlign: 'center' }}>
                        {['FREE', 'DEMO'].includes(infoModalCourse?.enrollmentType || '') ? 'General Batch' : 'PLUS ( Recorded )'}
                      </th>
                      <th style={{ padding: '18px 24px', fontSize: '13px', color: 'var(--primary-dark)', fontWeight: '800', background: 'var(--primary-light)', textAlign: 'center' }}>PRO ( LIVE )</th>
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
                      <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>{row.f}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--warning)', textAlign: 'center', background: 'var(--warning-light)' }}>{row.g}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--primary-dark)', fontWeight: '700', textAlign: 'center', background: 'var(--surface)' }}>{row.p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ padding: '0 40px 40px', textAlign: 'center' }}>
              <button onClick={() => setInfoModalCourse(null)} style={{ background: 'var(--primary)', color: 'white', padding: '14px 40px', borderRadius: '16px', fontSize: '15px', fontWeight: '700', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

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
                
                <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '24px', marginBottom: '32px', border: '1.5px solid var(--border)' }}>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--accent)', marginBottom: '8px' }}>₹{upgradeModalCourse.liveUpgradePrice}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>One-time upgrade fee</div>
                </div>

                <div style={{ display: 'flex', gap: '14px' }}>
                  <button 
                    onClick={() => setUpgradeModalCourse(null)} 
                    style={{ flex: 1, padding: '16px', borderRadius: '18px', border: '2px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' }}
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

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />

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

      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    </div>

    {/* ── Modals (shared between mobile & desktop) ── */}
      {/* Info Modal */}
      {infoModalCourse && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }} onClick={() => setInfoModalCourse(null)}>
          <div style={{
            background: 'var(--surface)', borderRadius: '32px', width: '100%', maxWidth: '750px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
            animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '24px 24px', background: 'linear-gradient(135deg, var(--surface-2), var(--border))', borderBottom: '1.5px solid var(--border)', position: 'relative' }}>
              <button onClick={() => setInfoModalCourse(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--surface)', border: 'none', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>Batch Comparison</h2>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', fontWeight: '500' }}>Choose the experience that fits your learning style</p>
            </div>

            {/* Comparison Table wrapper with swipe-to-scroll for mobile */}
            <div style={{ padding: '20px 20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ borderRadius: '20px', overflow: 'hidden', border: '1.5px solid var(--border)', background: 'var(--surface)', minWidth: '460px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)' }}>
                      <th style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Features</th>
                      <th style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--warning)', fontWeight: '800', background: 'var(--warning-light)', textAlign: 'center' }}>
                        {['FREE', 'DEMO'].includes(infoModalCourse?.enrollmentType || '') ? 'General Batch' : 'PLUS ( Recorded )'}
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--primary-dark)', fontWeight: '800', background: 'var(--primary-light)', textAlign: 'center' }}>PRO ( LIVE )</th>
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
                      <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{row.f}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--warning)', textAlign: 'center', background: 'var(--warning-light)' }}>{row.g}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--primary-dark)', fontWeight: '700', textAlign: 'center', background: 'var(--surface)' }}>{row.p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ padding: '0 20px 24px', textAlign: 'center' }}>
              <button onClick={() => setInfoModalCourse(null)} style={{ background: 'var(--primary)', color: 'white', padding: '12px 36px', borderRadius: '14px', fontSize: '14px', fontWeight: '700', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

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

                <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '24px', marginBottom: '32px', border: '1.5px solid var(--border)' }}>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--accent)', marginBottom: '8px' }}>₹{upgradeModalCourse.liveUpgradePrice}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>One-time upgrade fee</div>
                </div>

                <div style={{ display: 'flex', gap: '14px' }}>
                  <button
                    onClick={() => setUpgradeModalCourse(null)}
                    style={{ flex: 1, padding: '16px', borderRadius: '18px', border: '2px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' }}
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

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />

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
    </>
  )
}
