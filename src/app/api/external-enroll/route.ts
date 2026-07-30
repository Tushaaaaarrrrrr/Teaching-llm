import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { isCourseEffectivelyDisabled } from '@/lib/course-state'
import { queueGoogleGroupSyncJobs } from '@/lib/google-group-sync'
import { appendEnrollmentToSheet } from "@/lib/google-sheets"
import { getOrAssignPoolCategory } from '@/lib/notification-group-pool'
import { extractAndParseAmount, getFallbackCoursePrices } from '@/lib/external-price'

const EXTERNAL_SECRET = process.env.EXTERNAL_ENROLL_SECRET?.trim()

/**
 * POST /api/external-enroll
 *
 * Called by an external payment system after a successful purchase.
 * Creates the user (if new) and enrolls them into the purchased course(s).
 *
 * Auth: secret key in request body (NOT JWT-based).
 * Idempotent: safe to retry — duplicate enrollments are silently skipped.
 *
 * Maximum Payload (all optional fields except secret, email, name, and at
 * least one of courseId / courseIds / courseDetails):
 * {
 *   secret, email, name, phone?,
 *   gender?,        // "MALE" | "FEMALE" — case-insensitive
 *   orderId?,
 *   paymentId?,
 *   purchasedAt?,   // ISO-8601 string
 *   finalPrice?,    // number
 *   courseIds?,     // string[]  — backward-compat
 *   courseDetails?, // { id: string; type?: "LIVE" | "RECORDED" }[]  — primary
 * }
 *
 * Extra/unknown fields in the payload are silently ignored.
 */
export async function POST(request: NextRequest) {
  try {
    // ─── 1. Parse & Validate Secret ───────────────────────────────────
    const headerSecret = request.headers.get('x-external-secret')
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '')
    
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const {
      secret: bodySecret,
      email,
      name,
      courseId,
      courseIds,
      courseDetails,
      phone,
      gender,
      orderId,
      paymentId,
      purchasedAt,
      finalPrice,
    } = body as {
      secret?: string
      email?: string
      name?: string
      courseId?: string
      courseIds?: string[]
      courseDetails?: Array<{ id: string; type?: string }>
      phone?: string
      gender?: string
      orderId?: string
      paymentId?: string
      purchasedAt?: string
      finalPrice?: number
    }

    // Determine effective secret from all available sources
    const providedSecret = headerSecret || authHeader || bodySecret

    // ─── 2. Secret Check ───────────────────────────────────────────────
    if (!EXTERNAL_SECRET) {
      console.error('[external-enroll] EXTERNAL_ENROLL_SECRET is not configured')
      return NextResponse.json(
        { success: false, error: 'Service unavailable' },
        { status: 503 }
      )
    }

    if (!providedSecret || providedSecret !== EXTERNAL_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized — invalid secret' },
        { status: 401 }
      )
    }

    // ─── 3. Validate Required Fields ──────────────────────────────────
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      )
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    // ─── 4. Build Normalised Course ID List ───────────────────────────
    // courseDetails is PRIMARY; courseId / courseIds are backward-compat fallbacks.
    // IDs from courseDetails always win for type resolution.
    const courseDetailsIds: string[] = Array.isArray(courseDetails)
      ? courseDetails
          .filter(d => d && typeof d.id === 'string' && d.id.trim().length > 0)
          .map(d => d.id.trim())
      : []

    const legacyIds: string[] = [
      ...(typeof courseId === 'string' && courseId.trim().length > 0 ? [courseId.trim()] : []),
      ...(Array.isArray(courseIds)
        ? courseIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        : []),
    ]

    // Merge — courseDetails IDs first, then any legacy IDs not already present
    const normalizedCourseIds = Array.from(
      new Set([...courseDetailsIds, ...legacyIds])
    )

    if (normalizedCourseIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one course ID is required (via courseDetails, courseIds, or courseId)' },
        { status: 400 }
      )
    }

    // ─── 5. Build classTypeMap from courseDetails (case-insensitive) ──
    // Any value other than "LIVE" normalises to "RECORDED".
    // Legacy IDs without a courseDetails entry default to "LIVE".
    const classTypeMap = new Map<string, 'LIVE' | 'RECORDED'>()
    if (Array.isArray(courseDetails)) {
      for (const detail of courseDetails) {
        if (detail && typeof detail.id === 'string' && detail.id.trim().length > 0) {
          const upperType = typeof detail.type === 'string'
            ? detail.type.toUpperCase()
            : ''
          classTypeMap.set(
            detail.id.trim(),
            upperType === 'RECORDED' ? 'RECORDED' : 'LIVE'
          )
        }
      }
    }

    // Normalize gender — accept any casing
    const normalizedGender: 'FEMALE' | 'MALE' | null =
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
    const trimmedName = name.trim()

    // ─── 6. Verify All Courses Exist & Are Active ─────────────────────
    const courses = await prisma.course.findMany({
      where: { id: { in: normalizedCourseIds } },
      select: { id: true, name: true, isDisabled: true, expiresAt: true },
    })

    const courseMap = new Map(courses.map(course => [course.id, course]))
    const missingCourseIds = normalizedCourseIds.filter(id => !courseMap.has(id))

    if (missingCourseIds.length > 0) {
      const errorMsg = `Course ID not found in LMS: ${missingCourseIds.join(', ')}`
      console.error(`[external-enroll] FAILED — ${errorMsg} | buyer=${normalizedEmail}`)
      // Note: Logging to ActivityLog requires a valid User ID due to DB constraints.
      // For failed external syncs of non-existent users, we rely on console logs.
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 404 }
      )
    }

    const blockedCourses = courses.filter(course => isCourseEffectivelyDisabled(course))
    if (blockedCourses.length > 0) {
      const errorMsg = `Course is disabled or expired: ${blockedCourses.map(c => c.name).join(', ')}`
      console.error(`[external-enroll] FAILED — ${errorMsg} | buyer=${normalizedEmail}`)
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      )
    }

    // ─── 7. Find or Create User + Enroll (atomic transaction) ─────────
    let result: {
      userId: string
      userName: string | null
      userEmail: string
      isNewUser: boolean
      enrollments: Array<{
        courseId: string
        courseName: string
        enrollmentId: string
        isNewEnrollment: boolean
        classType: 'LIVE' | 'RECORDED'
      }>
    }

    try {
      result = await prisma.$transaction(async (tx) => {
        // 7a. Find or create user
        let user = await tx.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true, name: true, email: true },
        })

        let isNewUser = false

        if (!user) {
          const securityNumber =
            'SEC' + Math.random().toString(36).substring(2, 9).toUpperCase()

          const nameParts = trimmedName.split(' ')
          const firstName = nameParts[0] || trimmedName
          const lastName = nameParts.slice(1).join(' ') || ''

          user = await tx.user.create({
            data: {
              name: trimmedName,
              firstName,
              lastName,
              email: normalizedEmail,
              mobileNumber: normalizedPhone,
              role: 'STUDENT',
              gender: normalizedGender,
              securityNumber,
              isGoogleUser: true,
            },
            select: { id: true, name: true, email: true },
          })

          isNewUser = true

          // 7b. Auto-enroll in demo course if one exists
          const demoCourse = await (tx.course.findFirst as any)({
            where: { isDemo: true },
            select: { id: true },
          })
          if (demoCourse && !normalizedCourseIds.includes(demoCourse.id)) {
            const existingDemoEnroll = await tx.enrollment.findUnique({
              where: {
                userId_courseId: { userId: user.id, courseId: demoCourse.id },
              },
              select: { id: true },
            })
            if (!existingDemoEnroll) {
              await tx.enrollment.create({
                data: { userId: user.id, courseId: demoCourse.id },
              })
              await queueGoogleGroupSyncJobs(tx, {
                userEmail: user.email,
                courseIds: [demoCourse.id],
                action: 'ADD',
              })
            }
          }
        }

        // Auto-assign new user to default Notification Pool Group (ensures every student gets a group email)
        if (isNewUser) {
          await getOrAssignPoolCategory(tx, user.email)
        }

        // 7b2. Create Order & Order Items (to enable Transaction page visibility)
        let safeAmount = extractAndParseAmount(body)
        let coursePricesMap: Record<string, number> = {}

        if (safeAmount === 0 && normalizedCourseIds.length > 0) {
          const fallback = await getFallbackCoursePrices(tx, normalizedCourseIds, classTypeMap)
          safeAmount = fallback.totalPrice
          coursePricesMap = fallback.coursePrices
        }

        const safeCreatedAt = purchasedAt ? (() => { const d = new Date(purchasedAt); return isNaN(d.getTime()) ? new Date() : d })() : new Date()

        let order = null
        if (orderId && typeof orderId === 'string' && orderId.trim()) {
          order = await tx.order.findUnique({
            where: { razorpayOrderId: orderId.trim() },
          })
        }

        if (!order) {
          order = await tx.order.create({
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

          const pricePerCourse = normalizedCourseIds.length > 0 ? safeAmount / normalizedCourseIds.length : 0

          for (const courseId of normalizedCourseIds) {
            const accessType = classTypeMap.get(courseId) ?? 'LIVE'
            const itemPrice = coursePricesMap[courseId] ?? pricePerCourse
            await tx.orderItem.create({
              data: {
                orderId: order.id,
                courseId,
                accessType,
                price: itemPrice,
              },
            })
          }
        } else if (order.amount === 0 && safeAmount > 0) {
          // Update existing zero-amount order if we now parsed or derived a non-zero price
          await tx.order.update({
            where: { id: order.id },
            data: { amount: safeAmount },
          })
        }

        // 7c. Enroll in each purchased course (idempotent)
        const enrollmentResults: typeof result['enrollments'] = []

        for (const targetCourseId of normalizedCourseIds) {
          const existingEnrollment = await tx.enrollment.findUnique({
            where: {
              userId_courseId: { userId: user.id, courseId: targetCourseId },
            },
            select: { id: true },
          })

          const enrollmentType = classTypeMap.get(targetCourseId) ?? 'LIVE'

          if (existingEnrollment) {
            enrollmentResults.push({
              courseId: targetCourseId,
              courseName: courseMap.get(targetCourseId)?.name || targetCourseId,
              enrollmentId: existingEnrollment.id,
              isNewEnrollment: false,
              classType: enrollmentType,
            })
            continue
          }

          const enrollment = await tx.enrollment.create({
            data: { userId: user.id, courseId: targetCourseId, type: enrollmentType },
            select: { id: true },
          })

          await queueGoogleGroupSyncJobs(tx, {
            userEmail: user.email,
            courseIds: [targetCourseId],
            action: 'ADD',
          })

          enrollmentResults.push({
            courseId: targetCourseId,
            courseName: courseMap.get(targetCourseId)?.name || targetCourseId,
            enrollmentId: enrollment.id,
            isNewEnrollment: true,
            classType: enrollmentType,
          })
        }

        return {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          isNewUser,
          enrollments: enrollmentResults,
        }
      })
    } catch (txError) {
      // DB-level / Prisma errors (e.g. unique constraint on a race condition)
      const errMsg = txError instanceof Error ? txError.message : 'Unknown database error'
      console.error(`[external-enroll] DB transaction failed for ${normalizedEmail}:`, txError)
      logActivity({
        userId: 'EXTERNAL',
        userName: trimmedName,
        userRole: 'STUDENT',
        actionType: ACTION.EXTERNAL_ENROLLMENT,
        actionDescription: `[FAILED EXTERNAL SYNC] DB error during enrollment for ${normalizedEmail}: ${errMsg}`,
        moduleName: MODULE.ENROLLMENT,
        isFailure: true,
        metadata: {
          source: 'PURCHASE',
          failReason: 'DB_ERROR',
          error: errMsg,
          requestedCourseIds: normalizedCourseIds,
          orderId: orderId || null,
          paymentId: paymentId || null,
          purchasedAt: purchasedAt || null,
          finalPrice: finalPrice ?? null,
          email: normalizedEmail,
        },
      })
      return NextResponse.json(
        { success: false, error: 'Enrollment failed due to a database error', details: errMsg },
        { status: 500 }
      )
    }

    // ─── 8. Activity Log (fire-and-forget, outside transaction) ───────
    result.enrollments.forEach(enrollment => {
      const logDesc = result.isNewUser
        ? `External purchase: Created user "${result.userName}" (${result.userEmail}) and enrolled in "${enrollment.courseName}" [${enrollment.classType}]`
        : enrollment.isNewEnrollment
          ? `External purchase: Enrolled existing user "${result.userName}" (${result.userEmail}) in "${enrollment.courseName}" [${enrollment.classType}]`
          : `External purchase: User "${result.userName}" (${result.userEmail}) already enrolled in "${enrollment.courseName}" — skipped`

      logActivity({
        userId: result.userId,
        userName: result.userName ?? trimmedName,
        userRole: 'STUDENT',
        actionType: ACTION.EXTERNAL_ENROLLMENT,
        actionDescription: logDesc,
        moduleName: MODULE.ENROLLMENT,
        targetId: enrollment.enrollmentId,
        metadata: {
          source: 'PURCHASE',
          courseId: enrollment.courseId,
          courseName: enrollment.courseName,
          classType: enrollment.classType,
          isNewUser: result.isNewUser,
          isNewEnrollment: enrollment.isNewEnrollment,
          orderId: orderId || null,
          paymentId: paymentId || null,
          purchasedAt: purchasedAt || null,
          finalPrice: finalPrice ?? null,
          phone: phone || null,
          gender: normalizedGender,
        },
      })
    })

    // ─── 9. Google Sheets Integration (fire-and-forget, delayed) ──────
    setTimeout(() => {
      try {
        if (Array.isArray(result.enrollments)) {
          result.enrollments.forEach(enrollment => {
            appendEnrollmentToSheet({
              name: result.userName ?? trimmedName,
              email: result.userEmail,
              phone: phone,
              course: enrollment.courseName,
              gender: normalizedGender ?? gender,
            })
          })
        }
      } catch (err) {
        console.error('[external-enroll] Delayed sheets error:', err)
      }
    }, 120000) // 2 minutes

    // ─── 10. Response ─────────────────────────────────────────────────
    const newEnrollmentCount = result.enrollments.filter(e => e.isNewEnrollment).length
    const skippedEnrollmentCount = result.enrollments.length - newEnrollmentCount
    const isSingle = result.enrollments.length === 1
    const single = isSingle ? result.enrollments[0] : null

    const message = result.isNewUser
      ? isSingle
        ? 'User created and enrolled successfully'
        : `User created and processed ${result.enrollments.length} course enrollments`
      : isSingle
        ? single?.isNewEnrollment
          ? 'Existing user enrolled in new course successfully'
          : 'User is already enrolled in this course'
        : `Processed ${result.enrollments.length} course enrollments (${newEnrollmentCount} new, ${skippedEnrollmentCount} already enrolled)`

    return NextResponse.json({
      success: true,
      userId: result.userId,
      isNewUser: result.isNewUser,
      ...(single
        ? {
            enrollmentId: single.enrollmentId,
            isNewEnrollment: single.isNewEnrollment,
            classType: single.classType,
          }
        : {}),
      enrollments: result.enrollments,
      message,
    })
  } catch (error) {
    console.error('[external-enroll] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
