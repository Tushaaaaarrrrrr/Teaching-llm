'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FullSession } from '@/lib/auth'

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
  "Other"
];

export default function ProfileSetupBlocker({ user }: { user: FullSession }) {
  const router = useRouter()
  
  // Split existing name into first and last guess if needed, though they was nullish in standard flow
  const nameParts = (user.name || '').split(' ')
  const initialFirst = nameParts[0] || ''
  const initialLast = nameParts.slice(1).join(' ') || ''

  const [formData, setFormData] = useState({
    firstName: initialFirst,
    lastName: initialLast,
    mobileNumber: '',
    age: '',
    gender: '',
    state: ''
  })
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError('')
  }
  
  const handleGenderSelect = (val: string) => {
    setFormData({ ...formData, gender: val })
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Client-side validations
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      return setError('Please enter both your first and last name.')
    }
    if (!formData.mobileNumber.match(/^\d{10}$/)) {
      return setError('Mobile number must be exactly 10 digits.')
    }
    if (!formData.gender) {
      return setError('Please select a gender option.')
    }
    const ageNum = parseInt(formData.age, 10)
    if (!ageNum || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return setError('Please enter a valid age (1-120).')
    }
    if (!formData.state) {
      return setError('Please choose your state from the dropdown.')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/profile/setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete profile setup.')
      }

      // Force a hard reload to clear Next.js layout cache and unblock the user immediately
      window.location.reload()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'url(/auth-bg.svg) center/cover no-repeat, #f3f4f8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="fade-in" style={{
        background: '#fff',
        width: '100%',
        maxWidth: '540px',
        padding: '40px',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#1e1e3a', marginBottom: '8px' }}>
            Complete Your Profile
          </h1>
          <p style={{ fontSize: '14px', color: '#6b6b8a', lineHeight: 1.5 }}>
            Welcome to the platform! We need a few essential details to set up your account before you can continue.
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#b91c1c',
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>First Name</label>
              <input
                type="text"
                name="firstName"
                placeholder="John"
                className="form-input"
                style={{ background: '#f8f9fa' }}
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Last Name</label>
              <input
                type="text"
                name="lastName"
                placeholder="Doe"
                className="form-input"
                style={{ background: '#f8f9fa' }}
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '16px' }}>
             <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Mobile Number</label>
              <input
                type="text"
                name="mobileNumber"
                placeholder="10 digit number"
                className="form-input"
                style={{ background: '#f8f9fa' }}
                value={formData.mobileNumber}
                onChange={handleChange}
                maxLength={10}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Age</label>
              <input
                type="number"
                name="age"
                placeholder="e.g. 21"
                className="form-input"
                style={{ background: '#f8f9fa' }}
                value={formData.age}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>State / Territory</label>
            <select
              name="state"
              className="form-input"
              style={{ background: '#f8f9fa', cursor: 'pointer', appearance: 'auto' }}
              value={formData.state}
              onChange={handleChange}
            >
              <option value="" disabled>Select your state</option>
              {INDIAN_STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Gender</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['MALE', 'FEMALE', 'OTHER'].map(g => (
                <div
                  key={g}
                  onClick={() => handleGenderSelect(g)}
                  style={{
                    flex: 1,
                    textTransform: 'capitalize',
                    padding: '12px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                    border: formData.gender === g ? '2px solid #6366f1' : '2px solid #e0e3ea',
                    background: formData.gender === g ? '#eff0fe' : '#f8f9fa',
                    color: formData.gender === g ? '#6366f1' : '#6b6b8a',
                    transition: 'all 0.2s'
                  }}
                >
                  {g.toLowerCase()}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 800,
              boxShadow: '0 8px 20px rgba(99,102,241,0.3)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Saving Profile...' : 'Complete Setup & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
