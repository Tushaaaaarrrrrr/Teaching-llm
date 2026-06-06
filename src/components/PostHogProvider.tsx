'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'

// Initialize PostHog only on client side
if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    // Capture page views automatically
    capture_pageview: true,
    // Capture performance metrics
    capture_performance: true,
    // Record sessions (watch how users use your app!)
    session_recording: {
      maskAllInputs: true, // Hide passwords/sensitive inputs
    },
    // Don't track in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        posthog.opt_out_capturing()
      }
    },
  })
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>
}

// Hook to use PostHog anywhere in your app
export { usePostHog }
