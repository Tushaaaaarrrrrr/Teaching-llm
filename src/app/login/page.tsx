'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#0d1526',
    }}>
      {/* Left Panel - Branding */}
      <div style={{
        flex: '0 0 45%',
        background: 'linear-gradient(135deg, #0d1526 0%, #1a2540 50%, #0d1526 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration circles */}
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(99,102,241,0.08)',
          top: '-100px',
          left: '-100px',
        }} />
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(139,92,246,0.06)',
          bottom: '50px',
          right: '-80px',
        }} />
        <div style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'rgba(99,102,241,0.05)',
          bottom: '200px',
          left: '30px',
        }} />

        {/* Logo & Brand */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: '800',
            color: '#ffffff',
            letterSpacing: '-0.5px',
            marginBottom: '8px',
          }}>
            Teaching LLM
          </h1>
          <p style={{
            fontSize: '15px',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: '48px',
            lineHeight: '1.6',
          }}>
            Modern Online Learning Platform
          </p>

          {/* Feature highlights */}
          {[
            { icon: '📚', label: 'Access course recordings' },
            { icon: '🎯', label: 'Join live classes' },
            { icon: '📅', label: 'Track your schedule' },
            { icon: '📄', label: 'Download study materials' },
          ].map((f) => (
            <div key={f.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              marginBottom: '10px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ fontSize: '18px' }}>{f.icon}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div style={{
        flex: 1,
        background: '#f0f2f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '26px',
              fontWeight: '700',
              color: '#0f172a',
              marginBottom: '6px',
            }}>
              Welcome back
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Sign in to your account to continue learning
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(99,102,241,0.3)',
              }}
            >
              {loading ? (
                <>
                  <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/>
                  </svg>
                  Signing In...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: '#f8f9fc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
          }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Accounts</p>
            {[
              { role: 'Manager', email: 'manager@teacherai.com', pass: 'manager123' },
              { role: 'Admin', email: 'admin@teacherai.com', pass: 'admin123' },
              { role: 'Student', email: 'student@teacherai.com', pass: 'student123' },
            ].map(acc => (
              <button
                key={acc.role}
                onClick={() => { setEmail(acc.email); setPassword(acc.pass) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginBottom: '4px',
                  background: 'transparent',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.15s',
                  color: '#475569',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#e0e7ff', e.currentTarget.style.color = '#4f46e5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = '#475569')}
              >
                <span style={{ fontWeight: '600' }}>{acc.role}</span>
                <span style={{ opacity: 0.7 }}>{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-left { display: none !important; }
          .login-right { flex: 1 !important; }
        }
      `}</style>
    </div>
  )
}
