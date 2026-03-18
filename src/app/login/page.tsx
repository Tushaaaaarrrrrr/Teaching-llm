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
      background: '#e8eaf0',
    }}>
      {/* Left Panel - Branding */}
      <div style={{
        flex: '0 0 42%',
        background: '#e8eaf0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        {/* Logo & Brand */}
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '340px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: '#e8eaf0',
            boxShadow: '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
          }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: '34px',
            fontWeight: '800',
            color: '#1e1e3a',
            letterSpacing: '-0.5px',
            marginBottom: '8px',
          }}>
            Teaching LLM
          </h1>
          <p style={{
            fontSize: '15px',
            color: '#9999b0',
            marginBottom: '48px',
            lineHeight: '1.6',
          }}>
            Modern Online Learning Platform
          </p>

          {/* Feature highlights */}
          {[
            { icon: '📚', label: 'Access course recordings' },
            { icon: '🎯', label: 'Join live courses' },
            { icon: '📅', label: 'Track your schedule' },
            { icon: '📄', label: 'Download study materials' },
          ].map((f) => (
            <div key={f.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 20px',
              background: '#e8eaf0',
              borderRadius: '50px',
              marginBottom: '12px',
              boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
            }}>
              <span style={{ fontSize: '18px' }}>{f.icon}</span>
              <span style={{ color: '#6b6b8a', fontSize: '14px', fontWeight: '500' }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div style={{
        flex: 1,
        background: '#e8eaf0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: '#e8eaf0',
          borderRadius: '28px',
          padding: '44px',
          boxShadow: '12px 12px 24px #c5c7cf, -12px -12px 24px #ffffff',
        }}>
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1e1e3a',
              marginBottom: '6px',
            }}>
              Welcome back
            </h2>
            <p style={{ color: '#9999b0', fontSize: '14px' }}>
              Sign in to your account to continue learning
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'inset 2px 2px 5px rgba(239,68,68,0.1)',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '20px' }}>
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

            <div className="form-group" style={{ marginBottom: '28px' }}>
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
                padding: '14px',
                background: loading ? '#9999cc' : '#3636e8',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: loading ? 'none' : '4px 4px 10px rgba(54,54,232,0.4), -2px -2px 6px rgba(255,255,255,0.8)',
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
            marginTop: '28px',
            padding: '18px',
            background: '#e8eaf0',
            borderRadius: '16px',
            boxShadow: 'inset 4px 4px 8px #c5c7cf, inset -4px -4px 8px #ffffff',
          }}>
            <p style={{ fontSize: '11px', color: '#9999b0', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Access</p>
            {[
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
                  padding: '8px 12px',
                  borderRadius: '50px',
                  marginBottom: '6px',
                  background: '#e8eaf0',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.15s',
                  color: '#6b6b8a',
                  boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#3636e8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b6b8a')}
              >
                <span style={{ fontWeight: '600' }}>{acc.role}</span>
                <span style={{ opacity: 0.7, fontSize: '11px' }}>{acc.email}</span>
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
