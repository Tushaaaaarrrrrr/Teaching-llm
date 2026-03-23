import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { formatIST, getEventStatus } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { type: 'live' }
    if (status) where.manualStatus = status

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null) {
      where.courseId = { in: accessibleCourseIds }
    }

    const events = await prisma.courseEvent.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, color: true, teacherName: true } },
        instructor: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
    })

    // Compute status dynamically
    const mapped = events.map(ev => {
      const status = getEventStatus(ev.startTime, ev.endTime, ev.manualStatus)

      return {
        ...ev,
        status,
        date: ev.startTime.toISOString().split('T')[0],
        time: formatIST(ev.startTime),
        meetingLink: ev.meetLink,
      }
    })

    return NextResponse.json(mapped)
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

    // Convert date/time to startTime
    let startTime = new Date()
    if (date) {
      startTime = new Date(`${date} ${time || '00:00'}`)
    }
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // Default 1 hour

    const liveSession = await prisma.courseEvent.create({
      data: {
        courseId,
        title,
        description,
        meetLink: meetingLink,
        startTime,
        endTime,
        manualStatus: status || 'NONE',
        type: 'live',
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
