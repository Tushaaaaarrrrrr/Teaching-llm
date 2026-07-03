'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { hasStrictTimer } from '@/lib/exam-policy'
import ExamConfirmationModal from '@/components/exams/ExamConfirmationModal'
import { RichTextDisplay } from '@/components/ui/RichTextDisplay'
import ConfirmDialog from '@/components/ConfirmDialog'
import Calculator from '@/components/exams/Calculator'

interface Question {
  id: string
  text: string
  type: string
  options: string | null
  marks: number
}

interface Exam {
  id: string
  title: string
  durationMinutes: number
  expiresAt: string
  questions: Question[]
  examType?: string
  course?: {
    name: string
    subject?: string
  }
}

export default function ExamAttemptPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [attempt, setAttempt] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const answersRef = useRef<Record<string, string>>({})
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(new Set([0]))
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showBackWarningModal, setShowBackWarningModal] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)

  // Mobile responsiveness states
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)
  const [showMobileNavigator, setShowMobileNavigator] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Force Light Theme during exam attempt
  useEffect(() => {
    const originalTheme = document.documentElement.getAttribute('data-theme') || 'light';
    
    // Force light theme
    document.documentElement.setAttribute('data-theme', 'light');
    window.dispatchEvent(new CustomEvent('themechange', { detail: 'light' }));
    
    return () => {
      // Restore original theme
      document.documentElement.setAttribute('data-theme', originalTheme);
      window.dispatchEvent(new CustomEvent('themechange', { detail: originalTheme }));
    };
  }, []);

  // Prevent copying, selecting, right-clicking, and dragging
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', 'Copying questions is disabled during the exam.');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+C or Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
      }
      // Prevent Ctrl+U or Cmd+Option+U (view source)
      if (((e.ctrlKey || e.metaKey) && e.key === 'u') || (e.metaKey && e.altKey && e.key === 'u')) {
        e.preventDefault();
      }
      // Prevent F12 or Inspect element (Cmd+Option+I / Ctrl+Shift+I)
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  // Back navigation warning & beforeunload block
  useEffect(() => {
    // Push dummy history entry
    window.history.pushState(null, '', window.location.href)

    const handlePopState = (e: PopStateEvent) => {
      if (submittingRef.current) return
      // Push history state back so the user remains on the current screen
      window.history.pushState(null, '', window.location.href)
      setShowBackWarningModal(true)
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (submittingRef.current) return
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
  
  // Timer State
  const [isPaused, setIsPaused] = useState(false)
  const timeTextRef = useRef<HTMLDivElement>(null)
  const attemptStartedAtRef = useRef<number | null>(null)
  const durationMsRef = useRef<number | null>(null)
  const hasStrictTimerRef = useRef<boolean>(false)
  const submittingRef = useRef<boolean>(false)
  const pauseOffsetRef = useRef<number>(0)
  const lastTickTimeRef = useRef<number | null>(null)

  const loadData = useCallback(async () => {
    try {
      const exRes = await fetch(`/api/exams/${params.id}`)
      const examData = await exRes.json()
      
      const attRes = await fetch(`/api/exams/${params.id}/attempt`, { method: 'POST' })
      const attemptData = await attRes.json()

      if (attemptData.error) {
        alert(attemptData.error)
        router.push('/exams')
        return
      }

      setExam(examData)
      setAttempt(attemptData)
      
      const initialAnswers: Record<string, string> = {}
      attemptData.responses?.forEach((r: any) => {
        initialAnswers[r.questionId] = r.answer
      })
      setAnswers(initialAnswers)
      answersRef.current = initialAnswers

      const startedAt = new Date(attemptData.startedAt).getTime()
      const durationMs = examData.durationMinutes * 60 * 1000
      attemptStartedAtRef.current = startedAt
      durationMsRef.current = durationMs
      hasStrictTimerRef.current = hasStrictTimer(examData.examType)
      
      const now = Date.now()
      const elapsed = now - startedAt
      const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000))
      
      if (timeTextRef.current) {
         timeTextRef.current.innerText = formatTime(remaining)
         timeTextRef.current.style.color = remaining < 300 ? 'var(--danger)' : 'var(--primary)'
      }

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    let animationFrameId: number
    let lastSecond = -1
    
    const tick = () => {
      if (attemptStartedAtRef.current === null || durationMsRef.current === null || submittingRef.current) {
        animationFrameId = requestAnimationFrame(tick)
        return
      }

      const now = Date.now()

      // Handle Pause Logic for Practice Mode
      if (isPaused && !hasStrictTimerRef.current) {
        if (lastTickTimeRef.current) {
            pauseOffsetRef.current += (now - lastTickTimeRef.current)
        }
        lastTickTimeRef.current = now
        animationFrameId = requestAnimationFrame(tick)
        return
      }
      lastTickTimeRef.current = now

      const elapsed = (now - attemptStartedAtRef.current) - pauseOffsetRef.current
      const remainingSecs = Math.max(0, Math.floor((durationMsRef.current - elapsed) / 1000))

      if (remainingSecs <= 0 && !submittingRef.current && !loading && exam) {
        // Auto-submit when time is up in BOTH modes if it hits zero, but mostly critical for FINAL
        submittingRef.current = true
        setSubmitting(true)
        fetch(`/api/exams/${params.id}/submit`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: answersRef.current })
        }).then(res => {
          if (res.ok) router.push(`/exams/${params.id}/result`)
        }).catch(err => console.error(err))
        return
      }

      if (remainingSecs !== lastSecond) {
        lastSecond = remainingSecs
        if (timeTextRef.current) {
          timeTextRef.current.innerText = formatTime(remainingSecs)
          timeTextRef.current.style.color = remainingSecs < 300 ? 'var(--danger)' : 'var(--primary)'
        }
      }

      animationFrameId = requestAnimationFrame(tick)
    }

    animationFrameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrameId)
  }, [loading, exam, params.id, router, isPaused])

  const saveAnswer = async (questionId: string, answer: string, immediate: boolean = false) => {
    // Update local state immediately for snappy UI
    setAnswers(prev => {
      const next = { ...prev, [questionId]: answer }
      answersRef.current = next
      return next
    })
    
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    const performSave = async () => {
      setIsSaving(true)
      try {
        const res = await fetch(`/api/exams/${params.id}/attempt`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId, answer })
        })
        if (!res.ok) throw new Error('Failed to save')
      } catch (err) {
        console.error('Failed to save answer:', err)
      } finally {
        // Show "Saved" for a brief moment then clear
        setTimeout(() => setIsSaving(false), 1000)
      }
    }

    if (immediate) {
      performSave()
    } else {
      setIsSaving(true) // Indicate that changes are pending
      saveTimeoutRef.current = setTimeout(performSave, 1000) // 1s debounce for typing
    }
  }

  const handleNavigate = (idx: number) => {
    setCurrentIdx(idx)
    setVisitedIndices(prev => new Set(prev).add(idx))
  }

  const handleResetTimer = () => {
    if (confirm('Are you sure you want to reset the timer? This will restart your time from the beginning.')) {
        attemptStartedAtRef.current = Date.now()
        pauseOffsetRef.current = 0
        setIsPaused(false)
    }
  }

  const handleSubmit = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const res = await fetch(`/api/exams/${params.id}/submit`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      })
      if (res.ok) {
        router.push(`/exams/${params.id}/result`)
      } else {
        alert('Failed to submit exam')
        submittingRef.current = false
        setSubmitting(false)
      }
    } catch (error) {
      console.error(error)
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .sidebar-nav, .sidebar-overlay, .dashboard-header, .mobile-bottom-nav {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        ` }} />
        
        {/* Shimmering Side Panel */}
        <div style={{
          width: '360px',
          height: '100vh',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          gap: '20px'
        }}>
          <div className="skeleton" style={{ height: '32px', width: '60%', borderRadius: '6px' }} />
          <div className="skeleton" style={{ height: '18px', width: '40%', borderRadius: '4px' }} />
          <div style={{ borderBottom: '1px solid var(--border)', margin: '10px 0' }} />
          <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '12px' }} />
          
          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: '50%' }} />
            ))}
          </div>
        </div>

        {/* Shimmering Main content */}
        <div style={{ flex: 1, height: '100vh', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--surface)' }}>
          <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div className="skeleton" style={{ height: '24px', width: '120px', borderRadius: '6px' }} />
            <div className="skeleton" style={{ height: '40px', width: '150px', borderRadius: '50px' }} />
          </div>

          <div style={{ width: '100%', maxWidth: '800px', borderRadius: '24px', background: 'var(--surface)', border: '1px solid var(--border)', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '2px 2px 10px rgba(0,0,0,0.02)' }}>
            <div className="skeleton" style={{ height: '30px', width: '80%', borderRadius: '6px' }} />
            <div className="skeleton" style={{ height: '18px', width: '40%', borderRadius: '4px' }} />
            <div style={{ margin: '10px 0' }} />
            <div className="skeleton" style={{ height: '55px', width: '100%', borderRadius: '16px' }} />
            <div className="skeleton" style={{ height: '55px', width: '100%', borderRadius: '16px' }} />
            <div className="skeleton" style={{ height: '55px', width: '100%', borderRadius: '16px' }} />
            <div className="skeleton" style={{ height: '55px', width: '100%', borderRadius: '16px' }} />
          </div>

          <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
            <div className="skeleton" style={{ height: '45px', width: '140px', borderRadius: '50px' }} />
            <div className="skeleton" style={{ height: '45px', width: '140px', borderRadius: '50px' }} />
          </div>
        </div>
      </div>
    )
  }
  if (!exam || !exam.questions || exam.questions.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Error Loading Assessment</h2>
        <p>The assessment details could not be loaded. Please try again later.</p>
        <button onClick={() => router.push('/exams')} style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '50px', background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>Go Back</button>
      </div>
    )
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const currentQuestion = exam?.questions[currentIdx]
  const answeredCount = Object.keys(answers).length
  const isFinal = hasStrictTimer(exam?.examType)

  // Shared Styles
  const neuCard: React.CSSProperties = {
    borderRadius: '24px', background: 'var(--surface)',
    boxShadow: '8px 8px 16px #cfd6e1, -8px -8px 16px var(--neu-light)',
    padding: '32px',
  }

  const sidebarStyle: React.CSSProperties = {
    width: '360px',
    height: '100vh',
    position: 'sticky',
    top: 0,
    background: 'var(--surface)',
    borderRight: '1px solid #cfd6e1',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    overflowY: 'auto',
    zIndex: 10
  }

  const mainContentStyle: React.CSSProperties = {
    flex: 1,
    height: '100vh',
    overflowY: 'auto',
    padding: '32px',
    background: 'var(--surface)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--surface)', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .sidebar-nav, .sidebar-overlay, .dashboard-header, .mobile-bottom-nav {
            display: none !important;
          }
          .dashboard-main-container {
            margin-left: 0 !important;
            max-width: 100vw !important;
            width: 100vw !important;
            height: 100vh !important;
            height: 100dvh !important;
          }
        `}} />
        
        {/* Sticky Mobile Header */}
        <header style={{
          position: 'sticky',
          top: 0,
          background: 'var(--surface)',
          borderBottom: '1px solid #cfd6e1',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 90,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          {/* Progress */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Progress
            </span>
            <span style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-primary)' }}>
              Q{currentIdx + 1} of {exam?.questions.length}
            </span>
          </div>

          {/* Compact Timer Badge */}
          <div style={{
            background: 'var(--surface)',
            padding: '6px 14px',
            borderRadius: '50px',
            boxShadow: '3px 3px 6px #cfd6e1, -3px -3px 6px var(--neu-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <div ref={timeTextRef} style={{ fontSize: '15px', fontWeight: 900, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
              --:--
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowCalculator(prev => !prev)}
              style={{
                padding: '8px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--surface)',
                color: 'var(--primary)',
                cursor: 'pointer',
                boxShadow: '3px 3px 6px #cfd6e1, -3px -3px 6px var(--neu-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px'
              }}
              title="Calculator"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
                <line x1="9" y1="13" x2="9.01" y2="13"/>
                <line x1="15" y1="13" x2="15.01" y2="13"/>
                <line x1="9" y1="17" x2="15" y2="17"/>
              </svg>
            </button>
            <button
              onClick={() => setShowMobileNavigator(true)}
              style={{
                padding: '8px 12px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '3px 3px 6px #cfd6e1, -3px -3px 6px var(--neu-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e1e3a" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Grid
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={submitting}
              style={{
                padding: '8px 14px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--danger)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(239,68,68,0.2)'
              }}
            >
              {submitting ? '...' : 'Exit & Submit'}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{
          flex: 1,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflowY: 'auto'
        }}>
          <div style={{ width: '100%' }}>
            <div style={{
              borderRadius: '20px', background: 'var(--surface)',
              boxShadow: '6px 6px 12px #cfd6e1, -6px -6px 12px var(--neu-light)',
              padding: '20px',
            }}>
              
              {/* Question Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ 
                      fontSize: '9px', fontWeight: 900, letterSpacing: '0.05em',
                      background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '50px' 
                  }}>
                    QUESTION {currentIdx + 1}
                  </span>
                  <span style={{ 
                      fontSize: '9px', fontWeight: 900, letterSpacing: '0.05em',
                      background: '#1e1e3a10', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '50px' 
                  }}>
                    {currentQuestion?.type.replace('_', ' ')}
                  </span>
                  {isSaving && (
                    <span style={{ 
                        fontSize: '9px', fontWeight: 800, color: 'var(--success)', 
                        display: 'flex', alignItems: 'center', gap: '3px'
                    }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse 1.5s infinite' }} />
                      Saved
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>{currentQuestion?.marks} Marks</span>
              </div>

              {/* Question Text */}
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.4', marginBottom: '24px' }}>
                <RichTextDisplay text={currentQuestion?.text} />
              </div>

              {currentQuestion?.imageUrl && (
                <div style={{ marginBottom: '24px', maxWidth: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Question Graphic" 
                    style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '12px' }} 
                  />
                </div>
              )}

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {(currentQuestion?.type === 'MCQ' || currentQuestion?.type === 'MSQ' || currentQuestion?.type === 'TRUE_FALSE') ? (
                  (() => {
                    let opts: string[] = []
                    try {
                      let parsed = JSON.parse(currentQuestion.options || '[]')
                      if (typeof parsed === 'string') parsed = JSON.parse(parsed)
                      opts = Array.isArray(parsed) ? parsed : []
                    } catch { opts = [] }
                    
                    if (currentQuestion.type === 'TRUE_FALSE') opts = ['True', 'False']
                    
                    const isMSQ = currentQuestion.type === 'MSQ'
                    let currentSelection: string[] = []
                    if (isMSQ) {
                      try {
                        currentSelection = JSON.parse(answers[currentQuestion.id] || '[]')
                        if (!Array.isArray(currentSelection)) currentSelection = []
                      } catch {
                        currentSelection = []
                      }
                    }

                    return opts.filter(opt => typeof opt === 'string' && opt.trim()).map((opt: string) => {
                      const isSelected = isMSQ 
                        ? currentSelection.includes(opt)
                        : answers[currentQuestion.id] === opt

                      return (
                        <button
                          key={opt}
                          onClick={() => {
                            if (isMSQ) {
                              let newSelection = [...currentSelection]
                              if (newSelection.includes(opt)) {
                                newSelection = newSelection.filter(s => s !== opt)
                              } else {
                                newSelection.push(opt)
                              }
                              saveAnswer(currentQuestion.id, JSON.stringify(newSelection), true)
                            } else {
                              saveAnswer(currentQuestion.id, opt, true)
                            }
                          }}
                          style={{
                            padding: '14px 16px', borderRadius: '16px', border: 'none',
                            textAlign: 'left', fontSize: '14px', fontWeight: 600,
                            background: isSelected ? 'var(--primary)' : '#fff',
                            color: isSelected ? '#fff' : 'var(--text-primary)',
                            boxShadow: isSelected 
                              ? 'inset 3px 3px 6px rgba(0,0,0,0.2)' 
                              : '3px 3px 6px #cfd6e1, -3px -3px 6px var(--neu-light)',
                            cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', gap: '12px'
                          }}
                        >
                          <div style={{ 
                            width: '18px', height: '18px', borderRadius: isMSQ ? '4px' : '50%', 
                            border: `2px solid ${isSelected ? '#fff' : '#cfd6e1'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isSelected && (
                              isMSQ ? (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              ) : (
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--surface)' }} />
                              )
                            )}
                          </div>
                          <div style={{ flex: 1 }}><RichTextDisplay text={opt} /></div>
                        </button>
                      )
                    })
                  })()
                ) : currentQuestion?.type === 'NAT' ? (
                  <div style={{ padding: '2px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px' }}>Your Numerical Answer:</label>
                    <input 
                      type="number"
                      step="any"
                      value={answers[currentQuestion.id] || ''}
                      onChange={e => saveAnswer(currentQuestion.id, e.target.value)}
                      placeholder="Enter numerical response..."
                      style={{
                        width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                        background: 'var(--surface)', boxShadow: 'inset 4px 4px 8px #cfd6e1, inset -4px -4px 8px var(--neu-light)',
                        fontSize: '16px', fontWeight: 700, outline: 'none', color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                ) : (
                  <textarea
                    value={answers[currentQuestion.id] || ''}
                    onChange={e => saveAnswer(currentQuestion.id, e.target.value)}
                    placeholder="Type your detailed answer here..."
                    rows={6}
                    style={{
                      width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                      background: 'var(--surface)', boxShadow: 'inset 4px 4px 8px #cfd6e1, inset -4px -4px 8px var(--neu-light)',
                      fontSize: '14px', lineHeight: '1.6', outline: 'none', color: 'var(--text-primary)',
                      fontFamily: 'inherit'
                    }}
                  />
                )}
              </div>

              {/* Mobile Prev/Next Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #cfd6e1' }}>
                <button
                  disabled={currentIdx === 0}
                  onClick={() => handleNavigate(currentIdx - 1)}
                  style={{ 
                    padding: '10px 20px', borderRadius: '50px', border: 'none', 
                    background: 'var(--surface)', color: 'var(--text-primary)', fontWeight: 800, fontSize: '12px',
                    cursor: currentIdx === 0 ? 'default' : 'pointer',
                    opacity: currentIdx === 0 ? 0.5 : 1,
                    boxShadow: '3px 3px 6px #cfd6e1, -3px -3px 6px var(--neu-light)'
                  }}
                >
                  ← Prev
                </button>
                
                {currentIdx === (exam?.questions.length || 0) - 1 ? (
                  <button 
                    onClick={() => setShowConfirmModal(true)}
                    style={{ 
                      padding: '10px 24px', borderRadius: '50px', border: 'none', 
                      background: 'var(--danger)', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(239,68,68,0.2)'
                    }}
                  >
                    Submit Exam
                  </button>
                ) : (
                  <button 
                    onClick={() => handleNavigate(currentIdx + 1)}
                    style={{ 
                      padding: '10px 24px', borderRadius: '50px', border: 'none', 
                      background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(54,54,232,0.2)'
                    }}
                  >
                    Next →
                  </button>
                )}
              </div>

            </div>

            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Auto-saved in real-time. Do not reload the page.
            </div>

          </div>
        </main>

        {/* FLOATING QUESTION NAVIGATOR DRAWER */}
        {showMobileNavigator && (
          <>
            {/* Backdrop */}
            <div 
              onClick={() => setShowMobileNavigator(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 15, 25, 0.4)',
                backdropFilter: 'blur(4px)',
                zIndex: 998,
                transition: 'opacity 0.3s ease'
              }}
            />
            
            {/* Bottom Drawer */}
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--surface)',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.15)',
              zIndex: 999,
              padding: '24px 20px 32px 20px',
              maxHeight: '80vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              {/* Drawer Handle Indicator */}
              <div style={{
                width: '40px',
                height: '4px',
                borderRadius: '2px',
                background: '#cfd6e1',
                alignSelf: 'center',
                marginBottom: '16px'
              }} />

              {/* Title Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Question Navigator
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {answeredCount}/{exam?.questions.length} Answered
                </span>
              </div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
                {exam?.questions.map((q, i) => {
                  const isCurrent = currentIdx === i
                  const isAnswered = !!answers[q.id]
                  const isVisited = visitedIndices.has(i)
                  
                  let bgColor = '#fff'
                  let textColor = 'var(--text-primary)'
                  let shadow = '3px 3px 6px #cfd6e1, -3px -3px 6px var(--neu-light)'

                  if (isCurrent) {
                    bgColor = 'var(--primary)'
                    textColor = '#fff'
                    shadow = 'inset 2px 2px 5px rgba(0,0,0,0.2)'
                  } else if (isAnswered) {
                    bgColor = 'var(--success)'
                    textColor = '#fff'
                  } else if (!isVisited) {
                    bgColor = '#e0e0e0'
                    textColor = 'var(--text-muted)'
                    shadow = 'none'
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        handleNavigate(i)
                        setShowMobileNavigator(false)
                      }}
                      style={{
                        aspectRatio: '1', borderRadius: '12px', border: 'none',
                        background: bgColor, color: textColor,
                        fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                        boxShadow: shadow, transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>

              {/* Close Drawer Button */}
              <button 
                onClick={() => setShowMobileNavigator(false)}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  border: 'none',
                  background: 'var(--text-primary)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'center',
                  boxShadow: '0 6px 15px rgba(30,30,58,0.2)'
                }}
              >
                Close Navigator
              </button>

            </div>
          </>
        )}

        {/* Confirmation Modal */}
        {exam && (
          <ExamConfirmationModal
            open={showConfirmModal}
            onConfirm={handleSubmit}
            onCancel={() => setShowConfirmModal(false)}
            totalQuestions={exam.questions.length}
            answeredCount={answeredCount}
            submitting={submitting}
          />
        )}

      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar-nav, .sidebar-overlay, .dashboard-header, .mobile-bottom-nav {
          display: none !important;
        }
        .dashboard-main-container {
          margin-left: 0 !important;
          max-width: 100vw !important;
          width: 100vw !important;
          height: 100vh !important;
          height: 100dvh !important;
        }
      `}} />
      
      {/* LEFT PANEL - Fixed Sidebar */}
      <aside style={sidebarStyle}>
        
        {/* Exam Metadata */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            {exam?.course?.name || 'Course'} • {exam?.course?.subject || 'Assessment'}
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', lineHeight: '1.2', marginBottom: '8px' }}>
            {exam?.title}
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Total: {exam?.questions.reduce((acc, q) => acc + (q.marks || 0), 0)} Marks
            </span>
            <span style={{ 
                fontSize: '11px', fontWeight: 800, 
                background: isFinal ? 'var(--danger-light)' : 'var(--primary-light)', 
                color: isFinal ? 'var(--danger)' : 'var(--primary)', 
                padding: '4px 10px', borderRadius: '50px' 
            }}>
              {isFinal ? 'FINAL EXAM' : 'PRACTICE MODE'}
            </span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #cfd6e1', margin: '0 -24px 24px -24px' }} />

        {/* Timer Section */}
        <div style={{ ...neuCard, padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Time Remaining
          </div>
          <div ref={timeTextRef} style={{ fontSize: '36px', fontWeight: 900, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums', marginBottom: '12px' }}>
            --:--
          </div>
          
          {!isFinal && (
             <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button 
                    onClick={() => setIsPaused(!isPaused)}
                    style={{ 
                        padding: '8px 16px', borderRadius: '50px', border: 'none',
                        background: isPaused ? 'var(--success)' : '#fff', color: isPaused ? '#fff' : 'var(--text-primary)',
                        fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        boxShadow: '3px 3px 6px #cfd6e1, -3px -3px 6px var(--neu-light)'
                    }}
                >
                    {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button 
                    onClick={handleResetTimer}
                    style={{ 
                        padding: '8px 16px', borderRadius: '50px', border: 'none',
                        background: 'var(--surface)', color: 'var(--text-primary)',
                        fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        boxShadow: '3px 3px 6px #cfd6e1, -3px -3px 6px var(--neu-light)'
                    }}
                >
                    Reset
                </button>
             </div>
          )}
        </div>

        {/* Question Navigator */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Question Navigator</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>{answeredCount}/{exam?.questions.length} Answered</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            {exam?.questions.map((q, i) => {
              const isCurrent = currentIdx === i
              const isAnswered = !!answers[q.id]
              const isVisited = visitedIndices.has(i)
              
              let bgColor = '#fff'
              let textColor = 'var(--text-primary)'
              let shadow = '3px 3px 6px #cfd6e1, -3px -3px 6px var(--neu-light)'

              if (isCurrent) {
                bgColor = 'var(--primary)'
                textColor = '#fff'
                shadow = 'inset 2px 2px 5px rgba(0,0,0,0.2)'
              } else if (isAnswered) {
                bgColor = 'var(--success)'
                textColor = '#fff'
              } else if (!isVisited) {
                bgColor = '#e0e0e0'
                textColor = 'var(--text-muted)'
                shadow = 'none'
              }

              return (
                <button
                  key={q.id}
                  onClick={() => handleNavigate(i)}
                  style={{
                    aspectRatio: '1', borderRadius: '12px', border: 'none',
                    background: bgColor, color: textColor,
                    fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                    boxShadow: shadow, transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button 
            onClick={() => setShowConfirmModal(true)}
            disabled={submitting}
            style={{ 
                marginTop: '24px',
                padding: '16px', borderRadius: '16px', border: 'none', 
                background: 'var(--danger)', color: '#fff', fontSize: '15px', fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(239,68,68,0.3)',
                width: '100%'
            }}
        >
            {submitting ? 'Submitting...' : 'FINISH ASSESSMENT'}
        </button>

      </aside>

      {/* RIGHT PANEL - Dynamic Question Content */}
      <main style={mainContentStyle}>
        <div style={{ width: '100%', maxWidth: '900px' }}>
            
            {/* Desktop Full-Screen Top Header Bar */}
            <div style={{
              width: '100%',
              background: 'var(--surface)',
              padding: '18px 28px',
              borderRadius: '24px',
              boxShadow: '4px 4px 12px var(--neu-dark), -4px -4px 12px var(--neu-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '32px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {exam?.title}
                </span>
                <span style={{ 
                    fontSize: '11px', fontWeight: 800, 
                    background: isFinal ? 'var(--danger-light)' : 'var(--primary-light)', 
                    color: isFinal ? 'var(--danger)' : 'var(--primary)', 
                    padding: '4px 10px', borderRadius: '50px' 
                }}>
                  {isFinal ? 'FINAL EXAM' : 'PRACTICE MODE'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setShowCalculator(prev => !prev)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '50px',
                    border: 'none',
                    background: 'var(--surface)',
                    color: 'var(--primary)',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '3px 3px 6px #cfd6e1, -3px -3px 6px var(--neu-light)',
                    marginRight: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                    <line x1="9" y1="13" x2="9.01" y2="13"/>
                    <line x1="15" y1="13" x2="15.01" y2="13"/>
                    <line x1="9" y1="17" x2="15" y2="17"/>
                  </svg>
                  Calculator
                </button>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={submitting}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '50px',
                    border: 'none',
                    background: 'var(--danger)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                    transition: 'all 0.2s'
                  }}
                >
                  {submitting ? 'Submitting...' : 'Exit Exam & Submit'}
                </button>
              </div>
            </div>

            <div style={neuCard}>
                
                {/* Question Info Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ 
                            fontSize: '10px', fontWeight: 900, letterSpacing: '0.05em',
                            background: 'var(--primary-light)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '50px' 
                        }}>
                          QUESTION {currentIdx + 1}
                        </span>
                        <span style={{ 
                            fontSize: '10px', fontWeight: 900, letterSpacing: '0.05em',
                            background: '#1e1e3a10', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '50px' 
                        }}>
                          {currentQuestion?.type.replace('_', ' ')}
                        </span>
                        {isSaving && (
                          <span style={{ 
                              fontSize: '10px', fontWeight: 800, color: 'var(--success)', 
                              display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px'
                          }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse 1.5s infinite' }} />
                            Autosaving...
                          </span>
                        )}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>{currentQuestion?.marks} Marks</span>
                </div>

                {/* Question Text */}
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.4', marginBottom: '32px' }}>
                    <RichTextDisplay text={currentQuestion?.text} />
                </div>

                {currentQuestion?.imageUrl && (
                  <div style={{ marginBottom: '32px', maxWidth: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                    <img 
                      src={currentQuestion.imageUrl} 
                      alt="Question Graphic" 
                      style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '12px' }} 
                    />
                  </div>
                )}

                {/* Options Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px' }}>
                    {(currentQuestion?.type === 'MCQ' || currentQuestion?.type === 'MSQ' || currentQuestion?.type === 'TRUE_FALSE') ? (
                    (() => {
                        let opts: string[] = []
                        try {
                            let parsed = JSON.parse(currentQuestion.options || '[]')
                            if (typeof parsed === 'string') parsed = JSON.parse(parsed)
                            opts = Array.isArray(parsed) ? parsed : []
                        } catch { opts = [] }
                        
                        if (currentQuestion.type === 'TRUE_FALSE') opts = ['True', 'False']
                        
                        const isMSQ = currentQuestion.type === 'MSQ'
                        let currentSelection: string[] = []
                        if (isMSQ) {
                          try {
                            currentSelection = JSON.parse(answers[currentQuestion.id] || '[]')
                            if (!Array.isArray(currentSelection)) currentSelection = []
                          } catch {
                            currentSelection = []
                          }
                        }

                        return opts.filter(opt => typeof opt === 'string' && opt.trim()).map((opt: string) => {
                            const isSelected = isMSQ 
                              ? currentSelection.includes(opt)
                              : answers[currentQuestion.id] === opt

                            return (
                              <button
                                  key={opt}
                                  onClick={() => {
                                    if (isMSQ) {
                                      let newSelection = [...currentSelection]
                                      if (newSelection.includes(opt)) {
                                        newSelection = newSelection.filter(s => s !== opt)
                                      } else {
                                        newSelection.push(opt)
                                      }
                                      saveAnswer(currentQuestion.id, JSON.stringify(newSelection), true)
                                    } else {
                                      saveAnswer(currentQuestion.id, opt, true)
                                    }
                                  }}
                                  style={{
                                      padding: '20px 24px', borderRadius: '20px', border: 'none',
                                      textAlign: 'left', fontSize: '16px', fontWeight: 600,
                                      background: isSelected ? 'var(--primary)' : '#fff',
                                      color: isSelected ? '#fff' : 'var(--text-primary)',
                                      boxShadow: isSelected 
                                          ? 'inset 4px 4px 10px rgba(0,0,0,0.2)' 
                                          : '4px 4px 10px #cfd6e1, -4px -4px 10px var(--neu-light)',
                                      cursor: 'pointer', transition: 'all 0.2s',
                                      display: 'flex', alignItems: 'center', gap: '16px'
                                  }}
                              >
                                  <div style={{ 
                                      width: '24px', height: '24px', borderRadius: isMSQ ? '6px' : '50%', 
                                      border: `2px solid ${isSelected ? '#fff' : '#cfd6e1'}`,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                                  }}>
                                      {isSelected && (
                                        isMSQ ? (
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        ) : (
                                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--surface)' }} />
                                        )
                                      )}
                                  </div>
                                  <div style={{ flex: 1 }}><RichTextDisplay text={opt} /></div>
                              </button>
                            )
                        })
                    })()
                    ) : currentQuestion?.type === 'NAT' ? (
                      <div style={{ padding: '4px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '12px' }}>Your Numerical Answer:</label>
                        <input 
                          type="number"
                          step="any"
                          value={answers[currentQuestion.id] || ''}
                          onChange={e => saveAnswer(currentQuestion.id, e.target.value)}
                          placeholder="Enter number (decimals allowed)..."
                          style={{
                              width: '100%', padding: '24px', borderRadius: '20px', border: 'none',
                              background: 'var(--surface)', boxShadow: 'inset 6px 6px 12px #cfd6e1, inset -6px -6px 12px var(--neu-light)',
                              fontSize: '18px', fontWeight: 700, outline: 'none', color: 'var(--text-primary)',
                          }}
                        />
                      </div>
                    ) : (
                    <textarea
                        value={answers[currentQuestion.id] || ''}
                        onChange={e => saveAnswer(currentQuestion.id, e.target.value)}
                        placeholder="Type your detailed answer here..."
                        rows={10}
                        style={{
                            width: '100%', padding: '24px', borderRadius: '20px', border: 'none',
                            background: 'var(--surface)', boxShadow: 'inset 6px 6px 12px #cfd6e1, inset -6px -6px 12px var(--neu-light)',
                            fontSize: '16px', lineHeight: '1.6', outline: 'none', color: 'var(--text-primary)',
                            fontFamily: 'inherit'
                        }}
                    />
                    )}
                </div>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '24px', borderTop: '1px solid #cfd6e1' }}>
                    <button
                        disabled={currentIdx === 0}
                        onClick={() => handleNavigate(currentIdx - 1)}
                        style={{ 
                            padding: '14px 32px', borderRadius: '50px', border: 'none', 
                            background: 'var(--surface)', color: 'var(--text-primary)', fontWeight: 800, 
                            cursor: currentIdx === 0 ? 'default' : 'pointer',
                            opacity: currentIdx === 0 ? 0.5 : 1,
                            boxShadow: '4px 4px 8px #cfd6e1, -4px -4px 8px var(--neu-light)'
                        }}
                    >
                        ← Previous
                    </button>
                    
                    {currentIdx === (exam?.questions.length || 0) - 1 ? (
                        <button 
                            onClick={() => setShowConfirmModal(true)}
                            style={{ 
                                padding: '14px 40px', borderRadius: '50px', border: 'none', 
                                background: 'var(--danger)', color: '#fff', fontWeight: 800, cursor: 'pointer',
                                boxShadow: '0 8px 20px rgba(239,68,68,0.3)'
                            }}
                        >
                            Finish & Submit
                        </button>
                    ) : (
                        <button 
                            onClick={() => handleNavigate(currentIdx + 1)}
                            style={{ 
                                padding: '14px 40px', borderRadius: '50px', border: 'none', 
                                background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer',
                                boxShadow: '0 8px 20px rgba(54,54,232,0.3)'
                            }}
                        >
                            Next Question →
                        </button>
                    )}
                </div>

            </div>

            {/* Bottom Info */}
            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Questions are auto-saved in real-time. Do not reload the page unless necessary.
            </div>

        </div>
      </main>

      {/* Confirmation Modal */}
      {exam && (
          <ExamConfirmationModal
            open={showConfirmModal}
            onConfirm={handleSubmit}
            onCancel={() => setShowConfirmModal(false)}
            totalQuestions={exam.questions.length}
            answeredCount={answeredCount}
            submitting={submitting}
          />
      )}

      {/* Back Warning Modal */}
      {exam && (
        <ConfirmDialog
          open={showBackWarningModal}
          title="Warning: Leaving Exam"
          message="You are attempting to leave the exam page. Your progress so far is automatically saved, but you should submit your exam to record your attempt. Would you like to submit and exit, or cancel and stay?"
          confirmLabel="Submit and Exit"
          cancelLabel="Cancel"
          onConfirm={handleSubmit}
          onCancel={() => setShowBackWarningModal(false)}
          loading={submitting}
          tone="danger"
        />
      )}

      {/* Calculator Modal */}
      <Calculator
        open={showCalculator}
        onClose={() => setShowCalculator(false)}
      />

    </div>
  )
}
