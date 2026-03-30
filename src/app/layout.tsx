import type { Metadata } from 'next'
import './globals.css'
import CsrfProvider from '@/components/CsrfProvider'

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
        <CsrfProvider>{children}</CsrfProvider>
      </body>
    </html>
  )
}
