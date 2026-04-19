import type { Metadata } from 'next'
import './globals.css'
import 'katex/dist/katex.min.css'
import CsrfProvider from '@/components/CsrfProvider'
import MobileBlocker from '@/components/layout/MobileBlocker'

export const metadata: Metadata = {
  title: 'GENz IITIAN',
  description: 'Upgrade How You Learn',
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
        <CsrfProvider>{children}</CsrfProvider>
      </body>
    </html>
  )
}
