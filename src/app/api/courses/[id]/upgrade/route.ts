import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import crypto from 'crypto'

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
    const body = await request.json()
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = body

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
    }

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    if (expectedSignature !== razorpaySignature) {
      // Mark transaction as failed
      await prisma.upgradeTransaction.updateMany({
        where: { razorpayOrderId },
        data: { status: 'FAILED' },
      })
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    // Find the pending transaction
    const transaction = await prisma.upgradeTransaction.findUnique({
      where: { razorpayOrderId },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (transaction.status === 'SUCCESS') {
      return NextResponse.json({ error: 'Transaction already processed', orderId: transaction.orderId }, { status: 400 })
    }

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

    // Verify course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { name: true, liveUpgradePrice: true },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Update enrollment type to LIVE
    await prisma.enrollment.update({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
      data: { type: 'LIVE' },
    })

    // Mark transaction as successful
    await prisma.upgradeTransaction.update({
      where: { razorpayOrderId },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: 'SUCCESS',
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.EXTERNAL_ENROLLMENT,
      actionDescription: `${session.name} upgraded to PRO batch for "${course.name}" (₹${course.liveUpgradePrice}) — Order: ${transaction.orderId}`,
      moduleName: MODULE.ENROLLMENT,
      targetId: courseId,
    })

    // Send upgrade email via Google Apps Script webhook
    try {
      const webhookUrl = process.env.UPGRADE_EMAIL_WEBHOOK_URL
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: session.name,
            email: session.email,
            orderId: transaction.orderId,
            courseName: course.name,
            amount: course.liveUpgradePrice,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
          }),
        })
      }
    } catch (emailErr) {
      console.error('Failed to send upgrade email:', emailErr)
      // Don't fail the upgrade if email fails
    }

    return NextResponse.json({
      message: 'Successfully upgraded to PRO batch!',
      orderId: transaction.orderId,
    })
  } catch (error) {
    console.error('Error upgrading enrollment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
