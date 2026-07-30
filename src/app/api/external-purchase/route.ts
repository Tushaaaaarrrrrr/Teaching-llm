import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { queueGoogleGroupSyncJobs } from '@/lib/google-group-sync'
import { scheduleWelcomeSequence } from '@/lib/welcome-notifications'
import { getOrAssignPoolCategory } from '@/lib/notification-group-pool'
import { extractAndParseAmount, getFallbackCoursePrices } from '@/lib/external-price'

export async function POST(request: NextRequest) {
  const headerSecret = request.headers.get('x-external-secret')
  const authHeader = request.headers.get('authorization')?.replace('Bearer ', '')

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    // Destructure known fields — unknown/extra fields are silently ignored.
    const {
      secret: bodySecret,
      email,
      name,
      phone,
      gender,
      orderId,
      paymentId,
      purchasedAt,
      finalPrice,
      courseIds,
      courseDetails,
    } = body as {
      secret?: string
      email?: string
      name?: string
      phone?: string
      gender?: string
      orderId?: string
      paymentId?: string
      purchasedAt?: string
      finalPrice?: number
      courseIds?: string[]
      courseDetails?: Array<{ id: string; type?: string }>
    }

    // Determine effective secret
    const providedSecret = headerSecret || authHeader || bodySecret

    // ─── 1. Auth ──────────────────────────────────────────────────────
    if (!providedSecret || providedSecret !== process.env.EXTERNAL_ENROLL_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    // ─── 2. Required field validation ─────────────────────────────────
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    // Build normalised course ID list — courseDetails IDs are primary
    const detailsIds: string[] = Array.isArray(courseDetails)
      ? courseDetails.filter(d => d && typeof d.id === 'string' && d.id.trim().length > 0).map(d => d.id.trim())
      : []
    const legacyIds: string[] = Array.isArray(courseIds)
      ? courseIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : []

    const allCourseIds = Array.from(new Set([...detailsIds, ...legacyIds]))

    if (allCourseIds.length === 0) {
      return NextResponse.json({ error: 'At least one course ID is required' }, { status: 400 })
    }

    // Build id→type map from courseDetails (case-insensitive)
    const classTypeMap = new Map<string, 'LIVE' | 'RECORDED'>()
    if (Array.isArray(courseDetails)) {
      for (const d of courseDetails) {
        if (d && typeof d.id === 'string') {
          const upper = typeof d.type === 'string' ? d.type.toUpperCase() : ''
          classTypeMap.set(d.id.trim(), upper === 'LIVE' ? 'LIVE' : 'RECORDED')
        }
      }
    }

    // Normalize gender — accept any casing, fall back to null
    const normalizedGender: string | null =
      typeof gender === 'string' && gender.toUpperCase() === 'FEMALE'
        ? 'FEMALE'
        : typeof gender === 'string' && gender.toUpperCase() === 'MALE'
        ? 'MALE'
        : null

    // Normalize phone — treat "N/A" or empty strings as null
    const normalizedPhone = typeof phone === 'string' && 
      phone.trim().length > 0 && 
      phone.trim().toUpperCase() !== 'N/A' 
        ? phone.trim() 
        : null

    const normalizedEmail = email.toLowerCase().trim()
    const trimmedName = (typeof name === 'string' ? name.trim() : '') || normalizedEmail.split('@')[0]

    // ─── 3. Verify all courses exist ──────────────────────────────────
    const courses = await prisma.course.findMany({
      where: { id: { in: allCourseIds } },
      select: { id: true, name: true },
    })

    if (courses.length !== allCourseIds.length) {
      const foundIds = new Set(courses.map(c => c.id))
      const missing = allCourseIds.filter(id => !foundIds.has(id))
      const errorMsg = `Course ID not found in LMS: ${missing.join(', ')}`
      console.error(`[external-purchase] FAILED — ${errorMsg} | buyer=${normalizedEmail}`)
      return NextResponse.json({ error: errorMsg }, { status: 404 })
    }

    // ─── 4. Find or create user ───────────────────────────────────────
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: trimmedName,
            mobileNumber: normalizedPhone,
            gender: normalizedGender,
            role: 'STUDENT',
            isProfileComplete: false,
          },
        })
        
        // Trigger welcome notifications sequence in background
        scheduleWelcomeSequence(user.id).catch(console.error)

        // Auto-assign new user to default Notification Pool Group (ensures every student gets a group email)
        await getOrAssignPoolCategory(prisma, normalizedEmail)
      } catch (createErr) {
        const errMsg = createErr instanceof Error ? createErr.message : 'Unknown error'
        console.error(`[external-purchase] FAILED — user create error for ${normalizedEmail}:`, createErr)
        logActivity({
          userId: 'EXTERNAL',
          userName: trimmedName,
          userRole: 'STUDENT',
          actionType: ACTION.EXTERNAL_ENROLLMENT,
          actionDescription: `[FAILED EXTERNAL SYNC] Could not create user for ${normalizedEmail}: ${errMsg}`,
          moduleName: MODULE.ENROLLMENT,
          isFailure: true,
          metadata: { source: 'PURCHASE', failReason: 'USER_CREATE_ERROR', error: errMsg, email: normalizedEmail },
        })
        return NextResponse.json({ error: 'Could not create user record', details: errMsg }, { status: 400 })
      }
    }

    // ─── 5. Create Order (optional fields guarded) ────────────────────
    let safeAmount = extractAndParseAmount(body)
    let coursePricesMap: Record<string, number> = {}

    if (safeAmount === 0 && allCourseIds.length > 0) {
      const fallback = await getFallbackCoursePrices(prisma, allCourseIds, classTypeMap)
      safeAmount = fallback.totalPrice
      coursePricesMap = fallback.coursePrices
    }

    const safeCreatedAt = purchasedAt ? (() => { const d = new Date(purchasedAt); return isNaN(d.getTime()) ? new Date() : d })() : new Date()

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        amount: safeAmount,
        status: 'SUCCESS',
        isExternal: true,
        razorpayOrderId: typeof orderId === 'string' && orderId.trim() ? orderId.trim() : null,
        razorpayPaymentId: typeof paymentId === 'string' && paymentId.trim() ? paymentId.trim() : null,
        createdAt: safeCreatedAt,
      },
    })

    // ─── 6. Create order items + enrollments ──────────────────────────
    const enrollmentCourseIds: string[] = []
    const pricePerCourse = allCourseIds.length > 0 ? safeAmount / allCourseIds.length : 0

    for (const courseId of allCourseIds) {
      // Type is resolved by ID match, not position, to be robust against reordering
      const accessType = classTypeMap.get(courseId) ?? 'RECORDED'
      const itemPrice = coursePricesMap[courseId] ?? pricePerCourse

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          courseId,
          accessType,
          price: itemPrice,
        },
      })

      const existingEnrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId } },
      })

      if (existingEnrollment) {
        // Upgrade RECORDED → LIVE if needed
        if (existingEnrollment.type !== accessType && accessType === 'LIVE') {
          await prisma.enrollment.update({
            where: { id: existingEnrollment.id },
            data: { type: 'LIVE' },
          })
        }
      } else {
        await prisma.enrollment.create({
          data: {
            userId: user.id,
            courseId,
            type: accessType,
            isFreeEnrollment: false,
          },
        })
      }

      enrollmentCourseIds.push(courseId)
    }

    // Build map of courseId -> accessType for accurate group routing
    const enrollmentTypeMap: Record<string, 'LIVE' | 'RECORDED'> = {}
    for (const courseId of enrollmentCourseIds) {
      enrollmentTypeMap[courseId] = classTypeMap.get(courseId) ?? 'RECORDED'
    }

    // ─── 7. Queue Google Group sync ───────────────────────────────────
    await queueGoogleGroupSyncJobs(prisma, {
      userEmail: normalizedEmail,
      courseIds: enrollmentCourseIds,
      action: 'ADD',
      enrollmentTypeMap,
    })

    // ─── 8. Activity log ──────────────────────────────────────────────
    logActivity({
      userId: user.id,
      userName: trimmedName,
      userRole: 'STUDENT',
      actionType: ACTION.EXTERNAL_ENROLLMENT,
      actionDescription: `External purchase: ${allCourseIds.length} course(s) for ₹${safeAmount} (Order: ${orderId ?? 'N/A'})`,
      moduleName: MODULE.ENROLLMENT,
      targetId: allCourseIds[0],
      metadata: {
        source: 'PURCHASE',
        orderId: orderId || null,
        paymentId: paymentId || null,
        purchasedAt: purchasedAt || null,
        finalPrice: finalPrice ?? null,
        phone: phone || null,
        gender: normalizedGender,
        courseIds: allCourseIds,
      },
    })

    // NOTE: Do NOT send email here — external website already sent confirmation email.

    return NextResponse.json({
      success: true,
      message: 'External purchase processed successfully',
      orderId: order.id,
      enrolledCourses: allCourseIds.length,
    })
  } catch (error) {
    console.error('[external-purchase] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to process purchase', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
