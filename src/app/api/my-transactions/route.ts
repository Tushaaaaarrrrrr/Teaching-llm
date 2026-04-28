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
    })

    const orders = await prisma.order.findMany({
      where: { userId: session.userId },
      include: {
        items: {
          include: {
            course: { select: { id: true, name: true, subject: true } },
            courseOffering: { select: { name: true } }
          }
        }
      },
    })

    const transactions = [
      ...upgrades.map(u => ({
        id: u.id,
        orderId: u.orderId,
        amount: u.amount,
        status: u.status,
        createdAt: u.createdAt,
        type: 'UPGRADE',
        course: u.course
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
          course: firstItem ? firstItem.course : { id: '', name: 'Unknown', subject: null },
          bundleName: firstItem?.courseOffering?.name,
          accessType: firstItem?.accessType
        }
      })
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Error fetching user transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
