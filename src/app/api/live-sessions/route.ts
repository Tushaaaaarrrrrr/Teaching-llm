import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}
    if (status) where.status = status

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null) {
      where.courseId = { in: accessibleCourseIds }
    }

    const liveSessions = await prisma.liveSession.findMany({
      where,
      include: {
        course: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(liveSessions)
  } catch (error) {
    console.error('Error fetching live sessions:', error)
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

    const { courseId, title, description, meetingLink, instructor, date, time, status } =
      await request.json()

    // Verify ADMIN has access to the target class
    if (session.role === 'ADMIN') {
      const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
      if (accessibleCourseIds !== null && !accessibleCourseIds.includes(courseId)) {
        return NextResponse.json({ error: 'No access to this class' }, { status: 403 })
      }
    }

    // Get the class name for linking to the calendar event
    let className: string | null = null
    if (courseId) {
      const cls = await prisma.course.findUnique({ where: { id: courseId }, select: { name: true } })
      className = cls?.name || null
    }

    const liveSession = await prisma.liveSession.create({
      data: {
        courseId,
        title,
        description,
        meetingLink,
        instructor,
        date,
        time,
        status,
        createdById: session.userId,
      },
    })

    // Auto-create a calendar event linked to the same class
    if (date) {
      await prisma.calendarEvent.create({
        data: {
          title: `Live: ${title}`,
          description: instructor ? `Instructor: ${instructor}` : description || null,
          date,
          time: time || null,
          type: 'class',
          courseId: courseId || null,
          relatedCourse: className,
          createdById: session.userId,
        },
      })
    }

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.SESSION_CREATED,
      actionDescription: `${session.name} created live session "${title}"`,
      moduleName: MODULE.LIVE_SESSIONS,
      targetId: liveSession.id,
    })

    return NextResponse.json(liveSession, { status: 201 })
  } catch (error) {
    console.error('Error creating live session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
