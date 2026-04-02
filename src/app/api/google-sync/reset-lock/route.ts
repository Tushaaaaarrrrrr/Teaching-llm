import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { processGoogleGroupSyncJobs } from '@/lib/google-group-sync'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const userRole = session?.role || ''

    if (userRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Force-reset the lock
    await (prisma as any).groupSyncLock.update({
      where: { id: 'singleton' },
      data: {
        isProcessing: false,
        lockedAt: null,
      },
    })

    // Immediately trigger a sync run since the lock is now clear
    const result = await processGoogleGroupSyncJobs()

    return NextResponse.json({ 
      success: true, 
      message: 'Google Sync lock reset and processing started',
      details: result
    })
  } catch (error) {
    console.error('[API reset-lock] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    }, { status: 500 })
  }
}
