import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)

    const where: any = {
      isGlobal: false
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
        topic.content.forEach(content => {
          if (content.videoUrl) lecturesCount++
          if (content.pptUrl) materialsCount++
        })
      })

      // Remove topics from the response to keep payload small, 
      // or keep it if needed. The frontend CoursesPage doesn't seem to use it yet.
      // But we need to match the expected _count structure for compatibility.
      
      const { topics, ...rest } = course
      return {
        ...rest,
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

    if (!isAdminOrManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, description, subject, color, icon, expiresAt, teacherName, isDemo } = await request.json()
    
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
      const cls = await tx.course.create({
        data: {
          name,
          description,
          subject,
          color,
          icon,
          teacherName: teacherName || null,
          isDemo: !!isDemo,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdById: session.userId,
        },
      })

      // Auto-enroll the creating ADMIN so they have immediate access
      if (session.role === 'ADMIN') {
        await tx.enrollment.create({
          data: { userId: session.userId, courseId: cls.id },
        })
      }

      return cls
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.COURSE_CREATED,
      actionDescription: `${session.name} created course "${name}"`,
      moduleName: MODULE.COURSES,
      targetId: newCourse.id,
    })

    return NextResponse.json(newCourse, { status: 201 })
  } catch (error) {
    console.error('Error creating course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
