import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getSession()
    const userRole = session?.role || ''

    if (userRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized. Manager role required.' }, { status: 401 })
    }

    const result = await (prisma as any).groupSyncJob.deleteMany({})

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.count} sync job(s) from the database queue.`,
      clearedCount: result.count,
    })
  } catch (error) {
    console.error('Failed to clear sync jobs queue:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear sync jobs queue' },
      { status: 500 }
    )
  }
}
