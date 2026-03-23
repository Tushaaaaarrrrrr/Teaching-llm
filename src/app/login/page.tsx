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
        {/* Logo & Brand Horizontal Layout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px', width: '100%', maxWidth: '440px', background: 'rgba(255,255,255,0.4)', padding: '16px 24px', borderRadius: '32px', boxShadow: 'inset 4px 4px 8px #d1d5db, inset -4px -4px 8px #ffffff' }}>
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '24px', 
            background: '#F3F4F6', 
            boxShadow: '6px 6px 12px #d1d5db, -6px -6px 12px #ffffff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <img 
              src="/logo.png" 
              alt="Alpha IITIAN Logo" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                padding: '4px'
              }} 
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1e1e3a', letterSpacing: '-0.5px', marginBottom: '2px' }}>Alpha IITIAN</h1>
            <p style={{ fontSize: '14px', color: '#9999b0', fontWeight: '500' }}>Upgrade How You Learn</p>
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

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '0 0 20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#d1d5db' }} />
            <span style={{ fontSize: '12px', color: '#9999b0', fontWeight: '600' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#d1d5db' }} />
          </div>

          {/* Google Login */}
          <GoogleLoginButton />
        </div>
      </div>
    </div>
  )
}

function GoogleLoginButton() {
  const router = useRouter()
  const [gLoading, setGLoading] = useState(false)
  const [gError, setGError] = useState('')
  const [gsiReady, setGsiReady] = useState(false)

  useEffect(() => {
    const clientId = '990282572765-bn1ls79tuhpa589eiici5r9mr6c98c8h.apps.googleusercontent.com'

    // Load Google Identity Services script
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
        
        // Render the official Google button
        const buttonDiv = document.getElementById('google-button-container')
        if (buttonDiv) {
          (window as any).google.accounts.id.renderButton(buttonDiv, {
            theme: 'outline',
            size: 'large',
            shape: 'pill',
            width: 312, // Match form width
          })
        }
        setGsiReady(true)
      }
    }
    document.body.appendChild(script)

    return () => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      if (existing) existing.remove()
    }
  }, [])

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

  function handleGoogleClick() {
    // This is no longer needed as renderButton handles its own click
    // but we keep the logic to prompt one-tap if ready
    if (!gsiReady || gLoading) return
    ;(window as any).google.accounts.id.prompt()
  }

  return (
    <div>
      {gError && (
        <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '10px 14px', borderRadius: '12px', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {gError}
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: '13px', color: '#9999b0', marginBottom: '12px', fontWeight: '500' }}>
        Sign in or create an account using Google
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '44px' }}>
        <div id="google-button-container" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}></div>
        {!gsiReady && (
          <div style={{
            width: '100%', height: '44px', borderRadius: '50px', background: '#F3F4F6',
            boxShadow: '6px 6px 12px #d1d5db, -6px -6px 12px #ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            fontSize: '15px', fontWeight: '700', color: '#1e1e3a', opacity: 0.6
          }}>
             <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/></svg>
             Loading Google...
          </div>
        )}
      </div>
      
      {/* Hidden button to still allow one-tap if script fails to render but init succeeds */}
      {gsiReady && !gLoading && false && (
        <button onClick={handleGoogleClick} style={{ marginTop: '10px', fontSize: '11px', color: '#9999b0', background: 'none', border: 'none', cursor: 'pointer' }}>
          Try One-Tap
        </button>
      )}
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
