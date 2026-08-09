import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

function isAdminOrManager(role: string) {
  return role === 'MANAGER' || role === 'ADMIN'
}

const SUCCESSFUL_ORDER_STATUSES = ['SUCCESS', 'PAID']

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

    const [upgradeTransactions, upgradeRevenue, orders, orderRevenue, mentorships, mentorshipRevenue, testSeries, testRevenue, notes] = await Promise.all([
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
        where: { ...where, status: { in: SUCCESSFUL_ORDER_STATUSES } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.mentorshipBooking.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, mobileNumber: true } },
          mentorship: { select: { mentorName: true } }
        }
      }),
      prisma.mentorshipBooking.aggregate({
        where: { ...where, status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.testSeriesAccess.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, mobileNumber: true } },
          testSeries: { select: { title: true } }
        }
      }),
      prisma.testSeriesAccess.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.storeNoteAccess.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, mobileNumber: true } },
          note: { select: { title: true, price: true } }
        }
      })
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
        courses: [{ ...u.course, accessType: 'LIVE', price: u.amount }],
        user: u.user
      })),
      ...orders.map(o => {
        const courses = o.items.map(item => ({
          id: item.course.id,
          name: item.course.name,
          subject: item.course.subject,
          accessType: item.accessType,
          price: item.price,
          offeringName: item.courseOffering?.name ?? null,
        }))
        const firstCourse = courses[0] ?? { id: '', name: 'Unknown', subject: null, accessType: null, price: 0, offeringName: null }
        return {
          id: o.id,
          orderId: o.razorpayOrderId || o.id,
          amount: o.amount,
          status: o.status === 'PAID' ? 'SUCCESS' : o.status,
          rawStatus: o.status,
          createdAt: o.createdAt,
          type: 'PURCHASE',
          isExternal: o.isExternal,
          course: { id: firstCourse.id, name: firstCourse.name, subject: firstCourse.subject },
          courses,
          bundleName: firstCourse.offeringName ?? undefined,
          accessType: firstCourse.accessType ?? undefined,
          user: o.user
        }
      }),
      ...mentorships.map(m => ({
        id: m.id,
        orderId: m.razorpayOrderId || m.id,
        amount: m.amount,
        status: m.status === 'PAID' ? 'SUCCESS' : m.status,
        createdAt: m.createdAt,
        type: 'MENTORSHIP',
        course: { id: '', name: `Mentorship: ${m.mentorship.mentorName}`, subject: 'Mentorship' },
        courses: [{ id: '', name: `Mentorship: ${m.mentorship.mentorName}`, subject: 'Mentorship', accessType: 'LIVE', price: m.amount }],
        user: m.user
      })),
      ...testSeries.map(ts => ({
        id: ts.id,
        orderId: ts.razorpayPaymentId || ts.id,
        amount: ts.amount,
        status: 'SUCCESS',
        createdAt: ts.createdAt,
        type: 'TEST_SERIES',
        course: { id: '', name: `Test Series: ${ts.testSeries.title}`, subject: 'Test Series' },
        courses: [{ id: '', name: `Test Series: ${ts.testSeries.title}`, subject: 'Test Series', accessType: 'RECORDED', price: ts.amount }],
        user: ts.user
      })),
      ...notes.map(n => ({
        id: n.id,
        orderId: n.orderId || n.id,
        amount: n.note.price,
        status: 'SUCCESS',
        createdAt: n.createdAt,
        type: 'STUDY_NOTE',
        course: { id: '', name: `Study Note: ${n.note.title}`, subject: 'Study Notes' },
        courses: [{ id: '', name: `Study Note: ${n.note.title}`, subject: 'Study Notes', accessType: 'RECORDED', price: n.note.price }],
        user: n.user
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      transactions,
      summary: {
        totalRevenue: (upgradeRevenue._sum.amount || 0) + (orderRevenue._sum.amount || 0) + (mentorshipRevenue._sum.amount || 0) + (testRevenue._sum.amount || 0) + notes.reduce((acc, n) => acc + n.note.price, 0),
        totalSuccessful: upgradeRevenue._count + orderRevenue._count + mentorshipRevenue._count + testRevenue._count + notes.length,
        totalRecords: transactions.length,
      },
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
