import type { Metadata, Viewport } from 'next'
import './globals.css'
import 'katex/dist/katex.min.css'
import CsrfProvider from '@/components/CsrfProvider'
import MobileBlocker from '@/components/layout/MobileBlocker'
import CapacitorBridge from '@/components/CapacitorBridge'

export const metadata: Metadata = {
  title: 'GENz IITIAN',
  description: 'Upgrade How You Learn',
  manifest: '/site.webmanifest',
  icons: {
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <MobileBlocker />
        <CapacitorBridge />
        <CsrfProvider>{children}</CsrfProvider>
      </body>
    </html>
  )
}
