import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DELETION_STATUS } from '@/lib/deletion-reasons'

/**
 * GET /api/admin/deletion-requests
 * Manager-only endpoint to list all deletion requests with search, filtering, and summary statistics.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const searchQuery = searchParams.get('search')?.trim()

    const where: any = {}

    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'PENDING') {
        where.status = DELETION_STATUS.PENDING
      } else if (statusFilter === 'CANCELLED') {
        where.status = {
          in: [DELETION_STATUS.CANCELLED_BY_USER, DELETION_STATUS.CANCELLED_BY_MANAGER],
        }
      } else if (statusFilter === 'DELETED') {
        where.status = DELETION_STATUS.DELETED
      } else if (statusFilter === 'APPROVED_OR_PROCESSING') {
        where.status = {
          in: [DELETION_STATUS.APPROVED, DELETION_STATUS.PROCESSING],
        }
      } else {
        where.status = statusFilter
      }
    }

    if (searchQuery) {
      where.OR = [
        { userName: { contains: searchQuery, mode: 'insensitive' } },
        { userEmail: { contains: searchQuery, mode: 'insensitive' } },
        { reasonLabel: { contains: searchQuery, mode: 'insensitive' } },
        { userComment: { contains: searchQuery, mode: 'insensitive' } },
      ]
    }

    // Fetch all matching requests with event count and recent events
    const [requests, countsGrouped] = await Promise.all([
      prisma.accountDeletionRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          events: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
              securityNumber: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.accountDeletionRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ])

    const counts = {
      all: 0,
      pending: 0,
      cancelled: 0,
      deleted: 0,
      processing: 0,
    }

    countsGrouped.forEach((g) => {
      counts.all += g._count._all
      if (g.status === DELETION_STATUS.PENDING) {
        counts.pending += g._count._all
      } else if (
        g.status === DELETION_STATUS.CANCELLED_BY_USER ||
        g.status === DELETION_STATUS.CANCELLED_BY_MANAGER
      ) {
        counts.cancelled += g._count._all
      } else if (g.status === DELETION_STATUS.DELETED) {
        counts.deleted += g._count._all
      } else {
        counts.processing += g._count._all
      }
    })

    return NextResponse.json({
      requests,
      counts,
    })
  } catch (error) {
    console.error('Error fetching admin deletion requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
