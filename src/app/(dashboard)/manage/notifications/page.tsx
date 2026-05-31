'use client'

import { ManagePageInner } from '../ManagePageContent'
import { Suspense } from 'react'

export default function NotificationsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6366f1' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #e0e7ff', borderTopColor: '#6366f1' }} />
      </div>
    }>
      <ManagePageInner forcedTab="notifications" />
    </Suspense>
  )
}
