'use client'

import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'

export default function DataAnalysisPage() {
  return (
    <div style={{ padding: '24px 32px 48px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#1e1e3a', marginBottom: '8px' }}>
          📊 Data Analysis
        </h1>
        <p style={{ color: '#6b6b8a', fontSize: '14px' }}>
          Production-level LMS insights and student behavior metrics (Precomputed daily at 03:00 AM IST).
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  )
}
