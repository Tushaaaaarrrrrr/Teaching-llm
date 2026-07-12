'use client'

import { useEffect, useState } from 'react'
import { isCapacitorNative, registerCapacitorPush, checkCapacitorPermission } from '@/lib/capacitor-push'
import { usePushNotifications } from '@/hooks/usePushNotifications'

// ─── localStorage keys ────────────────────────────────────────────────────────
const KEY_INTERACTED        = 'push_permission_modal_interacted'
const KEY_LAST_DECLINED     = 'push_permission_last_declined_time'
const KEY_PUSH_ENABLED      = 'push_enabled'
const KEY_DENIED_LAST_SHOWN = 'push_denied_modal_last_shown'

const SEVEN_DAYS  = 7  * 24 * 60 * 60 * 1000
const ONE_DAY     = 24 * 60 * 60 * 1000

// ─── Helper: open Android notification settings via Capacitor ─────────────────
async function openAndroidNotificationSettings() {
  try {
    // Get the app package name to build the deep-link
    const { App } = await import('@capacitor/app')
    const { Browser } = await import('@capacitor/browser')
    const info = await App.getInfo().catch(() => ({ id: '' }))
    const pkg  = info.id ?? ''

    // "app-settings:" is a well-known URI scheme that Android resolves to
    // the app-specific notification settings screen (Android 8+)
    const uri = pkg
      ? `app-settings:${pkg}`
      : 'android.settings.APP_NOTIFICATION_SETTINGS'

    await Browser.open({ url: uri }).catch(async () => {
      // Fallback: open the generic notification settings page
      await Browser.open({ url: 'android.settings.APPLICATION_DETAILS_SETTINGS' })
    })
  } catch (err) {
    console.error('[PushNotificationSetup] Could not open Android settings:', err)
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// Modal A — First-time permission request
// ═════════════════════════════════════════════════════════════════════════════
function RequestPermissionModal({
  onEnable,
  onLater,
}: {
  onEnable: () => void
  onLater:  () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.50)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onLater}
    >
      <style>{`
        @keyframes pnsSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes pnsPulse {
          0%   { transform: scale(0.95); opacity: 0.8; }
          50%  { transform: scale(1.18); opacity: 0.25; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--surface-2)',
          borderRadius: '28px',
          padding: '32px 28px 24px',
          boxShadow: '0 24px 48px rgba(15,23,42,0.18), 0 8px 16px rgba(15,23,42,0.08), inset 0 1px 0 var(--neu-glow)',
          border: '1px solid rgba(255,255,255,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'pnsSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{ position: 'relative', marginBottom: '22px' }}>
          <div style={{
            position: 'absolute', inset: '-10px', borderRadius: '50%',
            background: 'rgba(54,54,232,0.13)', animation: 'pnsPulse 2.2s infinite',
          }} />
          <div style={{
            width: '68px', height: '68px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #3636e8, #6366f1)',
            boxShadow: '0 8px 20px rgba(54,54,232,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
        </div>

        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '10px', fontFamily: "'Outfit', sans-serif" }}>
          Enable Live Alerts
        </div>
        <p style={{ fontSize: '13.5px', lineHeight: '1.65', color: 'var(--text-secondary)', marginBottom: '26px', padding: '0 4px' }}>
          Get instant updates for live sessions, subject blueprints, announcements, and study notes so you never miss a class.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px' }}>
          <button
            type="button"
            onClick={onEnable}
            style={{
              width: '100%', border: 'none', borderRadius: '50px',
              padding: '14px 20px', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700',
              cursor: 'pointer', color: '#fff',
              background: 'linear-gradient(135deg, #3636e8, #6366f1)',
              boxShadow: '4px 4px 10px rgba(54,54,232,0.25), inset 1px 1px 0 var(--neu-glow)',
              transition: 'all 0.2s ease',
            }}
          >
            Enable Now
          </button>
          <button
            type="button"
            onClick={onLater}
            style={{
              width: '100%', border: 'none', background: 'transparent',
              padding: '10px 20px', fontFamily: 'inherit', fontSize: '13.5px',
              fontWeight: '600', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s ease',
            }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal B — Permission Denied (24-hr throttle) — step-by-step guide
// ═════════════════════════════════════════════════════════════════════════════
function PermissionDeniedModal({ onDismiss }: { onDismiss: () => void }) {
  const steps = [
    { icon: '⚙️', text: 'Open your phone\'s Settings' },
    { icon: '📱', text: 'Tap  Apps  →  GENz IITIAN' },
    { icon: '🔔', text: 'Tap  Notifications' },
    { icon: '✅', text: 'Toggle  Allow Notifications  ON' },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(10, 10, 30, 0.60)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onDismiss}
    >
      <style>{`
        @keyframes deniedSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes deniedShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-4px); }
          40%     { transform: translateX(4px); }
          60%     { transform: translateX(-3px); }
          80%     { transform: translateX(3px); }
        }
        @keyframes stepFadeIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'linear-gradient(160deg, #1a1a3a 0%, #12122a 100%)',
          borderRadius: '28px',
          padding: '30px 26px 24px',
          boxShadow: '0 32px 64px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 var(--neu-glow)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'deniedSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          boxShadow: '0 8px 24px rgba(245,158,11,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '18px',
          animation: 'deniedShake 0.5s ease 0.4s',
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="22" x2="12" y2="22" />
          </svg>
        </div>

        {/* Headline */}
        <div style={{
          fontSize: '18px', fontWeight: '800', color: '#ffffff',
          marginBottom: '6px', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.3px',
        }}>
          Notifications are Blocked 🔕
        </div>
        <p style={{
          fontSize: '13px', lineHeight: '1.6', color: 'rgba(255,255,255,0.55)',
          marginBottom: '22px', padding: '0 4px',
        }}>
          You&apos;ll miss live class alerts &amp; announcements. Enable them in Android Settings — it only takes 10 seconds.
        </p>

        {/* Step-by-step guide */}
        <div style={{
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '14px 16px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          textAlign: 'left',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '2px' }}>
            How to enable
          </div>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                animation: `stepFadeIn 0.3s ease ${0.1 + i * 0.07}s both`,
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                background: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px',
              }}>
                {step.icon}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366f1, #3636e8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: '800', color: '#fff',
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.80)', lineHeight: '1.4' }}>
                  {step.text}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px' }}>
          <button
            type="button"
            onClick={async () => {
              await openAndroidNotificationSettings()
              onDismiss()
            }}
            style={{
              width: '100%', border: 'none', borderRadius: '50px',
              padding: '14px 20px', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700',
              cursor: 'pointer', color: '#fff',
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              boxShadow: '0 6px 20px rgba(245,158,11,0.30), inset 1px 1px 0 var(--neu-glow)',
              transition: 'all 0.2s ease',
            }}
          >
            Open Settings Now →
          </button>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              width: '100%', border: 'none', background: 'transparent',
              padding: '10px 20px', fontFamily: 'inherit', fontSize: '13px',
              fontWeight: '600', color: 'rgba(255,255,255,0.30)', cursor: 'pointer',
              transition: 'color 0.2s ease',
            }}
          >
            Remind me tomorrow
          </button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Web Browser Custom Modals
// ═════════════════════════════════════════════════════════════════════════════

function WebPromptModal({
  onEnable,
  onLater,
}: {
  onEnable: () => void
  onLater:  () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.50)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onLater}
    >
      <style>{`
        @keyframes wpSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes wpPulse {
          0%   { transform: scale(0.95); opacity: 0.8; }
          50%  { transform: scale(1.18); opacity: 0.25; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--surface-2)',
          borderRadius: '28px',
          padding: '32px 28px 24px',
          boxShadow: '0 24px 48px rgba(15,23,42,0.18), 0 8px 16px rgba(15,23,42,0.08), inset 0 1px 0 var(--neu-glow)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'wpSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ position: 'relative', marginBottom: '22px' }}>
          <div style={{
            position: 'absolute', inset: '-10px', borderRadius: '50%',
            background: 'rgba(54,54,232,0.13)', animation: 'wpPulse 2.2s infinite',
          }} />
          <div style={{
            width: '68px', height: '68px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #3636e8, #6366f1)',
            boxShadow: '0 8px 20px rgba(54,54,232,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
        </div>

        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '10px', fontFamily: "'Outfit', sans-serif" }}>
          Stay Updated with Live Alerts
        </div>
        <p style={{ fontSize: '13.5px', lineHeight: '1.65', color: 'var(--text-secondary)', marginBottom: '26px', padding: '0 4px' }}>
          Get instant updates for live sessions, subject blueprints, announcements, and study notes so you never miss a class.
        </p>

        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button
            type="button"
            onClick={onLater}
            style={{
              flex: 1, border: '1.5px solid var(--border)', background: 'transparent',
              padding: '12px 20px', fontFamily: 'inherit', fontSize: '13.5px',
              fontWeight: '600', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '50px',
              transition: 'all 0.2s ease',
            }}
          >
            Later
          </button>
          <button
            type="button"
            onClick={onEnable}
            style={{
              flex: 1, border: 'none', borderRadius: '50px',
              padding: '12px 20px', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '700',
              cursor: 'pointer', color: '#fff',
              background: 'linear-gradient(135deg, #3636e8, #6366f1)',
              boxShadow: '4px 4px 10px rgba(54,54,232,0.25), inset 1px 1px 0 var(--neu-glow)',
              transition: 'all 0.2s ease',
            }}
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  )
}

function WebPointerOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(10, 10, 30, 0.70)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        pointerEvents: 'auto',
      }}
    >
      {/* Curved dashed line pointing to the top-left corner */}
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" style={{ position: 'absolute', top: '16px', left: '16px' }}>
        <path d="M100 100 C 60 100, 30 70, 20 20" stroke="#fff" strokeWidth="3.5" strokeDasharray="6,6" strokeLinecap="round"/>
        <path d="M10 35 L 20 20 L 35 30" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div style={{
        position: 'absolute',
        top: '120px',
        left: '48px',
        color: '#ffffff',
        maxWidth: '320px',
        fontFamily: "'Outfit', sans-serif",
      }}>
        <div style={{ fontSize: '20px', fontWeight: '850', marginBottom: '8px', letterSpacing: '-0.3px' }}>
          Almost there!
        </div>
        <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, fontWeight: '500' }}>
          Please click on <strong style={{ color: '#6366f1' }}>&quot;Allow&quot;</strong> in the browser prompt next to the address bar to enable desktop notifications.
        </div>
      </div>
    </div>
  )
}

function WebBlockedModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(10, 10, 30, 0.60)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onDismiss}
    >
      <style>{`
        @keyframes wbSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--surface-2)',
          borderRadius: '28px',
          padding: '32px 28px 24px',
          boxShadow: '0 32px 64px rgba(0,0,0,0.3), inset 0 1px 0 var(--neu-glow)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'wbSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          boxShadow: '0 8px 24px rgba(245,158,11,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px',
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="22" x2="12" y2="22" />
          </svg>
        </div>

        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px', fontFamily: "'Outfit', sans-serif" }}>
          Notifications are Blocked 🔕
        </div>
        <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-muted)', marginBottom: '22px', padding: '0 4px' }}>
          It seems like you have blocked desktop notifications from GENz IITIAN. Please unblock them to receive live class alerts.
        </p>

        {/* Step by step unblock guide */}
        <div style={{
          width: '100%',
          background: 'rgba(54,54,232,0.03)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '16px 18px',
          marginBottom: '24px',
          textAlign: 'left',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '750', color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '10px' }}>
            How to Unblock
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-primary)' }}>
              <span style={{ fontSize: '15px' }}>🔒</span>
              <span>Click the <strong>Lock icon</strong> next to the website URL in the address bar.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-primary)' }}>
              <span style={{ fontSize: '15px' }}>🔔</span>
              <span>Find <strong>Notifications</strong> and change permission to <strong>Allow</strong>.</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          style={{
            width: '100%', border: 'none', borderRadius: '50px',
            padding: '14px 20px', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700',
            cursor: 'pointer', color: '#fff',
            background: 'linear-gradient(135deg, #3636e8, #6366f1)',
            boxShadow: '0 6px 20px rgba(54,54,232,0.25)',
            transition: 'all 0.2s ease',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
type ModalKind = 'request' | 'denied' | null

export default function PushNotificationSetup() {
  const { isSupported, isSubscribed, permissionState, subscribe } = usePushNotifications()
  const [modalKind, setModalKind] = useState<ModalKind>(null)
  
  // Custom Web state
  const [showWebPrompt, setShowWebPrompt] = useState(false)
  const [showWebOverlay, setShowWebOverlay] = useState(false)
  const [showWebBlocked, setShowWebBlocked] = useState(false)

  useEffect(() => {
    console.log('[PushNotificationSetup] useEffect triggered')

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('reset_push') === 'true') {
        console.log('[PushNotificationSetup] reset_push=true — clearing push localStorage keys')
        localStorage.removeItem(KEY_INTERACTED)
        localStorage.removeItem(KEY_LAST_DECLINED)
        localStorage.removeItem(KEY_PUSH_ENABLED)
        localStorage.removeItem(KEY_DENIED_LAST_SHOWN)
      }
    }

    // ── Capacitor Native App ─────────────────────────────────────────────────
    if (isCapacitorNative()) {
      checkCapacitorPermission().then((status) => {
        console.log('[PushNotificationSetup] Permission status:', status)

        if (status === 'granted') {
          // Already granted — silently sync token
          registerCapacitorPush()
          return
        }

        if (status === 'denied') {
          // User previously denied in OS — show "go to Settings" modal once/24h
          const lastShown = localStorage.getItem(KEY_DENIED_LAST_SHOWN)
          const elapsed   = lastShown ? Date.now() - Number(lastShown) : Infinity

          if (elapsed < ONE_DAY) {
            console.log('[PushNotificationSetup] Denied modal suppressed — shown < 24h ago')
            return
          }

          const timer = setTimeout(() => {
            setModalKind('denied')
          }, 1500)
          return () => clearTimeout(timer)
        }

        // status === 'prompt' / 'prompt-with-rationale' — first-time ask
        const interacted   = localStorage.getItem(KEY_INTERACTED)
        const lastDeclined = localStorage.getItem(KEY_LAST_DECLINED)

        let shouldPrompt = false
        if (interacted !== 'true') {
          shouldPrompt = true
        } else if (lastDeclined) {
          const elapsed = Date.now() - Number(lastDeclined)
          if (elapsed > SEVEN_DAYS) {
            shouldPrompt = true
          }
        }

        if (shouldPrompt) {
          const timer = setTimeout(() => {
            setModalKind('request')
          }, 1200)
          return () => clearTimeout(timer)
        }
      })

      return
    }

    // ── Browser Web Push ─────────────────────────────────────────────────────
    if (!isSupported || isSubscribed) return

    // Listen for custom trigger to show blocked modal on desktop
    const handleShowBlocked = () => {
      setShowWebBlocked(true)
    }
    window.addEventListener('show-push-blocked-modal', handleShowBlocked)

    // Check if permission prompt is needed
    if (permissionState === 'default') {
      const interacted = localStorage.getItem(KEY_INTERACTED)
      const lastDeclined = localStorage.getItem(KEY_LAST_DECLINED)
      
      let shouldPrompt = false
      if (interacted !== 'true') {
        shouldPrompt = true
      } else if (lastDeclined) {
        const elapsed = Date.now() - Number(lastDeclined)
        if (elapsed > SEVEN_DAYS) {
          shouldPrompt = true
        }
      }

      if (shouldPrompt) {
        const timer = setTimeout(() => {
          setShowWebPrompt(true)
        }, 2000)
        return () => {
          window.removeEventListener('show-push-blocked-modal', handleShowBlocked)
          clearTimeout(timer)
        }
      }
    }

    return () => {
      window.removeEventListener('show-push-blocked-modal', handleShowBlocked)
    }
  }, [isSupported, isSubscribed, permissionState])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleEnable = async () => {
    setModalKind(null)
    localStorage.setItem(KEY_INTERACTED, 'true')

    const success = await registerCapacitorPush()
    if (success) {
      localStorage.setItem(KEY_PUSH_ENABLED, 'true')
      localStorage.removeItem(KEY_LAST_DECLINED)
    } else {
      // Permission was denied at the OS prompt level — treat as denied next time
      localStorage.setItem(KEY_PUSH_ENABLED, 'false')
      localStorage.setItem(KEY_LAST_DECLINED, Date.now().toString())
      // Next open will detect status=denied and show the settings modal
    }
  }

  const handleLater = () => {
    setModalKind(null)
    localStorage.setItem(KEY_INTERACTED, 'true')
    localStorage.setItem(KEY_PUSH_ENABLED, 'false')
    localStorage.setItem(KEY_LAST_DECLINED, Date.now().toString())
  }

  const handleDeniedDismiss = () => {
    setModalKind(null)
    // Record timestamp — won't show again for 24h
    localStorage.setItem(KEY_DENIED_LAST_SHOWN, Date.now().toString())
  }

  // ── Web Handlers ────────────────────────────────────────────────────────────

  const handleWebEnable = async () => {
    setShowWebPrompt(false)
    setShowWebOverlay(true)
    localStorage.setItem(KEY_INTERACTED, 'true')

    const success = await subscribe()
    setShowWebOverlay(false)
    if (success) {
      localStorage.setItem(KEY_PUSH_ENABLED, 'true')
      localStorage.removeItem(KEY_LAST_DECLINED)
    } else {
      localStorage.setItem(KEY_PUSH_ENABLED, 'false')
      localStorage.setItem(KEY_LAST_DECLINED, Date.now().toString())
      if (Notification.permission === 'denied') {
        setShowWebBlocked(true)
      }
    }
  }

  const handleWebLater = () => {
    setShowWebPrompt(false)
    localStorage.setItem(KEY_INTERACTED, 'true')
    localStorage.setItem(KEY_PUSH_ENABLED, 'false')
    localStorage.setItem(KEY_LAST_DECLINED, Date.now().toString())
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isCapacitorNative()) {
    if (modalKind === 'request') {
      return <RequestPermissionModal onEnable={handleEnable} onLater={handleLater} />
    }
    if (modalKind === 'denied') {
      return <PermissionDeniedModal onDismiss={handleDeniedDismiss} />
    }
    return null
  }

  // Web Render
  if (showWebPrompt) {
    return <WebPromptModal onEnable={handleWebEnable} onLater={handleWebLater} />
  }

  if (showWebOverlay) {
    return <WebPointerOverlay />
  }

  if (showWebBlocked) {
    return <WebBlockedModal onDismiss={() => setShowWebBlocked(false)} />
  }

  return null
}
