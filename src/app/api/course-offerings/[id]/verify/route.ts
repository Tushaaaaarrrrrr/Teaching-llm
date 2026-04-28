import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { queueGoogleGroupSyncJobs } from '@/lib/google-group-sync'
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const razorpayPaymentId = body.razorpayPaymentId || body.razorpay_payment_id
    const razorpayOrderId = body.razorpayOrderId || body.razorpay_order_id
    const razorpaySignature = body.razorpaySignature || body.razorpay_signature

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
    }

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    if (expectedSignature !== razorpaySignature) {
      // Mark order as failed
      await prisma.order.updateMany({
        where: { razorpayOrderId },
        data: { status: 'FAILED' },
      })
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    // Find the pending order
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
      include: { items: true }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === 'SUCCESS') {
      return NextResponse.json({ error: 'Order already processed', orderId: order.id }, { status: 400 })
    }

    const orderItem = order.items[0]
    if (!orderItem) {
       return NextResponse.json({ error: 'Order items missing' }, { status: 400 })
    }

    const courseId = orderItem.courseId
    const accessType = orderItem.accessType

    // Verify course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { name: true },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check existing enrollment
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
    })

    if (existingEnrollment) {
      if (existingEnrollment.type !== accessType) {
         // Update to LIVE if they bought LIVE and had RECORDED
         if (accessType === 'LIVE') {
           await prisma.enrollment.update({
             where: { id: existingEnrollment.id },
             data: { type: 'LIVE' }
           })
         }
      }
    } else {
      // Create new enrollment
      await prisma.enrollment.create({
        data: {
          userId: session.userId,
          courseId: courseId,
          type: accessType as 'RECORDED' | 'LIVE'
        }
      })

      // Sync Google Group if needed
      await queueGoogleGroupSyncJobs(prisma, {
        userEmail: session.email,
        courseIds: [courseId],
        action: 'ADD',
      })
    }

    // Mark order as successful
    await prisma.order.update({
      where: { id: order.id },
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
      actionDescription: `${session.name} purchased course "${course.name}" (${accessType}) for ₹${order.amount} — Order: ${order.id}`,
      moduleName: MODULE.ENROLLMENT,
      targetId: courseId,
    })

    // Send email via Google Apps Script webhook
    try {
      const webhookUrl = process.env.UPGRADE_EMAIL_WEBHOOK_URL
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: session.name,
            email: session.email,
            orderId: order.id,
            courseName: course.name,
            amount: order.amount,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
          }),
        })
      }
    } catch (emailErr) {
      console.error('Failed to send purchase email:', emailErr)
    }

    return NextResponse.json({
      message: 'Successfully purchased course!',
      orderId: order.id,
    })
  } catch (error) {
    console.error('Error verifying purchase:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
