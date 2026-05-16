import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Razorpay from 'razorpay'
import { getSession } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    const session = await getSession()
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.email }
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const testSeries = await (prisma as any).testSeries.findUnique({
      where: { id: params.id }
    })

    if (!testSeries) {
      return NextResponse.json({ error: 'Test series not found' }, { status: 404 })
    }

    if (!testSeries.isActive) {
      return NextResponse.json({ error: 'This test series is no longer available' }, { status: 400 })
    }

    // Check if user already has access
    const existingAccess = await (prisma as any).testSeriesAccess.findUnique({
      where: { testSeriesId_userId: { testSeriesId: testSeries.id, userId: user.id } }
    })

    if (existingAccess) {
      return NextResponse.json({ error: 'You already have access to this test series' }, { status: 400 })
    }

    const price = testSeries.price
    const expiresAt = new Date(Date.now() + testSeries.validityDays * 24 * 60 * 60 * 1000)

    if (price === 0) {
      // Free test series — grant access immediately
      const access = await (prisma as any).testSeriesAccess.create({
        data: {
          testSeriesId: testSeries.id,
          userId: user.id,
          amount: 0,
          expiresAt
        }
      })
      return NextResponse.json({ isFree: true, accessId: access.id })
    }

    // Create Razorpay Order
    const options = {
      amount: Math.round(price * 100),
      currency: 'INR',
      receipt: `ts_${user.id.slice(0, 8)}_${Date.now()}`,
    }

    const order = await razorpay.orders.create(options)

    // Create pending access record
    const access = await (prisma as any).testSeriesAccess.create({
      data: {
        testSeriesId: testSeries.id,
        userId: user.id,
        orderId: order.id,
        amount: price,
        expiresAt
      }
    })

    return NextResponse.json({
      razorpayOrderId: order.id,
      amount: options.amount,
      currency: 'INR',
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      accessId: access.id,
      testSeriesName: testSeries.title,
      userName: user.name,
      userEmail: user.email
    })
  } catch (error: any) {
    console.error('Error creating test series order:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
