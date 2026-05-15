import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Razorpay from 'razorpay'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    const body = await request.json()
    const { accessType } = body // 'RECORDED' or 'LIVE'

    if (!['RECORDED', 'LIVE'].includes(accessType)) {
      return NextResponse.json({ error: 'Invalid access type' }, { status: 400 })
    }

    const offering = await prisma.courseOffering.findUnique({
      where: { id: params.id },
      include: { course: { select: { id: true, name: true } } }
    })

    if (!offering) {
      return NextResponse.json({ error: 'Course offering not found' }, { status: 404 })
    }

    let price = 0
    if (accessType === 'RECORDED') {
      if (!offering.hasRecorded || offering.recordedDiscountPrice == null) {
        return NextResponse.json({ error: 'Recorded access is not available' }, { status: 400 })
      }
      price = offering.recordedDiscountPrice
    } else {
      if (!offering.hasLive || offering.liveDiscountPrice == null) {
        return NextResponse.json({ error: 'Live access is not available' }, { status: 400 })
      }
      price = offering.liveDiscountPrice
    }

    // Check if user is already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: offering.courseId
        }
      }
    })

    if (existingEnrollment) {
      // If they want LIVE and currently have RECORDED, they should use the upgrade flow, or we can handle it here?
      // Better to tell them they are already enrolled for now, as upgrades are handled elsewhere, but this is a purchase.
      if (existingEnrollment.type === 'LIVE' || accessType === 'RECORDED') {
        return NextResponse.json({ error: 'You are already enrolled in this course.' }, { status: 400 })
      } else {
        return NextResponse.json({ error: 'You already have recorded access. Use the UPGRADE button on your course card to get LIVE access.' }, { status: 400 })
      }
    }

    const amountInPaise = Math.round(price * 100)
    
    // Create pending order locally
    const order = await prisma.order.create({
      data: {
        userId: session.userId,
        amount: price,
        status: 'PENDING',
        items: {
          create: {
            courseOfferingId: offering.id,
            courseId: offering.courseId,
            accessType,
            price
          }
        }
      }
    })

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: order.id,
      notes: {
        orderId: order.id,
        courseOfferingId: offering.id,
        courseId: offering.courseId,
        userId: session.userId,
        userName: session.name || 'Student',
        type: 'COURSE_PURCHASE',
      },
    })

    // Update local order with Razorpay ID
    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: razorpayOrder.id }
    })

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      courseName: offering.course.name,
      bundleName: offering.name,
      userName: session.name,
      userEmail: session.email,
    })
  } catch (error) {
    console.error('[create-order] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
