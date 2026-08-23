import { redirect } from 'next/navigation'

import { getFullSession } from '@/lib/auth'

export default async function SupportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getFullSession()

  if (!session) {
    redirect('/login')
  }

  if (session.role === 'ADMIN') {
    redirect('/dashboard')
  }

  return children
}
