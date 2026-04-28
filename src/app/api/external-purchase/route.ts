import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { queueGoogleGroupSyncJobs } from '@/lib/google-group-sync'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { email, name, phone, courseIds, courseDetails, transaction, refund } = body

    if (!email || !courseIds || !courseIds.length || !transaction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          mobileNumber: phone || null,
          passwordHash: '', // External users don't have password
          role: 'STUDENT',
          isProfileComplete: false
        }
      })
    }

    // Verify all courses exist
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, name: true }
    })

    if (courses.length !== courseIds.length) {
      return NextResponse.json({ error: 'Some courses not found' }, { status: 404 })
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        amount: transaction.finalPrice,
        status: transaction.paymentStatus || 'SUCCESS',
        isExternal: true,
        paymentMethod: transaction.paymentMethod || 'external',
        currency: transaction.currency || 'INR',
        gstAmount: transaction.gstAmount || 0,
        invoiceNumber: transaction.invoiceNumber,
        discountCode: transaction.discountCode,
        referralCode: transaction.referralCode,
        coinsApplied: transaction.coinsApplied || 0,
        bundleId: transaction.bundleId,
        bundleName: transaction.bundleName,
        razorpayOrderId: transaction.orderId, // Store as orderId
        razorpayPaymentId: transaction.paymentId
      }
    })

    // Create order items and enrollments
    const enrollmentCourseIds: string[] = []

    for (let i = 0; i < courseIds.length; i++) {
      const courseId = courseIds[i]
      const accessType = courseDetails?.[i]?.type?.toUpperCase() || 'RECORDED'

      // Create order item
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          courseId,
          accessType,
          price: transaction.finalPrice / courseIds.length // Split price evenly
        }
      })

      // Create or update enrollment
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId } }
      })

      if (existingEnrollment) {
        if (existingEnrollment.type !== accessType && accessType === 'LIVE') {
          await prisma.enrollment.update({
            where: { id: existingEnrollment.id },
            data: { type: accessType as 'RECORDED' | 'LIVE' }
          })
        }
      } else {
        await prisma.enrollment.create({
          data: {
            userId: user.id,
            courseId,
            type: accessType as 'RECORDED' | 'LIVE',
            isFreeEnrollment: false
          }
        })
      }

      enrollmentCourseIds.push(courseId)
    }

    // Queue Google Group sync
    await queueGoogleGroupSyncJobs(prisma, {
      userEmail: email,
      courseIds: enrollmentCourseIds,
      action: 'ADD'
    })

    // Log activity
    logActivity({
      userId: user.id,
      userName: name || email,
      userRole: 'STUDENT',
      actionType: ACTION.EXTERNAL_ENROLLMENT,
      actionDescription: `External purchase: ${courseIds.length} course(s) for ₹${transaction.finalPrice} (Order: ${transaction.orderId})`,
      moduleName: MODULE.ENROLLMENT,
      targetId: courseIds[0]
    })

    // NOTE: Do NOT send email here - external website already sent confirmation email
    // Email is only sent for internal LMS purchases (from Store page)

    return NextResponse.json({
      success: true,
      message: 'External purchase processed successfully',
      orderId: order.id,
      enrolledCourses: courseIds.length
    })
  } catch (error) {
    console.error('Error processing external purchase:', error)
    return NextResponse.json(
      { error: 'Failed to process purchase', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
