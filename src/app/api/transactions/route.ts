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

    const [upgradeTransactions, upgradeRevenue, orders, orderRevenue] = await Promise.all([
      prisma.upgradeTransaction.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, mobileNumber: true } },
          course: { select: { id: true, name: true, subject: true } },
        },
      }),
      prisma.upgradeTransaction.aggregate({
        where: { ...where, status: 'SUCCESS' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, mobileNumber: true } },
          items: {
            include: {
              course: { select: { id: true, name: true, subject: true } },
              courseOffering: { select: { name: true } }
            }
          }
        },
      }),
      prisma.order.aggregate({
        where: { ...where, status: 'SUCCESS' },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const transactions = [
      ...upgradeTransactions.map(u => ({
        id: u.id,
        orderId: u.orderId,
        amount: u.amount,
        status: u.status,
        createdAt: u.createdAt,
        type: 'UPGRADE',
        isExternal: false,
        course: u.course,
        user: u.user
      })),
      ...orders.map(o => {
        const firstItem = o.items[0]
        return {
          id: o.id,
          orderId: o.razorpayOrderId || o.id,
          amount: o.amount,
          status: o.status,
          createdAt: o.createdAt,
          type: 'PURCHASE',
          isExternal: o.isExternal,
          course: firstItem ? firstItem.course : { id: '', name: 'Unknown', subject: null },
          bundleName: firstItem?.courseOffering?.name,
          accessType: firstItem?.accessType,
          user: o.user
        }
      })
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      transactions,
      summary: {
        totalRevenue: (upgradeRevenue._sum.amount || 0) + (orderRevenue._sum.amount || 0),
        totalSuccessful: upgradeRevenue._count + orderRevenue._count,
        totalRecords: transactions.length,
      },
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
