'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useTheme } from '@/components/ThemeProvider'


function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '46px', height: '26px', borderRadius: '13px', flexShrink: 0,
        background: checked ? 'var(--primary)' : 'var(--neu-dark)',
        boxShadow: checked
          ? 'inset 2px 2px 5px rgba(0,0,0,0.2)'
          : 'inset 2px 2px 4px #b0b2ba, inset -2px -2px 4px #dadce4',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.25s ease',
      }}
    >
      <div style={{
        position: 'absolute',
        top: '4px',
        left: checked ? '24px' : '4px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: 'var(--surface)',
        boxShadow: '1px 1px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.25s ease',
      }} />
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)
  useEffect(() => {
    setIsMobile(window.innerWidth <= 768)
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])


  // Notification preferences (UI state — backend integration ready when needed)
  const [notifEmail, setNotifEmail] = useState(true)
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications()

  const [isNativeApp, setIsNativeApp] = useState(false)
  const [nativeSubscribed, setNativeSubscribed] = useState(false)

  useEffect(() => {
    const checkNativeStatus = async () => {
      const { isCapacitorNative, checkCapacitorPermission } = await import('@/lib/capacitor-push')
      if (isCapacitorNative()) {
        setIsNativeApp(true)
        const perm = await checkCapacitorPermission()
        const storedPref = localStorage.getItem('push_enabled')
        setNativeSubscribed(perm === 'granted' && storedPref !== 'false')
      }
    }
    checkNativeStatus()
  }, [])

  // Theme preference — wired to the real ThemeProvider (persists + applies live)
  const { theme, setTheme } = useTheme()

  // Language preference
  const [language, setLanguage] = useState('en-US')

  // Global Maintenance Mode (Manager only)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [isManagerUser, setIsManagerUser] = useState(false)

  // Help Card Config
  const [helpCardConfig, setHelpCardConfig] = useState({ title: '', buttonText: '', redirectUrl: '', isEnabled: true })
  const [savingHelpCard, setSavingHelpCard] = useState(false)

  // Fetch initial settings on mount (strictly for managers)
  useEffect(() => {
    fetch('/api/updates/settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.settings) {
          setIsManagerUser(true)
          setMaintenanceMode(data.settings.maintenanceMode || false)
        }
      })
      .catch(err => console.error('Failed to fetch settings:', err))

    fetch('/api/support/help-card')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setHelpCardConfig({
            title: data.title || '',
            buttonText: data.buttonText || '',
            redirectUrl: data.redirectUrl || '',
            isEnabled: data.isEnabled ?? true,
          })
        }
      })
      .catch(err => console.error('Failed to fetch help card config:', err))
  }, [])

  async function handleToggleMaintenance(val: boolean) {
    setMaintenanceMode(val)
    try {
      await fetch('/api/updates/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceMode: val }),
      })
    } catch (err) {
      console.error('Failed to update maintenance mode:', err)
      setMaintenanceMode(!val) // revert on error
    }
  }

  async function handleSaveHelpCard() {
    setSavingHelpCard(true)
    try {
      const res = await fetch('/api/support/help-card', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(helpCardConfig),
      })
      if (res.ok) alert('Support card settings saved successfully')
      else alert('Failed to save settings')
    } catch {
      alert('Something went wrong')
    }
    setSavingHelpCard(false)
  }


  const insetRow: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: isMobile ? '12px 14px' : '14px 18px', borderRadius: '14px', background: 'var(--surface-2)',
    boxShadow: 'inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)',
    gap: '12px',
  }


  return (
    <div className="page-container fade-in" style={{ padding: isMobile ? '12px' : '20px' }}>
      <style>{`
        .mobile-back-header {
          display: none;
        }
        .desktop-back-container {
          display: block;
        }
        @media (max-width: 768px) {
          .mobile-back-header {
            display: flex !important;
          }
          .desktop-back-container {
            display: none !important;
          }
          .page-container {
            padding: 16px 14px 24px !important;
          }
        }
      `}</style>
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Mobile-only Header with Back Button */}
        <div className="mobile-back-header" style={{
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          padding: '8px 4px 16px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'var(--surface-2)',
              boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
              border: 'none',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              transition: 'transform 0.15s ease',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div>
            <span style={{ display: 'block', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Outfit', 'Nunito', sans-serif", letterSpacing: '-0.3px', lineHeight: '1.2' }}>
              Settings
            </span>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Manage passwords, appearance, and notifications
            </span>
          </div>
        </div>

        {/* ── Back ── */}
        <div className="desktop-back-container">
          <button
            onClick={() => router.back()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '50px',
              background: 'var(--surface-2)', border: 'none', cursor: 'pointer',
              boxShadow: '4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)',
              fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        </div>


        {/* ── Notifications + Preferences (side by side) ── */}
        <div className="responsive-two-column-grid">

          {/* ── Notifications ── */}
          <div className="card" style={{ padding: isMobile ? '16px' : '28px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Notifications
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>Choose what alerts you want to receive.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                {/* Regular Toggles */}
                <div style={insetRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>Email Notifications</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Receive updates and alerts via email</div>
                  </div>
                  <Toggle checked={notifEmail} onChange={setNotifEmail} />
                </div>

                {/* Push Notification Toggle (Web vs Native) */}
                {isNativeApp ? (
                  <div style={insetRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>App Push Notifications</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Get live alerts directly on your device</div>
                    </div>
                    <Toggle 
                      checked={nativeSubscribed} 
                      onChange={async (v) => {
                        const { registerCapacitorPush, unregisterCapacitorPush } = await import('@/lib/capacitor-push')
                        if (v) {
                          const success = await registerCapacitorPush()
                          if (success) {
                            setNativeSubscribed(true)
                            localStorage.setItem('push_enabled', 'true')
                          } else {
                            alert('Could not enable push notifications. Please check your system notification settings.')
                          }
                        } else {
                          await unregisterCapacitorPush()
                          setNativeSubscribed(false)
                          localStorage.setItem('push_enabled', 'false')
                        }
                      }} 
                    />
                  </div>
                ) : (
                  isSupported && (
                    <div style={insetRow}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>Browser Push Alerts</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Get live alerts even when the site is closed</div>
                      </div>
                      <Toggle 
                        checked={isSubscribed} 
                        onChange={async (v) => {
                          if (v) await subscribe()
                          else await unsubscribe()
                        }} 
                      />
                    </div>
                  )
                )}
              </div>
          </div>

          {/* ── Preferences ── */}
          <div className="card" style={{ padding: isMobile ? '16px' : '28px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Preferences
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>Customize your experience.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              {/* Theme Mode */}
              <div style={insetRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>Theme Mode</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Select your preferred interface theme</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {(['light', 'dark', 'system'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      style={{
                        padding: '7px 14px', borderRadius: '50px', border: 'none',
                        fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        background: theme === t ? 'var(--primary)' : 'var(--surface-2)',
                        color: theme === t ? '#ffffff' : 'var(--text-secondary)',
                        boxShadow: theme === t
                          ? '3px 3px 7px rgba(54,54,232,0.35), -1px -1px 4px var(--neu-glow)'
                          : '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div style={insetRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>Language</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Choose your display language</div>
                </div>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  style={{
                    padding: '7px 12px', borderRadius: '50px', border: 'none',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    background: 'var(--surface-2)', color: 'var(--text-primary)', fontFamily: 'inherit',
                    boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
                    outline: 'none', appearance: 'auto', flexShrink: 0,
                  }}
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>

              {/* Maintenance Mode - Only visible for Managers */}
              {isManagerUser && (
                <div style={{
                  ...insetRow,
                  background: maintenanceMode ? '#fff1f2' : 'var(--surface-2)',
                  transition: 'background 0.3s ease',
                  border: maintenanceMode ? '1px solid #fda4af' : '1px solid transparent'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: maintenanceMode ? '#be123c' : 'var(--text-primary)' }}>
                      Maintenance Mode
                    </div>
                    <div style={{ fontSize: '12px', color: maintenanceMode ? 'var(--danger)' : 'var(--text-muted)', marginTop: '2px' }}>
                      Restrict access for all non-manager users
                    </div>
                  </div>
                  <Toggle checked={maintenanceMode} onChange={handleToggleMaintenance} />
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── Help Card Settings (Manager only) ── */}
        {isManagerUser && (
          <div className="card" style={{ padding: isMobile ? '16px' : '28px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <path d="M12 8v8"/><path d="M8 12h8"/>
              </svg>
              Course List Add Settings (Manager Only)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>Configure the simple fake course card at the end of the list.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div style={insetRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>Enable Card</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Show this block in the courses section</div>
                </div>
                <Toggle
                  checked={helpCardConfig.isEnabled}
                  onChange={(v) => setHelpCardConfig(p => ({ ...p, isEnabled: v }))}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>Card Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={helpCardConfig.title}
                    onChange={e => setHelpCardConfig(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Join the Community"
                    style={{ background: 'var(--surface)', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>CTA Button Text</label>
                  <input
                    type="text"
                    className="form-input"
                    value={helpCardConfig.buttonText}
                    onChange={e => setHelpCardConfig(p => ({ ...p, buttonText: e.target.value }))}
                    placeholder="e.g. Enroll Now"
                    style={{ background: 'var(--surface)', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>Redirect URL</label>
                  <input
                    type="text"
                    className="form-input"
                    value={helpCardConfig.redirectUrl}
                    onChange={e => setHelpCardConfig(p => ({ ...p, redirectUrl: e.target.value }))}
                    placeholder="https://..."
                    style={{ background: 'var(--surface)', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={handleSaveHelpCard} disabled={savingHelpCard} className="btn btn-primary" style={{ background: 'var(--primary)', color: 'white' }}>
                  {savingHelpCard ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
