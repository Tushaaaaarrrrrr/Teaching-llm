import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import crypto from 'crypto'
import { logActivity, MODULE, ACTION } from '@/lib/activity-log'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const razorpayPaymentId = body.razorpayPaymentId || body.razorpay_payment_id
    const razorpayOrderId = body.razorpayOrderId || body.razorpay_order_id
    const razorpaySignature = body.razorpaySignature || body.razorpay_signature

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
    }

    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex')
    if (expectedSignature !== razorpaySignature) {
      await prisma.order.updateMany({ where: { razorpayOrderId }, data: { status: 'FAILED' } })
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { razorpayOrderId }, include: { items: true } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.status === 'SUCCESS') return NextResponse.json({ error: 'Order already processed', orderId: order.id }, { status: 400 })

    // Process enrollments for each order item (skip special bundle marker items if any)
    for (const item of order.items) {
      // If courseId corresponds to a bundle id (we used bundle id as marker), skip creating enrollment for the marker
      const maybeBundle = await prisma.bundleOffering.findUnique({ where: { id: item.courseId } })
      if (maybeBundle) continue

      const existing = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: session.userId, courseId: item.courseId } } })
      if (existing) {
        if (existing.type !== item.accessType && item.accessType === 'LIVE') {
          await prisma.enrollment.update({ where: { id: existing.id }, data: { type: 'LIVE' } })
        }
      } else {
        await prisma.enrollment.create({ data: { userId: session.userId, courseId: item.courseId, type: item.accessType as 'RECORDED' | 'LIVE' } })
        
        // Log individual enrollment
        logActivity({
          userId: session.userId,
          userName: session.name || session.email || 'User',
          userRole: session.role,
          actionType: ACTION.PURCHASE_COMPLETED,
          actionDescription: `Enrolled in course through order: ${item.courseId} (${item.accessType})`,
          moduleName: MODULE.STORE,
          targetId: item.courseId,
          metadata: {
            orderId: order.id,
            accessType: item.accessType
          }
        })
      }
    }

    await prisma.order.update({ where: { id: order.id }, data: { razorpayPaymentId, razorpaySignature, status: 'SUCCESS' } })

    // Trigger purchase confirmation email
    const { sendEmailNotification } = require('@/lib/email-service')
    // Get item names for the email
    const itemNames = order.items.map(i => i.courseId).join(', ') // Simplified for now
    
    await sendEmailNotification('purchase', {
      userEmail: session.email,
      userName: session.name,
      orderId: order.id,
      itemName: itemNames,
      amount: order.amount,
      date: new Date().toLocaleDateString(),
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/courses/explore`
    })

    // Track coupon usage if a coupon was applied
    if (order.couponId && order.couponCode) {
      try {
        await prisma.$transaction([
          prisma.coupon.update({
            where: { id: order.couponId },
            data: {
              currentUses: { increment: 1 },
              totalRevenueGenerated: { increment: order.amount }
            }
          }),
          prisma.couponUsage.create({
            data: {
              couponId: order.couponId,
              userId: session.userId,
              orderId: order.id,
              revenue: order.amount
            }
          })
        ])
      } catch (couponError) {
        console.error('[orders/verify] Coupon usage tracking failed (non-critical):', couponError)
      }
    }

    return NextResponse.json({ message: 'Successfully purchased', orderId: order.id })
  } catch (error) {
    console.error('Error verifying bundle/order purchase:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
