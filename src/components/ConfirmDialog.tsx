'use client'

import React from 'react'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: string | React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null

  const confirmBg = tone === 'danger' ? '#ef4444' : '#3636e8'
  const confirmShadow = tone === 'danger'
    ? '4px 4px 10px rgba(239,68,68,0.28)'
    : '4px 4px 10px rgba(54,54,232,0.28)'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          borderRadius: '24px',
          background: '#f0f2f8',
          boxShadow: '12px 12px 24px #cfd6e1, -12px -12px 24px #ffffff',
          padding: '24px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e1e3a', marginBottom: '8px' }}>
          {title}
        </div>
        <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#6b6b8a', marginBottom: '22px' }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn btn-ghost"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              border: 'none',
              borderRadius: '999px',
              padding: '10px 18px',
              fontFamily: 'inherit',
              fontSize: '13px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#fff',
              background: confirmBg,
              boxShadow: confirmShadow,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

