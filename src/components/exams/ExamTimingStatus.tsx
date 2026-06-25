'use client'

import { useEffect, useState, useRef } from 'react'
import { ExamTimingState, formatCountdownDuration, formatISTDateTime, getExamTimingState } from '@/lib/date-utils'

interface ExamTimingStatusProps {
  startDate?: string | null
  expiresAt: string
  compact?: boolean
}

function getTone(state: ExamTimingState): { background: string; color: string } {
  switch (state) {
    case 'before':
      return { background: 'var(--primary-light)', color: 'var(--primary)' }
    case 'ending':
      return { background: 'var(--warning-light)', color: 'var(--warning)' }
    case 'ended':
      return { background: 'var(--danger-light)', color: 'var(--danger)' }
    default:
      return { background: 'var(--success-light)', color: 'var(--success)' }
  }
}

export default function ExamTimingStatus({ startDate, expiresAt, compact = false }: ExamTimingStatusProps) {
  // We only track the macroscopic "phase" in React state to avoid re-rendering every second.
  const [examPhase, setExamPhase] = useState<ExamTimingState>(() => getExamTimingState(startDate, expiresAt, new Date()))
  const primaryTextRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let animationFrameId: number
    let lastSecond = -1

    const tick = () => {
      const now = new Date()
      const currentSec = now.getSeconds()

      if (currentSec !== lastSecond) {
        lastSecond = currentSec
        const currentPhase = getExamTimingState(startDate, expiresAt, now)

        if (currentPhase !== examPhase) {
          // Phase changed (e.g., from 'before' to 'ending'), trigger a full React re-render to update UI styles
          setExamPhase(currentPhase)
        } else if (primaryTextRef.current) {
          // Direct DOM mutation for the countdown text to bypass React overhead
          const start = startDate ? new Date(startDate) : null
          const end = new Date(expiresAt)
          let primaryText = 'Exam is live'

          if (currentPhase === 'before' && start) {
            primaryText = formatCountdownDuration(start.getTime() - now.getTime())
          } else if (currentPhase === 'ending') {
            primaryText = formatCountdownDuration(end.getTime() - now.getTime())
          } else if (currentPhase === 'ended') {
            primaryText = 'Exam window has closed'
          }
          
          if (primaryTextRef.current.innerText !== primaryText) {
            primaryTextRef.current.innerText = primaryText
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick)
    }

    animationFrameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrameId)
  }, [startDate, expiresAt, examPhase])

  const start = startDate ? new Date(startDate) : null
  const end = new Date(expiresAt)
  const tone = getTone(examPhase)

  let label = 'Started'
  let secondaryText = `Ends ${formatISTDateTime(end)}`
  let initialPrimaryText = 'Exam is live'

  if (examPhase === 'before' && start) {
    label = 'Starts In'
    initialPrimaryText = formatCountdownDuration(start.getTime() - new Date().getTime())
    secondaryText = `Scheduled for ${formatISTDateTime(start)}`
  } else if (examPhase === 'ending') {
    label = 'Ends In'
    initialPrimaryText = formatCountdownDuration(end.getTime() - new Date().getTime())
    secondaryText = `Ends at ${formatISTDateTime(end)}`
  } else if (examPhase === 'ended') {
    label = 'Ended'
    initialPrimaryText = 'Exam window has closed'
    secondaryText = `Ended on ${formatISTDateTime(end)}`
  }

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ alignSelf: 'flex-start', padding: '4px 10px', borderRadius: '50px', background: tone.background, color: tone.color, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
          {label}
        </span>
        <div ref={primaryTextRef} style={{ fontSize: '18px', fontWeight: 900, color: tone.color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
          {initialPrimaryText}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {secondaryText}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 18px', borderRadius: '18px', background: 'var(--surface)', boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ alignSelf: 'flex-start', padding: '5px 12px', borderRadius: '50px', background: tone.background, color: tone.color, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <div ref={primaryTextRef} style={{ fontSize: '24px', fontWeight: 900, color: tone.color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {initialPrimaryText}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
        {secondaryText}
      </div>
    </div>
  )
}
