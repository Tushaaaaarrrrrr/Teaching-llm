import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import Razorpay from 'razorpay'

function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim()
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim()
  if (!key_id || !key_secret) return null
  return new Razorpay({ key_id, key_secret })
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

    const { id } = await params

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        topics: {
          include: {
            content: { select: { isDemo: true } },
            sharedContentLinks: { include: { content: { select: { isDemo: true } } } },
          },
        },
        lectures: { select: { isDemo: true } },
        courseOfferings: true,
      },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (course.isDisabled) {
      return NextResponse.json({ error: 'Course is currently disabled' }, { status: 403 })
    }

    if (!course.isDemoEnabled) {
      return NextResponse.json({ error: 'Demo access is not enabled for this course.' }, { status: 400 })
    }

    // 1. Check if manager has assigned at least one demo lecture
    let hasDemoLectures = false
    course.topics.forEach((t: any) => {
      t.content?.forEach((c: any) => { if (c.isDemo) hasDemoLectures = true })
      t.sharedContentLinks?.forEach((l: any) => { if (l.content?.isDemo) hasDemoLectures = true })
    })
    if (course.lectures?.some((l: any) => l.isDemo)) hasDemoLectures = true

    if (!hasDemoLectures) {
      return NextResponse.json(
        { error: 'Manager has not set any lecture for demo access yet.' },
        { status: 400 }
      )
    }

    // 2. Check if store price is configured
    const offering = course.courseOfferings[0]
    const hasStorePrice = offering && (
      (offering.recordedDiscountPrice && offering.recordedDiscountPrice > 0) ||
      (offering.recordedOriginalPrice && offering.recordedOriginalPrice > 0) ||
      (offering.liveDiscountPrice && offering.liveDiscountPrice > 0) ||
      (offering.liveOriginalPrice && offering.liveOriginalPrice > 0)
    )

    if (!hasStorePrice) {
      return NextResponse.json(
        { error: 'Store price is not set for this course yet. Please tell manager to set the price first.' },
        { status: 400 }
      )
    }

    // 3. Check existing enrollment
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: id,
        },
      },
    })

    if (existingEnrollment) {
      if (existingEnrollment.type === 'DEMO') {
        return NextResponse.json({ message: 'You are already enrolled in this demo.', isEnrolled: true })
      }
      return NextResponse.json({ message: 'You are already enrolled in the full batch.', isEnrolled: true })
    }

    // 4. Handle Paid Demo vs Free Demo
    if (course.isDemoPaid && course.demoPrice && course.demoPrice > 0) {
      const razorpay = getRazorpayInstance()
      if (!razorpay) {
        return NextResponse.json({ error: 'Razorpay configuration missing on server' }, { status: 500 })
      }

      const amountInPaise = Math.round(course.demoPrice * 100)
      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `demo_${id.slice(-6)}_${Date.now().toString().slice(-6)}`,
        notes: {
          userId: session.userId,
          courseId: id,
          type: 'DEMO_ENROLLMENT',
        },
      }

      const rzpOrder = await razorpay.orders.create(options)

      return NextResponse.json({
        requiresPayment: true,
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        courseName: course.name,
        demoPrice: course.demoPrice,
      })
    }

    // Free Demo Enrollment — No payment, NO Google Sync
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: session.userId,
        courseId: id,
        type: 'DEMO',
        isFreeEnrollment: true,
      },
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.ENROLLED,
      actionDescription: `${session.name} enrolled in free demo for ${course.name}`,
      moduleName: MODULE.ENROLLMENT,
      targetId: enrollment.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully enrolled in course demo!',
      enrollment,
    })
  } catch (error: any) {
    console.error('Error in demo-enroll:', error)
    return NextResponse.json({ error: error.message || 'Failed to enroll in demo' }, { status: 500 })
  }
}
