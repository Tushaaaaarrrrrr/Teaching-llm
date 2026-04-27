import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

function generateOrderId(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `UPG-${date}-${random}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: courseId } = await params

    // Find the enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'You are not enrolled in this course' }, { status: 403 })
    }

    if (enrollment.type === 'LIVE') {
      return NextResponse.json({ error: 'You are already in the Live batch' }, { status: 400 })
    }

    // Verify course has an upgrade price set
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { name: true, liveUpgradePrice: true },
    })

    if (!course || !course.liveUpgradePrice) {
      return NextResponse.json({ error: 'Upgrade is not available for this course' }, { status: 400 })
    }

    const amountInPaise = Math.round(course.liveUpgradePrice * 100)
    const orderId = generateOrderId()

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: orderId,
      notes: {
        courseId,
        courseName: course.name,
        userId: session.userId,
        userName: session.name,
        type: 'COURSE_UPGRADE',
      },
    })

    // Save pending transaction
    await prisma.upgradeTransaction.create({
      data: {
        orderId,
        razorpayOrderId: razorpayOrder.id,
        userId: session.userId,
        courseId,
        amount: course.liveUpgradePrice,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      courseName: course.name,
      userName: session.name,
      userEmail: session.email,
    })
  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
