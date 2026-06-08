'use client'

import { Suspense } from 'react'
import { ManagePageInner } from './ManagePageContent'

export default function ManagePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--accent)' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)' }} />
      </div>
    }>
      <ManagePageInner />
    </Suspense>
  )
}
