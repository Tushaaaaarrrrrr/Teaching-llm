import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { queueGoogleGroupSyncJobs } from '@/lib/google-group-sync'
import { sendEmailNotification } from '@/lib/email-service'
import { sendCourseEnrollmentNotification } from '@/lib/system-notifications'

// Webhook signature verification
function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET not configured')
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  return expectedSignature === signature
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-razorpay-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const body = await request.text()
    
    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const eventId = event.id
    const eventType = event.event

    console.log(`Processing webhook event: ${eventType}`)

    // Prevent duplicate processing
    const existingWebhook = await prisma.webhookLog.findUnique({
      where: { webhookEventId: eventId }
    })

    if (existingWebhook && existingWebhook.status === 'PROCESSED') {
      console.log(`Webhook ${eventId} already processed`)
      return NextResponse.json({ status: 'already_processed' })
    }

    // Log webhook received
    await prisma.webhookLog.create({
      data: {
        webhookEventId: eventId,
        eventType,
        payload: body,
        status: 'RECEIVED'
      }
    })

    const paymentData = event.payload?.payment?.entity
    const orderId = paymentData?.notes?.orderId
    const razorpayPaymentId = paymentData?.id
    const razorpayOrderId = paymentData?.order_id

    if (!razorpayPaymentId || !razorpayOrderId) {
      throw new Error('Missing payment or order ID in webhook')
    }

    if (eventType === 'payment.captured') {
      // Payment successful
      console.log(`Payment captured: ${razorpayPaymentId}`)

      // Check if it's an Order or UpgradeTransaction
      const order = await prisma.order.findUnique({
        where: { razorpayOrderId },
        include: { items: { include: { course: true } }, user: true }
      })

      const upgradeTransaction = await prisma.upgradeTransaction.findUnique({
        where: { razorpayOrderId },
        include: { course: true, user: true }
      })

      if (order) {
        // Handle Order (Course Purchase)
        if (order.status === 'SUCCESS') {
          console.log(`Order ${order.id} already processed`)
          return NextResponse.json({ status: 'already_processed' })
        }

        const orderItem = order.items[0]
        if (!orderItem) {
          throw new Error('Order items missing')
        }

        const courseId = orderItem.courseId
        const accessType = orderItem.accessType

        // Check existing enrollment
        const existingEnrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: order.userId,
              courseId,
            },
          },
        })

        if (!existingEnrollment) {
          // Create new enrollment
          await prisma.enrollment.create({
            data: {
              userId: order.userId,
              courseId,
              type: accessType as 'RECORDED' | 'LIVE',
            },
          })

          sendCourseEnrollmentNotification(order.userId, courseId, order.amount).catch(console.error)

          // Sync Google Group if needed
          await queueGoogleGroupSyncJobs(prisma, {
            userEmail: order.user.email,
            courseIds: [courseId],
            action: 'ADD',
          })
        } else if (existingEnrollment.type !== accessType && accessType === 'LIVE') {
          // Upgrade from RECORDED to LIVE
          await prisma.enrollment.update({
            where: { id: existingEnrollment.id },
            data: { type: 'LIVE' },
          })
        }

        // Mark order as successful
        await prisma.order.update({
          where: { id: order.id },
          data: {
            razorpayPaymentId,
            status: 'SUCCESS',
          },
        })

        logActivity({
          userId: order.userId,
          userName: order.user.name,
          userRole: 'STUDENT',
          actionType: ACTION.EXTERNAL_ENROLLMENT,
          actionDescription: `Webhook payment verified for course "${orderItem.course.name}" (${accessType}) - ₹${order.amount}`,
          moduleName: MODULE.ENROLLMENT,
          targetId: courseId,
        })

        // Send email via unified email service
        try {
          await sendEmailNotification('purchase', {
            userName: order.user.name,
            userEmail: order.user.email,
            orderId: order.id,
            itemName: orderItem.course.name,
            amount: order.amount,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
          })
        } catch (emailErr) {
          console.error('Failed to send purchase email:', emailErr)
        }

        // Mark webhook as processed
        await prisma.webhookLog.update({
          where: { webhookEventId: eventId },
          data: { status: 'PROCESSED' }
        })

        return NextResponse.json({ status: 'success', orderId: order.id })
      } else if (upgradeTransaction) {
        // Handle UpgradeTransaction (Course Upgrade)
        if (upgradeTransaction.status === 'SUCCESS') {
          console.log(`Upgrade transaction ${upgradeTransaction.id} already processed`)
          return NextResponse.json({ status: 'already_processed' })
        }

        const courseId = upgradeTransaction.courseId

        // Update enrollment type to LIVE
        await prisma.enrollment.update({
          where: {
            userId_courseId: {
              userId: upgradeTransaction.userId,
              courseId,
            },
          },
          data: { type: 'LIVE' },
        })

        // Mark transaction as successful
        await prisma.upgradeTransaction.update({
          where: { id: upgradeTransaction.id },
          data: {
            razorpayPaymentId,
            status: 'SUCCESS',
          },
        })

        logActivity({
          userId: upgradeTransaction.userId,
          userName: upgradeTransaction.user.name,
          userRole: 'STUDENT',
          actionType: ACTION.EXTERNAL_ENROLLMENT,
          actionDescription: `Webhook payment verified for upgrade to "${upgradeTransaction.course.name}" - ₹${upgradeTransaction.amount}`,
          moduleName: MODULE.ENROLLMENT,
          targetId: courseId,
        })

        // Send email via unified email service
        try {
          await sendEmailNotification('upgrade', {
            userName: upgradeTransaction.user.name,
            userEmail: upgradeTransaction.user.email,
            orderId: upgradeTransaction.orderId,
            courseName: upgradeTransaction.course.name,
            amount: upgradeTransaction.amount,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
          })
        } catch (emailErr) {
          console.error('Failed to send upgrade email:', emailErr)
        }

        // Mark webhook as processed
        await prisma.webhookLog.update({
          where: { webhookEventId: eventId },
          data: { status: 'PROCESSED' }
        })

        return NextResponse.json({ status: 'success', transactionId: upgradeTransaction.id })
      } else {
        throw new Error(`No order or transaction found for razorpayOrderId: ${razorpayOrderId}`)
      }
    } else if (eventType === 'payment.failed' || eventType === 'payment.authorized') {
      // Payment failed or needs manual capture
      console.log(`Payment status changed: ${eventType}`)

      const order = await prisma.order.findUnique({
        where: { razorpayOrderId },
      })

      const upgradeTransaction = await prisma.upgradeTransaction.findUnique({
        where: { razorpayOrderId },
      })

      if (order && order.status !== 'FAILED') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'FAILED' },
        })
      }

      if (upgradeTransaction && upgradeTransaction.status !== 'FAILED') {
        await prisma.upgradeTransaction.update({
          where: { id: upgradeTransaction.id },
          data: { status: 'FAILED' },
        })
      }

      // Mark webhook as processed
      await prisma.webhookLog.update({
        where: { webhookEventId: eventId },
        data: { status: 'PROCESSED' }
      })

      return NextResponse.json({ status: 'success' })
    } else {
      console.log(`Unhandled event type: ${eventType}`)
      
      // Mark webhook as processed
      await prisma.webhookLog.update({
        where: { webhookEventId: eventId },
        data: { status: 'PROCESSED' }
      })

      return NextResponse.json({ status: 'success' })
    }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
