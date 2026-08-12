'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MaintenancePage() {
  const router = useRouter()
  const [endsAt, setEndsAt] = useState<string | null>(
    process.env.NEXT_PUBLIC_MAINTENANCE_ENDS_AT || null
  )
  const [timeLeft, setTimeLeft] = useState<{ days: string | null; hours: string; minutes: string; seconds: string } | null>(null)
  const [isFinishedUp, setIsFinishedUp] = useState(false)
  const [statusText, setStatusText] = useState('Updating systems...')
  const [fadeClass, setFadeClass] = useState('fade-in')

  // Status message rotation with smooth fade transition
  useEffect(() => {
    const statuses = [
      'Updating systems...',
      'Optimizing platform...',
      'Checking services...',
      'Finishing up...'
    ]
    let idx = 0

    const interval = setInterval(() => {
      setFadeClass('fade-out')
      setTimeout(() => {
        idx = (idx + 1) % statuses.length
        setStatusText(statuses[idx])
        setFadeClass('fade-in')
      }, 400) // Wait for fade-out transition
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  // Countdown timer logic (supports DAYS : HRS : MIN : SEC)
  useEffect(() => {
    if (!endsAt) {
      setTimeLeft(null)
      setIsFinishedUp(false)
      return
    }

    const targetTime = new Date(endsAt).getTime()
    if (isNaN(targetTime)) {
      setTimeLeft(null)
      setIsFinishedUp(false)
      return
    }

    const calculateTime = () => {
      const now = new Date().getTime()
      const diff = targetTime - now

      if (diff <= 0) {
        setTimeLeft(null)
        setIsFinishedUp(true)
        return
      }

      setIsFinishedUp(false)
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({
        days: days > 0 ? String(days).padStart(2, '0') : null,
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0')
      })
    }

    calculateTime()
    const timer = setInterval(calculateTime, 1000)
    return () => clearInterval(timer)
  }, [endsAt])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/maintenance-status')
      const data = await res.json()
      
      if (data.active === false) {
        router.push('/dashboard')
        return
      }

      if (data.endsAt) {
        setEndsAt(data.endsAt)
      } else {
        setEndsAt(null)
      }
    } catch (error) {
      console.error('Failed to check maintenance status:', error)
    }
  }

  // Backend status polling with exponential backoff
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let currentDelay = 5000 // Start at 5 seconds
    const maxDelay = 120000 // Cap at 2 minutes
    
    const runPoll = async () => {
      await checkStatus()
      currentDelay = Math.min(currentDelay * 2, maxDelay)
      timeoutId = setTimeout(runPoll, currentDelay)
    }

    timeoutId = setTimeout(runPoll, currentDelay)
    return () => clearTimeout(timeoutId)
  }, [router])

  return (
    <div className="maintenance-screen-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

        /* Layout & Theme variables */
        .maintenance-screen-wrapper {
          font-family: 'Outfit', sans-serif;
          min-height: 100vh;
          width: 100vw;
          background-color: var(--bg);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          position: fixed;
          inset: 0;
          z-index: 99999;
          overflow-y: auto;
          box-sizing: border-box;
          padding: 40px 24px;
        }

        .m-container {
          width: 100%;
          max-width: 1100px;
          margin: auto;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 64px;
          align-items: center;
          position: relative;
          z-index: 10;
          animation: mFadeSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Ambient Glow backdrops */
        .m-ambient-glow {
          position: absolute;
          width: 450px;
          height: 450px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(0,0,0,0) 70%);
          top: -10%;
          left: -10%;
          filter: blur(50px);
          pointer-events: none;
          z-index: 1;
        }

        .m-ambient-glow-2 {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.05) 0%, rgba(0,0,0,0) 70%);
          bottom: -15%;
          right: -10%;
          filter: blur(60px);
          pointer-events: none;
          z-index: 1;
        }

        /* Typography & Left Side Content */
        .m-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .m-logo-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 36px;
        }

        .m-logo-img {
          height: 38px;
          width: auto;
          object-fit: contain;
        }

        .m-brand-name {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: var(--text-primary);
        }

        .m-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--warning-light);
          border: 1px solid rgba(245, 158, 11, 0.15);
          color: var(--warning);
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .m-badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: var(--warning);
          box-shadow: 0 0 8px var(--warning);
          animation: mPulseDot 1.6s infinite ease-in-out;
        }

        h1.m-title {
          font-size: 42px;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -1px;
          margin-bottom: 18px;
          background: linear-gradient(135deg, var(--text-primary) 50%, var(--accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .m-desc {
          font-size: 16px;
          line-height: 1.6;
          color: var(--text-secondary);
          margin-bottom: 24px;
          font-family: 'Inter', sans-serif;
        }

        /* Live status upgrade & Progress Bar */
        .m-status-cycle-container {
          width: 100%;
          max-width: 320px;
          margin-bottom: 36px;
        }

        .m-status-text {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          height: 20px;
          overflow: hidden;
        }

        .m-status-message {
          transition: opacity 0.4s ease-in-out;
          opacity: 0;
        }
        
        .m-status-message.fade-in {
          opacity: 1;
        }
        
        .m-status-message.fade-out {
          opacity: 0;
        }

        .m-progress-bar-bg {
          width: 100%;
          height: 6px;
          background: var(--surface-2);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
        }

        .m-progress-bar-fill {
          height: 100%;
          width: 35%;
          background: linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%);
          border-radius: 999px;
          position: absolute;
          animation: mSweepProgress 2s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Button CTA */
        .btn-container {
          margin-bottom: 32px;
          width: 100%;
          max-width: 320px;
        }

        .btn {
          width: 100%;
          background: var(--primary);
          color: #ffffff;
          border: none;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          padding: 14px 20px;
          border-radius: 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
        }

        .btn:hover {
          background: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(99, 102, 241, 0.4);
        }

        .btn:active {
          transform: translateY(0);
        }

        /* Countdown display block */
        .m-countdown-block {
          margin-top: 8px;
        }

        .m-countdown-label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .m-countdown-grid {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .m-countdown-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .m-countdown-val {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.5px;
          background: var(--surface-2);
          padding: 8px 14px;
          border-radius: 12px;
          min-width: 64px;
          text-align: center;
          color: var(--text-primary);
        }

        .m-countdown-colon {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-muted);
          margin-bottom: 18px;
        }

        .m-countdown-unit {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 6px;
        }
        
        .m-no-countdown-text {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
          margin-top: 8px;
        }

        /* Contact card layout */
        .m-contact-card {
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 14px 20px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          width: 100%;
          max-width: 320px;
          transition: all 0.2s ease;
          margin-bottom: 32px;
        }

        .m-contact-card:hover {
          border-color: rgba(99, 102, 241, 0.3);
          box-shadow: 0 4px 12px var(--primary-light);
        }

        .m-contact-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .m-contact-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--bg);
          border: 1px solid var(--border);
          padding: 8px 14px;
          border-radius: 10px;
          color: var(--primary);
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          transition: all 0.2s ease;
          box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.05);
        }

        .m-contact-btn:hover {
          background: var(--primary);
          color: #ffffff;
          border-color: var(--primary);
          transform: translateY(-1px);
        }

        .m-contact-email {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          margin-left: 2px;
        }

        .m-contact-btn:hover .m-contact-email {
          color: rgba(255, 255, 255, 0.85);
        }

        /* Right Side Animated Illustration */
        .m-right {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          z-index: 10;
        }

        .m-svg-container {
          width: 100%;
          max-width: 440px;
          height: auto;
          overflow: visible;
        }

        /* Micro-details & Footer */
        .m-footer-detail {
          margin-top: auto;
          padding-top: 24px;
          border-top: 1px solid var(--border);
          width: 100%;
          font-size: 12.5px;
          color: var(--text-muted);
          font-weight: 600;
        }

        /* CSS Animation Rules */
        @keyframes mFadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes mPulseDot {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.15); }
        }

        @keyframes mSweepProgress {
          0% { left: -35%; }
          100% { left: 100%; }
        }

        /* Interactive SVG CSS Animations */
        .anim-float {
          animation: mFloatItem 5s ease-in-out infinite alternate;
        }
        .anim-float-delayed {
          animation: mFloatItem 6s ease-in-out infinite alternate-reverse;
        }
        .anim-rotate-cw {
          transform-origin: center;
          animation: mRotateCw 18s linear infinite;
        }
        .anim-rotate-ccw {
          transform-origin: center;
          animation: mRotateCcw 14s linear infinite;
        }
        .anim-pulse-led {
          animation: mPulseLed 2.5s infinite ease-in-out;
        }
        .anim-shimmer {
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: mDash 3.5s linear infinite;
        }
        .anim-glow-pulse {
          transform-origin: center;
          animation: mGlowPulse 4s ease-in-out infinite alternate;
        }
        .anim-wrench-pivot {
          transform-origin: 60px 260px;
          animation: mWrenchPivot 4s ease-in-out infinite alternate;
        }

        @keyframes mFloatItem {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-12px); }
        }

        @keyframes mRotateCw {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes mRotateCcw {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes mPulseLed {
          0%, 100% { fill-opacity: 0.25; }
          50% { fill-opacity: 1; }
        }

        @keyframes mDash {
          0% { stroke-dashoffset: 600; }
          50% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -600; }
        }
        
        @keyframes mGlowPulse {
          0% { transform: scale(0.96); opacity: 0.35; }
          100% { transform: scale(1.04); opacity: 0.6; }
        }

        @keyframes mWrenchPivot {
          0% { transform: translate(60px, 260px) rotate(-15deg); }
          100% { transform: translate(60px, 260px) rotate(15deg); }
        }

        /* Media queries & Responsive Adjustments */
        @media (max-width: 991px) {
          .m-container {
            grid-template-columns: 1fr;
            gap: 48px;
            max-width: 600px;
          }
          .m-left {
            align-items: center;
            text-align: center;
          }
          h1.m-title {
            font-size: 36px;
          }
          .m-right {
            order: -1; /* Move illustration above text on tablet/mobile */
          }
          .m-svg-container {
            max-width: 300px;
          }
          .m-status-cycle-container {
            max-width: 100%;
          }
          .m-status-text {
            justify-content: center;
          }
          .m-countdown-grid {
            justify-content: center;
          }
          .btn-container {
            max-width: 100%;
          }
          .m-contact-card {
            max-width: 100%;
          }
        }

        @media (max-width: 480px) {
          .maintenance-screen-wrapper {
            padding: 30px 16px;
          }
          h1.m-title {
            font-size: 28px;
            letter-spacing: -0.5px;
          }
          .m-desc {
            font-size: 15px;
          }
          .m-countdown-val {
            font-size: 24px;
            padding: 6px 10px;
            min-width: 50px;
          }
          .m-countdown-item {
            gap: 4px;
          }
          .m-logo-row {
            margin-bottom: 24px;
          }
          .m-contact-card {
            flex-direction: column;
            text-align: center;
            gap: 12px;
            padding: 16px;
          }
        }

        /* Accessibility: respect user prefers-reduced-motion configuration */
        @media (prefers-reduced-motion: reduce) {
          .m-progress-bar-fill {
            animation: none;
            width: 100%;
          }
          .anim-float,
          .anim-float-delayed,
          .anim-rotate-cw,
          .anim-rotate-ccw,
          .anim-pulse-led,
          .m-badge-dot,
          .anim-glow-pulse,
          .anim-wrench-pivot,
          .anim-shimmer {
            animation: none !important;
            transform: none !important;
            stroke-dashoffset: 0 !important;
            fill-opacity: 0.8 !important;
          }
          
          .anim-wrench-pivot {
            transform: translate(60px, 260px) rotate(-15deg) !important;
          }
        }
      `}} />

      <div className="m-ambient-glow" />
      <div className="m-ambient-glow-2" />

      <div className="m-container">
        
        {/* Left Side Content */}
        <div className="m-left">
          
          {/* Logo Bar */}
          <div className="m-logo-row">
            <img src="/mobile-login-logo.png" alt="GenZ IITIAN Logo" className="m-logo-img" />
            <span className="m-brand-name">GenZ IITIAN</span>
          </div>

          {/* Status Label */}
          <div className="m-badge">
            <span className="m-badge-dot" />
            <span>SYSTEM MAINTENANCE</span>
          </div>

          {/* Headings */}
          <h1 className="m-title">This site is currently down for maintenance.</h1>
          
          <p className="m-desc">
            We’re making a few improvements.
          </p>

          {/* Progress / Upgrade Activity */}
          <div className="m-status-cycle-container">
            <div className="m-status-text">
              <span className={`m-status-message ${fadeClass}`}>
                {statusText}
              </span>
            </div>
            <div className="m-progress-bar-bg">
              <div className="m-progress-bar-fill" />
            </div>
          </div>

          {/* Countdown timer */}
          {timeLeft ? (
            <div className="m-countdown-block" style={{ marginBottom: '24px' }}>
              <div className="m-countdown-label">Expected back in</div>
              <div className="m-countdown-grid">
                {timeLeft.days && (
                  <>
                    <div className="m-countdown-item">
                      <span className="m-countdown-val">{timeLeft.days}</span>
                      <span className="m-countdown-unit">days</span>
                    </div>
                    <span className="m-countdown-colon">:</span>
                  </>
                )}
                <div className="m-countdown-item">
                  <span className="m-countdown-val">{timeLeft.hours}</span>
                  <span className="m-countdown-unit">hrs</span>
                </div>
                <span className="m-countdown-colon">:</span>
                <div className="m-countdown-item">
                  <span className="m-countdown-val">{timeLeft.minutes}</span>
                  <span className="m-countdown-unit">min</span>
                </div>
                <span className="m-countdown-colon">:</span>
                <div className="m-countdown-item">
                  <span className="m-countdown-val">{timeLeft.seconds}</span>
                  <span className="m-countdown-unit">sec</span>
                </div>
              </div>
            </div>
          ) : isFinishedUp ? (
            <div className="m-no-countdown-text" style={{ marginBottom: '24px' }}>
              Finishing up...
            </div>
          ) : (
            <div className="m-no-countdown-text" style={{ marginBottom: '24px' }}>
              We’ll be back shortly.
            </div>
          )}

          {/* Manual Recheck button */}
          <div className="btn-container">
            <button className="btn" onClick={checkStatus}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
              </svg>
              Check Again
            </button>
          </div>

          {/* Minimal Contact Card */}
          <div className="m-contact-card">
            <span className="m-contact-label">Something important?</span>
            <a href="mailto:admin@genziitian.org" className="m-contact-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span>Contact us</span>
              <span className="m-contact-email">admin@genziitian.org</span>
            </a>
          </div>

          {/* Footer Metadata */}
          <div className="m-footer-detail">
            <div>GenZ IITian</div>
          </div>

        </div>

        {/* Right Side Illustration */}
        <div className="m-right">
          <svg className="m-svg-container" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="db-led-on" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
              <linearGradient id="db-cabinet" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--surface-2)" />
                <stop offset="100%" stopColor="var(--surface)" />
              </linearGradient>
            </defs>

            {/* Glowing Backdrop Circle */}
            <circle cx="250" cy="250" r="160" fill="var(--primary-light)" className="anim-glow-pulse" opacity="0.4" />

            {/* FLOATING GROUP 1: Browser Window representing the LMS */}
            <g className="anim-float">
              {/* Window Shadow */}
              <rect x="75" y="125" width="280" height="200" rx="16" fill="black" opacity="0.08" />
              
              {/* Browser Container */}
              <rect x="70" y="120" width="280" height="200" rx="16" fill="var(--bg)" stroke="var(--border)" strokeWidth="2" />
              
              {/* Browser Header Bar */}
              <rect x="70" y="120" width="280" height="32" rx="16" fill="var(--surface)" />
              {/* Anti-clip bottom overlap for browser header */}
              <rect x="70" y="136" width="280" height="16" fill="var(--surface)" />
              
              {/* Control Dots */}
              <circle cx="94" cy="136" r="4" fill="#f87171" />
              <circle cx="108" cy="136" r="4" fill="#fbbf24" />
              <circle cx="122" cy="136" r="4" fill="#34d399" />
              
              {/* Mock Address Bar */}
              <rect x="146" y="128" width="160" height="16" rx="8" fill="var(--bg)" opacity="0.75" />

              {/* Browser Web Content Mock */}
              {/* Left Sidebar block */}
              <rect x="86" y="168" width="48" height="136" rx="8" fill="var(--surface)" opacity="0.6" />
              
              {/* Course Dashboard card */}
              <rect x="148" y="168" width="186" height="60" rx="10" fill="var(--primary-light)" opacity="0.5" />
              
              {/* Simulated code brackets & layouts */}
              <rect x="148" y="244" width="70" height="12" rx="6" fill="var(--surface-2)" />
              <rect x="148" y="264" width="120" height="8" rx="4" fill="var(--surface-2)" opacity="0.8" />
              <rect x="148" y="280" width="90" height="8" rx="4" fill="var(--surface-2)" opacity="0.6" />

              {/* Wavy active transmission line */}
              <path d="M158 202 Q 188 182, 218 202 T 278 202" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" className="anim-shimmer" />
            </g>

            {/* FLOATING GROUP 2: Server database module (overlapping bottom right) */}
            <g className="anim-float-delayed">
              {/* Server Shadow */}
              <rect x="295" y="245" width="130" height="140" rx="12" fill="black" opacity="0.1" />

              {/* Server Frame */}
              <rect x="290" y="240" width="130" height="140" rx="12" fill="url(#db-cabinet)" stroke="var(--border)" strokeWidth="2" />
              
              {/* Server Slots */}
              {/* Slot 1 */}
              <rect x="300" y="252" width="110" height="32" rx="6" fill="var(--bg)" stroke="var(--border)" />
              <circle cx="316" cy="268" r="3" fill="#34d399" className="anim-pulse-led" />
              <rect x="330" y="265" width="50" height="6" rx="3" fill="var(--surface-2)" />
              <rect x="390" y="262" width="12" height="12" rx="2" fill="var(--primary-light)" />
              
              {/* Slot 2 */}
              <rect x="300" y="294" width="110" height="32" rx="6" fill="var(--bg)" stroke="var(--border)" />
              <circle cx="316" cy="310" r="3" fill="#60a5fa" className="anim-pulse-led" style={{ animationDelay: '0.5s' }} />
              <rect x="330" y="307" width="40" height="6" rx="3" fill="var(--surface-2)" />
              <rect x="390" y="304" width="12" height="12" rx="2" fill="var(--primary-light)" />

              {/* Slot 3 */}
              <rect x="300" y="336" width="110" height="32" rx="6" fill="var(--bg)" stroke="var(--border)" />
              <circle cx="316" cy="352" r="3" fill="#fbbf24" className="anim-pulse-led" style={{ animationDelay: '1s' }} />
              <rect x="330" y="349" width="60" height="6" rx="3" fill="var(--surface-2)" />
              <rect x="390" y="346" width="12" height="12" rx="2" fill="var(--primary-light)" />
            </g>

            {/* CONNECTION LINES (TRAVERSING WIRE SHIMMERS) */}
            <path d="M 280 220 Q 320 200, 340 240" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="6 6" className="anim-shimmer" opacity="0.5" />
            <path d="M 290 350 Q 200 350, 136 360" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="6 6" className="anim-shimmer" style={{ animationDelay: '1s' }} opacity="0.5" />

            {/* ROTATING GEARS */}
            {/* Gear 1: Large Purple/Indigo Gear */}
            <g transform="translate(110, 360)">
              <g className="anim-rotate-cw">
                <circle cx="0" cy="0" r="26" fill="none" stroke="var(--primary)" strokeWidth="8" strokeDasharray="14 8" />
                <circle cx="0" cy="0" r="16" fill="var(--bg)" stroke="var(--primary)" strokeWidth="2.5" />
                <circle cx="0" cy="0" r="5" fill="var(--primary)" />
              </g>
            </g>

            {/* Gear 2: Small Accent/Indigo Gear */}
            <g transform="translate(390, 160)">
              <g className="anim-rotate-ccw">
                <circle cx="0" cy="0" r="18" fill="none" stroke="var(--accent)" strokeWidth="6" strokeDasharray="10 6" />
                <circle cx="0" cy="0" r="11" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2" />
                <circle cx="0" cy="0" r="3" fill="var(--accent)" />
              </g>
            </g>

            {/* Gear 3: Additional small gear (Top-Left Balance) */}
            <g transform="translate(70, 80)">
              <g className="anim-rotate-ccw">
                <circle cx="0" cy="0" r="12" fill="none" stroke="var(--primary)" strokeWidth="4" strokeDasharray="7 4" />
                <circle cx="0" cy="0" r="7" fill="var(--bg)" stroke="var(--primary)" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="2" fill="var(--primary)" />
              </g>
            </g>

            {/* FLOATING ELEMENTS SPREAD ACROSS EMPTY ZONES */}
            {/* Floating Cloud/Server Icon (Right) */}
            <g className="anim-float" style={{ animationDelay: '1.5s' }} transform="translate(420, 260)">
              <path d="M-10 6 C-14 6, -17 3, -17 -1 C-17 -5, -13 -9, -8 -9 C-7 -14, -2 -18, 4 -18 C9 -18, 13 -15, 14 -10 C18 -10, 21 -7, 21 -3 C21 1, 18 6, 13 6 Z" fill="var(--bg)" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="2" cy="-6" r="1.5" fill="#34d399" className="anim-pulse-led" />
              <circle cx="8" cy="-6" r="1.5" fill="#60a5fa" className="anim-pulse-led" style={{ animationDelay: '0.5s' }} />
            </g>

            {/* Floating Database Cylinder (Left) */}
            <g className="anim-float-delayed" style={{ animationDelay: '0.9s' }} transform="translate(50, 180)">
              <ellipse cx="0" cy="-10" rx="14" ry="6" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2" />
              <path d="M-14 -10 V10 C-14 14, 14 14, 14 10 V-10" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2" />
              <path d="M-14 0 C-14 4, 14 4, 14 0" fill="none" stroke="var(--accent)" strokeDasharray="3 3" strokeWidth="1.5" />
              <circle cx="0" cy="5" r="2" fill="#fbbf24" className="anim-pulse-led" />
            </g>

            {/* Code bracket symbol: < /> (Top Right) */}
            <g className="anim-float" style={{ animationDelay: '0.4s' }} transform="translate(380, 80)">
              <path d="M-8 -6 L-16 0 L-8 6 M8 -6 L16 0 L8 6 M-2 8 L2 -8" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" />
            </g>

            {/* Additional bracket: { } (Bottom Left) */}
            <g className="anim-float-delayed" style={{ animationDelay: '0.7s' }} transform="translate(100, 420)">
              <text x="0" y="0" fill="var(--text-muted)" fontFamily="monospace" fontSize="22" fontWeight="700" opacity="0.6">{`{ }`}</text>
            </g>

            {/* Another bracket: </> (Far Right) */}
            <g className="anim-float" style={{ animationDelay: '0.3s' }} transform="translate(440, 190)">
              <path d="M-6 -5 L-12 0 L-6 5 M6 -5 L12 0 L6 5 M-1.5 6 L1.5 -6" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* Wrench Tool Icon (Pivoting + Floating) */}
            <g className="anim-wrench-pivot anim-float-delayed" style={{ animationDelay: '1.2s' }}>
              <path d="M-12 -12 C-6 -18 6 -18 12 -12 C16 -8 16 -2 14 2 L22 10 C24 12 24 16 22 18 C20 20 16 20 14 18 L6 10 C2 12 -4 12 -8 8 C-14 2 -16 -6 -12 -12 Z" 
                    fill="var(--bg)" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="18" cy="14" r="2" fill="var(--primary)" />
            </g>

            {/* Floating Course Book Element */}
            <g className="anim-float" style={{ animationDelay: '0.8s' }} transform="translate(240, 60)">
              <rect x="-16" y="-20" width="32" height="40" rx="4" fill="var(--accent)" />
              <rect x="-12" y="-18" width="26" height="36" rx="2" fill="var(--bg)" />
              <line x1="-6" y1="-8" x2="6" y2="-8" stroke="var(--border)" strokeWidth="2" />
              <line x1="-6" y1="-2" x2="4" y2="-2" stroke="var(--border)" strokeWidth="2" />
              <line x1="-6" y1="4" x2="2" y2="4" stroke="var(--border)" strokeWidth="2" />
            </g>

            {/* Floating particles */}
            <circle cx="190" cy="390" r="3" fill="var(--primary)" opacity="0.6" className="anim-float-delayed" />
            <circle cx="330" cy="100" r="2" fill="var(--accent)" opacity="0.8" className="anim-float" />
            <circle cx="280" cy="400" r="4" fill="var(--text-muted)" opacity="0.3" className="anim-float" />
            <circle cx="150" cy="100" r="3" fill="var(--primary)" opacity="0.4" className="anim-float" style={{ animationDelay: '1.1s' }} />
            <circle cx="360" cy="420" r="3" fill="var(--accent)" opacity="0.5" className="anim-float-delayed" style={{ animationDelay: '0.5s' }} />
            <circle cx="300" cy="120" r="2" fill="var(--text-muted)" opacity="0.6" className="anim-float" style={{ animationDelay: '1.7s' }} />

          </svg>
        </div>

      </div>
    </div>
  )
}
