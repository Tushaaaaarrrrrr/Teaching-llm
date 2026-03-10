'use client'

import { useRouter } from 'next/navigation'

export default function TerminatedPage() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#e8eaf0',
      padding: '24px',
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: '#e8eaf0',
        borderRadius: '28px',
        padding: '48px 40px',
        boxShadow: '12px 12px 24px #c5c7cf, -12px -12px 24px #ffffff',
        textAlign: 'center',
      }}>
        {/* Error icon */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#e8eaf0',
          boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: '800',
          color: '#1e1e3a',
          marginBottom: '12px',
        }}>
          Account Terminated
        </h1>

        <p style={{
          fontSize: '15px',
          color: '#6b6b8a',
          lineHeight: '1.6',
          marginBottom: '32px',
        }}>
          Your ID has been terminated. Please contact the Admin for further details.
        </p>

        <button
          onClick={handleLogout}
          style={{
            padding: '12px 32px',
            background: '#3636e8',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '4px 4px 10px rgba(54,54,232,0.4), -2px -2px 6px rgba(255,255,255,0.8)',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  )
}
