'use client'

import { useEffect, useState } from 'react'
import { ExamTimingState, formatCountdownDuration, formatISTDateTime, getExamTimingState } from '@/lib/date-utils'

interface ExamTimingStatusProps {
  startDate?: string | null
  expiresAt: string
  compact?: boolean
}

function getTone(state: ExamTimingState): { background: string; color: string } {
  switch (state) {
    case 'before':
      return { background: '#3636e812', color: '#3636e8' }
    case 'ending':
      return { background: '#f59e0b18', color: '#d97706' }
    case 'ended':
      return { background: '#ef444415', color: '#ef4444' }
    default:
      return { background: '#10b98115', color: '#10b981' }
  }
}

export default function ExamTimingStatus({ startDate, expiresAt, compact = false }: ExamTimingStatusProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const state = getExamTimingState(startDate, expiresAt, now)
  const start = startDate ? new Date(startDate) : null
  const end = new Date(expiresAt)
  const tone = getTone(state)

  let label = 'Started'
  let primaryText = 'Exam is live'
  let secondaryText = `Ends ${formatISTDateTime(end)}`

  if (state === 'before' && start) {
    label = 'Starts In'
    primaryText = formatCountdownDuration(start.getTime() - now.getTime())
    secondaryText = `Scheduled for ${formatISTDateTime(start)}`
  } else if (state === 'ending') {
    label = 'Ends In'
    primaryText = formatCountdownDuration(end.getTime() - now.getTime())
    secondaryText = `Ends at ${formatISTDateTime(end)}`
  } else if (state === 'ended') {
    label = 'Ended'
    primaryText = 'Exam window has closed'
    secondaryText = `Ended on ${formatISTDateTime(end)}`
  }

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ alignSelf: 'flex-start', padding: '4px 10px', borderRadius: '50px', background: tone.background, color: tone.color, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
          {label}
        </span>
        <div style={{ fontSize: '18px', fontWeight: 900, color: tone.color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
          {primaryText}
        </div>
        <div style={{ fontSize: '12px', color: '#6b6b8a', fontWeight: 600 }}>
          {secondaryText}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 18px', borderRadius: '18px', background: '#fff', boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ alignSelf: 'flex-start', padding: '5px 12px', borderRadius: '50px', background: tone.background, color: tone.color, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <div style={{ fontSize: '24px', fontWeight: 900, color: tone.color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {primaryText}
      </div>
      <div style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: 600 }}>
        {secondaryText}
      </div>
    </div>
  )
}
