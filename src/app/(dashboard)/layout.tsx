import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
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
      }}>
        <Header userName={session.name} userRole={session.role} />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
