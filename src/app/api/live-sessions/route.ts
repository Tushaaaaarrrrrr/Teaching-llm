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
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { type: 'live' }
    if (status) where.status = status

    const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
    if (accessibleCourseIds !== null) {
      where.OR = [
        { courseId: null },
        { courseId: { in: accessibleCourseIds } },
      ]
    }

    const events = await (prisma.calendarEvent as any).findMany({
      where,
      include: {
        course: { select: { id: true, name: true, color: true } },
        instructor: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    })

    // Map to expected LiveSession format for the UI
    const mapped = events.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      instructor: e.instructor?.name || 'Teacher',
      date: e.date,
      time: e.time,
      status: e.status,
      meetingLink: e.meetingLink,
      course: e.course ? { name: e.course.name, color: e.course.color } : { name: 'General', color: '#6366f1' }
    }))

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

    const { courseId, title, description, meetingLink, instructorId, instructor, date, time, status } =
      await request.json()

    // Verify ADMIN has access to the target course
    if (session.role === 'ADMIN' && courseId) {
      const accessibleCourseIds = await getAccessibleCourseIds(session.userId, session.role)
      if (accessibleCourseIds !== null && !accessibleCourseIds.includes(courseId)) {
        return NextResponse.json({ error: 'No access to this course' }, { status: 403 })
      }
    }

    // Create a calendar event with 'live' type
    const event = await (prisma.calendarEvent as any).create({
      data: {
        title,
        description,
        date,
        time,
        type: 'live',
        courseId: courseId || null,
        instructorId: instructorId || null,
        meetingLink,
        status: status || 'scheduled',
        createdById: session.userId,
      },
      include: {
        course: { select: { name: true, color: true } },
        instructor: { select: { name: true } }
      }
    })

    logActivity({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      actionType: ACTION.SESSION_CREATED,
      actionDescription: `${session.name} created live session "${title}"`,
      moduleName: MODULE.LIVE_SESSIONS,
      targetId: event.id,
    })

    // Return in the format the frontend expects
    return NextResponse.json({
        id: event.id,
        title: event.title,
        description: event.description,
        instructor: event.instructor?.name || instructor || 'Teacher',
        date: event.date,
        time: event.time,
        status: event.status,
        meetingLink: event.meetingLink,
        course: event.course ? { name: event.course.name, color: event.course.color } : { name: 'General', color: '#6366f1' }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating live session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
