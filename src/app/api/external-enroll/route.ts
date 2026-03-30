import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { isCourseEffectivelyDisabled } from '@/lib/course-state'

const EXTERNAL_SECRET = process.env.EXTERNAL_ENROLL_SECRET?.trim()

/**
 * POST /api/external-enroll
 *
 * Called by an external payment system after a successful purchase.
 * Creates the user (if new) and enrolls them into the purchased course.
 *
 * Auth: secret key in request body (NOT JWT-based).
 * Idempotent: safe to retry — duplicate enrollments are silently skipped.
 */
export async function POST(request: NextRequest) {
  try {
    // ─── 1. Parse & Validate Secret ───────────────────────────────────
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { secret, email, name, courseId, phone, gender } = body as {
      secret?: string
      email?: string
      name?: string
      courseId?: string
      phone?: string
      gender?: string
    }

    if (!EXTERNAL_SECRET) {
      console.error('[external-enroll] EXTERNAL_ENROLL_SECRET is not configured')
      return NextResponse.json(
        { success: false, error: 'Service unavailable' },
        { status: 503 }
      )
    }

    if (!secret || secret !== EXTERNAL_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized — invalid secret' },
        { status: 401 }
      )
    }

    // ─── 2. Validate Required Fields ──────────────────────────────────
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

    if (!courseId || typeof courseId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'courseId is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const trimmedName = name.trim()

    // ─── 3. Verify Course Exists & Is Active ──────────────────────────
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, name: true, isDisabled: true, expiresAt: true },
    })

    if (!course) {
      return NextResponse.json(
        { success: false, error: `Course not found: ${courseId}` },
        { status: 400 }
      )
    }

    if (isCourseEffectivelyDisabled(course)) {
      return NextResponse.json(
        { success: false, error: `Course is disabled or expired: ${course.name}` },
        { status: 400 }
      )
    }

    // ─── 4. Find or Create User + Enroll (atomic transaction) ─────────
    const result = await prisma.$transaction(async (tx) => {
      // 4a. Check if user already exists
      let user = await tx.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, name: true, email: true },
      })

      let isNewUser = false

      if (!user) {
        // 4b. Create new user as a Google-login student
        // Use a random placeholder hash — user will authenticate via Google OAuth
        const placeholderHash = await hashPassword(
          crypto.randomUUID() + Date.now().toString()
        )
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
            mobileNumber: phone?.trim() || null,
            passwordHash: placeholderHash,
            role: 'STUDENT',
            gender: gender === 'FEMALE' ? 'FEMALE' : 'MALE',
            securityNumber,
            isGoogleUser: true,
          },
          select: { id: true, name: true, email: true },
        })

        isNewUser = true

        // 4c. Auto-enroll in demo course if one exists
        const demoCourse = await (tx.course.findFirst as any)({
          where: { isDemo: true },
          select: { id: true },
        })
        if (demoCourse && demoCourse.id !== courseId) {
          // Check before create — .catch() inside a Prisma interactive transaction
          // can abort the entire transaction on unique constraint violations
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
          }
        }
      }

      // 4d. Enroll in the purchased course (skip if already enrolled)
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          userId_courseId: { userId: user.id, courseId },
        },
        select: { id: true },
      })

      if (existingEnrollment) {
        return {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          enrollmentId: existingEnrollment.id,
          isNewUser,
          isNewEnrollment: false,
        }
      }

      const enrollment = await tx.enrollment.create({
        data: { userId: user.id, courseId },
        select: { id: true },
      })

      return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        enrollmentId: enrollment.id,
        isNewUser,
        isNewEnrollment: true,
      }
    })

    // ─── 5. Activity Log (fire-and-forget, outside transaction) ───────
    const logDesc = result.isNewUser
      ? `External purchase: Created user "${result.userName}" (${result.userEmail}) and enrolled in "${course.name}"`
      : result.isNewEnrollment
        ? `External purchase: Enrolled existing user "${result.userName}" (${result.userEmail}) in "${course.name}"`
        : `External purchase: User "${result.userName}" (${result.userEmail}) already enrolled in "${course.name}" — skipped`

    logActivity({
      userId: result.userId,
      userName: result.userName,
      userRole: 'STUDENT',
      actionType: ACTION.EXTERNAL_ENROLLMENT,
      actionDescription: logDesc,
      moduleName: MODULE.ENROLLMENT,
      targetId: result.enrollmentId,
      metadata: {
        source: 'PURCHASE',
        courseId,
        courseName: course.name,
        isNewUser: result.isNewUser,
        isNewEnrollment: result.isNewEnrollment,
      },
    })

    // ─── 6. Response ──────────────────────────────────────────────────
    const message = result.isNewUser
      ? 'User created and enrolled successfully'
      : result.isNewEnrollment
        ? 'Existing user enrolled in new course successfully'
        : 'User is already enrolled in this course'

    return NextResponse.json({
      success: true,
      userId: result.userId,
      enrollmentId: result.enrollmentId,
      isNewUser: result.isNewUser,
      isNewEnrollment: result.isNewEnrollment,
      message,
    })
  } catch (error) {
    console.error('[external-enroll] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
