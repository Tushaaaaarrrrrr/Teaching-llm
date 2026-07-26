import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { retryFailedGoogleGroupSyncJobs } from '@/lib/google-group-sync'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getSession()
    const userRole = session?.role || ''

    if (userRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await retryFailedGoogleGroupSyncJobs()

    return NextResponse.json({
      success: true,
      message: `Successfully reset ${result.resetCount} failed sync jobs to PENDING. Processing started.`,
      resetCount: result.resetCount,
    })
  } catch (error) {
    console.error('[API retry-failed] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    )
  }
}
