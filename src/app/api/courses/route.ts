import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, getFullSession, isManagerOrSuperAdmin } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { checkRateLimit } from '@/lib/ratelimit'
import { sanitizeInput } from '@/lib/validation'
import { isCourseEffectivelyDisabled, isCourseExpired } from '@/lib/course-state'
import { queueGoogleGroupSyncJobs, validateGoogleGroupEmail } from '@/lib/google-group-sync'
import { logCourseDataDiagnostics } from '@/lib/course-data-diagnostics'

export async function GET() {
  try {
    const session = await getFullSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where: any = {
      isGlobal: false,
    }

    const isManager = isManagerOrSuperAdmin(session.role)
    if (!isManager) {
      where.isDisabled = false
    }

    if (session.accessibleCourseIds !== null) {
      where.id = { in: session.accessibleCourseIds }
    }

    const courseFilter = {
      isGlobal: false,
      ...(isManager ? {} : { isDisabled: false }),
      ...(session.accessibleCourseIds !== null ? { id: { in: session.accessibleCourseIds } } : {})
    }

    // Parallelize course fetch and minimal content counts queries
    const [courses, directContents, sharedContents] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          createdBy: { select: { name: true } },
          _count: {
            select: {
              topics: true,
              courseEvents: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.content.findMany({
        where: {
          topic: {
            course: courseFilter
          }
        },
        select: {
          videoUrl: true,
          pptUrl: true,
          topic: {
            select: { courseId: true }
          }
        }
      }),
      prisma.topicSharedContent.findMany({
        where: {
          topic: {
            course: courseFilter
          }
        },
        select: {
          content: {
            select: {
              videoUrl: true,
              pptUrl: true,
            }
          },
          topic: {
            select: { courseId: true }
          }
        }
      })
    ])

    // Build count maps for O(1) lookups
    const lectureCountMap = new Map<string, number>()
    const materialCountMap = new Map<string, number>()

    directContents.forEach(content => {
      const courseId = content.topic?.courseId
      if (!courseId) return
      if (content.videoUrl) {
        lectureCountMap.set(courseId, (lectureCountMap.get(courseId) || 0) + 1)
      }
      if (content.pptUrl) {
        materialCountMap.set(courseId, (materialCountMap.get(courseId) || 0) + 1)
      }
    })

    sharedContents.forEach(link => {
      const courseId = link.topic?.courseId
      if (!courseId) return
      if (link.content?.videoUrl) {
        lectureCountMap.set(courseId, (lectureCountMap.get(courseId) || 0) + 1)
      }
      if (link.content?.pptUrl) {
        materialCountMap.set(courseId, (materialCountMap.get(courseId) || 0) + 1)
      }
    })

    const nowTime = new Date().getTime()

    const coursesWithCounts = courses.map(course => {
      const topicsCount = course._count.topics
      const lecturesCount = lectureCountMap.get(course.id) || 0
      const materialsCount = materialCountMap.get(course.id) || 0

      return {
        ...course,
        isExpired: isManager ? false : isCourseExpired(course),
        isEffectivelyDisabled: isManager ? false : isCourseEffectivelyDisabled(course),
        enrollmentType: course.isDemo ? 'DEMO' : course.isFree ? 'FREE' : (session.enrollmentTypes[course.id] || 'LIVE'),
        _count: {
          courseEvents: course._count.courseEvents,
          topics: topicsCount,
          lectures: lecturesCount,
          materials: materialsCount,
        }
      }
    }).filter(course => {
      if (isManager) return true;
      if (course.isExpired && course.expiresAt) {
        const expiryDate = new Date(course.expiresAt)
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
        const expiryDateIST = new Date(expiryDate.getTime() + IST_OFFSET_MS)
        expiryDateIST.setUTCHours(23, 59, 59, 999)
        const endOfExpiryDayUTC = new Date(expiryDateIST.getTime() - IST_OFFSET_MS)
        const isPast72Hours = (nowTime - endOfExpiryDayUTC.getTime()) > 72 * 60 * 60 * 1000
        if (isPast72Hours) return false
      }
      return true
    })

    if (coursesWithCounts.length <= 1) {
      await logCourseDataDiagnostics({
        reason: 'api_courses_low_visible_count',
        visibleCount: coursesWithCounts.length,
        sessionRole: session.role,
        userId: session.userId,
      })
    }

    return NextResponse.json(coursesWithCounts, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30'
      }
    })
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, description, subject, color, icon, expiresAt, teacherName, isDemo, isDisabled, isFree, googleGroupEmail } = await request.json()

    // 1. Rate Limiting
    const rateLimit = await checkRateLimit(session.userId, 'general')
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'You are doing this too fast, please wait.' }, 
        { status: 429 }
      )
    }

    // 2. Validation
    if (!name || !subject) {
      return NextResponse.json({ error: 'Name and subject are required' }, { status: 400 })
    }

    if (name.length > 200) {
      return NextResponse.json({ error: 'Name is too long (max 200 chars)' }, { status: 400 })
    }

    if (description && description.length > 2000) {
      return NextResponse.json({ error: 'Description is too long (max 2000 chars)' }, { status: 400 })
    }
    
    const sanitizedName = sanitizeInput(name)
    const sanitizedDescription = description ? sanitizeInput(description) : null
    const sanitizedSubject = sanitizeInput(subject)
    const sanitizedTeacherName = teacherName ? sanitizeInput(teacherName) : null
    const normalizedGoogleGroupEmail = validateGoogleGroupEmail(googleGroupEmail)
    
    // Validate expiresAt if provided
    if (expiresAt) {
      const expiryDate = new Date(expiresAt)
      if (expiryDate <= new Date()) {
        return NextResponse.json({ error: 'Expiry date must be in the future' }, { status: 400 })
      }
    }

    // Prevent multiple demo courses
    if (isDemo) {
      const existingDemo = await prisma.course.findFirst({
        where: { isDemo: true }
      })
      if (existingDemo) {
        return NextResponse.json({ 
          error: 'A demo course already exists. Only one course can be marked as a demo.' 
        }, { status: 400 })
      }
    }

    const newCourse = await prisma.$transaction(async (tx) => {
      const cls = await (tx.course.create as any)({
        data: {
          name: sanitizedName,
          description: sanitizedDescription,
          subject: sanitizedSubject,
          color,
          icon,
          teacherName: sanitizedTeacherName,
          googleGroupEmail: normalizedGoogleGroupEmail,
          isDemo: !!isDemo,
          isFree: !!isFree,
          isDisabled: !!isDisabled,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdById: session.userId,
        },
      })

      // Auto-enroll the creating ADMIN so they have immediate access
      if (session.role === 'ADMIN') {
        await tx.enrollment.create({
          data: { userId: session.userId, courseId: cls.id },
        })
        await queueGoogleGroupSyncJobs(tx, {
          userEmail: session.email,
          courseIds: [cls.id],
          action: 'ADD',
        })
      }

      return cls
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.COURSE_CREATED,
      actionDescription: `${session.name} created course "${sanitizedName}"`,
      moduleName: MODULE.COURSES,
      targetId: newCourse.id,
    })

    return NextResponse.json(newCourse, { status: 201 })
  } catch (error) {
    console.error('Error creating course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
