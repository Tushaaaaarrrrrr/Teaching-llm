'use client'

import { useState, Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CreepyButton from '@/components/ui/CreepyButton'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAwake, setIsAwake] = useState(false)
  const [showSecretLogin, setShowSecretLogin] = useState(false)

   const signInBtnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let idleTimeout: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      let awake = false;
      const checkDist = (ref: React.RefObject<HTMLElement>) => {
        if (!ref.current) return false;
        const rect = ref.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        return dist < 250;
      };

      if (checkDist(signInBtnRef)) {
        awake = true;
      }
      setIsAwake(awake);

      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        setIsAwake(true);
        setTimeout(() => setIsAwake(false), 2000);
      }, 30000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    idleTimeout = setTimeout(() => {
      setIsAwake(true);
      setTimeout(() => setIsAwake(false), 2000);
    }, 30000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(idleTimeout);
    };
  }, []);

  // Show error from query params if any
  const queryError = searchParams.get('error')
  const errorMap: Record<string, string> = {
    AccountDeactivated: 'Your account has been deactivated. Please contact support.',
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

  const displayError = error || (queryError ? errorMap[queryError] || `Login error: ${queryError}` : '')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F3F4F6' }}>
      {/* Left Panel - Branding */}
      <div style={{ flex: '0 0 42%', background: '#F3F4F6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', position: 'relative' }}>
        {/* Logo & Tagline Centered Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '40px', width: '100%', maxWidth: '440px' }}>
          <div 
            onClick={() => setShowSecretLogin(true)}
            style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            overflow: 'hidden',
            flexShrink: 0,
            width: '100%',
            maxWidth: '320px',
            minHeight: '148px',
            padding: '22px 22px 18px',
            borderRadius: '28px',
            background: '#F3F4F6',
            boxShadow: '10px 10px 22px #d1d5db, -10px -10px 22px #ffffff',
            cursor: 'default',
          }}>
            <img 
              src="/logo.png" 
              alt="GENz IITIAN Logo" 
              style={{ 
                width: '100%',
                maxWidth: '260px',
                height: 'auto',
                maxHeight: '84px',
                objectFit: 'contain',
                display: 'block',
              }} 
            />
            <p style={{ fontSize: '18px', color: '#6b6b8a', fontWeight: '500', letterSpacing: '0.02em', marginTop: '14px', textAlign: 'center' }}>
              Upgrade How You Learn
            </p>
          </div>
        </div>
          
          {/* Geometric Characters Composition */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'center', justifyContent: 'center', margin: '40px 0' }}>
            {/* Purple Rectangle */}
            <div className="animate-float" style={{ width: '160px', height: '200px', background: '#8B5CF6', borderRadius: '24px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animationDelay: '0s', boxShadow: '0 15px 35px rgba(139, 92, 246, 0.4)' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '16px', height: '16px', background: 'white', borderRadius: '50%' }} />
                <div style={{ width: '16px', height: '16px', background: 'white', borderRadius: '50%' }} />
              </div>
              <div style={{ width: '32px', height: '16px', border: '4px solid white', borderTop: 'none', borderRadius: '0 0 16px 16px', marginTop: '12px' }} />
            </div>

            {/* Black Rounded Rectangle */}
            <div className="animate-float" style={{ width: '180px', height: '220px', background: '#111827', borderRadius: '40px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animationDelay: '2s', boxShadow: '0 15px 35px rgba(17, 24, 39, 0.4)' }}>
              <div style={{ display: 'flex', gap: '14px' }}>
                <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%' }} />
                <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%' }} />
              </div>
              <div style={{ width: '40px', height: '10px', background: 'white', borderRadius: '5px', marginTop: '16px' }} />
            </div>

            {/* Orange Semicircle */}
            <div className="animate-float" style={{ width: '200px', height: '100px', background: '#F97316', borderRadius: '100px 100px 0 0', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '16px', animationDelay: '4s', boxShadow: '0 15px 35px rgba(249, 115, 22, 0.4)' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                <div style={{ width: '12px', height: '12px', background: 'white', borderRadius: '50%' }} />
                <div style={{ width: '12px', height: '12px', background: 'white', borderRadius: '50%' }} />
              </div>
              <div style={{ width: '36px', height: '18px', border: '4px solid white', borderTop: 'none', borderRadius: '0 0 18px 18px' }} />
            </div>

            {/* Yellow Organic Blob */}
            <div className="animate-float" style={{ width: '180px', height: '180px', background: '#FACC15', borderRadius: '50% 50% 30% 70% / 50% 50% 70% 30%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animationDelay: '6s', boxShadow: '0 15px 35px rgba(250, 204, 21, 0.4)' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '14px', height: '14px', background: 'white', borderRadius: '50%' }} />
                <div style={{ width: '14px', height: '14px', background: 'white', borderRadius: '50%' }} />
              </div>
              <div style={{ width: '32px', height: '3px', background: 'white', marginTop: '12px' }} />
            </div>
          </div>
        
        {/* Contact link */}
        <a
          href="mailto:care.alpha.iitian@gmail.com"
          style={{ 
            position: 'absolute', 
            bottom: '24px', 
            left: '32px', 
            fontSize: '12px', 
            color: '#9999b0', 
            textDecoration: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontWeight: '600',
            padding: '8px 16px',
            background: '#F3F4F6',
            borderRadius: '50px',
            boxShadow: '4px 4px 8px #d1d5db, -4px -4px 8px #ffffff',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.boxShadow = '2px 2px 4px #d1d5db, -2px -2px 4px #ffffff';
            e.currentTarget.style.color = '#3636e8';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.boxShadow = '4px 4px 8px #d1d5db, -4px -4px 8px #ffffff';
            e.currentTarget.style.color = '#9999b0';
          }}
        >
          <span style={{ fontSize: '14px' }}>✉️</span><span>Contact Developer</span>
        </a>
      </div>

      {/* Right Panel - Login Form */}
      <div style={{ flex: 1, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        <div style={{ width: '100%', maxWidth: '400px', background: '#F3F4F6', borderRadius: '28px', padding: '44px', boxShadow: '12px 12px 24px #d1d5db, -12px -12px 24px #ffffff' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#1e1e3a', marginBottom: '6px' }}>Welcome back!</h2>
          <p style={{ color: '#9999b0', fontSize: '14px', marginBottom: '28px' }}>Sign in to continue your learning journey</p>

          {/* Google Login is now the primary method */}
          <GoogleLoginButton />
        </div>
      </div>

      {/* Secret Login Modal */}
      {showSecretLogin && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0, 0, 0, 0.6)', 
            backdropFilter: 'blur(4px)',
            zIndex: 1000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '24px' 
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSecretLogin(false)
            }
          }}
        >
          <div style={{ width: '100%', maxWidth: '400px', background: '#F3F4F6', borderRadius: '28px', padding: '44px', boxShadow: '12px 12px 24px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e1e3a', margin: 0 }}>Secret Login</h2>
              <button 
                onClick={() => setShowSecretLogin(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', color: '#9999b0', cursor: 'pointer', padding: '0 8px' }}
              >
                &times;
              </button>
            </div>

            {/* Error display */}
            {displayError && (
              <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {displayError}
              </div>
            )}

            {/* Email / Password form */}
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" htmlFor="email">Email</label>
                <input id="email" type="email" className="form-input" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" htmlFor="password">Password</label>
                <input id="password" type="password" className="form-input" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <div ref={signInBtnRef}>
                <CreepyButton
                  type="submit"
                  loading={loading}
                  disabled={loading}
                  isAwake={isAwake}
                >
                  Sign In
                </CreepyButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function GoogleLoginButton() {
  const router = useRouter()
  const [gLoading, setGLoading] = useState(false)
  const [gError, setGError] = useState('')
  const [gsiReady, setGsiReady] = useState(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clientId = '990282572765-bn1ls79tuhpa589eiici5r9mr6c98c8h.apps.googleusercontent.com'

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        })
        setGsiReady(true)
      }
    }
    document.body.appendChild(script)

    return () => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      if (existing) existing.remove()
    }
  }, [])

  // Render the actual Google button when GSI is ready
  useEffect(() => {
    if (gsiReady && googleBtnRef.current && (window as any).google) {
      (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: googleBtnRef.current.parentElement?.offsetWidth || 312,
        type: 'standard',
        shape: 'pill',
      });
    }
  }, [gsiReady])

  async function handleGoogleResponse(response: any) {
    setGLoading(true)
    setGError('')
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })

      const data = await res.json()

      if (!res.ok) {
        setGError(data.error || 'Google login failed')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setGError('Something went wrong with Google login.')
    } finally {
      setGLoading(false)
    }
  }

  return (
    <div>
      {gError && (
        <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '10px 14px', borderRadius: '12px', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {gError}
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: '13px', color: '#9999b0', marginBottom: '16px', fontWeight: '500' }}>
        Sign in or create an account using Google
      </p>

      <div style={{ position: 'relative' }}>
        {/* The invisible Google button container that sits on top of our custom button */}
        <div 
          ref={googleBtnRef} 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            opacity: 0.01, 
            zIndex: 10,
            cursor: gsiReady ? 'pointer' : 'default',
            overflow: 'hidden'
          }} 
        />
        
        <button
          disabled={!gsiReady || gLoading}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: '50px',
            border: 'none',
            background: '#F3F4F6',
            boxShadow: '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff',
            cursor: gsiReady && !gLoading ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '15px',
            fontWeight: '700',
            color: '#1e1e3a',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            opacity: gsiReady ? 1 : 0.6,
          }}
          onMouseOver={(e) => {
            if (gsiReady && !gLoading) {
              e.currentTarget.style.boxShadow = '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff'
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.boxShadow = '6px 6px 12px #c5c7cf, -6px -6px 12px #ffffff'
          }}
        >
          {gLoading ? (
            <>
              <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/></svg>
              Signing in...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }}>
        <div style={{ color: '#9999b0', fontSize: '15px' }}>Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
