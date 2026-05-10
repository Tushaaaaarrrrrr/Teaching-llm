import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getFullSession } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import UpdateOverlay from '@/components/UpdateOverlay'
import SupportFloatingButton from '@/components/ui/SupportFloatingButton'
import ProfileSetupBlocker from '@/components/ProfileSetupBlocker'
import DynamicPromptBlocker from '@/components/DynamicPromptBlocker'
import UserJourneyTracker from '@/components/UserJourneyTracker'
import PushNotificationSetup from '@/components/PushNotificationSetup'

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

  if (!session.isProfileComplete) {
    return <ProfileSetupBlocker user={session} />
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
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
        <SupportFloatingButton />
      </div>
      <UpdateOverlay />
      <DynamicPromptBlocker />
      <UserJourneyTracker enableDetailedLogs={session.enableDetailedLogs} />
      <PushNotificationSetup />
    </div>
  )
}

