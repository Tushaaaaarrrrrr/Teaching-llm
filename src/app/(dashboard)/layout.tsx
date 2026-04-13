import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getFullSession } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import UpdateOverlay from '@/components/UpdateOverlay'
import SupportFloatingButton from '@/components/ui/SupportFloatingButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getFullSession()

  if (!session) {
    redirect('/login')
  }

  // Redirect terminated users — uses the combined query, no extra DB call
  if (session.isTerminated) {
    redirect('/terminated')
  }

  // Maintenance mode guard
  if (session.isMaintenanceMode) {
    redirect('/maintenance')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#e8eaf0' }}>
      <Sidebar
        userRole={session.role}
        userName={session.name}
        userEmail={session.email}
      />
      <div style={{
        flex: 1,
        marginLeft: '215px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        maxWidth: 'calc(100vw - 215px)',
        overflow: 'hidden',
      }}>
        <Header userName={session.name} userRole={session.role} />
        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            {children}
          </div>
          <footer style={{ padding: '24px 32px', display: 'flex', justifyContent: 'center', gap: '24px', background: '#e8eaf0', borderTop: '2px solid #dcdfe8', marginTop: 'auto' }}>
            <Link href="/company/privacy-policy" style={{ fontSize: '13px', color: '#6b6b8a', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>
            <Link href="/company/return-policy" style={{ fontSize: '13px', color: '#6b6b8a', textDecoration: 'none', fontWeight: 600 }}>Return / Refund Policies</Link>
            <Link href="/company/copyright-policy" style={{ fontSize: '13px', color: '#6b6b8a', textDecoration: 'none', fontWeight: 600 }}>Copyright Policies</Link>
          </footer>
        </main>
        <SupportFloatingButton />
      </div>
      <UpdateOverlay />
    </div>
  )
}

