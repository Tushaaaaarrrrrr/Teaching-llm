'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Show error from OAuth redirect (e.g. ?error=GoogleLoginNotConfigured)
  const oauthError = searchParams.get('error')
  const oauthErrorMap: Record<string, string> = {
    GoogleLoginNotConfigured: 'Google login is not configured yet. Please use email & password.',
    GoogleAuthFailed: 'Google authentication failed. Please try again.',
    GoogleEmailMissing: 'Could not retrieve your email from Google.',
    AccountDeactivated: 'Your account has been deactivated. Please contact support.',
    NoCodeProvided: 'Google login was cancelled or failed. Please try again.',
    InternalError: 'An internal error occurred. Please try again later.',
  }

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

  const displayError = error || (oauthError ? oauthErrorMap[oauthError] || `Login error: ${oauthError}` : '')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#e8eaf0' }}>
      {/* Left Panel - Branding */}
      <div style={{ flex: '0 0 42%', background: '#e8eaf0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', position: 'relative' }}>
        {/* Logo & Brand */}
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '340px' }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '24px', 
            background: '#e8eaf0', 
            boxShadow: '8px 8px 16px #c5c7cf, -8px -8px 16px #ffffff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 28px',
            overflow: 'hidden'
          }}>
            <img 
              src="/logo.png" 
              alt="Alpha IITIAN Logo" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                padding: '10px'
              }} 
            />
          </div>
          <h1 style={{ fontSize: '34px', fontWeight: '800', color: '#1e1e3a', letterSpacing: '-0.5px', marginBottom: '8px' }}>Alpha IITIAN</h1>
          <p style={{ fontSize: '15px', color: '#9999b0', marginBottom: '48px', lineHeight: '1.6' }}>Upgrade How You Learn</p>
          {/* Feature highlights */}
          {[
            { icon: '📚', label: 'Access course recordings' },
            { icon: '🎯', label: 'Join live courses' },
            { icon: '📅', label: 'Track your schedule' },
            { icon: '📄', label: 'Download study materials' },
          ].map((f) => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', background: '#e8eaf0', borderRadius: '50px', marginBottom: '12px', boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff' }}>
              <span style={{ fontSize: '18px' }}>{f.icon}</span>
              <span style={{ color: '#6b6b8a', fontSize: '14px', fontWeight: '500' }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Contact link */}
        <a
          href="mailto:care.alpha.iitian@gmail.com"
          style={{ position: 'absolute', bottom: '24px', left: '32px', fontSize: '12px', color: '#9999b0', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#3636e8')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#9999b0')}
        >
          <span>👉</span><span>Contact Developer</span>
        </a>
      </div>

      {/* Right Panel - Login Form */}
      <div style={{ flex: 1, background: '#e8eaf0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        <div style={{ width: '100%', maxWidth: '400px', background: '#e8eaf0', borderRadius: '28px', padding: '44px', boxShadow: '12px 12px 24px #c5c7cf, -12px -12px 24px #ffffff' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#1e1e3a', marginBottom: '6px' }}>Welcome back</h2>
          <p style={{ color: '#9999b0', fontSize: '14px', marginBottom: '28px' }}>Sign in to your account to connect with your coursemates and continue learning</p>

          {/* Error display */}
          {displayError && (
            <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {displayError}
            </div>
          )}

          {/* Email / Password form */}
          <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" type="email" className="form-input" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </div>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" type="password" className="form-input" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', background: loading ? '#9999cc' : '#3636e8', color: 'white', border: 'none', borderRadius: '50px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: loading ? 'none' : '4px 4px 10px rgba(54,54,232,0.4), -2px -2px 6px rgba(255,255,255,0.8)' }}
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

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#d0d2d9' }} />
            <span style={{ fontSize: '12px', color: '#9999b0', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#d0d2d9' }} />
          </div>

          {/* Helper text */}
          <p style={{ fontSize: '13px', color: '#9999b0', textAlign: 'center', marginBottom: '16px', fontWeight: '500' }}>
            Sign in or create an account using Google
          </p>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={() => { window.location.href = '/api/auth/google' }}
            style={{ width: '100%', padding: '13px 20px', background: '#e8eaf0', color: '#1e1e3a', border: 'none', borderRadius: '50px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff', transition: 'all 0.2s ease' }}
            onMouseOver={(e) => { e.currentTarget.style.boxShadow = '2px 2px 5px #c5c7cf, -2px -2px 5px #ffffff' }}
            onMouseOut={(e) => { e.currentTarget.style.boxShadow = '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff' }}
          >
            {/* Google Logo SVG */}
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e8eaf0' }}>
        <div style={{ color: '#9999b0', fontSize: '15px' }}>Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
