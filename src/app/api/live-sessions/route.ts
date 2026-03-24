import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getFullSession, getSession, isAdminOrManager, getAccessibleCourseIds } from '@/lib/auth'
import { logActivity, ACTION, MODULE } from '@/lib/activity-log'
import { getTodaySessionSnapshots } from '@/lib/daily-session-sync'

export async function GET(request: NextRequest) {
  try {
    const session = await getFullSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sessions = await getTodaySessionSnapshots(session)

    const filtered = !status
      ? sessions
      : sessions.filter((item) => {
          if (status === 'live') return item.status === 'live'
          if (status === 'scheduled') return item.status === 'upcoming' || item.status === 'rescheduled'
          if (status === 'completed') return item.status === 'completed' || item.status === 'cancelled'
          return true
        })

    return NextResponse.json(filtered)
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

    const { courseId, title, description, meetLink, instructorId, startTime, endTime } =
      await request.json()

    // Verify ADMIN has access to the target class
    if (session.role === 'ADMIN') {
      const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
      if (accessibleCourseIds !== null && !accessibleCourseIds.includes(courseId)) {
        return NextResponse.json({ error: 'No access to this class' }, { status: 403 })
      }
    }

    const courseEvent = await prisma.courseEvent.create({
      data: {
        courseId: courseId || null,
        title,
        description: description || null,
        meetLink: meetLink || null,
        instructorId: instructorId || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        type: 'class',
        status: 'SCHEDULED',
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
      targetId: courseEvent.id,
    })

    return NextResponse.json(courseEvent, { status: 201 })
  } catch (error) {
    console.error('Error creating live session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
