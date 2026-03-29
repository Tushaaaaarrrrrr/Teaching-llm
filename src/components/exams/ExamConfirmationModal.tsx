import React from 'react'
import ConfirmDialog from '../ConfirmDialog'

interface ExamConfirmationModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  totalQuestions: number
  answeredCount: number
  submitting: boolean
}

export default function ExamConfirmationModal({
  open,
  onConfirm,
  onCancel,
  totalQuestions,
  answeredCount,
  submitting
}: ExamConfirmationModalProps) {
  const unansweredCount = totalQuestions - answeredCount

  const message = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p>Are you sure you want to submit your exam? Once submitted, you cannot change your answers.</p>
      <div style={{ 
        background: '#fff', 
        padding: '16px', 
        borderRadius: '16px', 
        boxShadow: 'inset 2px 2px 5px #c5c7cf, inset -2px -2px 5px #fff',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#9999b0', textTransform: 'uppercase' }}>Answered</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>{answeredCount}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#9999b0', textTransform: 'uppercase' }}>Unanswered</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: unansweredCount > 0 ? '#ef4444' : '#6b6b8a' }}>{unansweredCount}</div>
        </div>
      </div>
      {unansweredCount > 0 && (
        <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '13px', textAlign: 'center' }}>
          Warning: You have {unansweredCount} unanswered questions!
        </p>
      )}
    </div>
  )

  return (
    <ConfirmDialog
      open={open}
      title="Submit Exam?"
      message={message}
      confirmLabel="Yes, Submit Exam"
      cancelLabel="Back to Questions"
      onConfirm={onConfirm}
      onCancel={onCancel}
      loading={submitting}
      tone={unansweredCount > 0 ? 'danger' : 'default'}
    />
  )
}
