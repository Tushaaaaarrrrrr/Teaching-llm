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

    // Force-reset the lock (auto-creates if missing)
    await (prisma as any).groupSyncLock.upsert({
      where: { id: 'singleton' },
      update: {
        isProcessing: false,
        lockedAt: null,
      },
      create: {
        id: 'singleton',
        isProcessing: false,
        lockedAt: null,
      },
    })

    // Immediately trigger a sync run in background (fire-and-forget)
    process.nextTick(() => {
      processGoogleGroupSyncJobs().catch(err => console.error('[API reset-lock async worker] Error:', err))
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Google Sync lock reset successfully. Background processing started.',
    })
  } catch (error) {
    console.error('[API reset-lock] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    }, { status: 500 })
  }
}
