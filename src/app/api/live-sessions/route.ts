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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { type: 'class' }

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null) {
      where.courseId = { in: accessibleCourseIds }
    }

    const liveSessions = await prisma.courseEvent.findMany({
      where,
      include: {
        instructor: { select: { id: true, name: true } },
        course: { select: { id: true, name: true, color: true, teacherName: true } },
      },
      orderBy: { startTime: 'desc' },
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

    const start = new Date(`${date}T${time || '00:00'}`)
    const end = new Date(start.getTime() + 60 * 60 * 1000) // 1 hour default

    const liveSession = await prisma.courseEvent.create({
      data: {
        courseId: courseId || null,
        isGlobal: !courseId,
        title,
        description: description || null,
        meetLink: meetingLink || null,
        startTime: start,
        endTime: end,
        type: 'class',
        status: status || 'SCHEDULED',
        createdById: session.userId,
      },
    })

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
