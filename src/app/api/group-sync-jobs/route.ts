import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query parameters for filtering and pagination
    const url = new URL(req.url)
    const status = url.searchParams.get('status') || '' // PENDING, PROCESSING, SUCCESS, FAILED
    const action = url.searchParams.get('action') || '' // ADD, REMOVE
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    // Build where filter
    const where: any = {}
    if (status) {
      where.status = status.toUpperCase()
    }
    if (action) {
      where.action = action.toUpperCase()
    }

    // Get total count for pagination
    const total = await (prisma as any).groupSyncJob.count({ where })

    // Fetch jobs with filtering, pagination, and sorting
    const jobs = await (prisma as any).groupSyncJob.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            name: true,
            googleGroupEmail: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    // Get pending and processing counts for queue ETA calculation
    const pendingCount = await (prisma as any).groupSyncJob.count({
      where: { status: 'PENDING' },
    })
    const processingCount = await (prisma as any).groupSyncJob.count({
      where: { status: 'PROCESSING' },
    })
    const failedCount = await (prisma as any).groupSyncJob.count({
      where: { status: 'FAILED' },
    })

    return NextResponse.json({
      jobs,
      pendingCount,
      processingCount,
      failedCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching Google sync jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
