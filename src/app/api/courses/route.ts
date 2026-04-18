import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { checkRateLimit } from '@/lib/ratelimit'
import { sanitizeInput } from '@/lib/validation'
import { isCourseEffectivelyDisabled, isCourseExpired } from '@/lib/course-state'
import { queueGoogleGroupSyncJobs, validateGoogleGroupEmail } from '@/lib/google-group-sync'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)

    const where: any = {
      isGlobal: false,
    }

    if (session.role !== 'MANAGER') {
      where.isDisabled = false
    }

    if (accessibleCourseIds !== null) {
      where.id = { in: accessibleCourseIds }
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        topics: {
          include: {
            content: {
              select: {
                videoUrl: true,
                pptUrl: true,
              },
            },
            sharedContentLinks: {
              include: {
                content: {
                  select: {
                    videoUrl: true,
                    pptUrl: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            courseEvents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const coursesWithCounts = courses.map(course => {
      const topicsCount = course.topics.length
      let lecturesCount = 0
      let materialsCount = 0

      course.topics.forEach(topic => {
        // Count direct content
        topic.content.forEach(content => {
          if (content.videoUrl) lecturesCount++
          if (content.pptUrl) materialsCount++
        })
        // Count shared content from other courses/topics
        topic.sharedContentLinks?.forEach(link => {
          if (link.content?.videoUrl) lecturesCount++
          if (link.content?.pptUrl) materialsCount++
        })
      })

      // Remove topics to keep response size manageable
      const { topics, ...rest } = course
      return {
        ...rest,
        isExpired: isCourseExpired(course),
        isEffectivelyDisabled: isCourseEffectivelyDisabled(course),
        _count: {
          ...course._count,
          topics: topicsCount,
          lectures: lecturesCount,
          materials: materialsCount,
        }
      }
    })

    return NextResponse.json(coursesWithCounts)
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
