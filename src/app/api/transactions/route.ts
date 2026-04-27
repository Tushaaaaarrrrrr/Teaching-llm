import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

function isAdminOrManager(role: string) {
  return role === 'MANAGER' || role === 'ADMIN'
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'

    // Build date filter
    const now = new Date()
    let dateFilter: { gte?: Date; lte?: Date } | undefined

    switch (filter) {
      case 'today': {
        const start = new Date(now)
        start.setHours(0, 0, 0, 0)
        dateFilter = { gte: start }
        break
      }
      case 'yesterday': {
        const start = new Date(now)
        start.setDate(start.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        const end = new Date(now)
        end.setHours(0, 0, 0, 0)
        dateFilter = { gte: start, lte: end }
        break
      }
      case 'last7days': {
        const start = new Date(now)
        start.setDate(start.getDate() - 7)
        start.setHours(0, 0, 0, 0)
        dateFilter = { gte: start }
        break
      }
      case 'last30days': {
        const start = new Date(now)
        start.setDate(start.getDate() - 30)
        start.setHours(0, 0, 0, 0)
        dateFilter = { gte: start }
        break
      }
      case 'last3months': {
        const start = new Date(now)
        start.setMonth(start.getMonth() - 3)
        start.setHours(0, 0, 0, 0)
        dateFilter = { gte: start }
        break
      }
      default:
        dateFilter = undefined
    }

    const where: Record<string, unknown> = {}
    if (dateFilter) {
      where.createdAt = dateFilter
    }

    const [transactions, totalRevenue] = await Promise.all([
      prisma.upgradeTransaction.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, mobileNumber: true } },
          course: { select: { id: true, name: true, subject: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.upgradeTransaction.aggregate({
        where: { ...where, status: 'SUCCESS' },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    return NextResponse.json({
      transactions,
      summary: {
        totalRevenue: totalRevenue._sum.amount || 0,
        totalSuccessful: totalRevenue._count,
        totalRecords: transactions.length,
      },
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
