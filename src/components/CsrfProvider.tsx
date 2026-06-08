'use client'

import React from 'react'

if (typeof window !== 'undefined' && !(window as any).__csrfPatched) {
  const originalFetch = window.fetch

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const method = (init?.method || 'GET').toUpperCase()
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
    let newInit = init

    if (writeMethods.includes(method)) {
      const headers = new Headers(init?.headers || {})
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
      const isSameOrigin = url.startsWith('/') || url.startsWith(window.location.origin)

      if (isSameOrigin && !headers.has('X-Requested-With')) {
        headers.set('X-Requested-With', 'XMLHttpRequest')
      }
      newInit = { ...init, headers }
    }

    const response = await originalFetch.call(this, input, newInit)
    
    if (response.status === 429) {
      showRateLimitToast()
    }
    
    return response
  }

  ;(window as any).__csrfPatched = true
}

function showRateLimitToast() {
  if (typeof document === 'undefined') return
  
  if (document.getElementById('rate-limit-toast')) return

  const toast = document.createElement('div')
  toast.id = 'rate-limit-toast'
  toast.textContent = 'Too many requests. Please slow down and try again.'
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: rgba(239, 68, 68, 0.95);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: #ffffff;
    padding: 14px 28px;
    border-radius: 50px;
    z-index: 999999;
    font-weight: 700;
    font-size: 14px;
    box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    opacity: 0;
    pointer-events: none;
    font-family: system-ui, -apple-system, sans-serif;
    border: 1px solid rgba(255, 255, 255, 0.2);
    text-align: center;
    white-space: nowrap;
  `
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)'
    toast.style.opacity = '1'
  }, 10)

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(20px)'
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, 4000)
}

export default function CsrfProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

