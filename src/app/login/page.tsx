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
  const [showRefundPolicy, setShowRefundPolicy] = useState(false)
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false)
  const [showTermsConditions, setShowTermsConditions] = useState(false)

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
            background: '#ffffff',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
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
        
        {/* Footer Links */}
        <div style={{ position: 'absolute', bottom: '24px', left: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: 'Refund Policy', icon: '💸', onClick: () => setShowRefundPolicy(true) },
            { label: 'Privacy Policy', icon: '🔒', onClick: () => setShowPrivacyPolicy(true) },
            { label: 'Terms & Conditions', icon: '📜', onClick: () => setShowTermsConditions(true) },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              style={{
                fontSize: '12px', color: '#9999b0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600',
                padding: '8px 16px', background: '#F3F4F6', borderRadius: '50px', border: 'none', cursor: 'pointer',
                boxShadow: '4px 4px 8px #d1d5db, -4px -4px 8px #ffffff', transition: 'all 0.2s ease'
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
              <span style={{ fontSize: '14px' }}>{btn.icon}</span><span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div style={{ flex: 1, background: '#F3F4F6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', position: 'relative' }}>
        <div className="modal" style={{ width: '100%', maxWidth: '480px', padding: '52px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#1e1e3a', marginBottom: '36px', textAlign: 'center' }}>Welcome Back !</h2>

          {/* Google Login is now the primary method */}
          <GoogleLoginButton onTermsClick={() => setShowTermsConditions(true)} onPrivacyClick={() => setShowPrivacyPolicy(true)} />

          {/* Email/Password divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 4px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.08)' }} />
            <span style={{ fontSize: '12px', color: '#9999b0', fontWeight: '600' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.08)' }} />
          </div>
          <button
            onClick={() => setShowSecretLogin(true)}
            style={{
              width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid rgba(0,0,0,0.08)',
              background: 'transparent', fontSize: '13px', fontWeight: '700', color: '#6b6b8a',
              cursor: 'pointer', transition: 'all 0.2s ease', letterSpacing: '0.01em'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#3636e8'; e.currentTarget.style.color = '#3636e8'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = '#6b6b8a'; }}
          >
            Sign in with Email & Password
          </button>
        </div>

        {/* Explore Courses CTA below the card */}
        <div style={{ marginTop: '28px', textAlign: 'center' }}>
          <a 
            href="https://app.genziitian.in/courses" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '18px 40px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #1e1e3a, #3a3a6e)',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '800',
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(30, 30, 58, 0.35)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              letterSpacing: '0.03em',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 14px 32px rgba(30, 30, 58, 0.45)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(30, 30, 58, 0.35)';
            }}
          >
            <span>Explore Courses</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        </div>
        
        {/* Contact Developer Link (Bottom Right) */}
        <a
          href="mailto:admin@genziitian.org"
          style={{ 
            position: 'absolute', 
            bottom: '24px', 
            right: '32px', 
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
          <div className="modal" style={{ width: '100%', maxWidth: '400px', padding: '44px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e1e3a', margin: 0 }}>Sign In</h2>
              <button 
                onClick={() => setShowSecretLogin(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', color: '#9999b0', cursor: 'pointer', padding: '0 8px' }}
              >
                &times;
              </button>
            </div>
            <p style={{ color: '#9999b0', fontSize: '13px', marginBottom: '24px' }}>Enter your email and password to continue.</p>

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
      {/* Policy Modals */}
      {[
        { 
          show: showRefundPolicy, 
          close: () => setShowRefundPolicy(false), 
          title: 'Return & Refund Policy', 
          content: (
            <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '12px' }}>At GenZ IITian, we provide 100% digital educational services in the form of online courses. There is no physical product, shipment, or delivery involved.</p>
              <p style={{ marginBottom: '12px' }}>Due to the nature of digital content, all purchases are final. We do not offer refunds, returns, or exchanges under any circumstances once a course has been purchased.</p>
              <p style={{ marginBottom: '12px' }}>We strongly recommend reviewing course details before making a purchase.</p>
              <p style={{ marginBottom: '12px' }}>In case of any technical issues, payment errors, or access-related problems, you can contact our support team. We will ensure that you receive proper access to your purchased course.</p>
              <p>We reserve the right to update or modify this policy at any time without prior notice. Changes will be effective immediately upon posting.</p>
            </div>
          )
        },
        { 
          show: showPrivacyPolicy, 
          close: () => setShowPrivacyPolicy(false), 
          title: 'Privacy Policy', 
          content: (
            <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '12px' }}>At GenZ IITian, we respect your privacy and are committed to protecting your data.</p>
              <h4 style={{ color: '#1e1e3a', fontWeight: '600', marginBottom: '8px' }}>Information We Collect</h4>
              <p style={{ marginBottom: '12px' }}>We collect basic details such as your name, email, phone number, and device information to manage your registration, purchases, and account history.<br/>We also collect usage data to understand how you interact with our platform.</p>
              <h4 style={{ color: '#1e1e3a', fontWeight: '600', marginBottom: '8px' }}>How We Use Your Information</h4>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li>Provide and improve our courses and services</li>
                <li>Personalize your learning experience</li>
                <li>Communicate updates, offers, and important information</li>
                <li>Provide customer support</li>
                <li>Ensure platform security and prevent misuse</li>
              </ul>
              <h4 style={{ color: '#1e1e3a', fontWeight: '600', marginBottom: '8px' }}>Changes to This Policy</h4>
              <p style={{ marginBottom: '12px' }}>We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date.</p>
              <h4 style={{ color: '#1e1e3a', fontWeight: '600', marginBottom: '8px' }}>Contact Us</h4>
              <p>If you have any questions or concerns, you can contact us at:<br/>Email: help@genziitian.in</p>
            </div>
          )
        },
        { 
          show: showTermsConditions, 
          close: () => setShowTermsConditions(false), 
          title: 'Terms & Conditions', 
          content: (
            <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
              <p style={{ fontSize: '12px', color: '#9999b0', marginBottom: '16px' }}>Last Updated: April 2026</p>
              <h4 style={{ color: '#1e1e3a', fontWeight: '600', marginBottom: '4px' }}>01 Service Description</h4>
              <p style={{ marginBottom: '12px' }}>Gen-Z IITian provides access to premium digital educational courses designed specifically for students. Our services are delivered entirely online. Access to the courses is granted immediately upon successful completion of the payment process.</p>
              <h4 style={{ color: '#1e1e3a', fontWeight: '600', marginBottom: '4px' }}>02 User Account & Security</h4>
              <p style={{ marginBottom: '12px' }}>To access our courses, users must sign in via their Google account. You are solely responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. We reserve the right to terminate accounts that violate our security protocols.</p>
              <h4 style={{ color: '#1e1e3a', fontWeight: '600', marginBottom: '4px' }}>03 Course Access & Usage</h4>
              <p style={{ marginBottom: '12px' }}>Access is granted exclusively to the email address used during the purchase.<br/>Course access is non-transferable and intended for personal use only.<br/>Sharing account credentials or course content with third parties is strictly prohibited.</p>
              <h4 style={{ color: '#1e1e3a', fontWeight: '600', marginBottom: '4px' }}>04 Payment Terms</h4>
              <p style={{ marginBottom: '12px' }}>All prices are clearly displayed before the final checkout. By proceeding with the payment, you agree to the price and terms of the specific course. All payments are processed through secure third-party payment gateways (Razorpay, Stripe, or Cashfree).</p>
              <h4 style={{ color: '#1e1e3a', fontWeight: '600', marginBottom: '4px' }}>05 Prohibited Use & Copyright</h4>
              <p style={{ marginBottom: '12px' }}>All content on this platform, including videos, documents, and code samples, is the intellectual property of Gen-Z IITian. Any form of piracy, unauthorized redistribution, or commercial use of our content will result in legal action and immediate termination of access without notice.</p>
              <h4 style={{ color: '#1e1e3a', fontWeight: '600', marginBottom: '4px' }}>06 Limitation of Liability</h4>
              <p>Gen-Z IITian is an educational platform. While we strive for excellence, we do not guarantee specific academic results or career outcomes. The platform is not responsible for any misuse of the information provided or for any technical issues arising from the user's internet connection or device.</p>
            </div>
          )
        }
      ].map((modal, i) => modal.show && (
        <div 
          key={i}
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' 
          }}
          onClick={(e) => { if (e.target === e.currentTarget) modal.close() }}
        >
          <div className="modal" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', padding: '44px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e1e3a', margin: 0 }}>{modal.title}</h2>
              <button onClick={modal.close} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#9999b0', cursor: 'pointer', padding: '0 8px' }}>&times;</button>
            </div>
            {modal.content}
          </div>
        </div>
      ))}

    </div>
  )
}

function GoogleLoginButton({ onTermsClick, onPrivacyClick }: { onTermsClick?: () => void, onPrivacyClick?: () => void }) {
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

      <p style={{ textAlign: 'center', fontSize: '17px', color: '#1e1e3a', marginBottom: '36px', fontWeight: '600', whiteSpace: 'nowrap' }}>
        Log in or create a new account with Google
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
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            cursor: gsiReady && !gLoading ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '16px',
            fontWeight: '700',
            color: '#1e1e3a',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            opacity: gsiReady ? 1 : 0.6,
          }}
          onMouseOver={(e) => {
            if (gsiReady && !gLoading) {
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
            e.currentTarget.style.transform = 'none'
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

      <div style={{ marginTop: '16px' }}>
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#9999b0', fontWeight: '500', lineHeight: '1.5', whiteSpace: 'nowrap' }}>
          By continuing, you agree to the <span onClick={onTermsClick} style={{ color: '#1e1e3a', cursor: 'pointer', textDecoration: 'underline' }}>Terms & Conditions</span> & <span onClick={onPrivacyClick} style={{ color: '#1e1e3a', cursor: 'pointer', textDecoration: 'underline' }}>privacy policy</span>
        </p>
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
