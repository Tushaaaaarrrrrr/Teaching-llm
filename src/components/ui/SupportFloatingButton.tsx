'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SupportFloatingButton() {
  const pathname = usePathname()

  // Visibility Rules:
  // Hide on: Profile, Settings, Exam pages, Lecture pages (recordings), Support tab, Community section
  const hiddenPaths = [
    '/profile',
    '/settings',
    '/exams',
    '/recordings',
    '/support',
    '/community'
  ]

  const isHidden = hiddenPaths.some(path => pathname === path || pathname.startsWith(path + '/'))

  if (isHidden) return null

  return (
    <Link
      href="/support"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        borderRadius: '50px',
        background: 'linear-gradient(135deg, #3636e8 0%, #5b5bf0 100%)',
        color: '#ffffff',
        textDecoration: 'none',
        fontWeight: '700',
        fontSize: '14px',
        boxShadow: '0 8px 16px rgba(54,54,232,0.3)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      }}
      className="support-btn-float"
    >
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      Need Help?
      <style jsx>{`
        .support-btn-float:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 24px rgba(54,54,232,0.4);
        }
        .support-btn-float:active {
          transform: translateY(-2px) scale(0.98);
        }
      `}</style>
    </Link>
  )
}
