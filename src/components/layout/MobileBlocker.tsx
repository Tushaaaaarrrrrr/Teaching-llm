"use client";

import { useState, useEffect } from "react";

export default function MobileBlocker() {
  const [isMobile, setIsMobile] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Device detection logic
    const ua = navigator.userAgent;
    const isMobi = /Android|iPhone|iPod|IEMobile|Opera Mini/i.test(ua);
    
    // 2. Check pointer (coarse = touch, fine = mouse)
    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    // 3. check storage if dismissed for this session
    const dismissed = sessionStorage.getItem("mobile-notice-dismissed");

    if (isMobi && isTouch && !dismissed) {
      setIsMobile(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("mobile-notice-dismissed", "true");
    // Also set isMobile to false to hide it immediately
    setTimeout(() => setIsMobile(false), 300); // Allow animation to finish
  };

  if (!isMobile) return null;

  return (
    <div className={`mobile-blocker-overlay ${isDismissed ? 'fade-out' : 'fade-in'}`}>
      <div className="mobile-blocker-content">
        <div className="warning-icon">⚠️</div>
        <h1 className="warning-title">Warning</h1>
        <p className="warning-text">
          Our platform is not designed for mobile devices and may not function properly on smaller screens.
        </p>
        <p className="warning-hint">
          For the best experience, please switch to a laptop, desktop, or tablet.
        </p>
        <button className="dismiss-btn" onClick={handleDismiss}>
          I understand, let me in
        </button>
      </div>
    </div>
  );
}
