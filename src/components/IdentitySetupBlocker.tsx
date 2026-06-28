'use client'

import React, { useState } from 'react'

export default function IdentitySetupBlocker({ user }: { user: any }) {
  const [formData, setFormData] = useState({
    iitmJoinYear: '',
    iitmJoinMonth: '',
    iitmLevel: '',
    iitmUserType: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)

  const handleSelect = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Client-side validations
    if (!formData.iitmJoinYear) {
      return setError('Please select the year you joined IITM BS Degree.')
    }
    if (!formData.iitmJoinMonth) {
      return setError('Please select the month you joined IITM BS Degree.')
    }
    if (!formData.iitmLevel) {
      return setError('Please select which level you are in.')
    }
    if (!formData.iitmUserType) {
      return setError('Please select your category.')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/profile/identity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update identity details.')
      }

      // Success - show the welcome modal!
      setShowWelcomeModal(true)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Something went wrong.')
      setLoading(false)
    }
  }

  const handleProceed = () => {
    // Reload page to re-check session state and clear blockers
    window.location.reload()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'url(/auth-bg.svg) center/cover no-repeat, #f3f4f8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9998,
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div className="fade-in" style={{
        background: 'var(--surface)',
        width: '100%',
        maxWidth: '560px',
        padding: '36px',
        borderRadius: '24px',
        boxShadow: '0 20px 45px rgba(0,0,0,0.08)',
        border: '1px solid rgba(255,255,255,0.7)',
        backdropFilter: 'blur(10px)',
        margin: 'auto'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #818cf8, #4f46e5)',
            color: '#fff',
            marginBottom: '16px',
            boxShadow: '0 8px 16px rgba(79,70,229,0.2)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            UPDATE YOUR IDENTITY !
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Help us customize your learning experience by confirming your IITM BS details.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Question 1: When you Join IITM BS DEGREE */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '10px', display: 'block' }}>
              When You Join IITM BS DEGREE
            </label>
            
            {/* Year Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
              {['2023', '2024', '2025', '2026'].map(year => {
                const isSelected = formData.iitmJoinYear === year
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => handleSelect('iitmJoinYear', year)}
                    style={{
                      padding: '12px 6px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #6366f1' : '2px solid #e2e8f0',
                      background: isSelected ? '#eff0fe' : 'var(--surface)',
                      color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    {year}
                  </button>
                )
              })}
            </div>

            {/* Month Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {['JAN', 'MAY', 'SEPT'].map(month => {
                const isSelected = formData.iitmJoinMonth === month
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => handleSelect('iitmJoinMonth', month)}
                    style={{
                      padding: '12px 6px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #6366f1' : '2px solid #e2e8f0',
                      background: isSelected ? '#eff0fe' : 'var(--surface)',
                      color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    {month}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Question 2: Which Level are You in */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '10px', display: 'block' }}>
              Which Level are You in :
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {['Qualifier', 'Foundation', 'Diploma', 'Degree'].map(level => {
                const isSelected = formData.iitmLevel === level
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleSelect('iitmLevel', level)}
                    style={{
                      padding: '14px 10px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #6366f1' : '2px solid #e2e8f0',
                      background: isSelected ? '#eff0fe' : 'var(--surface)',
                      color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  >
                    {level}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Question 3: Are You */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '10px', display: 'block' }}>
              Are You :
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { key: 'STANDALONE', label: 'STANDALONE' },
                { key: 'DUAL DEGREE', label: 'DUAL DEGREE' },
                { key: 'WORKING PROFESSIONAL', label: 'WORKING PROFESSIONAL' }
              ].map(type => {
                const isSelected = formData.iitmUserType === type.key
                return (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => handleSelect('iitmUserType', type.key)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #6366f1' : '2px solid #e2e8f0',
                      background: isSelected ? '#eff0fe' : 'var(--surface)',
                      color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{type.label}</span>
                    {isSelected && (
                      <span style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '10px'
                      }}>✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 800,
              boxShadow: '0 8px 20px rgba(99,102,241,0.25)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '14px',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#ffffff'
            }}
          >
            {loading ? 'Saving...' : 'Submit'}
          </button>
        </form>
      </div>

      {/* Success Modal */}
      {showWelcomeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          <div className="fade-in" style={{
            background: 'var(--surface)',
            borderRadius: '24px',
            padding: '40px 32px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.8)',
            transform: 'scale(1)',
            transition: 'transform 0.3s ease'
          }}>
            {/* Celebration Icon */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #34d399, #059669)',
              display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 10px 20px rgba(5,150,105,0.25)',
              color: '#fff'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '-0.01em' }}>
              Thank You!
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}>
              Your identity has been updated. Welcome to <strong style={{ color: '#4f46e5' }}>GenZ IITian</strong> family! Let's build something amazing together.
            </p>

            <button
              onClick={handleProceed}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 800,
                boxShadow: '0 8px 20px rgba(99,102,241,0.25)',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
