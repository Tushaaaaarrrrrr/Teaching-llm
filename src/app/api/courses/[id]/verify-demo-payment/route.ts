import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import crypto from 'crypto'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = await request.json()

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
    if (!keySecret) {
      return NextResponse.json({ error: 'Razorpay secret missing' }, { status: 500 })
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    if (generatedSignature !== razorpaySignature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    const course = await prisma.course.findUnique({
      where: { id },
      select: { name: true },
    })

    // Upsert demo enrollment — DO NOT run Google Sync for demo!
    const enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: id,
        },
      },
      create: {
        userId: session.userId,
        courseId: id,
        type: 'DEMO',
        isFreeEnrollment: false,
      },
      update: {
        type: 'DEMO',
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.ENROLLED,
      actionDescription: `${session.name} paid for demo access to ${course?.name || id}`,
      moduleName: MODULE.ENROLLMENT,
      targetId: enrollment.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Paid demo access granted!',
      enrollment,
    })
  } catch (error: any) {
    console.error('Error verifying demo payment:', error)
    return NextResponse.json({ error: error.message || 'Payment verification failed' }, { status: 500 })
  }
}
