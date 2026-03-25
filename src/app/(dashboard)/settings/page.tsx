'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '46px', height: '26px', borderRadius: '13px', flexShrink: 0,
        background: checked ? '#3636e8' : '#c5c7cf',
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
        background: '#ffffff',
        boxShadow: '1px 1px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.25s ease',
      }} />
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()

  // Password change
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' })
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  // Notification preferences (UI state — backend integration ready when needed)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSms, setNotifSms] = useState(false)
  const [notifAssignment, setNotifAssignment] = useState(true)

  // Theme preference
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Language preference
  const [language, setLanguage] = useState('en-US')

  // Global Maintenance Mode (Manager only)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(false)
  // Fetch initial settings
  useState(() => {
    fetch('/api/updates/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setMaintenanceMode(data.settings.maintenanceMode || false)
        }
      })
      .catch(err => console.error('Failed to fetch settings:', err))
  })

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
  async function handlePasswordChange() {
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: 'All fields are required' }); return
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'New password must be at least 6 characters' }); return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' }); return
    }
    setSavingPw(true)
    setPwMsg({ type: '', text: '' })
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setPwMsg({ type: 'success', text: 'Password updated successfully' })
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setPwMsg({ type: 'error', text: data.error || 'Failed to update password' })
      }
    } catch { setPwMsg({ type: 'error', text: 'Something went wrong' }) }
    setSavingPw(false)
  }

  const insetRow: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px', borderRadius: '14px', background: '#e8eaf0',
    boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
    gap: '16px',
  }

  const eyeBtn: React.CSSProperties = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    color: '#9999b0', background: 'none', border: 'none', cursor: 'pointer',
    padding: '2px', display: 'flex', alignItems: 'center',
  }

  return (
    <div className="page-container fade-in">
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Back ── */}
        <div>
          <button
            onClick={() => router.back()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '50px',
              background: '#e8eaf0', border: 'none', cursor: 'pointer',
              boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
              fontSize: '13px', fontWeight: '600', color: '#6b6b8a',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3636e8' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b6b8a' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        </div>

        {/* ── Change Password ── */}
        <div className="card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e1e3a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Change Password
          </h3>

          {pwMsg.text && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '14px',
              background: pwMsg.type === 'success' ? '#d1fae5' : '#fee2e2',
              color: pwMsg.type === 'success' ? '#065f46' : '#991b1b',
            }}>
              {pwMsg.text}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Current Password',    key: 'currentPassword' as const, show: showCurrentPw,  setShow: setShowCurrentPw,  placeholder: 'Enter current password' },
              { label: 'New Password',         key: 'newPassword' as const,     show: showNewPw,       setShow: setShowNewPw,       placeholder: 'Min. 6 characters' },
              { label: 'Confirm New Password', key: 'confirmPassword' as const, show: showConfirmPw,   setShow: setShowConfirmPw,   placeholder: 'Repeat new password' },
            ].map(field => (
              <div key={field.key} className="form-group">
                <label className="form-label">{field.label}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={field.show ? 'text' : 'password'}
                    className="form-input"
                    value={pwForm[field.key]}
                    onChange={e => setPwForm(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ paddingRight: '42px' }}
                  />
                  <button type="button" onClick={() => field.setShow(v => !v)} style={eyeBtn}>
                    {field.show ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handlePasswordChange} disabled={savingPw} className="btn btn-primary">
                {savingPw ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Notifications + Preferences (side by side) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* ── Notifications ── */}
          <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e1e3a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Notifications
            </h3>
            <p style={{ fontSize: '12px', color: '#9999b0', marginBottom: '18px' }}>Choose what alerts you want to receive.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              {[
                { label: 'Email Notifications',      sub: 'Receive updates and alerts via email',           value: notifEmail,      set: setNotifEmail },
                { label: 'SMS Alerts',                sub: 'Get important reminders by text message',        value: notifSms,        set: setNotifSms },
                { label: 'New Assignment Reminders',  sub: 'Notify me before assignment deadlines',          value: notifAssignment, set: setNotifAssignment },
              ].map(item => (
                <div key={item.label} style={insetRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e1e3a' }}>{item.label}</div>
                    <div style={{ fontSize: '12px', color: '#9999b0', marginTop: '2px' }}>{item.sub}</div>
                  </div>
                  <Toggle checked={item.value} onChange={item.set} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Preferences ── */}
          <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e1e3a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3636e8" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Preferences
            </h3>
            <p style={{ fontSize: '12px', color: '#9999b0', marginBottom: '18px' }}>Customize your experience.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              {/* Theme Mode */}
              <div style={insetRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e1e3a' }}>Theme Mode</div>
                  <div style={{ fontSize: '12px', color: '#9999b0', marginTop: '2px' }}>Select your preferred interface theme</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {(['light', 'dark'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      style={{
                        padding: '7px 14px', borderRadius: '50px', border: 'none',
                        fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        background: theme === t ? '#3636e8' : '#e8eaf0',
                        color: theme === t ? '#ffffff' : '#6b6b8a',
                        boxShadow: theme === t
                          ? '3px 3px 7px rgba(54,54,232,0.35), -1px -1px 4px rgba(255,255,255,0.5)'
                          : '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
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
                  <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e1e3a' }}>Language</div>
                  <div style={{ fontSize: '12px', color: '#9999b0', marginTop: '2px' }}>Choose your display language</div>
                </div>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  style={{
                    padding: '7px 12px', borderRadius: '50px', border: 'none',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    background: '#e8eaf0', color: '#1e1e3a', fontFamily: 'inherit',
                    boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                    outline: 'none', appearance: 'auto', flexShrink: 0,
                  }}
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>

              {/* Maintenance Mode - Highly Visible for Managers */}
              <div style={{
                ...insetRow,
                background: maintenanceMode ? '#fff1f2' : '#e8eaf0',
                transition: 'background 0.3s ease',
                border: maintenanceMode ? '1px solid #fda4af' : '1px solid transparent'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: maintenanceMode ? '#be123c' : '#1e1e3a' }}>
                    Maintenance Mode
                  </div>
                  <div style={{ fontSize: '12px', color: maintenanceMode ? '#e11d48' : '#9999b0', marginTop: '2px' }}>
                    Restrict access for all non-manager users
                  </div>
                </div>
                <Toggle checked={maintenanceMode} onChange={handleToggleMaintenance} />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
