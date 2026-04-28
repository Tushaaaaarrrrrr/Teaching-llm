import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const upgrades = await prisma.upgradeTransaction.findMany({
      where: { userId: session.userId },
      include: {
        course: { select: { id: true, name: true, subject: true } },
      },
      orderBy: { createdAt: 'desc' }
    })

    const orders = await prisma.order.findMany({
      where: { userId: session.userId },
      include: {
        items: {
          include: {
            course: { select: { id: true, name: true, subject: true } },
            courseOffering: { select: { name: true } }
          }
        },
        refund: {
          select: {
            refundAmount: true,
            refundStatus: true,
            refundDate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const transactions = [
      ...upgrades.map(u => ({
        id: u.id,
        orderId: u.orderId,
        paymentId: u.razorpayPaymentId,
        amount: u.amount,
        status: u.status,
        createdAt: u.createdAt,
        type: 'UPGRADE',
        isExternal: false,
        courses: [
          {
            id: u.course.id,
            name: u.course.name,
            subject: u.course.subject,
            accessType: 'LIVE'
          }
        ],
        discountCode: null,
        referralCode: null,
        coinsApplied: 0,
        paymentMethod: 'razorpay',
        currency: 'INR',
        gstAmount: 0,
        invoiceNumber: null,
        bundleName: null,
        refund: null
      })),
      ...orders.map(o => {
        const firstItem = o.items[0]
        return {
          id: o.id,
          orderId: o.razorpayOrderId || o.id,
          paymentId: o.razorpayPaymentId,
          amount: o.amount,
          status: o.status,
          createdAt: o.createdAt,
          type: 'PURCHASE',
          isExternal: o.isExternal,
          courses: o.items.map(item => ({
            id: item.course.id,
            name: item.course.name,
            subject: item.course.subject,
            accessType: item.accessType
          })),
          bundleName: o.bundleName,
          discountCode: o.discountCode,
          referralCode: o.referralCode,
          coinsApplied: o.coinsApplied,
          paymentMethod: o.paymentMethod,
          currency: o.currency,
          gstAmount: o.gstAmount,
          invoiceNumber: o.invoiceNumber,
          refund: o.refund
        }
      })
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Error fetching user transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
